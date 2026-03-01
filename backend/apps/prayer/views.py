from django.db.models import F
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.prayer.models import PrayerRequest
from apps.prayer.serializers import PrayerRequestSerializer


class PrayerRequestViewSet(viewsets.ModelViewSet):
    serializer_class = PrayerRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    search_fields = ["title", "description"]

    def get_queryset(self):
        user = self.request.user
        return PrayerRequest.objects.filter(is_public=True) | PrayerRequest.objects.filter(user=user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def prayed(self, request, pk=None):
        prayer = self.get_object()
        if request.user not in prayer.prayed_by.all():
            prayer.prayed_by.add(request.user)
            PrayerRequest.objects.filter(pk=prayer.pk).update(prayer_count=F("prayer_count") + 1)
            prayer.refresh_from_db(fields=["prayer_count"])
        return Response({"prayer_count": prayer.prayer_count})
