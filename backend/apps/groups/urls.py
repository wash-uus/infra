from rest_framework.routers import DefaultRouter

from apps.groups.views import RevivalGroupViewSet

router = DefaultRouter()
router.register("", RevivalGroupViewSet, basename="revival-group")

urlpatterns = router.urls
