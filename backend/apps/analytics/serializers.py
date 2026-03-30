from rest_framework import serializers

from .models import ShareEvent


class TrackShareSerializer(serializers.Serializer):
    content_type = serializers.ChoiceField(choices=ShareEvent.ContentKind.choices)
    object_id = serializers.IntegerField(min_value=0)
    platform = serializers.ChoiceField(choices=ShareEvent.Platform.choices)
