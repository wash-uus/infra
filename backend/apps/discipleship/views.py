from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

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

    def get_serializer_context(self):
        return {"request": self.request}

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def enroll(self, request, pk=None):
        """Mark user as enrolled (creates progress stubs for all lessons)."""
        course = self.get_object()
        created = 0
        for lesson in course.lessons.all():
            _, new = UserLessonProgress.objects.get_or_create(
                user=request.user, lesson=lesson
            )
            if new:
                created += 1
        return Response({"detail": f"Enrolled. {created} lesson(s) initialised."})


class LessonViewSet(viewsets.ModelViewSet):
    queryset = Lesson.objects.select_related("course").all()
    serializer_class = LessonSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filterset_fields = ["course"]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsModeratorOrAbove()]
        return super().get_permissions()

    def get_serializer_context(self):
        return {"request": self.request}


class UserLessonProgressViewSet(viewsets.ModelViewSet):
    serializer_class = UserLessonProgressSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserLessonProgress.objects.filter(user=self.request.user).select_related("lesson")

    def perform_create(self, serializer):
        serializer.save(
            user=self.request.user,
            completed_at=timezone.now() if serializer.validated_data.get("completed") else None,
        )

    def perform_update(self, serializer):
        completed = serializer.validated_data.get("completed", serializer.instance.completed)
        serializer.save(completed_at=timezone.now() if completed else None)

    @action(detail=False, methods=["post"], url_path="mark-complete")
    def mark_complete(self, request):
        """POST {lesson: <id>} to mark a lesson complete for the current user."""
        lesson_id = request.data.get("lesson")
        if not lesson_id:
            return Response({"detail": "lesson field is required."}, status=400)
        progress, _ = UserLessonProgress.objects.get_or_create(
            user=request.user,
            lesson_id=lesson_id,
        )
        if not progress.completed:
            progress.completed = True
            progress.completed_at = timezone.now()
            progress.save(update_fields=["completed", "completed_at"])
        return Response({"detail": "Lesson marked complete.", "completed_at": progress.completed_at})
