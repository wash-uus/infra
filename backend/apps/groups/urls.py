from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.groups.views import (
    RevivalGroupViewSet,
    approve_join_request_view,
    reject_join_request_view,
    list_join_requests_view,
)

router = DefaultRouter()
router.register("", RevivalGroupViewSet, basename="revival-group")

urlpatterns = router.urls + [
    path("join-requests/", list_join_requests_view, name="group-join-requests"),
    path("join-requests/<int:req_id>/approve/", approve_join_request_view, name="group-join-approve"),
    path("join-requests/<int:req_id>/reject/", reject_join_request_view, name="group-join-reject"),
]
