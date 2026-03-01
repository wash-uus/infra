from rest_framework import serializers

from apps.messaging.models import DirectMessage, GroupMessage


class DirectMessageSerializer(serializers.ModelSerializer):
    sender_email = serializers.ReadOnlyField(source="sender.email")

    class Meta:
        model = DirectMessage
        fields = [
            "id",
            "sender",
            "sender_email",
            "receiver",
            "text",
            "audio_file",
            "timestamp",
            "is_read",
        ]
        read_only_fields = ["id", "sender", "timestamp"]

    def validate_audio_file(self, value):
        if not value:
            return value
        name = value.name.lower()
        if not (name.endswith(".mp3") or name.endswith(".wav") or name.endswith(".m4a")):
            raise serializers.ValidationError("Unsupported audio format")
        return value


class GroupMessageSerializer(serializers.ModelSerializer):
    sender_email = serializers.ReadOnlyField(source="sender.email")

    class Meta:
        model = GroupMessage
        fields = ["id", "sender", "sender_email", "group", "text", "audio_file", "timestamp", "is_read"]
        read_only_fields = ["id", "sender", "timestamp"]

    def validate_audio_file(self, value):
        if not value:
            return value
        name = value.name.lower()
        if not (name.endswith(".mp3") or name.endswith(".wav") or name.endswith(".m4a")):
            raise serializers.ValidationError("Unsupported audio format")
        return value
