from django.urls import path

from apps.messaging.consumers import DirectMessageConsumer, GroupMessageConsumer

websocket_urlpatterns = [
    path("ws/messages/direct/<int:user_id>/", DirectMessageConsumer.as_asgi()),
    path("ws/messages/group/<int:group_id>/", GroupMessageConsumer.as_asgi()),
]
