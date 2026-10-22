import requests
import time

BASE = 'http://127.0.0.1:8000'

def run_checks():
    print('--- 1. Testing Health ---')
    r = requests.get(f'{BASE}/health')
    assert r.status_code == 200, f'Health failed: {r.text}'
    print('Health OK:', r.json())

    print('--- 2. Testing Register ---')
    email = f'live_analyst_{int(time.time())}@example.com'
    pwd = 'SecurePassword123!'
    r = requests.post(f'{BASE}/api/v1/auth/register', json={
        'email': email,
        'password': pwd,
        'full_name': 'Live Verifier'
    })
    assert r.status_code == 201, f'Register failed: {r.text}'
    print('Register OK:', r.json()['user']['email'])

    print('--- 3. Testing Login ---')
    r = requests.post(f'{BASE}/api/v1/auth/login', json={
        'email': email,
        'password': pwd
    })
    assert r.status_code == 200, f'Login failed: {r.text}'
    tokens = r.json()
    token = tokens['access_token']
    refresh_tok = tokens['refresh_token']
    headers = {'Authorization': f'Bearer {token}'}
    print('Login OK, token acquired')

    print('--- 4. Testing /auth/me ---')
    r = requests.get(f'{BASE}/api/v1/auth/me', headers=headers)
    assert r.status_code == 200
    print('/auth/me OK:', r.json()['email'])

    print('--- 5. Testing /auth/refresh ---')
    r = requests.post(f'{BASE}/api/v1/auth/refresh', json={'refresh_token': refresh_tok})
    assert r.status_code == 200
    print('Refresh OK, new token acquired')

    print('--- 6. Testing Direct Scan Model ---')
    sample_content = b"cos\nsystem\n(S'echo exploit'\ntR."
    r = requests.post(
        f'{BASE}/api/v1/scans/model',
        files={'file': ('live_model.pkl', sample_content, 'application/octet-stream')}
    )
    assert r.status_code == 201, f'Scan model failed: {r.text}'
    scan = r.json()
    scan_id = scan['id']
    artifact_id = scan['artifact_id']
    print(f'Scan model OK: id={scan_id}, risk_score={scan["risk_score"]}, findings={len(scan["findings"])}')

    print('--- 7. Testing List Scans & Detail ---')
    r = requests.get(f'{BASE}/api/v1/scans')
    assert r.status_code == 200
    r = requests.get(f'{BASE}/api/v1/scans/{scan_id}')
    assert r.status_code == 200

    print('--- 8. Testing SSE Scan Status ---')
    r = requests.get(f'{BASE}/api/v1/scans/{scan_id}/status', stream=True)
    assert r.status_code == 200
    chunk = next(r.iter_content(chunk_size=256)).decode('utf-8')
    assert 'data: ' in chunk
    print('SSE Status stream OK')

    print('--- 9. Testing JSON Report ---')
    r = requests.get(f'{BASE}/api/v1/scans/{scan_id}/report?format=json')
    assert r.status_code == 200
    assert 'findings' in r.json()
    print('JSON Report OK')

    print('--- 10. Testing PDF Report ---')
    r = requests.get(f'{BASE}/api/v1/scans/{scan_id}/report?format=pdf')
    assert r.status_code == 200
    assert r.content.startswith(b'%PDF-')
    print(f'PDF Report OK: {len(r.content)} bytes generated')

    print('--- 11. Testing Quarantine ---')
    r = requests.post(
        f'{BASE}/api/v1/artifacts/{artifact_id}/quarantine',
        json={'reason': 'Live verification test isolation'},
        headers=headers
    )
    assert r.status_code == 200
    print('Quarantine OK:', r.json()['action'])

    print('--- 12. Testing Quarantine Events Audit ---')
    r = requests.get(f'{BASE}/api/v1/artifacts/{artifact_id}/events', headers=headers)
    assert r.status_code == 200
    assert len(r.json()) >= 1
    print('Quarantine Audit Events OK')

    print('--- 13. Testing Release ---')
    r = requests.post(
        f'{BASE}/api/v1/artifacts/{artifact_id}/release',
        json={'reason': 'Live verification release'},
        headers=headers
    )
    assert r.status_code == 200
    print('Release OK:', r.json()['action'])

    print('--- 14. Testing Findings list ---')
    r = requests.get(f'{BASE}/api/v1/findings')
    assert r.status_code == 200
    print(f'Findings OK: {r.json()["total"]} total findings')

    print('\n======================================================')
    print('=== ALL 14 LIVE BACKEND API CHECKS PASSED 100%! ===')
    print('======================================================')

if __name__ == '__main__':
    run_checks()
