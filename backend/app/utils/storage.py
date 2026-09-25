"""
AISecGuard — Artifact Storage Utility
Week 3: Safe local storage for uploaded AI/ML artifacts.

Security principles enforced:
  - Original filenames are NEVER used as storage paths (path traversal prevention)
  - Files are stored using UUID-based names
  - Only the file extension from the original filename is preserved
  - Files are NEVER executed — this is read/write storage only
"""

import uuid
import os
import io
from pathlib import Path

from app.core.config import settings


def get_upload_dir() -> Path:
    """
    Return the upload directory Path, creating it if it does not exist.
    """
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)
    return upload_dir


def build_safe_storage_path(original_filename: str) -> tuple[str, str]:
    """
    Generate a safe UUID-based storage path for an uploaded file.

    The original filename is discarded as a storage path to prevent
    path traversal attacks (e.g., original='../../malicious.pkl' becomes
    a random UUID filename like 'a3f8b2c1-....pkl').

    Args:
        original_filename: The original filename as submitted by the client.

    Returns:
        Tuple of (safe_filename, absolute_storage_path):
          - safe_filename: UUID + sanitized extension only
          - absolute_storage_path: Full path on disk
    """
    # Extract only the extension — do not trust anything else from the original name
    original_ext = Path(original_filename).suffix.lower()

    # Generate a UUID-based filename
    file_id = str(uuid.uuid4())
    safe_filename = f"{file_id}{original_ext}"

    upload_dir = get_upload_dir()
    storage_path = str(upload_dir / safe_filename)

    return safe_filename, storage_path


def save_upload(file_data: bytes | io.IOBase, storage_path: str) -> int:
    """
    Write uploaded file data to the safe storage path.

    Args:
        file_data: Raw bytes or a file-like object.
        storage_path: Absolute path returned by build_safe_storage_path.

    Returns:
        Number of bytes written.
    """
    if isinstance(file_data, (bytes, bytearray)):
        content = file_data
    else:
        file_data.seek(0)
        content = file_data.read()

    with open(storage_path, "wb") as f:
        f.write(content)

    return len(content)


def delete_artifact_file(storage_path: str) -> bool:
    """
    Delete an artifact file from disk.

    Args:
        storage_path: Absolute path to the stored artifact.

    Returns:
        True if deleted, False if the file was not found.
    """
    try:
        os.remove(storage_path)
        return True
    except FileNotFoundError:
        return False
