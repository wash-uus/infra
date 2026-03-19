from rest_framework import serializers

from apps.messaging.models import DirectMessage, GroupMessage

_ALLOWED_AUDIO = (".mp3", ".wav", ".m4a", ".ogg", ".webm")


def _validate_audio(value):
    if not value:
        return value
    if not value.name.lower().endswith(_ALLOWED_AUDIO):
        raise serializers.ValidationError("Unsupported audio format. Allowed: mp3, wav, m4a, ogg, webm.")
    return value


class DirectMessageSerializer(serializers.ModelSerializer):
    sender_email = serializers.ReadOnlyField(source="sender.email")
    sender_name = serializers.SerializerMethodField()
    receiver_email = serializers.ReadOnlyField(source="receiver.email")
    receiver_name = serializers.SerializerMethodField()

    class Meta:
        model = DirectMessage
        fields = [
            "id",
            "sender",
            "sender_email",
            "sender_name",
            "receiver",
            "receiver_email",
            "receiver_name",
            "text",
            "audio_file",
            "timestamp",
            "is_read",
            "is_deleted",
        ]
        read_only_fields = ["id", "sender", "sender_email", "sender_name",
                            "receiver_email", "receiver_name", "timestamp", "is_deleted"]

    def get_sender_name(self, obj):
        u = obj.sender
        return getattr(u, "full_name", None) or u.email.split("@")[0]

    def get_receiver_name(self, obj):
        u = obj.receiver
        return getattr(u, "full_name", None) or u.email.split("@")[0]

    def validate_audio_file(self, value):
        return _validate_audio(value)


class GroupMessageSerializer(serializers.ModelSerializer):
    sender_email = serializers.ReadOnlyField(source="sender.email")
    sender_name = serializers.SerializerMethodField()

    class Meta:
        model = GroupMessage
        fields = [
            "id",
            "sender",
            "sender_email",
            "sender_name",
            "group",
            "text",
            "audio_file",
            "timestamp",
            "is_deleted",
        ]
        read_only_fields = ["id", "sender", "sender_email", "sender_name", "timestamp", "is_deleted"]

    def get_sender_name(self, obj):
        u = obj.sender
        return getattr(u, "full_name", None) or u.email.split("@")[0]

    def validate_audio_file(self, value):
        return _validate_audio(value)
