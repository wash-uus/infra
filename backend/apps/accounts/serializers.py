from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core import signing
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
import json

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    ministry_areas = serializers.ListField(
        child=serializers.CharField(), required=False, allow_empty=True
    )

    class Meta:
        model = User
        fields = [
            "id", "username", "email", "role",
            "email_verified", "full_name", "phone", "gender",
            "bio", "country", "city",
            "born_again", "year_of_salvation", "church_name",
            "denomination", "serves_in_church", "ministry_areas", "testimony",
            "why_join", "unity_agreement", "statement_of_faith",
            "code_of_conduct", "subscribe_scripture",
            "membership_type", "led_ministry_before", "leadership_experience",
            "profile_picture", "date_joined", "is_active",
        ]
        read_only_fields = ["id", "role", "email_verified", "date_joined", "is_active"]

    def to_internal_value(self, data):
        mutable = data.copy()
        ministry = mutable.get("ministry_areas")
        if isinstance(ministry, str):
            try:
                mutable["ministry_areas"] = json.loads(ministry)
            except json.JSONDecodeError:
                mutable["ministry_areas"] = []
        return super().to_internal_value(mutable)


class AdminUserSerializer(serializers.ModelSerializer):
    """Full user data for admin/super_admin views."""
    class Meta:
        model = User
        fields = [
            "id", "username", "email", "role",
            "email_verified", "full_name", "phone", "gender",
            "bio", "country", "city",
            "born_again", "year_of_salvation", "church_name",
            "denomination", "serves_in_church", "ministry_areas", "testimony",
            "why_join", "unity_agreement", "statement_of_faith",
            "code_of_conduct", "subscribe_scripture",
            "membership_type", "led_ministry_before", "leadership_experience",
            "profile_picture", "date_joined", "last_login",
            "is_active",
        ]
        read_only_fields = fields


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    full_name = serializers.CharField(required=False, allow_blank=True)
    phone = serializers.CharField(required=False, allow_blank=True)
    gender = serializers.CharField(required=False, allow_blank=True)
    spiritual_info = serializers.CharField(write_only=True, required=False)
    alignment = serializers.CharField(write_only=True, required=False)
    leadership_interest = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = [
            "username", "email", "password",
            "full_name", "phone", "gender",
            "bio", "country", "city", "profile_picture",
            "spiritual_info", "alignment", "leadership_interest",
        ]

    @staticmethod
    def _parse_blob(value):
        if not value:
            return {}
        if isinstance(value, dict):
            return value
        try:
            return json.loads(value)
        except (TypeError, json.JSONDecodeError):
            return {}

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        spiritual = self._parse_blob(validated_data.pop("spiritual_info", None))
        alignment = self._parse_blob(validated_data.pop("alignment", None))
        leadership = self._parse_blob(validated_data.pop("leadership_interest", None))

        password = validated_data.pop("password")

        validated_data["born_again"] = spiritual.get("born_again", "")
        year = spiritual.get("year_of_salvation")
        validated_data["year_of_salvation"] = int(year) if str(year).isdigit() else None
        validated_data["church_name"] = spiritual.get("church_name", "")
        validated_data["denomination"] = spiritual.get("denomination", "")
        validated_data["serves_in_church"] = spiritual.get("serves_in_church", "")
        validated_data["ministry_areas"] = spiritual.get("ministry_areas", []) or []
        validated_data["testimony"] = spiritual.get("testimony", "")

        validated_data["why_join"] = alignment.get("why_join", "")
        validated_data["unity_agreement"] = bool(alignment.get("unity_agreement", False))
        validated_data["statement_of_faith"] = bool(alignment.get("statement_of_faith", False))
        validated_data["code_of_conduct"] = bool(alignment.get("code_of_conduct", False))
        validated_data["subscribe_scripture"] = bool(alignment.get("subscribe_scripture", True))

        validated_data["membership_type"] = leadership.get("membership_type", "member")
        validated_data["led_ministry_before"] = leadership.get("led_ministry_before", "")
        validated_data["leadership_experience"] = leadership.get("leadership_experience", "")

        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = "email"

    def validate(self, attrs):
        from django.conf import settings as django_settings
        data = super().validate(attrs)
        # Skip email verification gate in development so all existing users can log in freely.
        if not django_settings.DEBUG and not self.user.email_verified:
            raise serializers.ValidationError(
                {"detail": "Please verify your email address before logging in. Check your inbox for the verification link."}
            )
        return data

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        token["email"] = user.email
        return token


class EmailVerificationSerializer(serializers.Serializer):
    token = serializers.CharField()

    def validate_token(self, value):
        try:
            payload = signing.loads(value, max_age=60 * 60 * 24)
        except Exception as exc:
            raise serializers.ValidationError("Invalid or expired token") from exc
        if "user_id" not in payload:
            raise serializers.ValidationError("Malformed verification token")
        return value
