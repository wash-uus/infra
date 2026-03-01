from django.core.management.base import BaseCommand
from django.utils.text import slugify

from apps.groups.models import RevivalGroup


class Command(BaseCommand):
    help = "Seed default revival groups"

    def handle(self, *args, **options):
        defaults = [
            "Youths",
            "Women",
            "Worshippers",
            "Preachers",
            "Instrumentalists",
            "Church Workers",
            "Intercessors",
            "Discipleship",
        ]

        for name in defaults:
            group, created = RevivalGroup.objects.get_or_create(
                slug=slugify(name),
                defaults={"name": name, "description": f"{name} group", "privacy": RevivalGroup.Privacy.PUBLIC},
            )
            status = "Created" if created else "Exists"
            self.stdout.write(self.style.SUCCESS(f"{status}: {group.name}"))
