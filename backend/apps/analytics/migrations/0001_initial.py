"""Initial migration for the analytics app — creates ShareEvent table."""
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="ShareEvent",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("content_type", models.CharField(
                    choices=[("story", "Story"), ("prayer", "Prayer")],
                    db_index=True,
                    max_length=20,
                )),
                ("object_id", models.PositiveIntegerField(db_index=True)),
                ("platform", models.CharField(
                    choices=[
                        ("whatsapp", "WhatsApp"),
                        ("twitter", "Twitter"),
                        ("facebook", "Facebook"),
                        ("copy", "Copy"),
                        ("native", "Native Share"),
                    ],
                    max_length=20,
                )),
                ("ip_address", models.GenericIPAddressField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("user", models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="share_events",
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.AddIndex(
            model_name="shareevent",
            index=models.Index(fields=["content_type", "object_id"], name="analytics_ct_obj_idx"),
        ),
        migrations.AddIndex(
            model_name="shareevent",
            index=models.Index(fields=["created_at"], name="analytics_created_idx"),
        ),
    ]
