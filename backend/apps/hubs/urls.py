from rest_framework.routers import DefaultRouter

from apps.hubs.views import RevivalHubViewSet

router = DefaultRouter()
router.register("", RevivalHubViewSet, basename="hub")

urlpatterns = router.urls
