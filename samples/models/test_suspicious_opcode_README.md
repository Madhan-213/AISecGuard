# test_suspicious_opcode.pkl

**Security Test Fixture — Academic Use Only**

This file contains raw pickle bytes with a GLOBAL opcode referencing `os.system`.
It is used by the AISecGuard model scanner test suite to verify that the scanner
detects suspicious module references.

**This file is intentionally incomplete and cannot be deserialized.**
It exists purely for static byte-level analysis testing.
