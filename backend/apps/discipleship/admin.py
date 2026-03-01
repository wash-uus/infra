from django.contrib import admin

from apps.discipleship.models import Course, Lesson, UserLessonProgress


class LessonInline(admin.TabularInline):
    model = Lesson
    extra = 1
    fields = ("order", "title", "video_url", "pdf_material")
    ordering = ("order",)


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "lesson_count", "created_at")
    search_fields = ("title", "description")
    readonly_fields = ("created_at",)
    ordering = ("title",)
    inlines = [LessonInline]

    @admin.display(description="Lessons")
    def lesson_count(self, obj):
        return obj.lessons.count()


@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = ("id", "course", "order", "title", "has_video", "has_pdf")
    list_filter = ("course",)
    search_fields = ("title", "description", "course__title")
    ordering = ("course", "order")

    @admin.display(description="Video", boolean=True)
    def has_video(self, obj):
        return bool(obj.video_url)

    @admin.display(description="PDF", boolean=True)
    def has_pdf(self, obj):
        return bool(obj.pdf_material)


@admin.register(UserLessonProgress)
class UserLessonProgressAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "lesson", "completed", "completed_at")
    list_filter = ("completed",)
    search_fields = ("user__email", "lesson__title")
    readonly_fields = ("completed_at",)
    raw_id_fields = ("user", "lesson")
    ordering = ("-completed_at",)
