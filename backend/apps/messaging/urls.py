from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.messaging.views import DirectMessageViewSet, GroupMessageViewSet, UnreadCountView

router = DefaultRouter()
router.register("direct", DirectMessageViewSet, basename="direct-message")
router.register("group", GroupMessageViewSet, basename="group-message")

urlpatterns = router.urls + [
    path("unread-count/", UnreadCountView.as_view(), name="messaging-unread-count"),
]
