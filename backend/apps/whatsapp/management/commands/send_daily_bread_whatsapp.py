"""
Management command: send_daily_bread_whatsapp

Fetches today's DailyBread and sends it to all opted-in WhatsApp contacts.
Run at 7:00 AM daily via cron.

Cron example (cPanel):
    0 7 * * * /path/to/python /path/to/manage.py send_daily_bread_whatsapp

Note: Contacts who just joined today (sequence_day=0) receive the welcome
message instead. To avoid double-messaging them, we skip contacts whose
last_interaction_at was in the last 6 hours.
"""
import logging

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.content.models import DailyBread
from apps.whatsapp.models import WhatsAppContact, WhatsAppDeliveryMetric, WhatsAppMessage
from apps.whatsapp.sender import WhatsAppSendError, WhatsAppSender

logger = logging.getLogger(__name__)

_DAILY_BREAD_PREAMBLE = (
    "🌅 *Daily Bread — Spirit Revival Africa*\n"
    "━━━━━━━━━━━━━━━━━━━━━━\n"
)
_DAILY_BREAD_FOOTER = (
    "\n━━━━━━━━━━━━━━━━━━━━━━\n"
    "Reply *PRAY* for prayer | *STORY* for testimonies | *STOP* to unsubscribe"
)


def _build_message(bread: DailyBread) -> str:
    lines = [
        _DAILY_BREAD_PREAMBLE,
        f"📖 *{bread.verse_reference}*\n",
        f'_{bread.verse_text}_\n',
    ]
    if bread.reflection:
        lines.append(f"\n💭 *Reflection:*\n{bread.reflection}\n")
    lines.append(_DAILY_BREAD_FOOTER)
    return "".join(lines)


class Command(BaseCommand):
    help = "Send today's Daily Bread to all opted-in WhatsApp contacts."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Print what would be sent without actually sending.",
        )
        parser.add_argument(
            "--date",
            type=str,
            default=None,
            help="Override the date (YYYY-MM-DD). Defaults to today.",
        )

    def handle(self, *args, **options):
        from datetime import date

        dry_run = options["dry_run"]
        target_date = options["date"]

        if target_date:
            try:
                target = date.fromisoformat(target_date)
            except ValueError:
                self.stderr.write(self.style.ERROR(f"Invalid date: {target_date}. Use YYYY-MM-DD."))
                return
        else:
            target = timezone.now().date()

        # Fetch today's daily bread
        try:
            bread = DailyBread.objects.get(display_date=target, is_active=True)
        except DailyBread.DoesNotExist:
            self.stderr.write(self.style.WARNING(f"No active DailyBread found for {target}. Skipping."))
            return

        message_text = _build_message(bread)

        if dry_run:
            self.stdout.write(f"[DRY RUN] Would send to opted-in contacts:\n{message_text[:300]}…")

        contacts = WhatsAppContact.objects.filter(is_opted_in=True)

        # Skip contacts who were messaged in the last 6 hours (e.g., just joined today)
        from django.utils.timezone import now
        from datetime import timedelta
        recent_cutoff = now() - timedelta(hours=6)
        contacts = contacts.exclude(last_interaction_at__gte=recent_cutoff)

        total = contacts.count()
        self.stdout.write(f"Sending Daily Bread for {target} to {total} contacts…")

        sent = failed = 0
        for contact in contacts:
            if dry_run:
                self.stdout.write(f"  [DRY RUN] → {contact.phone_number}")
                sent += 1
                continue

            try:
                msg_id = WhatsAppSender.send(contact.phone_number, message_text)
                WhatsAppMessage.objects.create(
                    contact=contact,
                    direction="outbound",
                    message_type="daily_bread",
                    body=message_text,
                    provider_message_id=msg_id,
                    status="sent",
                )
                sent += 1
            except WhatsAppSendError as exc:
                logger.error("Daily bread send failed for %s: %s", contact.phone_number, exc)
                WhatsAppMessage.objects.create(
                    contact=contact,
                    direction="outbound",
                    message_type="daily_bread",
                    body=message_text,
                    status="failed",
                    error_message=str(exc),
                )
                failed += 1

        # Update metrics
        if not dry_run and (sent or failed):
            today_date = timezone.now().date()
            metric, _ = WhatsAppDeliveryMetric.objects.get_or_create(date=today_date)
            metric.messages_sent += sent
            metric.failed += failed
            metric.save(update_fields=["messages_sent", "failed"])

        self.stdout.write(
            self.style.SUCCESS(
                f"Daily Bread {target}: {sent} sent, {failed} failed."
            )
        )
