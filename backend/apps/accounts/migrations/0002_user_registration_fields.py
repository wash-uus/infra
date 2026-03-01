from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="full_name",
            field=models.CharField(blank=True, max_length=140),
        ),
        migrations.AddField(
            model_name="user",
            name="phone",
            field=models.CharField(blank=True, max_length=32),
        ),
        migrations.AddField(
            model_name="user",
            name="gender",
            field=models.CharField(
                blank=True,
                choices=[
                    ("male", "Male"),
                    ("female", "Female"),
                    ("prefer_not_to_say", "Prefer not to say"),
                ],
                max_length=24,
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="born_again",
            field=models.CharField(
                blank=True,
                choices=[("yes", "Yes"), ("no", "No")],
                max_length=8,
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="year_of_salvation",
            field=models.PositiveSmallIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="user",
            name="church_name",
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AddField(
            model_name="user",
            name="denomination",
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AddField(
            model_name="user",
            name="serves_in_church",
            field=models.CharField(
                blank=True,
                choices=[("yes", "Yes"), ("no", "No")],
                max_length=8,
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="ministry_areas",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="user",
            name="testimony",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="user",
            name="why_join",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="user",
            name="unity_agreement",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="user",
            name="statement_of_faith",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="user",
            name="code_of_conduct",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="user",
            name="subscribe_scripture",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="user",
            name="membership_type",
            field=models.CharField(
                choices=[
                    ("member", "Member"),
                    ("digital_group", "Digital Group"),
                    ("revival_hub", "Revival Hub"),
                ],
                default="member",
                max_length=24,
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="led_ministry_before",
            field=models.CharField(
                blank=True,
                choices=[("yes", "Yes"), ("no", "No")],
                max_length=8,
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="leadership_experience",
            field=models.TextField(blank=True),
        ),
    ]
