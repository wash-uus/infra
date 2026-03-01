from rest_framework.routers import DefaultRouter

from apps.worship.views import (
    TeamJoinRequestViewSet,
    WorshipMemberViewSet,
    WorshipTeamViewSet,
    WorshipTrackViewSet,
)

router = DefaultRouter()
router.register("teams", WorshipTeamViewSet, basename="worship-team")
router.register("members", WorshipMemberViewSet, basename="worship-member")
router.register("tracks", WorshipTrackViewSet, basename="worship-track")
router.register("join", TeamJoinRequestViewSet, basename="worship-join")

urlpatterns = router.urls
