from django.urls import path

from .views import ClaimReferralView, TrackShareView, TrendingView

urlpatterns = [
    path("share/", TrackShareView.as_view(), name="analytics-share"),
    path("trending/", TrendingView.as_view(), name="analytics-trending"),
    path("claim-referral/", ClaimReferralView.as_view(), name="analytics-claim-referral"),
]
