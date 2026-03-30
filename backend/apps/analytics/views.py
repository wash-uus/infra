from datetime import timedelta

from django.db.models import Count
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.content.models import ShortStory
from apps.prayer.models import PrayerRequest

from .models import ShareEvent
from .serializers import TrackShareSerializer


def _client_ip(request):
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    return xff.split(",")[0].strip() if xff else request.META.get("REMOTE_ADDR")


class TrackShareView(APIView):
    """
    POST /api/analytics/share/
    Stores a ShareEvent. Never 500s — returns {"ok": false} on bad data.
    No authentication required.
    """
    permission_classes = [AllowAny]
    throttle_classes = []  # don't rate-limit analytics

    def post(self, request):
        ser = TrackShareSerializer(data=request.data)
        if not ser.is_valid():
            return Response({"ok": False, "errors": ser.errors}, status=status.HTTP_400_BAD_REQUEST)
        ShareEvent.objects.create(
            user=request.user if request.user.is_authenticated else None,
            content_type=ser.validated_data["content_type"],
            object_id=ser.validated_data["object_id"],
            platform=ser.validated_data["platform"],
            ip_address=_client_ip(request),
        )
        return Response({"ok": True}, status=status.HTTP_201_CREATED)


class TrendingView(APIView):
    """
    GET /api/analytics/trending/
    Returns top shared content in the last 48 hours.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        cutoff = timezone.now() - timedelta(hours=48)
        top = (
            ShareEvent.objects
            .filter(created_at__gte=cutoff)
            .values("content_type", "object_id")
            .annotate(share_count=Count("id"))
            .order_by("-share_count")[:8]
        )
        result = []
        for item in top:
            entry = {
                "content_type": item["content_type"],
                "object_id": item["object_id"],
                "share_count": item["share_count"],
            }
            if item["content_type"] == "story":
                try:
                    story = ShortStory.objects.get(
                        pk=item["object_id"],
                        status=ShortStory.Status.APPROVED,
                        is_published=True,
                    )
                    entry.update({
                        "title": story.title,
                        "excerpt": (story.story or "")[:120].strip(),
                        "link": f"/stories/{story.pk}",
                        "author": story.author_name or "Spirit Revival Africa",
                    })
                except ShortStory.DoesNotExist:
                    continue
            elif item["content_type"] == "prayer":
                try:
                    prayer = PrayerRequest.objects.get(
                        pk=item["object_id"],
                        status=PrayerRequest.Status.APPROVED,
                        is_public=True,
                    )
                    entry.update({
                        "title": prayer.title,
                        "excerpt": (prayer.description or "")[:120].strip(),
                        "link": "/prayer",
                        "author": getattr(prayer, "author_name", None) or "Anonymous",
                    })
                except PrayerRequest.DoesNotExist:
                    continue
            else:
                continue
            result.append(entry)
        return Response(result)


class ClaimReferralView(APIView):
    """
    POST /api/analytics/claim-referral/
    Called once after login if localStorage holds a ?ref= value.
    Sets referred_by on the current user if not already set.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        ref_id = request.data.get("ref")
        if not ref_id:
            return Response({"ok": False}, status=status.HTTP_400_BAD_REQUEST)
        user = request.user
        if getattr(user, "referred_by_id", None):
            return Response({"ok": False, "detail": "Referral already set."})
        try:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            referrer = User.objects.get(pk=int(ref_id))
            if referrer.pk != user.pk:
                user.referred_by = referrer
                user.save(update_fields=["referred_by"])
        except Exception:
            pass  # silent fail — invalid ref id or field missing
        return Response({"ok": True})
