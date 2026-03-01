from rest_framework.routers import DefaultRouter

from apps.discipleship.views import CourseViewSet, LessonViewSet, UserLessonProgressViewSet

router = DefaultRouter()
router.register("courses", CourseViewSet, basename="course")
router.register("lessons", LessonViewSet, basename="lesson")
router.register("progress", UserLessonProgressViewSet, basename="lesson-progress")

urlpatterns = router.urls
