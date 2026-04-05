from rest_framework.routers import DefaultRouter
from django.urls import path

from apps.content.views import (
	ContentItemViewSet,
	DailyBreadPublicView,
	DailyBreadShareView,
	GalleryPublicListView,
	HomeFeedView,
	ShortStoryApproveView,
	ShortStoryEditView,
	ShortStoryPublicDetailView,
	ShortStoryPublicListView,
	ShortStorySubmitView,
	StoryShareView,
)

router = DefaultRouter()
router.register("items", ContentItemViewSet, basename="content-item")

urlpatterns = router.urls
urlpatterns += [
	path("daily-bread/", DailyBreadPublicView.as_view(), name="daily-bread"),
	path("daily-bread/share/", DailyBreadShareView.as_view(), name="daily-bread-share"),
	path("short-stories/", ShortStoryPublicListView.as_view(), name="short-stories"),
	path("short-stories/<int:story_id>/", ShortStoryPublicDetailView.as_view(), name="short-story-detail"),
	path("short-stories/<int:story_id>/share/", StoryShareView.as_view(), name="short-story-share"),
	path("stories/submit/", ShortStorySubmitView.as_view(), name="story-submit"),
	path("stories/<int:story_id>/edit/", ShortStoryEditView.as_view(), name="story-edit"),
	path("stories/<int:story_id>/<str:action_type>/", ShortStoryApproveView.as_view(), name="story-moderate"),
	path("home-feed/", HomeFeedView.as_view(), name="home-feed"),
	path("gallery/", GalleryPublicListView.as_view(), name="gallery"),
]
