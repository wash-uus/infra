from django.db import migrations


FACEBOOK_LINK = "https://www.facebook.com/groups/520384944033632/?ref=share&mibextid=NSMWBT"


def set_facebook_link(apps, schema_editor):
    WorshipTeam = apps.get_model("worship", "WorshipTeam")
    WorshipTeam.objects.filter(name="Shouts of Joy Melodies").update(facebook_link=FACEBOOK_LINK)


def unset_facebook_link(apps, schema_editor):
    WorshipTeam = apps.get_model("worship", "WorshipTeam")
    WorshipTeam.objects.filter(name="Shouts of Joy Melodies").update(facebook_link="")


class Migration(migrations.Migration):

    dependencies = [
        ("worship", "0004_facebook_link"),
    ]

    operations = [
        migrations.RunPython(set_facebook_link, reverse_code=unset_facebook_link),
    ]
