from django.db.models import F, Q
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from apps.prayer.models import PrayerRequest
from apps.prayer.serializers import PrayerRequestSerializer


class PrayerRequestViewSet(viewsets.ModelViewSet):
    serializer_class = PrayerRequestSerializer
    search_fields = ["title", "description"]

    def get_permissions(self):
        """Allow unauthenticated list/retrieve; require auth for create/update/delete/pray."""
        if self.action in ["list", "retrieve"]:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated:
            return PrayerRequest.objects.filter(
                Q(is_public=True) | Q(user=user)
            ).select_related("user")
        return PrayerRequest.objects.filter(is_public=True).select_related("user")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def _check_owner(self, instance):
        if instance.user_id != self.request.user.id:
            raise PermissionDenied("You can only modify your own prayer requests.")

    def perform_update(self, serializer):
        self._check_owner(serializer.instance)
        serializer.save()

    def perform_destroy(self, instance):
        self._check_owner(instance)
        instance.delete()

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def prayed(self, request, pk=None):
        prayer = self.get_object()
        if request.user not in prayer.prayed_by.all():
            prayer.prayed_by.add(request.user)
            PrayerRequest.objects.filter(pk=prayer.pk).update(prayer_count=F("prayer_count") + 1)
            prayer.refresh_from_db(fields=["prayer_count"])
        return Response({"prayer_count": prayer.prayer_count})
