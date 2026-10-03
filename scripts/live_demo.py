"""
AISecGuard — Live End-to-End Demo Script
Run from project root: python scripts/live_demo.py
"""

import urllib.request
import json
import pickle

BASE = "http://127.0.0.1:8000"


def upload_artifact(filename, content):
    boundary = "aisecguard_boundary_xyz"
    cd = f'Content-Disposition: form-data; name="file"; filename="{filename}"'
    body = (
        f"--{boundary}\r\n"
        f"{cd}\r\n"
        f"Content-Type: application/octet-stream\r\n\r\n"
    ).encode() + content + f"\r\n--{boundary}--\r\n".encode()

    req = urllib.request.Request(
        f"{BASE}/api/v1/artifacts/upload",
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        method="POST",
    )
    return json.loads(urllib.request.urlopen(req).read())


def run_scan(artifact_id):
    payload = json.dumps({"artifact_id": artifact_id}).encode()
    req = urllib.request.Request(
        f"{BASE}/api/v1/scans/",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    return json.loads(urllib.request.urlopen(req).read())


def main():
    print("\n" + "="*60)
    print("  AISecGuard - Live Pipeline Demo")
    print("="*60)

    # --- Health check ---
    resp = json.loads(urllib.request.urlopen(f"{BASE}/health").read())
    print(f"\n[Health] status={resp['status']}  version={resp['version']}")

    # =========================================================
    # TEST 1: Safe pickle model
    # =========================================================
    print("\n" + "-"*60)
    print("TEST 1: Upload a safe pickle model")
    print("-"*60)

    safe_content = pickle.dumps({"weights": [0.1, 0.25, -0.3], "bias": 0.05})
    artifact = upload_artifact("safe_model.pkl", safe_content)
    print(f"  Uploaded   : {artifact['original_filename']}")
    print(f"  Artifact ID: {artifact['id']}")
    print(f"  SHA-256    : {artifact['sha256']}")
    print(f"  Type       : {artifact['artifact_type']}")
    print(f"  Status     : {artifact['status']}")

    print("\n  Running scan...")
    scan = run_scan(artifact["id"])
    print(f"  Scan ID    : {scan['id']}")
    print(f"  Status     : {scan['status']}")
    print(f"  Risk Level : {scan['risk_level']}")
    print(f"  Findings   : {len(scan['findings'])}")
    for f in scan["findings"]:
        print(f"    [{f['severity']:15s}] {f['title']}")

    # =========================================================
    # TEST 2: Suspicious pickle (static fixture)
    # =========================================================
    print("\n" + "-"*60)
    print("TEST 2: Upload suspicious model (os.system reference)")
    print("-"*60)

    suspicious = (
        b"\x80\x02"        # PROTO 2
        b"\x63"             # GLOBAL opcode
        b"os\nsystem\n"    # module=os, name=system
        b"q\x00"            # BINPUT
        b"."                # STOP
    )
    artifact2 = upload_artifact("suspicious_model.pkl", suspicious)
    print(f"  Uploaded   : {artifact2['original_filename']}")
    print(f"  Artifact ID: {artifact2['id']}")
    print(f"  SHA-256    : {artifact2['sha256']}")

    print("\n  Running scan...")
    scan2 = run_scan(artifact2["id"])
    print(f"  Scan ID    : {scan2['id']}")
    print(f"  Status     : {scan2['status']}")
    print(f"  Risk Level : {scan2['risk_level']}  <-- should be HIGH or CRITICAL")
    print(f"  Findings   : {len(scan2['findings'])}")
    for f in scan2["findings"]:
        print(f"    [{f['severity']:15s}] {f['title']}")
        if f.get("evidence"):
            for line in f["evidence"].split("\n"):
                print(f"                 {line}")

    # =========================================================
    # TEST 3: CSV dataset
    # =========================================================
    print("\n" + "-"*60)
    print("TEST 3: Upload a CSV dataset")
    print("-"*60)

    csv_content = b"label,f1,f2\n0,1.0,2.0\n1,3.0,4.0\n"
    artifact3 = upload_artifact("dataset.csv", csv_content)
    print(f"  Uploaded   : {artifact3['original_filename']}")
    print(f"  Type       : {artifact3['artifact_type']}")
    print(f"  SHA-256    : {artifact3['sha256']}")

    scan3 = run_scan(artifact3["id"])
    print(f"  Risk Level : {scan3['risk_level']}")

    # =========================================================
    # Summary
    # =========================================================
    print("\n" + "="*60)
    print("  SUMMARY")
    print("="*60)
    print(f"  Safe model risk     : {scan['risk_level']}")
    print(f"  Suspicious model    : {scan2['risk_level']}  (CRITICAL finding detected)")
    print(f"  Dataset risk        : {scan3['risk_level']}")
    print(f"\n  Swagger UI          : {BASE}/docs")
    print(f"  Artifacts list      : {BASE}/api/v1/artifacts/")
    print(f"  Scans list          : {BASE}/api/v1/scans/")
    print(f"  Findings list       : {BASE}/api/v1/findings/")
    print("\n[Demo complete]")


if __name__ == "__main__":
    main()
