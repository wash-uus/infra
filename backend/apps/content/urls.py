from rest_framework.routers import DefaultRouter
from django.urls import path

from apps.content.views import (
	ContentItemViewSet,
	DailyBreadPublicView,
	GalleryPublicListView,
	HomeFeedView,
	ShortStoryPublicDetailView,
	ShortStoryPublicListView,
)

router = DefaultRouter()
router.register("items", ContentItemViewSet, basename="content-item")

urlpatterns = router.urls
urlpatterns += [
	path("daily-bread/", DailyBreadPublicView.as_view(), name="daily-bread"),
	path("short-stories/", ShortStoryPublicListView.as_view(), name="short-stories"),
	path("short-stories/<int:story_id>/", ShortStoryPublicDetailView.as_view(), name="short-story-detail"),
	path("home-feed/", HomeFeedView.as_view(), name="home-feed"),
	path("gallery/", GalleryPublicListView.as_view(), name="gallery"),
]
