"""
Management command: fetch_hero_photos
=====================================
Fetches worship/spirit-filled images from Pexels (primary) and Unsplash
(secondary) using configurable search terms, then stores them in the
``FetchedPhoto`` table with ``approved=False`` so admins can review before
they appear in the live hero collage.

Usage
-----
    # Fetch using all default terms (12 per term, both sources)
    python manage.py fetch_hero_photos

    # Custom search terms
    python manage.py fetch_hero_photos --terms "african choir" "holy spirit fire"

    # Limit per-term count
    python manage.py fetch_hero_photos --count 6

    # Preview only — don't write to DB
    python manage.py fetch_hero_photos --dry-run

Environment Variables
---------------------
    PEXELS_API_KEY      — required for Pexels queries
    UNSPLASH_ACCESS_KEY — required for Unsplash queries

If both keys are absent the command exits with a warning instead of an error,
so it can be called in CI / staging without keys configured.
"""

import logging
import os
import time

from django.core.management.base import BaseCommand

logger = logging.getLogger(__name__)

# ── Default search terms ──────────────────────────────────────────────────────
DEFAULT_TERMS = [
    "African worship",
    "praying hands",
    "Holy Spirit",
    "church praise Africa",
    "revival prayer",
    "gospel choir",
]

# ── Per-source orientation preference ────────────────────────────────────────
LANDSCAPE_ONLY = True   # hero images look best in landscape


# ---------------------------------------------------------------------------
# Source adapters
# ---------------------------------------------------------------------------

def _fetch_pexels(term, count, api_key):
    """
    Returns a list of dicts: {source_id, image_url, thumb_url, alt_text,
                               photographer, photographer_url, search_term}
    """
    import requests  # noqa: PLC0415

    url = "https://api.pexels.com/v1/search"
    headers = {"Authorization": api_key}
    params = {
        "query": term,
        "per_page": count,
        "orientation": "landscape" if LANDSCAPE_ONLY else "all",
    }

    try:
        resp = requests.get(url, headers=headers, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()
    except Exception as exc:
        logger.warning("Pexels fetch failed for term '%s': %s", term, exc)
        return []

    results = []
    for photo in data.get("photos", []):
        src = photo.get("src", {})
        results.append({
            "source_id": f"pexels-{photo['id']}",
            "image_url": src.get("large2x") or src.get("large") or src.get("original", ""),
            "thumb_url": src.get("medium") or src.get("small", ""),
            "alt_text": photo.get("alt", term),
            "photographer": photo.get("photographer", ""),
            "photographer_url": photo.get("photographer_url", ""),
            "search_term": term,
        })
    return results


def _fetch_unsplash(term, count, api_key):
    """
    Returns a list of dicts in the same shape as _fetch_pexels.
    Uses the Unsplash public-domain / free-to-use search endpoint.
    """
    import requests  # noqa: PLC0415

    url = "https://api.unsplash.com/search/photos"
    params = {
        "query": term,
        "per_page": count,
        "orientation": "landscape" if LANDSCAPE_ONLY else "all",
    }
    headers = {"Authorization": f"Client-ID {api_key}"}

    try:
        resp = requests.get(url, headers=headers, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()
    except Exception as exc:
        logger.warning("Unsplash fetch failed for term '%s': %s", term, exc)
        return []

    results = []
    for photo in data.get("results", []):
        urls = photo.get("urls", {})
        user = photo.get("user", {})
        results.append({
            "source_id": f"unsplash-{photo['id']}",
            "image_url": urls.get("full") or urls.get("regular", ""),
            "thumb_url": urls.get("small") or urls.get("thumb", ""),
            "alt_text": photo.get("alt_description") or photo.get("description") or term,
            "photographer": user.get("name", ""),
            "photographer_url": user.get("links", {}).get("html", ""),
            "search_term": term,
        })
    return results


# ---------------------------------------------------------------------------
# Command
# ---------------------------------------------------------------------------

class Command(BaseCommand):
    help = "Fetch worship images from Pexels / Unsplash for the hero collage."

    def add_arguments(self, parser):
        parser.add_argument(
            "--terms",
            nargs="+",
            default=DEFAULT_TERMS,
            metavar="TERM",
            help="Search terms to use (space-separated, quote multi-word terms).",
        )
        parser.add_argument(
            "--count",
            type=int,
            default=8,
            metavar="N",
            help="Number of images to fetch per search term (default: 8).",
        )
        parser.add_argument(
            "--sources",
            nargs="+",
            default=["pexels", "unsplash"],
            choices=["pexels", "unsplash"],
            metavar="SOURCE",
            help="Sources to query: pexels unsplash (default: both).",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Print results without writing to the database.",
        )
        parser.add_argument(
            "--approve-all",
            action="store_true",
            help="Mark fetched photos as approved immediately (skip moderation).",
        )

    def handle(self, *args, **options):
        from apps.content.models import FetchedPhoto  # noqa: PLC0415 — lazy import

        pexels_key = os.getenv("PEXELS_API_KEY", "")
        unsplash_key = os.getenv("UNSPLASH_ACCESS_KEY", "")

        sources = options["sources"]
        if "pexels" in sources and not pexels_key:
            self.stdout.write(self.style.WARNING("PEXELS_API_KEY not set — skipping Pexels."))
            sources = [s for s in sources if s != "pexels"]
        if "unsplash" in sources and not unsplash_key:
            self.stdout.write(self.style.WARNING("UNSPLASH_ACCESS_KEY not set — skipping Unsplash."))
            sources = [s for s in sources if s != "unsplash"]

        if not sources:
            self.stdout.write(self.style.ERROR("No API keys configured. Set PEXELS_API_KEY or UNSPLASH_ACCESS_KEY."))
            return

        terms = options["terms"]
        count = options["count"]
        dry_run = options["dry_run"]
        approve_all = options["approve_all"]

        total_new = 0
        total_skipped = 0

        for term in terms:
            self.stdout.write(f"  Fetching: '{term}' …")
            raw_items = []

            if "pexels" in sources:
                raw_items.extend(_fetch_pexels(term, count, pexels_key))
                time.sleep(0.3)   # be polite to the API

            if "unsplash" in sources:
                raw_items.extend(_fetch_unsplash(term, count, unsplash_key))
                time.sleep(0.3)

            for item in raw_items:
                source_id = item["source_id"]
                source_name = "pexels" if source_id.startswith("pexels-") else "unsplash"

                if dry_run:
                    self.stdout.write(
                        f"    [DRY-RUN] {source_name}: {item['alt_text'][:60]} — {item['image_url'][:80]}"
                    )
                    total_new += 1
                    continue

                _, created = FetchedPhoto.objects.get_or_create(
                    source_id=source_id,
                    defaults={
                        "source": source_name,
                        "image_url": item["image_url"],
                        "thumb_url": item["thumb_url"],
                        "alt_text": item["alt_text"],
                        "photographer": item["photographer"],
                        "photographer_url": item["photographer_url"],
                        "search_term": item["search_term"],
                        "approved": approve_all,
                    },
                )
                if created:
                    total_new += 1
                else:
                    total_skipped += 1

        if dry_run:
            self.stdout.write(self.style.SUCCESS(f"\n[DRY-RUN] Would have fetched {total_new} photos."))
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f"\nDone — {total_new} new, {total_skipped} already existed."
                )
            )
            if total_new and not approve_all:
                self.stdout.write(
                    "  ✓ Photos saved as unapproved. Review them at /admin/content/fetchedphoto/"
                )
