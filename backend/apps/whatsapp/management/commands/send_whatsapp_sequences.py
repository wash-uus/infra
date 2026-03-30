"""
Management command: send_whatsapp_sequences

Run once daily via cron to advance welcome sequences for all active contacts.
For each contact where sequence_day < 3 and not completed, sends the next
sequence message and increments sequence_day.

Cron example (cPanel):
    0 8 * * * /path/to/python /path/to/manage.py send_whatsapp_sequences

Or via cPanel Task Scheduler using the django management command format.
"""
import logging

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.whatsapp.models import WhatsAppContact, WhatsAppMessage
from apps.whatsapp.sender import WhatsAppSendError, WhatsAppSender
from apps.whatsapp.sequences import get_sequence_message

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Send the next welcome sequence message to opted-in contacts who haven't completed the sequence."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Print what would be sent without actually sending.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        # Contacts who: are opted in, haven't completed the sequence, and are past day 0
        # (Day 0 is sent immediately on JOIN; this command sends days 1, 2, 3)
        contacts = WhatsAppContact.objects.filter(
            is_opted_in=True,
            sequence_completed=False,
            sequence_day__gte=1,
            sequence_day__lte=3,
        )

        sent = failed = skipped = 0

        for contact in contacts:
            day = contact.sequence_day
            message_text = get_sequence_message(day, contact)
            if not message_text:
                skipped += 1
                continue

            if dry_run:
                self.stdout.write(
                    f"[DRY RUN] Day {day} → {contact.phone_number}: {message_text[:60]}…"
                )
                skipped += 1
                continue

            try:
                msg_id = WhatsAppSender.send(contact.phone_number, message_text)
                WhatsAppMessage.objects.create(
                    contact=contact,
                    direction="outbound",
                    message_type="welcome",
                    body=message_text,
                    provider_message_id=msg_id,
                    status="sent",
                )
                # Advance or complete the sequence
                if day >= 3:
                    contact.sequence_completed = True
                    contact.save(update_fields=["sequence_completed"])
                else:
                    contact.sequence_day = day + 1
                    contact.save(update_fields=["sequence_day"])
                sent += 1
                logger.info("Sequence day %d sent to %s", day, contact.phone_number)
            except WhatsAppSendError as exc:
                logger.error("Sequence send failed for %s: %s", contact.phone_number, exc)
                WhatsAppMessage.objects.create(
                    contact=contact,
                    direction="outbound",
                    message_type="welcome",
                    body=message_text,
                    status="failed",
                    error_message=str(exc),
                )
                failed += 1

        # Also advance sequence_day=0 contacts to day 1 (they received the webhook welcome)
        # so the cron will pick them up at day 1 next run.
        WhatsAppContact.objects.filter(
            is_opted_in=True,
            sequence_completed=False,
            sequence_day=0,
        ).update(sequence_day=1)

        self.stdout.write(
            self.style.SUCCESS(
                f"WhatsApp sequences: {sent} sent, {failed} failed, {skipped} skipped."
            )
        )
