from django.contrib import admin

from apps.discipleship.models import Course, Lesson, UserLessonProgress


class LessonInline(admin.TabularInline):
    model = Lesson
    extra = 1
    fields = ("order", "title", "video_url", "pdf_material")
    ordering = ("order",)
    show_change_link = True


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "lesson_count", "created_at")
    list_filter = ("created_at",)
    search_fields = ("title", "description")
    readonly_fields = ("created_at",)
    ordering = ("-created_at",)
    date_hierarchy = "created_at"
    inlines = [LessonInline]
    fieldsets = (
        ("Course Info", {"fields": ("title", "description")}),
        ("Metadata", {"fields": ("created_at",), "classes": ("collapse",)}),
    )

    @admin.display(description="Lessons")
    def lesson_count(self, obj):
        return obj.lessons.count()


@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = ("id", "course", "order", "title", "has_video", "has_pdf")
    list_filter = ("course",)
    search_fields = ("title", "description", "course__title")
    ordering = ("course", "order")
    raw_id_fields = ("course",)
    fieldsets = (
        ("Lesson Info", {"fields": ("course", "order", "title", "description")}),
        ("Media", {"fields": ("video_url", "pdf_material")}),
    )

    @admin.display(description="Video", boolean=True)
    def has_video(self, obj):
        return bool(obj.video_url)

    @admin.display(description="PDF", boolean=True)
    def has_pdf(self, obj):
        return bool(obj.pdf_material)


@admin.register(UserLessonProgress)
class UserLessonProgressAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "lesson", "completed", "completed_at")
    list_filter = ("completed", "lesson__course")
    search_fields = ("user__email", "user__username", "lesson__title", "lesson__course__title")
    readonly_fields = ("user", "lesson", "completed", "completed_at")
    ordering = ("-completed_at",)
    fieldsets = (
        ("Progress", {"fields": ("user", "lesson", "completed", "completed_at")}),
    )

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser
