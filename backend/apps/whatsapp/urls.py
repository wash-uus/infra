from django.urls import path

from .views import (
    WhatsAppBroadcastView,
    WhatsAppContactsView,
    WhatsAppStatsView,
    WhatsAppWebhookView,
)

app_name = "whatsapp"

urlpatterns = [
    path("webhook/", WhatsAppWebhookView.as_view(), name="webhook"),
    path("broadcast/", WhatsAppBroadcastView.as_view(), name="broadcast"),
    path("stats/", WhatsAppStatsView.as_view(), name="stats"),
    path("contacts/", WhatsAppContactsView.as_view(), name="contacts"),
]
