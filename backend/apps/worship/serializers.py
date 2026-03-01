from rest_framework import serializers

from apps.worship.models import TeamJoinRequest, WorshipMember, WorshipTeam, WorshipTrack


class WorshipMemberSerializer(serializers.ModelSerializer):
    role_display = serializers.CharField(source="get_role_display", read_only=True)
    photo_url = serializers.SerializerMethodField()

    class Meta:
        model = WorshipMember
        fields = [
            "id",
            "display_name",
            "role",
            "role_display",
            "instrument",
            "bio",
            "photo",
            "photo_url",
            "order",
            "is_active",
            "joined_at",
        ]
        read_only_fields = ["id"]

    def get_photo_url(self, obj):
        request = self.context.get("request")
        if obj.photo and request:
            return request.build_absolute_uri(obj.photo.url)
        return None


class WorshipTrackSerializer(serializers.ModelSerializer):
    duration_display = serializers.CharField(read_only=True)
    cover_art_url = serializers.SerializerMethodField()
    audio_url = serializers.SerializerMethodField()
    featured_members = WorshipMemberSerializer(many=True, read_only=True)

    class Meta:
        model = WorshipTrack
        fields = [
            "id",
            "title",
            "description",
            "audio_file",
            "audio_url",
            "cover_art",
            "cover_art_url",
            "youtube_url",
            "released_at",
            "duration_seconds",
            "duration_display",
            "is_published",
            "play_count",
            "featured_members",
            "created_at",
        ]
        read_only_fields = ["id", "play_count", "created_at"]

    def get_cover_art_url(self, obj):
        request = self.context.get("request")
        if obj.cover_art and request:
            return request.build_absolute_uri(obj.cover_art.url)
        return None

    def get_audio_url(self, obj):
        request = self.context.get("request")
        if obj.audio_file and request:
            return request.build_absolute_uri(obj.audio_file.url)
        return None


class WorshipTeamSerializer(serializers.ModelSerializer):
    members = serializers.SerializerMethodField()
    tracks = serializers.SerializerMethodField()
    logo_url = serializers.SerializerMethodField()
    cover_photo_url = serializers.SerializerMethodField()
    vocalist_count = serializers.SerializerMethodField()
    instrumentalist_count = serializers.SerializerMethodField()

    class Meta:
        model = WorshipTeam
        fields = [
            "id",
            "name",
            "tagline",
            "description",
            "logo",
            "logo_url",
            "cover_photo",
            "cover_photo_url",
            "founded_year",
            "whatsapp_link",
            "facebook_link",
            "is_active",
            "vocalist_count",
            "instrumentalist_count",
            "members",
            "tracks",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def get_members(self, obj):
        qs = obj.members.filter(is_active=True)
        return WorshipMemberSerializer(qs, many=True, context=self.context).data

    def get_tracks(self, obj):
        qs = obj.tracks.filter(is_published=True)
        return WorshipTrackSerializer(qs, many=True, context=self.context).data

    def get_logo_url(self, obj):
        request = self.context.get("request")
        if obj.logo and request:
            return request.build_absolute_uri(obj.logo.url)
        return None

    def get_cover_photo_url(self, obj):
        request = self.context.get("request")
        if obj.cover_photo and request:
            return request.build_absolute_uri(obj.cover_photo.url)
        return None

    def get_vocalist_count(self, obj):
        return obj.members.filter(is_active=True, role=WorshipMember.Role.VOCALIST).count()

    def get_instrumentalist_count(self, obj):
        return obj.members.filter(is_active=True, role=WorshipMember.Role.INSTRUMENTALIST).count()


class TeamJoinRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeamJoinRequest
        fields = [
            "id",
            "team",
            "full_name",
            "email",
            "phone",
            "role",
            "instrument",
            "message",
            "status",
            "submitted_at",
        ]
        read_only_fields = ["id", "status", "submitted_at"]

    def validate(self, data):
        if data.get("role") == TeamJoinRequest.Role.INSTRUMENTALIST and not data.get("instrument"):
            raise serializers.ValidationError({"instrument": "Please specify your instrument."})
        return data
