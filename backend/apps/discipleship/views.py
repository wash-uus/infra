from django.utils import timezone
from rest_framework import permissions, viewsets

from apps.accounts.permissions import IsModeratorOrAbove
from apps.discipleship.models import Course, Lesson, UserLessonProgress
from apps.discipleship.serializers import CourseSerializer, LessonSerializer, UserLessonProgressSerializer


class CourseViewSet(viewsets.ModelViewSet):
    queryset = Course.objects.prefetch_related("lessons").all()
    serializer_class = CourseSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    search_fields = ["title", "description"]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsModeratorOrAbove()]
        return super().get_permissions()


class LessonViewSet(viewsets.ModelViewSet):
    queryset = Lesson.objects.select_related("course").all()
    serializer_class = LessonSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filterset_fields = ["course"]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsModeratorOrAbove()]
        return super().get_permissions()


class UserLessonProgressViewSet(viewsets.ModelViewSet):
    serializer_class = UserLessonProgressSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserLessonProgress.objects.filter(user=self.request.user).select_related("lesson")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user, completed_at=timezone.now() if serializer.validated_data.get("completed") else None)

    def perform_update(self, serializer):
        completed = serializer.validated_data.get("completed", serializer.instance.completed)
        serializer.save(completed_at=timezone.now() if completed else None)
