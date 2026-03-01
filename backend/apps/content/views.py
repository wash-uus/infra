import random

from django.db.models import Q
from django.utils import timezone
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsModeratorOrAbove
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
        serializer.save(author=self.request.user)

    @action(detail=True, methods=["post"], permission_classes=[IsModeratorOrAbove])
    def approve(self, request, pk=None):
        item = self.get_object()
        item.approved = True
        item.save(update_fields=["approved"])
        return Response({"detail": "Content approved"})

    @action(detail=True, methods=["post"], permission_classes=[IsModeratorOrAbove])
    def reject(self, request, pk=None):
        item = self.get_object()
        item.approved = False
        item.save(update_fields=["approved"])
        return Response({"detail": "Content rejected"})


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
        items = ShortStory.objects.filter(is_published=True, published_at__lte=now)[:limit]
        return Response({"results": ShortStorySerializer(items, many=True, context={"request": request}).data, "count": len(items)})


class ShortStoryPublicDetailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, story_id):
        now = timezone.now()
        story = (
            ShortStory.objects.filter(id=story_id, is_published=True, published_at__lte=now)
            .order_by("-published_at")
            .first()
        )
        if not story:
            return Response({"detail": "Story not found"}, status=404)
        return Response({"story": ShortStorySerializer(story, context={"request": request}).data})


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
        stories = ShortStory.objects.filter(is_published=True, published_at__lte=now)[:stories_limit]

        return Response(
            {
                "daily_bread": DailyBreadSerializer(daily_bread, context={"request": request}).data if daily_bread else None,
                "stories": ShortStorySerializer(stories, many=True, context={"request": request}).data,
                "stories_count": len(stories),
            }
        )
