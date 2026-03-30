from django.urls import path

from apps.accounts.views import (
    AdminStatsView,
    ChangePasswordView,
    EmailLoginView,
    GoogleAuthView,
    HubLeaderStatsView,
    MemberDashboardView,
    ModeratorStatsView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    PendingApprovalsView,
    ProfileView,
    RegisterView,
    SRATokenRefreshView,
    SuperAdminStatsView,
    UserDetailView,
    UserListView,
    UserSearchView,
    VerifyEmailView,
    approve_user,
    reject_user,
    promote_user_role,
    reactivate_user,
    site_statistics,
    suspend_user,
    admin_send_message,
    admin_broadcast_message,
)

urlpatterns = [
    # Auth
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", EmailLoginView.as_view(), name="login"),
    path("auth/google/", GoogleAuthView.as_view(), name="google_auth"),
    path("token/refresh/", SRATokenRefreshView.as_view(), name="token_refresh"),
    path("verify-email/", VerifyEmailView.as_view(), name="verify_email"),
    path("password-reset/", PasswordResetRequestView.as_view(), name="password_reset"),
    path("password-reset/confirm/", PasswordResetConfirmView.as_view(), name="password_reset_confirm"),

    # Profile
    path("profile/", ProfileView.as_view(), name="profile"),
    path("change-password/", ChangePasswordView.as_view(), name="change_password"),

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
    path("users/search/", UserSearchView.as_view(), name="user_search"),

    # Account approval (admin+)
    path("users/pending-approval/", PendingApprovalsView.as_view(), name="pending_approvals"),
    path("users/<int:user_id>/approve/", approve_user, name="approve_user"),
    path("users/<int:user_id>/reject/", reject_user, name="reject_user"),

    # Admin messaging
    path("admin/message-user/<int:user_id>/", admin_send_message, name="admin_send_message"),
    path("admin/broadcast/", admin_broadcast_message, name="admin_broadcast"),

    # Legacy compat
    path("site-stats/", site_statistics, name="site_statistics"),
]
