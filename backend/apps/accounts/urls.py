from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from apps.accounts.views import (
    AdminStatsView,
    EmailLoginView,
    HubLeaderStatsView,
    MemberDashboardView,
    ModeratorStatsView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    ProfileView,
    RegisterView,
    SuperAdminStatsView,
    UserDetailView,
    UserListView,
    VerifyEmailView,
    promote_user_role,
    reactivate_user,
    site_statistics,
    suspend_user,
)

urlpatterns = [
    # Auth
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", EmailLoginView.as_view(), name="login"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("verify-email/", VerifyEmailView.as_view(), name="verify_email"),
    path("password-reset/", PasswordResetRequestView.as_view(), name="password_reset"),
    path("password-reset/confirm/", PasswordResetConfirmView.as_view(), name="password_reset_confirm"),

    # Profile
    path("profile/", ProfileView.as_view(), name="profile"),

    # Role dashboards
    path("dashboard/me/", MemberDashboardView.as_view(), name="member_dashboard"),
    path("moderator/stats/", ModeratorStatsView.as_view(), name="moderator_stats"),
    path("hub-leader/stats/", HubLeaderStatsView.as_view(), name="hub_leader_stats"),
    path("admin/stats/", AdminStatsView.as_view(), name="admin_stats"),
    path("superadmin/stats/", SuperAdminStatsView.as_view(), name="superadmin_stats"),

    # User management (admin+)
    path("users/", UserListView.as_view(), name="user_list"),
    path("users/<int:pk>/", UserDetailView.as_view(), name="user_detail"),
    path("users/<int:user_id>/promote/", promote_user_role, name="promote_user"),
    path("users/<int:user_id>/suspend/", suspend_user, name="suspend_user"),
    path("users/<int:user_id>/reactivate/", reactivate_user, name="reactivate_user"),

    # Legacy compat
    path("site-stats/", site_statistics, name="site_statistics"),
]
