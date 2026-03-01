from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("content", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="UserPhoto",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("image", models.ImageField(upload_to="user-photos/")),
                ("caption", models.CharField(blank=True, max_length=220)),
                ("testimony", models.TextField(blank=True)),
                ("approved", models.BooleanField(default=False)),
                ("uploaded_at", models.DateTimeField(auto_now_add=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="user_photos",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-uploaded_at"],
            },
        ),
        migrations.AddIndex(
            model_name="userphoto",
            index=models.Index(fields=["approved"], name="ct_uph_approved_idx"),
        ),
        migrations.AddIndex(
            model_name="userphoto",
            index=models.Index(fields=["uploaded_at"], name="ct_uph_uploaded_idx"),
        ),
    ]
