/**
 * AISecGuard — User-Scoped Device Cache Manager
 *
 * Provides client-side cache persistence isolated per user account.
 * Every user starts with ZERO history and fresh state.
 * Only artifacts and scans created by that specific user are saved.
 */

function getCurrentUserId() {
  try {
    const rawUser = localStorage.getItem('aisecguard_current_user');
    if (rawUser) {
      const u = JSON.parse(rawUser);
      return u.id || u.email || 'default';
    }
    const token = localStorage.getItem('access_token');
    if (token) {
      // Decode JWT payload (middle section)
      const base64Url = token.split('.')[1];
      if (base64Url) {
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        const parsed = JSON.parse(jsonPayload);
        return parsed.sub || 'default';
      }
    }
  } catch (e) {
    // Fall back to default
  }
  return 'default';
}

function getKey(prefix) {
  const uid = getCurrentUserId();
  return `aisecguard_${uid}_${prefix}`;
}

function readJson(key, defaultVal) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultVal;
  } catch (err) {
    console.warn(`[LocalCache] Failed reading ${key}:`, err);
    return defaultVal;
  }
}

function writeJson(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (err) {
    console.error(`[LocalCache] Failed writing ${key}:`, err);
  }
}

export const deviceCache = {
  /**
   * Set active user context to switch cache scope
   */
  setCurrentUser(user) {
    if (user) {
      writeJson('aisecguard_current_user', { id: user.id, email: user.email });
    } else {
      localStorage.removeItem('aisecguard_current_user');
    }
  },

  /**
   * Retrieve all cached scans for the current user
   */
  getScans() {
    return readJson(getKey('scans'), []);
  },

  /**
   * Retrieve single scan by scanId for current user
   */
  getScan(scanId) {
    const scans = this.getScans();
    return scans.find((s) => s.id === scanId) || null;
  },

  /**
   * Save or update a scan in local device memory for current user
   */
  saveScan(scanData) {
    if (!scanData || !scanData.id) return;
    const key = getKey('scans');
    const scans = this.getScans();
    const existingIdx = scans.findIndex((s) => s.id === scanData.id);

    const normalizedScan = {
      ...scanData,
      updated_at: new Date().toISOString(),
      findings_count: scanData.findings?.length ?? scanData.findings_count ?? 0,
    };

    if (existingIdx >= 0) {
      scans[existingIdx] = { ...scans[existingIdx], ...normalizedScan };
    } else {
      scans.unshift(normalizedScan);
    }

    writeJson(key, scans);

    if (scanData.findings && Array.isArray(scanData.findings)) {
      this.saveFindings(scanData.findings, scanData.id);
    }

    return normalizedScan;
  },

  /**
   * Retrieve all cached artifacts for current user
   */
  getArtifacts() {
    return readJson(getKey('artifacts'), []);
  },

  /**
   * Retrieve single artifact by ID
   */
  getArtifact(artifactId) {
    const list = this.getArtifacts();
    return list.find((a) => a.id === artifactId) || null;
  },

  /**
   * Save or update artifact for current user
   */
  saveArtifact(artifact) {
    if (!artifact || !artifact.id) return;
    const key = getKey('artifacts');
    const list = this.getArtifacts();
    const idx = list.findIndex((a) => a.id === artifact.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...artifact };
    } else {
      list.unshift(artifact);
    }
    writeJson(key, list);
    return artifact;
  },

  /**
   * Retrieve all security findings for current user
   */
  getFindings() {
    const scans = this.getScans();
    const all = [];
    scans.forEach((s) => {
      if (s.findings && Array.isArray(s.findings)) {
        s.findings.forEach((f) => {
          all.push({ ...f, scan_id: s.id, artifact_id: s.artifact_id });
        });
      }
    });
    return all;
  },

  /**
   * Save list of findings
   */
  saveFindings(findingsList, scanId) {
    const key = getKey('findings');
    const current = readJson(key, []);
    const filtered = current.filter((f) => f.scan_id !== scanId);
    const updated = [...findingsList.map((f) => ({ ...f, scan_id: scanId })), ...filtered];
    writeJson(key, updated);
  },

  /**
   * Quarantine an artifact in current user's cache
   */
  quarantineArtifact(artifactId, reason) {
    const artKey = getKey('artifacts');
    const evKey = getKey('quarantine');

    const artifacts = this.getArtifacts();
    const art = artifacts.find((a) => a.id === artifactId);
    if (art) {
      art.status = 'QUARANTINED';
      art.quarantine_reason = reason;
      art.quarantined_at = new Date().toISOString();
      writeJson(artKey, artifacts);
    }

    const events = readJson(evKey, []);
    events.unshift({
      id: `qev-${Date.now()}`,
      artifact_id: artifactId,
      action: 'QUARANTINE',
      reason,
      performed_by: getCurrentUserId(),
      timestamp: new Date().toISOString(),
    });
    writeJson(evKey, events);
    return art;
  },

  /**
   * Release an artifact in current user's cache
   */
  releaseArtifact(artifactId, reason) {
    const artKey = getKey('artifacts');
    const evKey = getKey('quarantine');

    const artifacts = this.getArtifacts();
    const art = artifacts.find((a) => a.id === artifactId);
    if (art) {
      art.status = 'ACTIVE';
      art.quarantine_reason = null;
      art.released_at = new Date().toISOString();
      writeJson(artKey, artifacts);
    }

    const events = readJson(evKey, []);
    events.unshift({
      id: `qev-${Date.now()}`,
      artifact_id: artifactId,
      action: 'RELEASE',
      reason,
      performed_by: getCurrentUserId(),
      timestamp: new Date().toISOString(),
    });
    writeJson(evKey, events);
    return art;
  },

  /**
   * Clear all local cache memory for current user
   */
  clearCache() {
    localStorage.removeItem(getKey('scans'));
    localStorage.removeItem(getKey('artifacts'));
    localStorage.removeItem(getKey('findings'));
    localStorage.removeItem(getKey('quarantine'));
    console.log('[LocalCache] Cleared current user device cache.');
  },

  /**
   * Reset cache to completely empty clean state
   */
  resetToBaseline() {
    writeJson(getKey('scans'), []);
    writeJson(getKey('artifacts'), []);
    writeJson(getKey('findings'), []);
    writeJson(getKey('quarantine'), []);
  },

  /**
   * Export all device cache memory for current user as downloadable JSON
   */
  exportCacheAsJson() {
    const payload = {
      exported_at: new Date().toISOString(),
      user: getCurrentUserId(),
      scans: this.getScans(),
      artifacts: this.getArtifacts(),
      findings: this.getFindings(),
      quarantine_events: readJson(getKey('quarantine'), []),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aisecguard_cache_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  /**
   * Get metrics about local cache memory usage
   */
  getCacheMetrics() {
    const scans = this.getScans();
    const artifacts = this.getArtifacts();
    const findings = this.getFindings();

    return {
      scanCount: scans.length,
      artifactCount: artifacts.length,
      findingCount: findings.length,
      user: getCurrentUserId(),
    };
  },
};
