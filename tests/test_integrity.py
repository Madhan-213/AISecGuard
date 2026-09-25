"""
AISecGuard — SHA-256 Hashing Tests
Week 3: Verifies correctness of all hashing utility functions.
"""

import hashlib
import io
import tempfile
import os

from app.utils.hashing import (
    compute_sha256_file,
    compute_sha256_bytes,
    compute_sha256_stream,
)


def test_sha256_bytes_known_value():
    """SHA-256 of empty bytes matches known hash."""
    # sha256("") = e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
    expected = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    assert compute_sha256_bytes(b"") == expected


def test_sha256_bytes_content():
    """SHA-256 of b'hello' matches known value."""
    expected = hashlib.sha256(b"hello").hexdigest()
    assert compute_sha256_bytes(b"hello") == expected


def test_sha256_file():
    """SHA-256 of a temp file matches bytes hash of same content."""
    content = b"test content for sha256 file verification"
    expected = hashlib.sha256(content).hexdigest()

    with tempfile.NamedTemporaryFile(delete=False, suffix=".bin") as f:
        f.write(content)
        path = f.name

    try:
        result = compute_sha256_file(path)
        assert result == expected
    finally:
        os.unlink(path)


def test_sha256_stream():
    """SHA-256 of a BytesIO stream matches bytes hash."""
    content = b"stream test data"
    expected = hashlib.sha256(content).hexdigest()
    stream = io.BytesIO(content)
    assert compute_sha256_stream(stream) == expected


def test_sha256_stream_rewinds():
    """compute_sha256_stream rewinds the stream to position 0 after reading."""
    content = b"rewind test"
    stream = io.BytesIO(content)
    compute_sha256_stream(stream)
    # Stream should be at position 0 after hashing
    assert stream.tell() == 0


def test_sha256_consistency():
    """The same content always produces the same hash regardless of method."""
    content = b"deterministic hash test"
    h1 = compute_sha256_bytes(content)
    h2 = compute_sha256_stream(io.BytesIO(content))

    with tempfile.NamedTemporaryFile(delete=False) as f:
        f.write(content)
        path = f.name
    try:
        h3 = compute_sha256_file(path)
    finally:
        os.unlink(path)

    assert h1 == h2 == h3
