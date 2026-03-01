from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.content.views import (
    FetchedPhotoViewSet,
    HeroCollageQueueView,
    HeroCollageView,
    UserPhotoViewSet,
)

router = DefaultRouter()
router.register("user-photos", UserPhotoViewSet, basename="user-photo")
router.register("fetched-photos", FetchedPhotoViewSet, basename="fetched-photo")

urlpatterns = [
    path("hero-collage/", HeroCollageView.as_view(), name="hero-collage"),
    path("hero-collage/queue/", HeroCollageQueueView.as_view(), name="hero-collage-queue"),
    *router.urls,
]
