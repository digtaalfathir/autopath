'use strict';

const fs   = require('fs');
const path = require('path');
const { safeStorage } = require('electron');

// CredentialStore — encrypted credential vault for workflows.
//
// Secrets are encrypted with Electron's safeStorage (OS-backed: DPAPI on
// Windows, Keychain on macOS, libsecret/kwallet on Linux) and stored as
// base64 in credentials.json. The plaintext secret is NEVER written to the
// flow JSON or the credentials file.
//
// Workflows reference a credential via interpolation:
//     {{secret.NAME.username}}   {{secret.NAME.password}}
//
// At run time main.js calls decryptAll() and passes the result to the engine,
// which exposes it under the reserved `secret` bucket (redacted from logs).
class CredentialStore {
  constructor({ file }) {
    this._file = file;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    this._data = this._load();
  }

  _load() {
    if (!fs.existsSync(this._file)) return {};
    try { return JSON.parse(fs.readFileSync(this._file, 'utf-8')) || {}; }
    catch { return {}; }
  }

  _save() {
    fs.writeFileSync(this._file, JSON.stringify(this._data, null, 2), 'utf-8');
  }

  _encAvailable() {
    try { return safeStorage.isEncryptionAvailable(); } catch { return false; }
  }

  _encrypt(plain) {
    if (this._encAvailable()) {
      return { enc: true, value: safeStorage.encryptString(plain).toString('base64') };
    }
    // Fallback when no OS keyring (e.g. headless Linux) — base64 obfuscation only.
    return { enc: false, value: Buffer.from(plain, 'utf-8').toString('base64') };
  }

  _decrypt(rec) {
    if (!rec || rec.value == null) return '';
    const buf = Buffer.from(rec.value, 'base64');
    try {
      return rec.enc ? safeStorage.decryptString(buf) : buf.toString('utf-8');
    } catch {
      return '';
    }
  }

  // Safe to send to the renderer — names + usernames only, never secrets.
  list() {
    return Object.entries(this._data).map(([name, rec]) => ({
      name,
      username:   rec.username || '',
      hasSecret:  !!(rec.secret && rec.secret.value),
      encrypted:  !!(rec.secret && rec.secret.enc),
      updatedAt:  rec.updatedAt || null,
    }));
  }

  // Create or update. An empty `secret` on an existing credential keeps the
  // current secret (so the UI never has to round-trip the plaintext).
  save({ name, username, secret }) {
    const key = String(name || '').trim();
    if (!key) throw new Error('Credential name is required.');

    const existing = this._data[key] || {};
    this._data[key] = {
      username:  username ?? existing.username ?? '',
      secret:    (secret != null && secret !== '') ? this._encrypt(String(secret)) : existing.secret || null,
      updatedAt: new Date().toISOString(),
    };
    this._save();
    return { success: true };
  }

  delete(name) {
    delete this._data[String(name || '').trim()];
    this._save();
    return { success: true };
  }

  // { NAME: { username, password } } — used only at execution time.
  decryptAll() {
    const out = {};
    for (const [name, rec] of Object.entries(this._data)) {
      out[name] = { username: rec.username || '', password: this._decrypt(rec.secret) };
    }
    return out;
  }

  encryptionAvailable() { return this._encAvailable(); }
}

module.exports = { CredentialStore };
