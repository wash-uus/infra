"""Adds referred_by self-FK to User for the viral referral loop."""
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0003_add_approval_and_join_requests"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="referred_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="referrals",
                to="accounts.user",
                help_text="User who referred this account via a share link.",
            ),
        ),
    ]
