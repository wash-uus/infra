from django.db import migrations


WHATSAPP_LINK = "https://chat.whatsapp.com/JvLtB2Kgbeq4qNR6oEQgKy?mode=gi_t"


def set_whatsapp_link(apps, schema_editor):
    WorshipTeam = apps.get_model("worship", "WorshipTeam")
    WorshipTeam.objects.filter(name="Shouts of Joy Melodies").update(whatsapp_link=WHATSAPP_LINK)


def unset_whatsapp_link(apps, schema_editor):
    WorshipTeam = apps.get_model("worship", "WorshipTeam")
    WorshipTeam.objects.filter(name="Shouts of Joy Melodies").update(whatsapp_link="")


class Migration(migrations.Migration):

    dependencies = [
        ("worship", "0005_seed_facebook_link"),
    ]

    operations = [
        migrations.RunPython(set_whatsapp_link, reverse_code=unset_whatsapp_link),
    ]
