"""
Management command: seed_prayers
Seeds 5 real starter prayer requests as approved public prayers
so the prayer wall never appears empty on launch.

Usage:
    python manage.py seed_prayers
    python manage.py seed_prayers --force   # re-seed even if entries already exist
"""

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.prayer.models import PrayerRequest

User = get_user_model()

SEED_PRAYERS = [
    {
        "title": "Revival fire across Africa",
        "description": (
            "Lord, let the fire of the Holy Spirit fall on every nation in Africa. "
            "Open blind eyes, unstop deaf ears, and raise up a generation that carries "
            "the flame of revival from Cape to Cairo. Let no city, no village be left untouched."
        ),
        "author_name": "Spirit Revival Africa",
    },
    {
        "title": "Healing and restoration for broken families",
        "description": (
            "Father God, we lift up every broken home represented on this platform. "
            "Where there is divorce, bring reconciliation. Where there is estrangement, "
            "bring reunion. Let the spirit of Elijah turn the hearts of fathers to their "
            "children and children to their fathers across this continent."
        ),
        "author_name": "Intercession Team",
    },
    {
        "title": "Breakthrough for those facing financial hardship",
        "description": (
            "Jehovah Jireh, we stand in agreement for every believer struggling with "
            "unemployment, debt, and poverty. Open doors that no man can shut. "
            "Release supernatural provision and let every hand that gives sacrificially "
            "to Your kingdom receive a hundredfold return."
        ),
        "author_name": "Faith Community",
    },
    {
        "title": "Protection and courage for persecuted believers",
        "description": (
            "Lord Jesus, we remember our brothers and sisters who face persecution for "
            "their faith. Strengthen them with inner power. Let no weapon formed against "
            "them prosper. Give them boldness to preach and a peace that surpasses understanding "
            "even in the hardest places."
        ),
        "author_name": "Global Intercession",
    },
    {
        "title": "Salvation for the lost — especially the youth",
        "description": (
            "Holy Spirit, we cry out for the youth of Africa. A generation drowning in "
            "confusion, addiction, and hopelessness. Draw them with your love. "
            "Send workers into the harvest. Let every prodigal come home. "
            "Let this platform be a gateway where encounter with You becomes salvation."
        ),
        "author_name": "Youth Revival Network",
    },
]


class Command(BaseCommand):
    help = "Seed 5 approved starter prayer requests for the prayer wall"

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Re-seed even if seed prayers already exist",
        )

    def handle(self, *args, **options):
        force = options["force"]

        # Find or create a system admin user to be the author
        admin = User.objects.filter(is_superuser=True).first()
        if not admin:
            self.stderr.write("No superuser found. Create a superuser first: python manage.py createsuperuser")
            return

        # Check if already seeded
        if not force and PrayerRequest.objects.filter(user=admin).count() >= len(SEED_PRAYERS):
            self.stdout.write(self.style.WARNING(
                f"Seed prayers already exist ({len(SEED_PRAYERS)} found). Use --force to re-seed."
            ))
            return

        created_count = 0
        for item in SEED_PRAYERS:
            _, created = PrayerRequest.objects.get_or_create(
                title=item["title"],
                user=admin,
                defaults={
                    "description": item["description"],
                    "is_public": True,
                    "status": PrayerRequest.Status.APPROVED,
                    "reviewed_by": admin,
                    "reviewed_at": timezone.now(),
                    "prayer_count": 0,
                },
            )
            if created:
                created_count += 1

        self.stdout.write(self.style.SUCCESS(
            f"Done. {created_count} seed prayer(s) created."
        ))
