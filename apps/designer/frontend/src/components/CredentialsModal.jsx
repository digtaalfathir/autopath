import React, { useState, useEffect, useCallback } from 'react';
import { IconX, IconKey, IconTrash } from './Icons';

const api = window.electronAPI || null;

const blankForm = { name: '', username: '', secret: '' };

export function CredentialsModal({ onClose }) {
  const [creds,   setCreds]   = useState([]);
  const [encOk,   setEncOk]   = useState(true);
  const [form,    setForm]    = useState(blankForm);
  const [editing, setEditing] = useState(false);   // editing an existing name
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  const load = useCallback(async () => {
    if (!api) return;
    const r = await api.listCredentials();
    if (r.success) { setCreds(r.credentials || []); setEncOk(r.encryptionAvailable !== false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const startNew  = () => { setForm(blankForm); setEditing(false); setError(''); };
  const startEdit = (c) => { setForm({ name: c.name, username: c.username, secret: '' }); setEditing(true); setError(''); };

  const save = async () => {
    if (!form.name.trim()) { setError('Name is required.'); return; }
    if (!editing && creds.some(c => c.name === form.name.trim())) {
      setError('A credential with this name already exists.'); return;
    }
    setSaving(true);
    const r = await api.saveCredential(form);
    setSaving(false);
    if (!r.success) { setError(r.error || 'Save failed.'); return; }
    setForm(blankForm); setEditing(false);
    await load();
  };

  const remove = async (name) => {
    if (!confirm(`Delete credential "${name}"? Workflows using it will fail.`)) return;
    await api.deleteCredential(name);
    if (form.name === name) startNew();
    await load();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog cred-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title"><IconKey /> Credential Vault</span>
          <button className="modal-close" onClick={onClose}><IconX size={14} /></button>
        </div>

        <div className="cred-body">
          {!encOk && (
            <div className="cred-warn">
              ⚠ OS encryption unavailable on this machine — secrets are stored with weak
              obfuscation only. Install a system keyring for full protection.
            </div>
          )}

          <p className="settings-hint" style={{ marginTop: 0 }}>
            Secrets are encrypted at rest and never saved inside workflow files. Reference them in any
            node field with <code>{'{{secret.NAME.password}}'}</code> or <code>{'{{secret.NAME.username}}'}</code>.
          </p>

          <div className="cred-layout">
            {/* List */}
            <div className="cred-list">
              <div className="cred-list__head">
                <span>Saved credentials ({creds.length})</span>
                <button className="btn btn--secondary btn--sm" onClick={startNew}>+ New</button>
              </div>
              {creds.length === 0 ? (
                <div className="cred-empty">No credentials yet.</div>
              ) : creds.map(c => (
                <div key={c.name} className={`cred-item${form.name === c.name && editing ? ' cred-item--active' : ''}`}>
                  <div className="cred-item__main" onClick={() => startEdit(c)}>
                    <div className="cred-item__name">{c.name}</div>
                    <div className="cred-item__sub">
                      {c.username || <span className="hist-muted">no username</span>}
                      <span className="cred-item__dots"> · ••••••</span>
                      {!c.encrypted && c.hasSecret && <span className="cred-item__badge">obfuscated</span>}
                    </div>
                  </div>
                  <button className="cred-item__del" title="Delete" onClick={() => remove(c.name)}>
                    <IconTrash size={14} />
                  </button>
                </div>
              ))}
            </div>

            {/* Form */}
            <div className="cred-form">
              <h4 className="settings-section__title">{editing ? 'Edit credential' : 'New credential'}</h4>
              <div className="settings-field">
                <label>Name</label>
                <input
                  type="text" value={form.name} disabled={editing}
                  placeholder="e.g. PortalLogin"
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="settings-field">
                <label>Username</label>
                <input
                  type="text" value={form.username}
                  placeholder="user@example.com"
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                />
              </div>
              <div className="settings-field">
                <label>Secret / Password</label>
                <input
                  type="password" value={form.secret}
                  placeholder={editing ? 'Leave blank to keep current' : 'Enter secret'}
                  onChange={e => setForm(f => ({ ...f, secret: e.target.value }))}
                />
              </div>
              {error && <div className="cred-error">{error}</div>}
              <div className="cred-form__actions">
                {editing && <button className="btn btn--secondary" onClick={startNew}>Cancel</button>}
                <button className="btn btn--primary" onClick={save} disabled={saving}>
                  {saving ? 'Saving…' : editing ? 'Update' : 'Add Credential'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn--secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
