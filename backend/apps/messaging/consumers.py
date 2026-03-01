import json

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer

from apps.messaging.models import DirectMessage, GroupMessage
from apps.groups.models import GroupMembership


class DirectMessageConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.other_user_id = self.scope["url_route"]["kwargs"]["user_id"]
        self.room_group_name = f"direct_{min(self.scope['user'].id, self.other_user_id)}_{max(self.scope['user'].id, self.other_user_id)}"

        if self.scope["user"].is_anonymous:
            await self.close()
            return

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        user = self.scope["user"]
        data = json.loads(text_data)
        msg_type = data.get("type", "message")

        if msg_type == "typing":
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "typing_indicator",
                    "sender_id": user.id,
                    "sender_name": await self.get_display_name(user),
                },
            )
            return

        message = data.get("text", "")
        if not message.strip():
            return
        msg_id = await self.save_direct_message(message)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "chat_message",
                "id": msg_id,
                "message": message,
                "sender": user.id,
                "sender_email": user.email,
                "receiver": self.other_user_id,
            },
        )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps(event))

    async def typing_indicator(self, event):
        await self.send(text_data=json.dumps(event))

    @database_sync_to_async
    def save_direct_message(self, message):
        msg = DirectMessage.objects.create(
            sender=self.scope["user"],
            receiver_id=self.other_user_id,
            text=message,
        )
        return msg.id

    @database_sync_to_async
    def get_display_name(self, user):
        return (user.full_name or user.email.split("@")[0]) if user else "Someone"


class GroupMessageConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.group_id = self.scope["url_route"]["kwargs"]["group_id"]
        self.room_group_name = f"group_{self.group_id}"

        user = self.scope["user"]
        if user.is_anonymous:
            await self.close()
            return

        if not await self.is_group_member(user, self.group_id):
            await self.close(4403)
            return

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        user = self.scope["user"]
        if not await self.is_group_member(user, self.group_id):
            await self.close(4403)
            return

        data = json.loads(text_data)
        msg_type = data.get("type", "message")

        if msg_type == "typing":
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "typing_indicator",
                    "sender_id": user.id,
                    "sender_name": await self.get_display_name(user),
                },
            )
            return

        message = data.get("text", "")
        if not message.strip():
            return
        msg_id = await self.save_message(message)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "group_chat_message",
                "id": msg_id,
                "message": message,
                "sender": user.id,
                "sender_email": user.email,
                "group": self.group_id,
            },
        )

    async def group_chat_message(self, event):
        await self.send(text_data=json.dumps(event))

    async def typing_indicator(self, event):
        await self.send(text_data=json.dumps(event))

    @database_sync_to_async
    def is_group_member(self, user, group_id):
        return GroupMembership.objects.filter(user=user, group_id=group_id).exists()

    @database_sync_to_async
    def save_message(self, message):
        msg = GroupMessage.objects.create(
            sender=self.scope["user"],
            group_id=self.group_id,
            text=message,
        )
        return msg.id

    @database_sync_to_async
    def get_display_name(self, user):
        return (user.full_name or user.email.split("@")[0]) if user else "Someone"
