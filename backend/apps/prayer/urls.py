from rest_framework.routers import DefaultRouter

from apps.prayer.views import PrayerRequestViewSet

router = DefaultRouter()
router.register("requests", PrayerRequestViewSet, basename="prayer-request")

urlpatterns = router.urls
