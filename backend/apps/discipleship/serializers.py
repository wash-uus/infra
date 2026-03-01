from rest_framework import serializers

from apps.discipleship.models import Course, Lesson, UserLessonProgress


class LessonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lesson
        fields = ["id", "course", "title", "description", "video_url", "pdf_material", "order"]


class CourseSerializer(serializers.ModelSerializer):
    lessons = LessonSerializer(many=True, read_only=True)

    class Meta:
        model = Course
        fields = ["id", "title", "description", "created_at", "lessons"]


class UserLessonProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserLessonProgress
        fields = ["id", "user", "lesson", "completed", "completed_at"]
        read_only_fields = ["id", "user", "completed_at"]
