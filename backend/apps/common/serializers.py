from rest_framework import serializers
from .models import Announcement, AuditLog, Notification, ContentReview, AppealRequest


class AnnouncementSerializer(serializers.ModelSerializer):
    created_by_email = serializers.ReadOnlyField(source="created_by.email")

    class Meta:
        model = Announcement
        fields = ["id", "title", "body", "priority", "expires_at", "created_at", "created_by_email"]
        read_only_fields = fields


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ["id", "notif_type", "title", "message", "is_read", "link", "created_at"]
        read_only_fields = ["id", "notif_type", "title", "message", "link", "created_at"]


class AuditLogSerializer(serializers.ModelSerializer):
    actor_email = serializers.CharField(source="actor.email", default=None, read_only=True)
    actor_role = serializers.CharField(source="actor.role", default=None, read_only=True)

    class Meta:
        model = AuditLog
        fields = ["id", "actor_email", "actor_role", "action", "target_model",
                  "target_id", "detail", "ip_address", "created_at"]


class ContentReviewSerializer(serializers.ModelSerializer):
    submitter_email = serializers.CharField(source="submitter.email", default=None, read_only=True)
    reviewer_email = serializers.CharField(source="reviewer.email", default=None, read_only=True)

    class Meta:
        model = ContentReview
        fields = ["id", "target_type", "target_id", "submitter_email", "reviewer_email",
                  "status", "reason", "created_at", "reviewed_at"]
        read_only_fields = ["id", "submitter_email", "reviewer_email", "created_at"]


class ReviewActionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=["approve", "reject"])
    reason = serializers.CharField(required=False, allow_blank=True)


class AppealRequestSerializer(serializers.ModelSerializer):
    appellant_email = serializers.CharField(source="appellant.email", read_only=True)

    class Meta:
        model = AppealRequest
        fields = ["id", "appellant_email", "review", "reason", "status",
                  "admin_note", "created_at", "resolved_at"]
        read_only_fields = ["id", "appellant_email", "status", "admin_note",
                            "created_at", "resolved_at"]
