import React, { useState, useEffect } from 'react';
import { IconX, IconBell, IconSettings } from './Icons';

const TABS = ['General', 'Notifications', 'Communication', 'System', 'Robot API', 'Execution'];

export function SettingsModal({ onClose }) {
  const [tab,      setTab]      = useState('General');
  const [settings, setSettings] = useState(null);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);

  useEffect(() => {
    window.electronAPI.getSettings().then(res => {
      if (res.success) setSettings(res.settings);
    });
  }, []);

  if (!settings) return null;

  const notif = settings.notifications;
  const rApi  = settings.robotApi;
  const exec  = settings.execution    || { workflowTimeoutMs: 0, nodeTimeoutMs: 0, maxSteps: 0 };
  const gen   = settings.general      || { theme: 'light', language: 'en' };
  const sys   = settings.system       || { autoStart: false, startMinimized: false, closeToTray: true };
  const comm  = settings.communication|| { smtp: {}, imap: {} };

  const patch = (path, value) => {
    const keys = path.split('.');
    setSettings(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      let obj = next;
      for (let i = 0; i < keys.length - 1; i++) { obj[keys[i]] = obj[keys[i]] || {}; obj = obj[keys[i]]; }
      obj[keys[keys.length - 1]] = value;
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    await window.electronAPI.saveSettings(settings);
    // Persist theme/language hints on the document (full theming is future work)
    try {
      document.documentElement.setAttribute('data-theme', settings.general?.theme || 'light');
      document.documentElement.setAttribute('lang', settings.general?.language || 'en');
    } catch (_) {}
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog settings-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title"><IconSettings /> Settings</span>
          <button className="modal-close" onClick={onClose}><IconX size={14} /></button>
        </div>

        <div className="settings-tabs">
          {TABS.map(t => (
            <button
              key={t}
              className={`settings-tab${tab === t ? ' settings-tab--active' : ''}`}
              onClick={() => setTab(t)}
            >{t}</button>
          ))}
        </div>

        <div className="settings-body">
          {/* ── General ─────────────────────────────────────────── */}
          {tab === 'General' && (
            <div className="settings-section">
              <h4 className="settings-section__title">Appearance</h4>
              <div className="settings-field settings-field--short">
                <label>Theme</label>
                <select value={gen.theme} onChange={e => patch('general.theme', e.target.value)}>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>
              <div className="settings-field settings-field--short">
                <label>Language</label>
                <select value={gen.language} onChange={e => patch('general.language', e.target.value)}>
                  <option value="en">English</option>
                  <option value="id">Bahasa Indonesia</option>
                </select>
              </div>
              <p className="settings-hint">Theme &amp; language preferences are saved per machine.</p>
            </div>
          )}

          {/* ── Notifications ───────────────────────────────────── */}
          {tab === 'Notifications' && (
            <div className="settings-section">
              <h4 className="settings-section__title"><IconBell size={14} /> Desktop Notifications</h4>
              <label className="settings-row">
                <input type="checkbox" checked={!!notif.desktopOnSuccess} onChange={e => patch('notifications.desktopOnSuccess', e.target.checked)} />
                Notify on job success
              </label>
              <label className="settings-row">
                <input type="checkbox" checked={!!notif.desktopOnFailure} onChange={e => patch('notifications.desktopOnFailure', e.target.checked)} />
                Notify on job failure
              </label>

              <h4 className="settings-section__title" style={{ marginTop: 20 }}>Email Notifications</h4>
              <label className="settings-row">
                <input type="checkbox" checked={!!notif.emailEnabled} onChange={e => patch('notifications.emailEnabled', e.target.checked)} />
                Enable email notifications
              </label>
              {notif.emailEnabled && (
                <>
                  <label className="settings-row">
                    <input type="checkbox" checked={!!notif.emailOnSuccess} onChange={e => patch('notifications.emailOnSuccess', e.target.checked)} />
                    Email on success
                  </label>
                  <label className="settings-row">
                    <input type="checkbox" checked={!!notif.emailOnFailure} onChange={e => patch('notifications.emailOnFailure', e.target.checked)} />
                    Email on failure
                  </label>
                  <p className="settings-hint">SMTP server is configured in the <strong>Communication</strong> tab.</p>
                </>
              )}
            </div>
          )}

          {/* ── Communication (SMTP / IMAP profiles) ────────────── */}
          {tab === 'Communication' && (
            <div className="settings-section">
              <h4 className="settings-section__title">SMTP Profile (outgoing)</h4>
              <div className="settings-field"><label>Host</label>
                <input type="text" value={notif.smtp.host} onChange={e => patch('notifications.smtp.host', e.target.value)} placeholder="smtp.gmail.com" /></div>
              <div className="settings-field settings-field--short"><label>Port</label>
                <input type="number" value={notif.smtp.port} onChange={e => patch('notifications.smtp.port', Number(e.target.value))} /></div>
              <label className="settings-row">
                <input type="checkbox" checked={!!notif.smtp.secure} onChange={e => patch('notifications.smtp.secure', e.target.checked)} /> SSL/TLS
              </label>
              <div className="settings-field"><label>Username</label>
                <input type="text" value={notif.smtp.user} onChange={e => patch('notifications.smtp.user', e.target.value)} placeholder="user@example.com" /></div>
              <div className="settings-field"><label>Password</label>
                <input type="password" value={notif.smtp.pass} onChange={e => patch('notifications.smtp.pass', e.target.value)} /></div>
              <div className="settings-field"><label>Send To (notifications)</label>
                <input type="text" value={notif.smtp.to} onChange={e => patch('notifications.smtp.to', e.target.value)} placeholder="recipient@example.com" /></div>

              <h4 className="settings-section__title" style={{ marginTop: 20 }}>IMAP Profile (incoming)</h4>
              <div className="settings-field"><label>Host</label>
                <input type="text" value={comm.imap?.host || ''} onChange={e => patch('communication.imap.host', e.target.value)} placeholder="imap.gmail.com" /></div>
              <div className="settings-field settings-field--short"><label>Port</label>
                <input type="number" value={comm.imap?.port ?? 993} onChange={e => patch('communication.imap.port', Number(e.target.value))} /></div>
              <label className="settings-row">
                <input type="checkbox" checked={comm.imap?.secure !== false} onChange={e => patch('communication.imap.secure', e.target.checked)} /> SSL/TLS
              </label>
              <div className="settings-field"><label>Username</label>
                <input type="text" value={comm.imap?.user || ''} onChange={e => patch('communication.imap.user', e.target.value)} placeholder="user@example.com" /></div>
              <p className="settings-hint">
                Reference values for your email workflows. <strong>Send/Read Email</strong> nodes are
                self-contained — paste these in, and use <code>{'{{secret.NAME.password}}'}</code> for passwords.
              </p>
            </div>
          )}

          {/* ── System ──────────────────────────────────────────── */}
          {tab === 'System' && (
            <div className="settings-section">
              <h4 className="settings-section__title">Startup &amp; Window</h4>
              <label className="settings-row">
                <input type="checkbox" checked={!!sys.autoStart} onChange={e => patch('system.autoStart', e.target.checked)} />
                Start Autopath when Windows starts
              </label>
              <label className="settings-row">
                <input type="checkbox" checked={!!sys.startMinimized} onChange={e => patch('system.startMinimized', e.target.checked)} />
                Start minimized to tray
              </label>
              <label className="settings-row">
                <input type="checkbox" checked={sys.closeToTray !== false} onChange={e => patch('system.closeToTray', e.target.checked)} />
                Close to tray (X button keeps the app + scheduler running)
              </label>
              <p className="settings-hint">
                Auto start and Start minimized are ideal for unattended robot / scheduler machines.
                Auto start applies to installed builds (not dev).
              </p>
            </div>
          )}

          {/* ── Robot API ───────────────────────────────────────── */}
          {tab === 'Robot API' && (
            <div className="settings-section">
              <h4 className="settings-section__title">Remote Robot API</h4>
              <label className="settings-row">
                <input type="checkbox" checked={!!rApi.enabled} onChange={e => patch('robotApi.enabled', e.target.checked)} />
                Enable Robot API Server
              </label>
              <div className="settings-field settings-field--short">
                <label>Port</label>
                <input type="number" value={rApi.port} onChange={e => patch('robotApi.port', Number(e.target.value))} min={1024} max={65535} />
              </div>
              <p className="settings-hint">Token is auto-generated. View in <strong>Robot Manager</strong> after saving.</p>
            </div>
          )}

          {/* ── Execution ───────────────────────────────────────── */}
          {tab === 'Execution' && (
            <div className="settings-section">
              <h4 className="settings-section__title">Execution Guards</h4>
              <p className="settings-hint" style={{ marginTop: 0 }}>
                Protect unattended runs from hanging or runaway loops. Set <strong>0</strong> to disable a guard.
              </p>
              <div className="settings-field settings-field--short">
                <label>Workflow timeout (seconds)</label>
                <input type="number" min={0} value={Math.round((exec.workflowTimeoutMs || 0) / 1000)}
                  onChange={e => patch('execution.workflowTimeoutMs', Math.max(0, Number(e.target.value)) * 1000)} />
              </div>
              <p className="settings-hint">Aborts the whole run if it exceeds this. Default 1800 (30 min).</p>
              <div className="settings-field settings-field--short">
                <label>Per-node timeout (seconds)</label>
                <input type="number" min={0} value={Math.round((exec.nodeTimeoutMs || 0) / 1000)}
                  onChange={e => patch('execution.nodeTimeoutMs', Math.max(0, Number(e.target.value)) * 1000)} />
              </div>
              <p className="settings-hint">Caps each node. Keep 0 if you use long <code>Delay</code>/wait nodes.</p>
              <div className="settings-field settings-field--short">
                <label>Max steps</label>
                <input type="number" min={0} value={exec.maxSteps || 0}
                  onChange={e => patch('execution.maxSteps', Math.max(0, Number(e.target.value)))} />
              </div>
              <p className="settings-hint">Runaway-loop safety net (total nodes executed). Default 100000.</p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn--secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn--primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
