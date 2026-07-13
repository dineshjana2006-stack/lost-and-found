"""
ReConnect – Image Service
==========================
Handles all image upload logic:
  1. Validate uploaded files (type, size)
  2. Generate a secure, collision-free filename
  3. Resize to max dimensions (preserving aspect ratio)
  4. Save the processed file to the upload directory
  5. Return the filename for storage

Dependencies: Pillow (PIL)
"""

import os
import uuid
import logging
from typing import List, Tuple

from PIL import Image, UnidentifiedImageError
from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename
from flask import current_app

logger = logging.getLogger(__name__)

# Map allowed MIME types to canonical extensions
ALLOWED_MIME_TYPES = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
}


# ──────────────────────────────────────────────────────────────
#  Public API
# ──────────────────────────────────────────────────────────────

def allowed_file(filename: str) -> bool:
    """Check whether a filename has an allowed extension.

    Args:
        filename: Original filename from the upload.

    Returns:
        True if allowed, False otherwise.
    """
    if "." not in filename:
        return False
    ext = filename.rsplit(".", 1)[1].lower()
    return ext in current_app.config["ALLOWED_EXTENSIONS"]


def process_and_save_image(file: FileStorage, item_type: str) -> Tuple[bool, str]:
    """Validate, resize, and persist an uploaded image file.

    Args:
        file:       Werkzeug FileStorage object from the request.
        item_type:  "lost" or "found" (used as filename prefix).

    Returns:
        Tuple of (success: bool, result: str) where:
            - On success: (True, filename_on_disk)
            - On failure: (False, error_message)
    """
    if not file or file.filename == "":
        return False, "No file selected."

    original_name = secure_filename(file.filename)

    if not allowed_file(original_name):
        allowed = ", ".join(sorted(current_app.config["ALLOWED_EXTENSIONS"]))
        return False, f"File type not allowed. Accepted formats: {allowed}."

    # ── File size validation (pre-Pillow guard) ────────────────
    file.stream.seek(0, 2)          # Seek to end of stream
    file_size = file.stream.tell()  # Current position = file size in bytes
    file.stream.seek(0)             # Reset stream so Pillow can read it

    max_bytes = current_app.config["MAX_IMAGE_SIZE_MB"] * 1024 * 1024
    if file_size > max_bytes:
        return False, (
            f"File size ({file_size // (1024 * 1024)} MB) exceeds the "
            f"{current_app.config['MAX_IMAGE_SIZE_MB']} MB limit."
        )

    # Read content into memory for Pillow processing
    try:
        img = Image.open(file.stream)
    except UnidentifiedImageError:
        return False, "Uploaded file is not a valid image."
    except Exception as exc:
        logger.warning("Image open failed: %s", exc)
        return False, "Could not process the uploaded image."

    # Determine output format
    img_format = img.format or "JPEG"
    if img_format.upper() == "JPG":
        img_format = "JPEG"
    ext = _format_to_ext(img_format)

    # Convert palette/RGBA to RGB for JPEG compatibility
    if img_format == "JPEG" and img.mode in ("RGBA", "P", "LA"):
        img = img.convert("RGB")

    # Resize to fit within THUMBNAIL_MAX_SIZE (preserves aspect ratio)
    img.thumbnail(current_app.config["THUMBNAIL_MAX_SIZE"], Image.LANCZOS)

    # Generate a unique filename
    unique_id = uuid.uuid4().hex[:12]
    filename = f"{item_type}_{unique_id}.{ext}"
    save_path = os.path.join(current_app.config["UPLOAD_DIR"], filename)

    # Ensure the upload directory exists
    os.makedirs(current_app.config["UPLOAD_DIR"], exist_ok=True)

    # Save the processed image
    try:
        save_kwargs = {}
        if img_format == "JPEG":
            save_kwargs["quality"] = current_app.config["JPEG_QUALITY"]
            save_kwargs["optimize"] = True
        img.save(save_path, format=img_format, **save_kwargs)
    except Exception as exc:
        logger.error("Failed to save image %s: %s", save_path, exc)
        return False, "Failed to save image. Please try again."

    logger.info("Saved image: %s", filename)
    return True, filename


def process_multiple_images(
    files: List[FileStorage], item_type: str, existing_count: int = 0
) -> Tuple[List[str], List[str]]:
    """Process a list of uploaded image files.

    Args:
        files:          List of FileStorage objects.
        item_type:      "lost" or "found".
        existing_count: Number of images already attached to the item.
                        Used to correctly enforce the per-item limit so that
                        existing images are counted toward the cap.

    Returns:
        Tuple of (saved_filenames, error_messages).
    """
    saved: List[str] = []
    errors: List[str] = []

    # Enforce per-item image limit, accounting for already-saved images
    max_images = current_app.config["MAX_IMAGES_PER_ITEM"]
    allowed_count = max(max_images - existing_count, 0)
    files_to_process = files[:allowed_count]

    for file in files_to_process:
        success, result = process_and_save_image(file, item_type)
        if success:
            saved.append(result)
        else:
            errors.append(f"File '{file.filename}': {result}")

    if len(files) > allowed_count:
        errors.append(
            f"Only {max_images} images are allowed per item. "
            f"Extra files were ignored."
        )

    return saved, errors


def delete_image(filename: str) -> bool:
    """Delete an image file from disk.

    Args:
        filename: Stored filename (not the full path).

    Returns:
        True if deleted, False if file did not exist.
    """
    # Security: ensure the filename contains no path traversal
    safe_name = os.path.basename(filename)
    file_path = os.path.join(current_app.config["UPLOAD_DIR"], safe_name)

    if os.path.exists(file_path):
        try:
            os.remove(file_path)
            logger.info("Deleted image: %s", safe_name)
            return True
        except OSError as exc:
            logger.error("Failed to delete image %s: %s", safe_name, exc)
    return False


def get_image_url(filename: str) -> str:
    """Build the public URL for a stored image.

    Args:
        filename: Stored filename.

    Returns:
        Relative URL string (e.g. /uploads/images/lost_abc123.jpg).
    """
    return f"/uploads/images/{filename}"


# ──────────────────────────────────────────────────────────────
#  Private helpers
# ──────────────────────────────────────────────────────────────

def _format_to_ext(img_format: str) -> str:
    """Convert a Pillow format name to a file extension."""
    mapping = {
        "JPEG": "jpg",
        "PNG": "png",
        "GIF": "gif",
        "WEBP": "webp",
    }
    return mapping.get(img_format.upper(), "jpg")
