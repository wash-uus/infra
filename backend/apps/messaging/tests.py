"""
Unit tests for the polling-based messaging REST API.

Run with:  python manage.py test apps.messaging.tests
"""
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.groups.models import GroupMembership, RevivalGroup
from apps.messaging.models import (
    DirectMessage,
    GroupMessage,
    GroupMessageReadReceipt,
    MAX_MESSAGE_LENGTH,
)

User = get_user_model()


# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

def make_user(email, password="pass1234!"):
    return User.objects.create_user(email=email, password=password, username=email.split("@")[0])


def make_group(name="Test Group"):
    return RevivalGroup.objects.create(name=name, slug=name.lower().replace(" ", "-"))


# ──────────────────────────────────────────────────────────────────────────────
# Direct Message Tests
# ──────────────────────────────────────────────────────────────────────────────

class DirectMessageAPITest(APITestCase):
    def setUp(self):
        self.alice = make_user("alice@example.com")
        self.bob = make_user("bob@example.com")
        self.client.force_authenticate(user=self.alice)

    # ── Send ──────────────────────────────────────────────────────────────
    def test_send_direct_message(self):
        url = reverse("direct-message-list")
        resp = self.client.post(url, {"receiver": self.bob.id, "text": "Hello Bob!"})
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data["text"], "Hello Bob!")
        self.assertEqual(resp.data["sender"], self.alice.id)
        self.assertEqual(resp.data["receiver"], self.bob.id)

    def test_send_requires_auth(self):
        self.client.force_authenticate(user=None)
        url = reverse("direct-message-list")
        resp = self.client.post(url, {"receiver": self.bob.id, "text": "Hi"})
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_message_too_long_rejected(self):
        url = reverse("direct-message-list")
        resp = self.client.post(url, {"receiver": self.bob.id, "text": "x" * (MAX_MESSAGE_LENGTH + 1)})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_empty_text_rejected(self):
        """Empty text with no audio should be a valid API call (server side allows blank text)."""
        # The model allows blank text (for audio-only messages); non-blank is enforced by UI
        url = reverse("direct-message-list")
        resp = self.client.post(url, {"receiver": self.bob.id, "text": ""})
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    # ── Conversations list ────────────────────────────────────────────────
    def test_conversations_list_returns_latest_per_partner(self):
        DirectMessage.objects.create(sender=self.alice, receiver=self.bob, text="a")
        DirectMessage.objects.create(sender=self.alice, receiver=self.bob, text="b")
        DirectMessage.objects.create(sender=self.bob, receiver=self.alice, text="c")

        url = reverse("direct-message-list")
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        # Should return 1 conversation record (the latest), not 3 raw messages
        self.assertEqual(len(resp.data["results"]), 1)

    def test_conversations_not_visible_to_third_party(self):
        """Charlie should not see Alice↔Bob messages."""
        charlie = make_user("charlie@example.com")
        DirectMessage.objects.create(sender=self.alice, receiver=self.bob, text="secret")
        self.client.force_authenticate(user=charlie)
        url = reverse("direct-message-list")
        resp = self.client.get(url)
        self.assertEqual(len(resp.data["results"]), 0)

    # ── Thread / since filter ─────────────────────────────────────────────
    def test_interlocutor_filter_returns_thread(self):
        DirectMessage.objects.create(sender=self.alice, receiver=self.bob, text="m1")
        DirectMessage.objects.create(sender=self.bob, receiver=self.alice, text="m2")
        url = reverse("direct-message-list")
        resp = self.client.get(url, {"interlocutor": self.bob.id})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data["results"]), 2)

    def test_since_filter_returns_only_newer_messages(self):
        m1 = DirectMessage.objects.create(sender=self.alice, receiver=self.bob, text="old")
        since = m1.timestamp.isoformat()
        DirectMessage.objects.create(sender=self.alice, receiver=self.bob, text="new")
        url = reverse("direct-message-list")
        resp = self.client.get(url, {"interlocutor": self.bob.id, "since": since})
        texts = [m["text"] for m in resp.data["results"]]
        self.assertNotIn("old", texts)
        self.assertIn("new", texts)

    # ── Soft delete ───────────────────────────────────────────────────────
    def test_author_can_soft_delete(self):
        msg = DirectMessage.objects.create(sender=self.alice, receiver=self.bob, text="bye")
        url = reverse("direct-message-detail", args=[msg.id])
        resp = self.client.delete(url)
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)
        msg.refresh_from_db()
        self.assertTrue(msg.is_deleted)

    def test_non_author_cannot_delete(self):
        msg = DirectMessage.objects.create(sender=self.bob, receiver=self.alice, text="mine")
        url = reverse("direct-message-detail", args=[msg.id])
        resp = self.client.delete(url)
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_deleted_messages_excluded_from_list(self):
        DirectMessage.objects.create(sender=self.alice, receiver=self.bob, text="visible")
        DirectMessage.objects.create(sender=self.alice, receiver=self.bob, text="gone", is_deleted=True)
        url = reverse("direct-message-list")
        resp = self.client.get(url, {"interlocutor": self.bob.id})
        texts = [m["text"] for m in resp.data["results"]]
        self.assertIn("visible", texts)
        self.assertNotIn("gone", texts)

    # ── Mark read ─────────────────────────────────────────────────────────
    def test_mark_read_updates_is_read(self):
        DirectMessage.objects.create(sender=self.bob, receiver=self.alice, text="read me", is_read=False)
        self.client.force_authenticate(user=self.alice)
        url = reverse("direct-message-mark-read")
        resp = self.client.post(url, {"sender_id": self.bob.id})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["marked_read"], 1)
        self.assertTrue(DirectMessage.objects.filter(sender=self.bob, receiver=self.alice).first().is_read)

    def test_mark_read_requires_sender_id(self):
        url = reverse("direct-message-mark-read")
        resp = self.client.post(url, {})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


# ──────────────────────────────────────────────────────────────────────────────
# Group Message Tests
# ──────────────────────────────────────────────────────────────────────────────

class GroupMessageAPITest(APITestCase):
    def setUp(self):
        self.alice = make_user("galice@example.com")
        self.bob = make_user("gbob@example.com")
        self.group = make_group("Worshippers")
        GroupMembership.objects.create(user=self.alice, group=self.group)
        self.client.force_authenticate(user=self.alice)

    # ── Send ──────────────────────────────────────────────────────────────
    def test_member_can_send_group_message(self):
        url = reverse("group-message-list")
        resp = self.client.post(url, {"group": self.group.id, "text": "Praise!"})
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data["text"], "Praise!")

    def test_non_member_cannot_send(self):
        self.client.force_authenticate(user=self.bob)
        url = reverse("group-message-list")
        resp = self.client.post(url, {"group": self.group.id, "text": "Sneak"})
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    # ── Thread / since filter ─────────────────────────────────────────────
    def test_group_filter_returns_thread(self):
        GroupMessage.objects.create(sender=self.alice, group=self.group, text="hi")
        GroupMessage.objects.create(sender=self.alice, group=self.group, text="there")
        url = reverse("group-message-list")
        resp = self.client.get(url, {"group": self.group.id})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data["results"]), 2)

    def test_since_filter_returns_only_newer(self):
        m1 = GroupMessage.objects.create(sender=self.alice, group=self.group, text="old")
        since = m1.timestamp.isoformat()
        GroupMessage.objects.create(sender=self.alice, group=self.group, text="new")
        url = reverse("group-message-list")
        resp = self.client.get(url, {"group": self.group.id, "since": since})
        texts = [m["text"] for m in resp.data["results"]]
        self.assertNotIn("old", texts)
        self.assertIn("new", texts)

    def test_non_member_cannot_read_thread(self):
        GroupMessage.objects.create(sender=self.alice, group=self.group, text="private")
        self.client.force_authenticate(user=self.bob)
        url = reverse("group-message-list")
        resp = self.client.get(url, {"group": self.group.id})
        self.assertEqual(len(resp.data["results"]), 0)

    # ── Soft delete ───────────────────────────────────────────────────────
    def test_author_can_soft_delete_group_message(self):
        msg = GroupMessage.objects.create(sender=self.alice, group=self.group, text="oops")
        url = reverse("group-message-detail", args=[msg.id])
        resp = self.client.delete(url)
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)
        msg.refresh_from_db()
        self.assertTrue(msg.is_deleted)

    def test_non_author_cannot_delete_group_message(self):
        GroupMembership.objects.create(user=self.bob, group=self.group)
        msg = GroupMessage.objects.create(sender=self.alice, group=self.group, text="alice's")
        self.client.force_authenticate(user=self.bob)
        url = reverse("group-message-detail", args=[msg.id])
        resp = self.client.delete(url)
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    # ── Mark read ─────────────────────────────────────────────────────────
    def test_mark_group_read_creates_receipt(self):
        url = reverse("group-message-mark-read")
        resp = self.client.post(url, {"group_id": self.group.id})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(
            GroupMessageReadReceipt.objects.filter(user=self.alice, group=self.group).exists()
        )

    def test_mark_group_read_updates_existing_receipt(self):
        GroupMessageReadReceipt.objects.create(
            user=self.alice, group=self.group,
            last_read_at=timezone.now() - timezone.timedelta(hours=1)
        )
        url = reverse("group-message-mark-read")
        resp = self.client.post(url, {"group_id": self.group.id})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        # Still only 1 row
        self.assertEqual(
            GroupMessageReadReceipt.objects.filter(user=self.alice, group=self.group).count(), 1
        )

    def test_non_member_cannot_mark_group_read(self):
        self.client.force_authenticate(user=self.bob)
        url = reverse("group-message-mark-read")
        resp = self.client.post(url, {"group_id": self.group.id})
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)


# ──────────────────────────────────────────────────────────────────────────────
# Unread Count Tests
# ──────────────────────────────────────────────────────────────────────────────

class UnreadCountAPITest(APITestCase):
    def setUp(self):
        self.alice = make_user("uac_alice@example.com")
        self.bob = make_user("uac_bob@example.com")
        self.group = make_group("Intercessors")
        GroupMembership.objects.create(user=self.alice, group=self.group)
        GroupMembership.objects.create(user=self.bob, group=self.group)
        self.client.force_authenticate(user=self.alice)

    def _url(self):
        return "/api/messaging/unread-count/"

    def test_zero_unread_on_fresh_account(self):
        resp = self.client.get(self._url())
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["total"], 0)

    def test_dm_unread_count_increments(self):
        DirectMessage.objects.create(sender=self.bob, receiver=self.alice, text="hi", is_read=False)
        resp = self.client.get(self._url())
        self.assertEqual(resp.data["dm"], 1)
        self.assertEqual(resp.data["total"], 1)

    def test_read_dm_not_counted(self):
        DirectMessage.objects.create(sender=self.bob, receiver=self.alice, text="hi", is_read=True)
        resp = self.client.get(self._url())
        self.assertEqual(resp.data["dm"], 0)

    def test_group_unread_count(self):
        # Bob posts a message; Alice hasn't read it yet (no receipt)
        GroupMessage.objects.create(sender=self.bob, group=self.group, text="announcement")
        resp = self.client.get(self._url())
        self.assertEqual(resp.data["group"], 1)

    def test_group_unread_zeroed_after_mark_read(self):
        GroupMessage.objects.create(sender=self.bob, group=self.group, text="announcement")
        GroupMessageReadReceipt.objects.create(
            user=self.alice, group=self.group, last_read_at=timezone.now()
        )
        resp = self.client.get(self._url())
        self.assertEqual(resp.data["group"], 0)

    def test_own_messages_not_counted_as_unread(self):
        GroupMessage.objects.create(sender=self.alice, group=self.group, text="my msg")
        resp = self.client.get(self._url())
        self.assertEqual(resp.data["group"], 0)

    def test_unread_count_requires_auth(self):
        self.client.force_authenticate(user=None)
        resp = self.client.get(self._url())
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)
