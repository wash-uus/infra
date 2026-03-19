"""
Migration: Polling refactor.
- Adds GroupMessageReadReceipt (per-user last-read tracking for groups).
- Adds db_index to DirectMessage.timestamp and GroupMessage.timestamp.
- Adds composite index on DirectMessage(receiver, is_read) for fast unread counts.
- Changes ordering of both message tables from -timestamp to +timestamp
  (ascending — better for polling / append-only display).
- Removes is_read from GroupMessage (group reads now tracked via receipt table).
"""
import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("messaging", "0002_add_is_deleted"),
        ("groups", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # 1. Add db_index to DirectMessage.timestamp
        migrations.AlterField(
            model_name="directmessage",
            name="timestamp",
            field=models.DateTimeField(auto_now_add=True, db_index=True),
        ),
        # 2. Add db_index to DirectMessage.is_read
        migrations.AlterField(
            model_name="directmessage",
            name="is_read",
            field=models.BooleanField(default=False, db_index=True),
        ),
        # 3. Add composite index on DirectMessage(receiver, is_read)
        migrations.AddIndex(
            model_name="directmessage",
            index=models.Index(fields=["receiver", "is_read"], name="dm_receiver_is_read_idx"),
        ),
        # 4. Change DirectMessage ordering to ascending timestamp
        migrations.AlterModelOptions(
            name="directmessage",
            options={"ordering": ["timestamp"]},
        ),
        # 5. Add db_index to GroupMessage.timestamp
        migrations.AlterField(
            model_name="groupmessage",
            name="timestamp",
            field=models.DateTimeField(auto_now_add=True, db_index=True),
        ),
        # 6. Remove is_read from GroupMessage (replaced by GroupMessageReadReceipt)
        migrations.RemoveField(
            model_name="groupmessage",
            name="is_read",
        ),
        # 7. Add composite index on GroupMessage(group, sender, timestamp)
        migrations.AddIndex(
            model_name="groupmessage",
            index=models.Index(
                fields=["group", "sender", "timestamp"],
                name="gm_group_sender_ts_idx",
            ),
        ),
        # 8. Change GroupMessage ordering to ascending timestamp
        migrations.AlterModelOptions(
            name="groupmessage",
            options={"ordering": ["timestamp"]},
        ),
        # 9. Create GroupMessageReadReceipt
        migrations.CreateModel(
            name="GroupMessageReadReceipt",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True, primary_key=True, serialize=False, verbose_name="ID"
                    ),
                ),
                (
                    "last_read_at",
                    models.DateTimeField(default=django.utils.timezone.now),
                ),
                (
                    "group",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="read_receipts",
                        to="groups.revivalgroup",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="group_read_receipts",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "unique_together": {("user", "group")},
            },
        ),
        migrations.AddIndex(
            model_name="groupmessagereadreceipt",
            index=models.Index(
                fields=["user", "group"], name="gmrr_user_group_idx"
            ),
        ),
    ]
