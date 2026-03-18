from rest_framework import serializers

from apps.discipleship.models import Course, Lesson, UserLessonProgress


class LessonSerializer(serializers.ModelSerializer):
    completed = serializers.SerializerMethodField()

    def get_completed(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return UserLessonProgress.objects.filter(
                user=request.user, lesson=obj, completed=True
            ).exists()
        return False

    class Meta:
        model = Lesson
        fields = ["id", "course", "title", "description", "video_url", "pdf_material",
                  "order", "completed"]


class CourseSerializer(serializers.ModelSerializer):
    lessons = LessonSerializer(many=True, read_only=True)
    completed_lessons = serializers.SerializerMethodField()
    total_lessons = serializers.SerializerMethodField()

    def get_completed_lessons(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return UserLessonProgress.objects.filter(
                user=request.user, lesson__course=obj, completed=True
            ).count()
        return 0

    def get_total_lessons(self, obj):
        return obj.lessons.count()

    class Meta:
        model = Course
        fields = ["id", "title", "description", "created_at", "lessons",
                  "completed_lessons", "total_lessons"]


class UserLessonProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserLessonProgress
        fields = ["id", "user", "lesson", "completed", "completed_at"]
        read_only_fields = ["id", "user", "completed_at"]
