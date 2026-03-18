from django.urls import path
from .views import (
    AnnouncementPublicListView,
    NotificationListView,
    NotificationUnreadCountView,
    AuditLogListView,
    ContentReviewListView,
    ReviewActionView,
    AppealCreateView,
    AppealListView,
    AppealResolveView,
    PlatformStatsView,
)

urlpatterns = [
    path("platform-stats/", PlatformStatsView.as_view(), name="platform-stats"),
    path("announcements/", AnnouncementPublicListView.as_view(), name="announcements"),
    path("notifications/", NotificationListView.as_view(), name="notifications"),
    path("notifications/unread/", NotificationUnreadCountView.as_view(), name="notif-unread"),
    path("audit/", AuditLogListView.as_view(), name="audit-log"),
    path("reviews/", ContentReviewListView.as_view(), name="review-list"),
    path("reviews/<int:pk>/action/", ReviewActionView.as_view(), name="review-action"),
    path("appeals/", AppealListView.as_view(), name="appeal-list"),
    path("appeals/create/", AppealCreateView.as_view(), name="appeal-create"),
    path("appeals/<int:pk>/resolve/", AppealResolveView.as_view(), name="appeal-resolve"),
]
