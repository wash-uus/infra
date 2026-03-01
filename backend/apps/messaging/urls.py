from rest_framework.routers import DefaultRouter

from apps.messaging.views import DirectMessageViewSet, GroupMessageViewSet

router = DefaultRouter()
router.register("direct", DirectMessageViewSet, basename="direct-message")
router.register("group", GroupMessageViewSet, basename="group-message")

urlpatterns = router.urls
