import random

from django.conf import settings as django_settings
from django.core.mail import send_mail
from django.db.models import Q
from django.utils import timezone
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.accounts.permissions import IsModeratorOrAbove
from apps.common.utils import log_action, send_notification
from apps.content.models import ContentItem, DailyBread, FetchedPhoto, GalleryItem, ShortStory, UserPhoto
from apps.content.serializers import (
    ContentItemSerializer,
    DailyBreadSerializer,
    FetchedPhotoSerializer,
    GalleryItemSerializer,
    HeroCollageItemSerializer,
    ShortStorySerializer,
    UserPhotoSerializer,
)


def _send_content_notification(item, approved: bool, reason: str = "") -> None:
    """Notify the content author of approval/rejection via in-app + email."""
    user = item.author
    if approved:
        notif_title = "Your content is live ✓"
        notif_msg = f'"{item.title}" has been approved and is now visible in the content library.'
        notif_type = "approved"
        subject = "Your content is live — Spirit Revival Africa"
        body = (
            f"Hi {user.first_name or 'there'},\n\n"
            f'Your submission "{item.title}" has been approved and is now live.\n\n'
            f"View it here: {django_settings.FRONTEND_URL}/content\n\n"
            f"— Spirit Revival Africa"
        )
    else:
        notif_title = "Update on your content submission"
        notif_msg = (
            f'"{item.title}" was not approved.'
            + (f" Reason: {reason}" if reason else "")
        )
        notif_type = "rejected"
        subject = "Update on your content submission — Spirit Revival Africa"
        body = (
            f"Hi {user.first_name or 'there'},\n\n"
            f'Your submission "{item.title}" could not be approved at this time.\n'
            + (f"Reason: {reason}\n\n" if reason else "\n")
            + "You're welcome to revise and resubmit.\n\n— Spirit Revival Africa"
        )

    send_notification(user, notif_title, notif_msg, notif_type=notif_type, link="/content")
    if user.email:
        try:
            send_mail(subject, body, django_settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=True)
        except Exception:
            pass



class ContentItemViewSet(viewsets.ModelViewSet):
    queryset = ContentItem.objects.select_related("author").all()
    serializer_class = ContentItemSerializer
    filterset_fields = ["type", "approved", "category"]
    search_fields = ["title", "description", "category"]
    ordering_fields = ["created_at", "title"]

    def get_permissions(self):
        if self.action in ["create"]:
            return [permissions.IsAuthenticated()]
        if self.action in ["approve", "reject", "destroy", "update", "partial_update"]:
            return [IsModeratorOrAbove()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.is_authenticated and user.role in {"moderator", "admin", "hub_leader", "super_admin"}:
            return qs
        return qs.filter(approved=True)

    def perform_create(self, serializer):
        serializer.save(author=self.request.user, approved=False)

    @action(detail=True, methods=["post"], permission_classes=[IsModeratorOrAbove])
    def approve(self, request, pk=None):
        item = self.get_object()
        item.approved = True
        item.save(update_fields=["approved"])
        log_action(request.user, "content.approve", "ContentItem", item.pk, detail=item.title)
        _send_content_notification(item, approved=True)
        return Response({"detail": "Content approved"})

    @action(detail=True, methods=["post"], permission_classes=[IsModeratorOrAbove])
    def reject(self, request, pk=None):
        item = self.get_object()
        reason = request.data.get("reason", "")
        item.approved = False
        item.save(update_fields=["approved"])
        log_action(request.user, "content.reject", "ContentItem", item.pk,
                   detail=f"{item.title} | reason: {reason}")
        _send_content_notification(item, approved=False, reason=reason)
        return Response({"detail": "Content rejected"})

    @action(detail=True, methods=["get"], permission_classes=[permissions.AllowAny])
    def share(self, request, pk=None):
        """Return share card data for a ContentItem."""
        item = self.get_object()
        if not item.approved:
            return Response({"detail": "Not shareable."}, status=404)
        frontend_url = getattr(django_settings, "FRONTEND_URL", "https://spiritrevivalafrica.com")
        photo_url = None
        if item.photo:
            photo_url = request.build_absolute_uri(item.photo.url) if request else None
        excerpt = (item.description[:200].rstrip() + "…") if len(item.description) > 200 else item.description
        return Response({
            "title": item.title,
            "excerpt": excerpt,
            "url": f"{frontend_url}/content",
            "photo_url": photo_url,
            "cta": f"Read more → {frontend_url}/content",
            "whatsapp_caption": (
                f"📖 *{item.title}*\n\n{excerpt}\n\n"
                f"Read the full article: {frontend_url}/content"
            ),
        })


class UserPhotoViewSet(viewsets.ModelViewSet):
    serializer_class = UserPhotoSerializer
    queryset = UserPhoto.objects.select_related("user").all()
    filterset_fields = ["approved"]
    search_fields = ["caption", "testimony", "user__email"]
    ordering_fields = ["uploaded_at"]

    def get_permissions(self):
        if self.action in ["create"]:
            return [permissions.IsAuthenticated()]
        if self.action in ["update", "partial_update", "destroy", "approve", "reject"]:
            return [IsModeratorOrAbove()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.is_authenticated and user.role in {"moderator", "admin", "hub_leader", "super_admin"}:
            approved = self.request.query_params.get("approved")
            if approved is None:
                return qs
            return qs.filter(approved=approved.lower() == "true")
        return qs.filter(approved=True)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=["post"], permission_classes=[IsModeratorOrAbove])
    def approve(self, request, pk=None):
        photo = self.get_object()
        photo.approved = True
        photo.save(update_fields=["approved"])
        return Response({"detail": "Photo approved"})

    @action(detail=True, methods=["post"], permission_classes=[IsModeratorOrAbove])
    def reject(self, request, pk=None):
        photo = self.get_object()
        photo.approved = False
        photo.save(update_fields=["approved"])
        return Response({"detail": "Photo rejected"})


# ── FetchedPhoto ──────────────────────────────────────────────────────────────


class FetchedPhotoViewSet(viewsets.ModelViewSet):
    """
    CRUD + approve/reject for auto-fetched worship photos.
    - Public: read approved only.
    - Moderators+: see all, approve / reject.
    """

    serializer_class = FetchedPhotoSerializer
    queryset = FetchedPhoto.objects.all()
    filterset_fields = ["approved", "source"]
    search_fields = ["alt_text", "photographer", "search_term"]
    ordering_fields = ["created_at"]

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [permissions.AllowAny()]
        return [IsModeratorOrAbove()]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.is_authenticated and user.role in {"moderator", "admin", "hub_leader", "super_admin"}:
            approved = self.request.query_params.get("approved")
            if approved is None:
                return qs
            return qs.filter(approved=approved.lower() == "true")
        return qs.filter(approved=True)

    @action(detail=True, methods=["post"], permission_classes=[IsModeratorOrAbove])
    def approve(self, request, pk=None):
        photo = self.get_object()
        photo.approved = True
        photo.save(update_fields=["approved"])
        return Response({"detail": "Photo approved"})

    @action(detail=True, methods=["post"], permission_classes=[IsModeratorOrAbove])
    def reject(self, request, pk=None):
        photo = self.get_object()
        photo.approved = False
        photo.save(update_fields=["approved"])
        return Response({"detail": "Photo rejected"})

    @action(detail=False, methods=["post"], permission_classes=[IsModeratorOrAbove])
    def bulk_approve(self, request):
        ids = request.data.get("ids", [])
        if not isinstance(ids, list):
            return Response({"detail": "ids must be a list"}, status=400)
        updated = FetchedPhoto.objects.filter(pk__in=ids).update(approved=True)
        return Response({"detail": f"{updated} photos approved"})

    @action(detail=False, methods=["post"], permission_classes=[IsModeratorOrAbove])
    def bulk_reject(self, request):
        ids = request.data.get("ids", [])
        if not isinstance(ids, list):
            return Response({"detail": "ids must be a list"}, status=400)
        updated = FetchedPhoto.objects.filter(pk__in=ids).update(approved=False)
        return Response({"detail": f"{updated} photos rejected"})


# ── Hero Collage ──────────────────────────────────────────────────────────────


def _build_hero_item(request, obj):
    """
    Convert a UserPhoto or FetchedPhoto into the unified HeroCollage shape.
    """
    if isinstance(obj, UserPhoto):
        image_url = obj.image.url if obj.image else ""
        if request and image_url:
            image_url = request.build_absolute_uri(image_url)
        return {
            "id": f"user-{obj.pk}",
            "image_url": image_url,
            "thumb_url": image_url,   # no separate thumb for user photos
            "alt_text": obj.caption or "Worship moment shared by a revival community member",
            "caption": obj.caption,
            "source": "user",
            "photographer": "",
            "photographer_url": "",
        }
    else:
        return {
            "id": f"fetched-{obj.pk}",
            "image_url": obj.image_url,
            "thumb_url": obj.thumb_url or obj.image_url,
            "alt_text": obj.alt_text or "Spirit Revival Africa worship photo",
            "caption": "",
            "source": obj.source,
            "photographer": obj.photographer,
            "photographer_url": obj.photographer_url,
        }


class HeroCollageView(APIView):
    """
    GET /api/hero-collage/
    Returns up to `limit` approved images (user-submitted + auto-fetched),
    randomised per request so the collage feels fresh on every load.

    Query params:
      limit  (int, default 24)  — max number of items to return
    """

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        limit = min(int(request.query_params.get("limit", 24)), 60)

        user_photos = list(
            UserPhoto.objects.filter(approved=True).order_by("-uploaded_at").values_list("pk", flat=True)[:limit]
        )
        fetched_photos = list(
            FetchedPhoto.objects.filter(approved=True).order_by("-created_at").values_list("pk", flat=True)[:limit]
        )

        user_objs = {p.pk: p for p in UserPhoto.objects.filter(pk__in=user_photos)}
        fetched_objs = {p.pk: p for p in FetchedPhoto.objects.filter(pk__in=fetched_photos)}

        combined = [_build_hero_item(request, user_objs[pk]) for pk in user_photos if pk in user_objs]
        combined += [_build_hero_item(request, fetched_objs[pk]) for pk in fetched_photos if pk in fetched_objs]

        # Shuffle for variety; cap at limit
        random.shuffle(combined)
        combined = combined[:limit]

        serializer = HeroCollageItemSerializer(combined, many=True)
        return Response({"results": serializer.data, "count": len(combined)})


class HeroCollageQueueView(APIView):
    """
    GET /api/hero-collage/queue/
    Returns pending (unapproved) photos for moderator review.
    """

    permission_classes = [IsModeratorOrAbove]

    def get(self, request):
        user_pending = list(UserPhoto.objects.filter(approved=False).select_related("user").order_by("uploaded_at"))
        fetched_pending = list(FetchedPhoto.objects.filter(approved=False).order_by("created_at"))

        user_items = [_build_hero_item(request, p) for p in user_pending]
        fetched_items = [_build_hero_item(request, p) for p in fetched_pending]

        # Enrich with raw type so the frontend knows which endpoint to call
        for item in user_items:
            item["type"] = "user"
        for item in fetched_items:
            item["type"] = "fetched"

        return Response({
            "user_pending": user_items,
            "fetched_pending": fetched_items,
            "total_pending": len(user_items) + len(fetched_items),
        })


class DailyBreadPublicView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        today = timezone.now().date()
        item = (
            DailyBread.objects.filter(is_active=True, display_date__lte=today)
            .order_by("-display_date", "-updated_at")
            .first()
        )
        if not item:
            return Response({"daily_bread": None})
        return Response({"daily_bread": DailyBreadSerializer(item, context={"request": request}).data})


class ShortStoryPublicListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        limit = min(int(request.query_params.get("limit", 3)), 10)
        now = timezone.now()
        items = ShortStory.objects.filter(
            is_published=True, published_at__lte=now, status=ShortStory.Status.APPROVED
        )[:limit]
        return Response({"results": ShortStorySerializer(items, many=True, context={"request": request}).data, "count": len(items)})


class ShortStoryPublicDetailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, story_id):
        now = timezone.now()
        story = (
            ShortStory.objects.filter(
                id=story_id, is_published=True, published_at__lte=now, status=ShortStory.Status.APPROVED
            )
            .order_by("-published_at")
            .first()
        )
        if not story:
            return Response({"detail": "Story not found"}, status=404)
        return Response({"story": ShortStorySerializer(story, context={"request": request}).data})


class ShortStorySubmitView(APIView):
    """
    POST /api/content/stories/submit/
    Authenticated users submit a testimony/story for admin review.
    It goes into PENDING status; admin approves before it goes live.
    """
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "content_submit"

    def post(self, request):
        title = request.data.get("title", "").strip()
        story = request.data.get("story", "").strip()
        author_name = (
            request.data.get("submitter_name", "").strip()
            or request.data.get("author_name", "").strip()
            or request.user.full_name
        )
        photo = request.FILES.get("photo")
        if not title or len(title) < 5:
            return Response({"detail": "Title must be at least 5 characters."}, status=400)
        if not story or len(story) < 50:
            return Response({"detail": "Story must be at least 50 characters."}, status=400)

        # Magic byte validation — reject files that claim to be images but aren't
        if photo:
            if photo.size > 5 * 1024 * 1024:
                return Response({"detail": "Image must be under 5 MB."}, status=400)
            header = photo.read(12)
            photo.seek(0)
            is_jpeg = header[:3] == b"\xff\xd8\xff"
            is_png  = header[:8] == b"\x89PNG\r\n\x1a\n"
            is_webp = header[:4] == b"RIFF" and header[8:12] == b"WEBP"
            if not (is_jpeg or is_png or is_webp):
                return Response({"detail": "Only JPEG, PNG, or WebP images are allowed."}, status=400)

        obj = ShortStory.objects.create(
            title=title,
            story=story,
            author_name=author_name,
            submitter=request.user,
            photo=photo,
            status=ShortStory.Status.PENDING,
            is_published=False,
        )
        log_action(request.user, "story.submit", "ShortStory", obj.pk, detail=title)
        return Response({"detail": "Story submitted for review.", "id": obj.pk}, status=201)

    def get(self, request):
        """Users can list their own submitted stories and see approval status."""
        stories = ShortStory.objects.filter(submitter=request.user).order_by("-created_at")
        data = [
            {
                "id": s.pk,
                "title": s.title,
                "status": s.status,
                "rejection_reason": s.rejection_reason,
                "created_at": s.created_at,
            }
            for s in stories
        ]
        return Response({"results": data})


class ShortStoryApproveView(APIView):
    """
    POST /api/content/stories/<id>/approve/
    POST /api/content/stories/<id>/reject/
    Moderator/admin actions — fire notification + log.
    """
    permission_classes = [IsModeratorOrAbove]

    def _get_story(self, story_id):
        try:
            return ShortStory.objects.get(pk=story_id)
        except ShortStory.DoesNotExist:
            return None

    def _notify_story(self, story, approved: bool, reason: str = "") -> None:
        user = story.submitter
        if not user:
            return
        if approved:
            notif_title = "Your story is live ✓"
            notif_msg = f'"{story.title}" has been approved and is now visible on the platform.'
            notif_type = "approved"
            subject = "Your story is live — Spirit Revival Africa"
            body = (
                f"Hi {user.first_name or 'there'},\n\n"
                f'Your testimony "{story.title}" has been approved and is now live.\n\n'
                f"Thank you for sharing what God has done. Your story will encourage others.\n\n"
                f"— Spirit Revival Africa"
            )
        else:
            notif_title = "Update on your story submission"
            notif_msg = (
                f'"{story.title}" was not approved.'
                + (f" Reason: {reason}" if reason else "")
            )
            notif_type = "rejected"
            subject = "Update on your story submission — Spirit Revival Africa"
            body = (
                f"Hi {user.first_name or 'there'},\n\n"
                f'Your story "{story.title}" could not be approved at this time.\n'
                + (f"Reason: {reason}\n\n" if reason else "\n")
                + "You're welcome to revise and resubmit.\n\n— Spirit Revival Africa"
            )
        send_notification(user, notif_title, notif_msg, notif_type=notif_type)
        if user.email:
            try:
                send_mail(subject, body, django_settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=True)
            except Exception:
                pass

    def post(self, request, story_id, action_type):
        story = self._get_story(story_id)
        if not story:
            return Response({"detail": "Story not found."}, status=404)

        if action_type == "approve":
            story.status = ShortStory.Status.APPROVED
            story.rejection_reason = ""
            story.is_published = True
            story.reviewed_by = request.user
            story.reviewed_at = timezone.now()
            story.save(update_fields=["status", "rejection_reason", "is_published", "reviewed_by", "reviewed_at"])
            log_action(request.user, "story.approve", "ShortStory", story.pk, detail=story.title)
            self._notify_story(story, approved=True)
            return Response({"detail": "Story approved and is now live."})
        elif action_type == "reject":
            reason = request.data.get("reason", "").strip()
            if not reason:
                return Response({"detail": "A rejection_reason is required."}, status=400)
            story.status = ShortStory.Status.REJECTED
            story.rejection_reason = reason
            story.is_published = False
            story.reviewed_by = request.user
            story.reviewed_at = timezone.now()
            story.save(update_fields=["status", "rejection_reason", "is_published", "reviewed_by", "reviewed_at"])
            log_action(request.user, "story.reject", "ShortStory", story.pk, detail=f"{story.title} | {reason}")
            self._notify_story(story, approved=False, reason=reason)
            return Response({"detail": "Story rejected. User notified."})
        return Response({"detail": "Invalid action."}, status=400)


class ShortStoryEditView(APIView):
    """
    PATCH /api/content/stories/<id>/edit/
    Owner can edit their own PENDING or REJECTED story. Editing resets status to PENDING.
    Approved stories are locked — return 403.
    """
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, story_id):
        try:
            story = ShortStory.objects.get(pk=story_id, submitter=request.user)
        except ShortStory.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)

        if story.status == ShortStory.Status.APPROVED:
            return Response(
                {"detail": "Approved stories are locked. Contact support to request an edit."},
                status=403,
            )

        title = request.data.get("title", "").strip()
        story_text = request.data.get("story", "").strip()
        author_name = request.data.get("author_name", "").strip()
        photo = request.FILES.get("photo")

        if title and len(title) < 5:
            return Response({"detail": "Title must be at least 5 characters."}, status=400)
        if story_text and len(story_text) < 50:
            return Response({"detail": "Story must be at least 50 characters."}, status=400)

        update_fields = ["status", "reviewed_by", "reviewed_at", "rejection_reason"]
        if title:
            story.title = title
            update_fields.append("title")
        if story_text:
            story.story = story_text
            update_fields.append("story")
        if author_name:
            story.author_name = author_name
            update_fields.append("author_name")
        if photo:
            if photo.size > 5 * 1024 * 1024:
                return Response({"detail": "Image must be under 5 MB."}, status=400)
            header = photo.read(12)
            photo.seek(0)
            is_jpeg = header[:3] == b"\xff\xd8\xff"
            is_png  = header[:8] == b"\x89PNG\r\n\x1a\n"
            is_webp = header[:4] == b"RIFF" and header[8:12] == b"WEBP"
            if not (is_jpeg or is_png or is_webp):
                return Response({"detail": "Only JPEG, PNG, or WebP images are allowed."}, status=400)
            story.photo = photo
            update_fields.append("photo")

        story.status = ShortStory.Status.PENDING
        story.reviewed_by = None
        story.reviewed_at = None
        story.rejection_reason = ""
        story.save(update_fields=update_fields)
        log_action(request.user, "story.edit", "ShortStory", story.pk, detail=story.title)
        return Response({"detail": "Story updated and returned to review.", "id": story.pk})


class StoryShareView(APIView):
    """GET /api/content/stories/<id>/share/ — public share card data."""
    permission_classes = [permissions.AllowAny]

    def get(self, request, story_id):
        try:
            story = ShortStory.objects.get(pk=story_id, status=ShortStory.Status.APPROVED, is_published=True)
        except ShortStory.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)
        frontend_url = getattr(django_settings, "FRONTEND_URL", "https://spiritrevivalafrica.com")
        story_url = f"{frontend_url}/stories/{story_id}"
        hook = (story.story[:120].rstrip() + "…") if len(story.story) > 120 else story.story
        excerpt = (story.story[:200].rstrip() + "…") if len(story.story) > 200 else story.story
        photo_url = None
        if story.photo:
            photo_url = request.build_absolute_uri(story.photo.url)
        cta_text = f"🔥 Join the movement → {frontend_url}"
        return Response({
            "title": f"{story.title} — Spirit Revival Africa",
            "excerpt": excerpt,
            "url": story_url,
            "share_url": f"/stories/{story_id}",
            "photo_url": photo_url,
            "cta": cta_text,
            "whatsapp_caption": (
                f"✨ *{story.title}*\n\n"
                f"{hook}\n\n"
                f"{cta_text}\n"
                f"Read the full story: {story_url}"
            ),
        })



class DailyBreadShareView(APIView):
    """GET /api/content/daily-bread/share/ — public share card for today's Daily Bread."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        today = timezone.now().date()
        try:
            bread = (
                DailyBread.objects.filter(is_active=True, display_date__lte=today)
                .order_by("-display_date")
                .first()
            )
            if not bread:
                return Response({"detail": "No Daily Bread available."}, status=404)
        except DailyBread.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)

        frontend_url = getattr(django_settings, "FRONTEND_URL", "https://spiritrevivalafrica.com")
        photo_url = None
        if bread.photo:
            photo_url = request.build_absolute_uri(bread.photo.url)

        verse = bread.verse_text or ""
        hook = (verse[:160].rstrip() + "…") if len(verse) > 160 else verse
        excerpt = (
            f'"{hook}" — {bread.verse_reference} ({bread.bible_version})'
        )
        reflection_line = f"\n\n💭 {bread.reflection.strip()}" if bread.reflection else ""
        whatsapp_caption = (
            f"📖 *Daily Bread — Spirit Revival Africa*\n\n"
            f"_{bread.verse_reference} ({bread.bible_version})_\n\n"
            f'"{hook}"'
            f"{reflection_line}\n\n"
            f"👉 Join the movement:\n{frontend_url}"
        )
        return Response({
            "title": f"Daily Bread — {bread.verse_reference}",
            "excerpt": excerpt,
            "url": frontend_url,
            "photo_url": photo_url,
            "cta": f"🔥 Join the movement → {frontend_url}",
            "whatsapp_caption": whatsapp_caption,
        })


class GalleryPublicListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        media_type = request.query_params.get("type")  # ?type=photo  or  ?type=video
        qs = GalleryItem.objects.filter(approved=True)
        if media_type in ("photo", "video"):
            qs = qs.filter(media_type=media_type)
        serializer = GalleryItemSerializer(qs, many=True, context={"request": request})
        return Response({"results": serializer.data})


class HomeFeedView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        today = timezone.now().date()
        now = timezone.now()
        stories_limit = min(int(request.query_params.get("stories_limit", 3)), 10)

        daily_bread = (
            DailyBread.objects.filter(is_active=True, display_date__lte=today)
            .order_by("-display_date", "-updated_at")
            .first()
        )
        stories = ShortStory.objects.filter(
            is_published=True, published_at__lte=now, status=ShortStory.Status.APPROVED
        )[:stories_limit]

        return Response(
            {
                "daily_bread": DailyBreadSerializer(daily_bread, context={"request": request}).data if daily_bread else None,
                "stories": ShortStorySerializer(stories, many=True, context={"request": request}).data,
                "stories_count": len(stories),
            }
        )
