"""
Image processing utilities for hero collage images.

Compress + resize uploaded images on-the-fly before saving to storage.
All operations use Pillow and are performed in-memory — no temporary files.
"""

import io
import logging

from django.core.files.base import ContentFile

logger = logging.getLogger(__name__)

# ── Constants ────────────────────────────────────────────────────────────────
MAX_HERO_WIDTH = 1920          # px — largest dimension for hero images
MAX_HERO_HEIGHT = 1280         # px
JPEG_QUALITY = 78              # 70–85 sweet spot for perceptual quality vs size
WEBP_QUALITY = 82
TARGET_FORMAT = "WEBP"         # prefer WebP for hero; fallback to JPEG
MAX_FILE_SIZE_BYTES = 3 * 1024 * 1024   # 3 MB guard


def compress_hero_image(image_file, *, max_width=MAX_HERO_WIDTH, max_height=MAX_HERO_HEIGHT):
    """
    Resizes and compresses a Django UploadedFile / InMemoryUploadedFile.

    Returns a ``ContentFile`` in WebP format (with ``<original_name>.webp`` name),
    or the original file unchanged if Pillow is unavailable or the image is
    already small enough.

    Parameters
    ----------
    image_file : InMemoryUploadedFile | UploadedFile
        The incoming file from request.FILES or DRF validated data.
    max_width : int
    max_height : int

    Returns
    -------
    ContentFile | original file
    """
    try:
        from PIL import Image, ImageOps
    except ImportError:
        logger.warning("Pillow not installed — skipping hero image compression.")
        return image_file

    try:
        image_file.seek(0)
        img = Image.open(image_file)

        # Normalise orientation from EXIF (handles portrait photos rotated in-camera)
        img = ImageOps.exif_transpose(img)

        # Convert to RGB (drop alpha / palette — JPEG doesn't support alpha)
        if img.mode not in ("RGB", "RGBA"):
            img = img.convert("RGB")
        elif img.mode == "RGBA":
            # Composite alpha onto black — appropriate for dark hero backgrounds
            bg = Image.new("RGB", img.size, (0, 0, 0))
            bg.paste(img, mask=img.split()[3])
            img = bg

        # Resize proportionally — only downscale, never upscale
        if img.width > max_width or img.height > max_height:
            img.thumbnail((max_width, max_height), Image.LANCZOS)

        # Encode to WebP in-memory
        buf = io.BytesIO()
        img.save(buf, format="WEBP", quality=WEBP_QUALITY, method=4)
        buf.seek(0)

        # Guard: if WebP result is somehow > 3 MB, try with lower quality
        if buf.getbuffer().nbytes > MAX_FILE_SIZE_BYTES:
            buf = io.BytesIO()
            img.save(buf, format="WEBP", quality=60, method=4)
            buf.seek(0)

        # Derive new filename (strip extension, add .webp)
        original_name = getattr(image_file, "name", "image.jpg")
        stem = original_name.rsplit(".", 1)[0]
        new_name = f"{stem}.webp"

        content_file = ContentFile(buf.read(), name=new_name)
        return content_file

    except Exception as exc:
        logger.exception("compress_hero_image failed; using original file. Error: %s", exc)
        # Always seek back so the original is still readable by the storage backend
        try:
            image_file.seek(0)
        except Exception:
            pass
        return image_file


def validate_image_file(value, *, max_mb=5):
    """
    DRF / Django validation helper.
    Raises ``ValueError`` with a human-readable message if the file fails validation.
    """
    allowed_content_types = {"image/jpeg", "image/png", "image/webp", "image/gif"}
    ct = getattr(value, "content_type", "")
    if ct and ct not in allowed_content_types:
        raise ValueError("Only JPEG, PNG, WebP, and GIF images are accepted.")

    max_bytes = max_mb * 1024 * 1024
    if value.size > max_bytes:
        raise ValueError(f"Image must be {max_mb} MB or smaller (received {value.size / 1024 / 1024:.1f} MB).")
