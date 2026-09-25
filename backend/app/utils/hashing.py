"""
AISecGuard — SHA-256 Hashing Utility
Week 3: Chunked SHA-256 calculation for files and in-memory data.

IMPORTANT: Files are read in chunks — never loaded entirely into memory.
This is safe for large model files (e.g., 100 MB+).
"""

import hashlib
import io
from pathlib import Path

CHUNK_SIZE = 65536  # 64 KiB per chunk


def compute_sha256_file(file_path: str | Path) -> str:
    """
    Compute SHA-256 hash of a file on disk.

    Reads the file in 64 KiB chunks to avoid loading large files into memory.

    Args:
        file_path: Absolute or relative path to the file.

    Returns:
        Lowercase hex digest string (64 characters).

    Raises:
        FileNotFoundError: If the file does not exist.
        PermissionError: If the file cannot be read.
    """
    h = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(CHUNK_SIZE):
            h.update(chunk)
    return h.hexdigest()


def compute_sha256_bytes(data: bytes) -> str:
    """
    Compute SHA-256 hash of an in-memory bytes object.

    Args:
        data: Raw bytes to hash.

    Returns:
        Lowercase hex digest string (64 characters).
    """
    return hashlib.sha256(data).hexdigest()


def compute_sha256_stream(stream: io.IOBase) -> str:
    """
    Compute SHA-256 hash of a file-like stream.

    Reads the stream from its current position in 64 KiB chunks.
    Rewinds the stream to position 0 after reading.

    Args:
        stream: A readable binary file-like object.

    Returns:
        Lowercase hex digest string (64 characters).
    """
    h = hashlib.sha256()
    stream.seek(0)
    while chunk := stream.read(CHUNK_SIZE):
        h.update(chunk)
    stream.seek(0)
    return h.hexdigest()
