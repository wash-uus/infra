"""
Role hierarchy:
  member < moderator/hub_leader < admin < super_admin

Permission classes used on DRF views via permission_classes=[...].
"""
from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsRole(BasePermission):
    """Base: user must be authenticated with one of allowed_roles."""
    allowed_roles: set = set()

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in self.allowed_roles
        )


# ── concrete role gates ───────────────────────────────────────────────────────

class IsMember(IsRole):
    allowed_roles = {"member", "moderator", "hub_leader", "admin", "super_admin"}


class IsModerator(IsRole):
    allowed_roles = {"moderator"}


class IsHubLeader(IsRole):
    allowed_roles = {"hub_leader"}


class IsModeratorOrAbove(IsRole):
    allowed_roles = {"moderator", "admin", "hub_leader", "super_admin"}


class IsAdminOrAbove(IsRole):
    allowed_roles = {"admin", "super_admin"}


class IsSuperAdmin(IsRole):
    allowed_roles = {"super_admin"}


# ── compound helpers ──────────────────────────────────────────────────────────

class IsModeratorOrHubLeader(IsRole):
    allowed_roles = {"moderator", "hub_leader", "admin", "super_admin"}


class IsOwnerOrAdminOrAbove(BasePermission):
    """Object-level: owner of the object OR admin/super_admin."""
    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.role in {"admin", "super_admin"}:
            return True
        return getattr(obj, "user", None) == request.user or getattr(obj, "author", None) == request.user
