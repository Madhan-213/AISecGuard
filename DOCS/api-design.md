# AISecGuard — API Design

**Project:** AISecGuard: Automated Framework for Detecting, Preventing, and Mitigating AI Supply Chain Attacks  
**Week:** 2  
**Document Type:** API Design  
**Author:** MCA 3rd Semester Student  
**Date:** September 2026  
**API Style:** REST  
**Format:** JSON  
**Base URL:** `http://localhost:8000` (development)

---

## Table of Contents

1. [General Conventions](#1-general-conventions)
2. [Authentication](#2-authentication)
3. [Health Check](#3-health-check)
4. [User Endpoints](#4-user-endpoints)
5. [Artifact Endpoints](#5-artifact-endpoints)
6. [Scan Endpoints](#6-scan-endpoints)
7. [Finding Endpoints](#7-finding-endpoints)
8. [Report Endpoints](#8-report-endpoints)
9. [Alert Endpoints](#9-alert-endpoints)
10. [Error Response Format](#10-error-response-format)
11. [HTTP Status Code Reference](#11-http-status-code-reference)

---

## 1. General Conventions

- All request and response bodies are JSON unless the endpoint accepts file uploads (multipart/form-data).
- All timestamps are in ISO 8601 UTC format: `"2026-09-20T05:30:00Z"`.
- All IDs are UUID strings: `"a1b2c3d4-e5f6-7890-abcd-ef1234567890"`.
- Severity values: `"CRITICAL"`, `"HIGH"`, `"MEDIUM"`, `"LOW"`, `"INFO"`.
- Scan status values: `"PENDING"`, `"RUNNING"`, `"COMPLETED"`, `"FAILED"`.
- Artifact type values: `"model"`, `"dataset"`, `"dependency"`.

---

## 2. Authentication

All endpoints except `GET /health` and `POST /api/users/register` and `POST /api/users/login` require a valid JWT token.

**Token format:**
```
Authorization: Bearer <jwt_token>
```

Tokens expire after 24 hours.

---

## 3. Health Check

### `GET /health`

**Purpose:** Check that the backend is running. Used for deployment verification and monitoring.  
**Authentication:** Not required.

**Response — 200 OK:**
```json
{
  "status": "ok",
  "project": "AISecGuard",
  "version": "0.1.0",
  "timestamp": "2026-09-20T05:30:00Z"
}
```

---

## 4. User Endpoints

### `POST /api/users/register`

**Purpose:** Register a new user account.  
**Authentication:** Not required.

**Request Body:**
```json
{
  "username": "researcher01",
  "email": "researcher@example.com",
  "password": "securepassword123"
}
```

**Response — 201 Created:**
```json
{
  "id": "uuid",
  "username": "researcher01",
  "email": "researcher@example.com",
  "is_active": true,
  "created_at": "2026-09-20T05:30:00Z"
}
```

**Status Codes:**
| Code | Meaning |
|---|---|
| 201 | User created successfully |
| 400 | Validation error (missing fields, invalid email) |
| 409 | Username or email already exists |

---

### `POST /api/users/login`

**Purpose:** Authenticate a user and return a JWT token.  
**Authentication:** Not required.

**Request Body:**
```json
{
  "username": "researcher01",
  "password": "securepassword123"
}
```

**Response — 200 OK:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 86400
}
```

**Status Codes:**
| Code | Meaning |
|---|---|
| 200 | Authentication successful |
| 401 | Invalid credentials |

---

### `GET /api/users/me`

**Purpose:** Get the profile of the currently authenticated user.  
**Authentication:** Required.

**Response — 200 OK:**
```json
{
  "id": "uuid",
  "username": "researcher01",
  "email": "researcher@example.com",
  "is_active": true,
  "created_at": "2026-09-20T05:30:00Z"
}
```

---

## 5. Artifact Endpoints

### `POST /api/artifacts/upload`

**Purpose:** Upload an AI artifact (model, dataset, or dependency file) for security scanning.  
**Authentication:** Required.  
**Content-Type:** `multipart/form-data`

**Request Form Fields:**
| Field | Type | Required | Description |
|---|---|---|---|
| `file` | File | Yes | The artifact file to upload |
| `artifact_type` | string | Yes | `model`, `dataset`, or `dependency` |
| `source_url` | string | No | URL where the artifact was obtained |
| `known_good_hash` | string | No | SHA-256 hash for integrity verification |

**Response — 201 Created:**
```json
{
  "artifact_id": "uuid",
  "original_filename": "model.pkl",
  "artifact_type": "model",
  "file_size_bytes": 1048576,
  "sha256_hash": "abc123...",
  "is_quarantined": false,
  "provenance": {
    "id": "uuid",
    "sha256_hash": "abc123...",
    "source_url": "https://huggingface.co/example/model",
    "integrity_verified": null,
    "created_at": "2026-09-20T05:30:00Z"
  },
  "created_at": "2026-09-20T05:30:00Z"
}
```

**Status Codes:**
| Code | Meaning |
|---|---|
| 201 | Artifact uploaded and provenance recorded |
| 400 | Invalid file type, file too large, or validation error |
| 401 | Unauthenticated |
| 415 | Unsupported file format |

---

### `GET /api/artifacts`

**Purpose:** List all artifacts uploaded by the current user.  
**Authentication:** Required.

**Query Parameters:**
| Parameter | Type | Description |
|---|---|---|
| `artifact_type` | string | Filter by type (`model`, `dataset`, `dependency`) |
| `is_quarantined` | boolean | Filter by quarantine status |
| `limit` | integer | Max results (default 20, max 100) |
| `offset` | integer | Pagination offset |

**Response — 200 OK:**
```json
{
  "total": 5,
  "limit": 20,
  "offset": 0,
  "items": [
    {
      "artifact_id": "uuid",
      "original_filename": "model.pkl",
      "artifact_type": "model",
      "file_size_bytes": 1048576,
      "is_quarantined": false,
      "created_at": "2026-09-20T05:30:00Z"
    }
  ]
}
```

---

### `GET /api/artifacts/{id}`

**Purpose:** Get full details of a specific artifact, including provenance and scan history.  
**Authentication:** Required.

**Response — 200 OK:**
```json
{
  "artifact_id": "uuid",
  "original_filename": "model.pkl",
  "artifact_type": "model",
  "file_size_bytes": 1048576,
  "file_extension": ".pkl",
  "is_quarantined": false,
  "provenance": {
    "sha256_hash": "abc123...",
    "source_url": "https://huggingface.co/example",
    "integrity_verified": true,
    "integrity_checked_at": "2026-09-20T05:35:00Z"
  },
  "scan_count": 2,
  "created_at": "2026-09-20T05:30:00Z"
}
```

**Status Codes:**
| Code | Meaning |
|---|---|
| 200 | Artifact found |
| 404 | Artifact not found |
| 403 | Artifact belongs to another user |

---

### `POST /api/artifacts/{id}/quarantine`

**Purpose:** Manually quarantine an artifact, preventing it from being used.  
**Authentication:** Required.

**Request Body:**
```json
{
  "reason": "Manually flagged by security analyst pending review"
}
```

**Response — 200 OK:**
```json
{
  "artifact_id": "uuid",
  "is_quarantined": true,
  "quarantine_reason": "Manually flagged by security analyst pending review",
  "quarantined_at": "2026-09-20T06:00:00Z"
}
```

---

## 6. Scan Endpoints

### `POST /api/scans`

**Purpose:** Initiate a new security scan for an uploaded artifact.  
**Authentication:** Required.

**Request Body:**
```json
{
  "artifact_id": "uuid"
}
```

**Response — 202 Accepted:**
```json
{
  "scan_id": "uuid",
  "artifact_id": "uuid",
  "status": "PENDING",
  "created_at": "2026-09-20T05:31:00Z"
}
```

**Status Codes:**
| Code | Meaning |
|---|---|
| 202 | Scan accepted and queued |
| 400 | Invalid artifact ID or artifact already quarantined |
| 404 | Artifact not found |

---

### `GET /api/scans`

**Purpose:** List all scans initiated by the current user.  
**Authentication:** Required.

**Query Parameters:**
| Parameter | Type | Description |
|---|---|---|
| `status` | string | Filter by status (`PENDING`, `RUNNING`, `COMPLETED`, `FAILED`) |
| `limit` | integer | Max results (default 20) |
| `offset` | integer | Pagination offset |

**Response — 200 OK:**
```json
{
  "total": 8,
  "items": [
    {
      "scan_id": "uuid",
      "artifact_id": "uuid",
      "artifact_filename": "model.pkl",
      "status": "COMPLETED",
      "risk_score": 7.5,
      "risk_level": "HIGH",
      "completed_at": "2026-09-20T05:33:00Z",
      "created_at": "2026-09-20T05:31:00Z"
    }
  ]
}
```

---

### `GET /api/scans/{id}`

**Purpose:** Get full details of a specific scan, including findings summary.  
**Authentication:** Required.

**Response — 200 OK:**
```json
{
  "scan_id": "uuid",
  "artifact_id": "uuid",
  "artifact_filename": "model.pkl",
  "artifact_type": "model",
  "status": "COMPLETED",
  "risk_score": 7.5,
  "risk_level": "HIGH",
  "finding_summary": {
    "CRITICAL": 1,
    "HIGH": 2,
    "MEDIUM": 0,
    "LOW": 1,
    "INFO": 3
  },
  "started_at": "2026-09-20T05:31:01Z",
  "completed_at": "2026-09-20T05:31:45Z",
  "created_at": "2026-09-20T05:31:00Z"
}
```

**Status Codes:**
| Code | Meaning |
|---|---|
| 200 | Scan found |
| 202 | Scan still in progress |
| 404 | Scan not found |

---

## 7. Finding Endpoints

### `GET /api/findings`

**Purpose:** List all findings. Can be filtered by scan or severity.  
**Authentication:** Required.

**Query Parameters:**
| Parameter | Type | Description |
|---|---|---|
| `scan_id` | UUID | Filter by scan |
| `severity` | string | Filter by severity level |
| `limit` | integer | Max results |

**Response — 200 OK:**
```json
{
  "total": 7,
  "items": [
    {
      "finding_id": "uuid",
      "scan_id": "uuid",
      "finding_type": "pickle_opcode_dangerous",
      "severity": "CRITICAL",
      "title": "Dangerous Pickle Opcodes Detected",
      "mitre_atlas_id": "AML.T0010",
      "created_at": "2026-09-20T05:31:30Z"
    }
  ]
}
```

---

### `GET /api/findings/{id}`

**Purpose:** Get full details of a specific finding, including evidence and recommendation.  
**Authentication:** Required.

**Response — 200 OK:**
```json
{
  "finding_id": "uuid",
  "scan_id": "uuid",
  "artifact_id": "uuid",
  "finding_type": "pickle_opcode_dangerous",
  "severity": "CRITICAL",
  "title": "Dangerous Pickle Opcodes Detected",
  "description": "The uploaded model file contains pickle opcodes (GLOBAL, REDUCE) that reference callable objects. Loading this file with pickle.load() could execute arbitrary code.",
  "evidence": "Opcode 0x63 (GLOBAL) found at byte offset 42 referencing 'os.system'",
  "attack_name": "Unsafe Model Serialization (Potential RCE)",
  "mitre_atlas_id": "AML.T0010",
  "mitre_atlas_name": "ML Supply Chain Compromise",
  "owasp_llm_id": "LLM04",
  "recommendation": "Do not load this model with pickle.load(). Use a safe serialization format such as SafeTensors or ONNX. Investigate the origin of this model file before any further use.",
  "created_at": "2026-09-20T05:31:30Z"
}
```

---

## 8. Report Endpoints

### `GET /api/reports/{scan_id}`

**Purpose:** Get the full security report for a completed scan.  
**Authentication:** Required.

**Response — 200 OK:**
```json
{
  "report_id": "uuid",
  "scan_id": "uuid",
  "artifact": {
    "id": "uuid",
    "filename": "model.pkl",
    "type": "model"
  },
  "provenance": {
    "sha256_hash": "abc123...",
    "source_url": "https://huggingface.co/example",
    "integrity_verified": false
  },
  "risk_score": 7.5,
  "risk_level": "HIGH",
  "finding_summary": {
    "CRITICAL": 1,
    "HIGH": 2,
    "MEDIUM": 0,
    "LOW": 1,
    "INFO": 3
  },
  "findings": [ ... ],
  "mitigation_actions": [ ... ],
  "markdown_summary": "## AISecGuard Security Report\n\n...",
  "generated_at": "2026-09-20T05:32:00Z"
}
```

**Status Codes:**
| Code | Meaning |
|---|---|
| 200 | Report returned |
| 202 | Scan still in progress; report not yet available |
| 404 | No report found for this scan |

---

## 9. Alert Endpoints

### `GET /api/alerts`

**Purpose:** Get unread alerts for the current user.  
**Authentication:** Required.

**Response — 200 OK:**
```json
{
  "total": 2,
  "items": [
    {
      "alert_id": "uuid",
      "scan_id": "uuid",
      "priority": "CRITICAL",
      "message": "CRITICAL finding in model.pkl: Dangerous Pickle Opcodes Detected. Artifact has been quarantined.",
      "is_read": false,
      "created_at": "2026-09-20T05:31:30Z"
    }
  ]
}
```

### `PATCH /api/alerts/{id}/read`

**Purpose:** Mark an alert as read.  
**Authentication:** Required.

**Response — 200 OK:**
```json
{
  "alert_id": "uuid",
  "is_read": true
}
```

---

## 10. Error Response Format

All error responses follow this structure:
```json
{
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "The uploaded file exceeds the maximum allowed size of 100MB.",
    "details": null
  }
}
```

Common error codes:
| Code | HTTP Status | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Request body or parameters failed validation |
| `AUTHENTICATION_REQUIRED` | 401 | No token provided |
| `TOKEN_EXPIRED` | 401 | JWT token has expired |
| `FORBIDDEN` | 403 | Access to another user's resource denied |
| `NOT_FOUND` | 404 | Resource does not exist |
| `CONFLICT` | 409 | Resource already exists |
| `FILE_TOO_LARGE` | 413 | Uploaded file exceeds size limit |
| `UNSUPPORTED_FORMAT` | 415 | File type not supported |
| `SCAN_IN_PROGRESS` | 409 | A scan is already running for this artifact |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## 11. HTTP Status Code Reference

| Code | Meaning | When Used |
|---|---|---|
| 200 | OK | Successful GET or PATCH |
| 201 | Created | Successful POST that creates a resource |
| 202 | Accepted | Scan queued; scan still in progress |
| 400 | Bad Request | Validation failure |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Accessing another user's resource |
| 404 | Not Found | Resource does not exist |
| 409 | Conflict | Duplicate resource or scan in progress |
| 413 | Payload Too Large | File exceeds size limit |
| 415 | Unsupported Media Type | Unsupported file format |
| 500 | Internal Server Error | Unhandled server exception |

---

## 12. Implemented Week 5 Endpoints

### Authentication (`/api/v1/auth`)
- `POST /api/v1/auth/register` — Create account with email, password (min 8 chars), full_name. Returns HTTP 201 with public user representation (no passwords).
- `POST /api/v1/auth/login` — Authenticate credentials. Returns HTTP 200 with `access_token` (30 min) and `refresh_token` (7 days).
- `POST /api/v1/auth/refresh` — Exchange valid refresh token for fresh token pair.
- `GET /api/v1/auth/me` — Retrieve active user profile. Requires Bearer access token.

### Containment & Quarantine (`/api/v1/artifacts`)
- `POST /api/v1/artifacts/{artifact_id}/quarantine` — Transition SCANNED artifact to QUARANTINED, relocates physical file to `uploads/quarantine/`, creates immutable audit record. Requires Bearer token.
- `POST /api/v1/artifacts/{artifact_id}/release` — Transition QUARANTINED artifact back to SCANNED, relocates file to active uploads, records release audit event. Requires Bearer token.
- `GET /api/v1/artifacts/{artifact_id}/events` — Chronological audit trail of all quarantine and release actions with actor IDs, actor emails, and timestamps.

### Remediation Reports & Progress (`/api/v1/scans`)
- `GET /api/v1/scans/{scan_id}/report?format=json` — Structured JSON export containing artifact metadata, scan metrics, risk score, and all findings with evidence and recommendations.
- `GET /api/v1/scans/{scan_id}/report?format=pdf` — Formatted PDF document generated dynamically via ReportLab with colored severity badges and tabular layout.
- `GET /api/v1/scans/{scan_id}/status` — Real-time Server-Sent Events (SSE) streaming scan execution phases (`QUEUED` -> `PROVENANCE_CHECK` -> `SCANNER_RUNNING` -> `RISK_CALC` -> `COMPLETED`).

