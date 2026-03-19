"""
WebSocket URL routing — STUB.

WebSockets are disabled while the project runs on WSGI (Truehost cPanel).
This file is preserved so consumers can be re-wired with minimal effort
when migrating to an ASGI host.

To re-enable:
  from django.urls import path
  from apps.messaging.consumers import DirectMessageConsumer, GroupMessageConsumer

  websocket_urlpatterns = [
      path("ws/messages/direct/<int:user_id>/", DirectMessageConsumer.as_asgi()),
      path("ws/messages/group/<int:group_id>/",  GroupMessageConsumer.as_asgi()),
  ]
"""

websocket_urlpatterns = []
