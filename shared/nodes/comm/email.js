'use strict';

// Communication library — Email nodes (SMTP send + IMAP read/manage).
// Dependencies are lazily required so the module loads even if a package is
// missing; the node then fails at runtime with a clear, actionable message.
// Passwords accept {{secret.NAME.password}} from the Credential Vault.

const fs   = require('fs');
const path = require('path');
const { interpolate } = require('../../utils/interpolate');

const CAT = 'Communication';
const COLOR = '#0EA5E9';

function lazy(mod, hint) {
  try { return require(mod); }
  catch { throw new Error(`"${mod}" is not installed. Run: npm install ${mod} (${hint})`); }
}

const num  = (v, d) => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : d; };
const bool = v => v === true || v === 'true';
const splitList = s => String(s || '').split(/[\n,;]+/).map(x => x.trim()).filter(Boolean);

// ── SMTP: Send Email ──────────────────────────────────────────
const sendEmail = {
  meta: { type: 'sendEmail', label: 'Send Email', category: CAT, description: 'Send an email via SMTP (HTML/plain + attachments)', color: COLOR },
  defaults: {
    smtpHost: '', smtpPort: '587', secure: false, username: '', password: '',
    from: '', to: '', cc: '', bcc: '', subject: '', body: '', bodyType: 'html', attachments: '',
  },
  schema: [
    { key: 'smtpHost',    label: 'SMTP Host', type: 'text', placeholder: 'smtp.gmail.com' },
    { key: 'smtpPort',    label: 'SMTP Port', type: 'text', placeholder: '587' },
    { key: 'secure',      label: 'SSL/TLS (port 465)', type: 'boolean' },
    { key: 'username',    label: 'Username', type: 'text', placeholder: 'user@example.com' },
    { key: 'password',    label: 'Password', type: 'text', placeholder: '{{secret.Mail.password}}', hint: 'Supports {{secret.NAME.password}}.' },
    { key: 'from',        label: 'From', type: 'text', placeholder: 'Bot <bot@example.com>' },
    { key: 'to',          label: 'To', type: 'text', placeholder: 'a@x.com, b@x.com' },
    { key: 'cc',          label: 'Cc', type: 'text', placeholder: 'optional' },
    { key: 'bcc',         label: 'Bcc', type: 'text', placeholder: 'optional' },
    { key: 'subject',     label: 'Subject', type: 'text', placeholder: 'Report ready' },
    { key: 'bodyType',    label: 'Body Type', type: 'select', options: ['html', 'text'] },
    { key: 'body',        label: 'Body', type: 'textarea', placeholder: '<h1>Hello</h1> or plain text. Supports {{variable}}.' },
    { key: 'attachments', label: 'Attachments', type: 'textarea', placeholder: 'C:\\a.pdf, C:\\b.xlsx (one per line or comma-separated)' },
  ],
  execute: async (data, context, engine) => {
    const nodemailer = lazy('nodemailer', 'SMTP send');
    const V = k => interpolate(data[k] ?? '', context.variables);

    const host = V('smtpHost').trim();
    const to   = splitList(V('to'));
    if (!host) throw new Error('Send Email: SMTP Host is required.');
    if (!to.length) throw new Error('Send Email: at least one "To" recipient is required.');

    const transporter = nodemailer.createTransport({
      host, port: num(V('smtpPort'), 587), secure: bool(data.secure),
      auth: V('username') ? { user: V('username'), pass: V('password') } : undefined,
    });

    const atts = splitList(V('attachments')).map(p => ({ path: p, filename: path.basename(p) }));
    const bodyType = (data.bodyType || 'html').toLowerCase();
    const body = V('body');

    const mail = {
      from: V('from') || V('username'),
      to, cc: splitList(V('cc')), bcc: splitList(V('bcc')),
      subject: V('subject'),
      [bodyType === 'text' ? 'text' : 'html']: body,
      attachments: atts,
    };

    engine.log('INFO', `Sending email → ${to.join(', ')} (subject: "${mail.subject}")`);
    const info = await transporter.sendMail(mail);
    engine.log('SUCCESS', `Email sent (id: ${info.messageId})`);
  },
};

// ── IMAP helpers ──────────────────────────────────────────────
function imapConfigFrom(data, context) {
  const V = k => interpolate(data[k] ?? '', context.variables);
  const host = V('imapHost').trim();
  if (!host) throw new Error('Read Email: IMAP Host is required.');
  return {
    host,
    port: num(V('imapPort'), 993),
    secure: data.secure === undefined ? true : bool(data.secure),
    auth: { user: V('username'), pass: V('password') },
  };
}

async function withImap(config, folder, fn) {
  const { ImapFlow } = lazy('imapflow', 'IMAP read/manage');
  const client = new ImapFlow({ ...config, logger: false });
  await client.connect();
  const lock = await client.getMailboxLock(folder || 'INBOX');
  try { return await fn(client); }
  finally { lock.release(); await client.logout().catch(() => {}); }
}

function requireImapContext(context) {
  if (!context.imap || !context.imap.config) {
    throw new Error('No IMAP session. Add a "Read Email" node earlier in the workflow.');
  }
  return context.imap;
}

// ── IMAP: Read Email ──────────────────────────────────────────
const readEmail = {
  meta: { type: 'readEmail', label: 'Read Email', category: CAT, description: 'Read emails from an IMAP mailbox into an array', color: COLOR },
  defaults: {
    imapHost: '', imapPort: '993', secure: true, username: '', password: '',
    folder: 'INBOX', unreadOnly: true, limit: '25', outputVariable: 'emails',
  },
  schema: [
    { key: 'imapHost',       label: 'IMAP Host', type: 'text', placeholder: 'imap.gmail.com' },
    { key: 'imapPort',       label: 'IMAP Port', type: 'text', placeholder: '993' },
    { key: 'secure',         label: 'SSL/TLS', type: 'boolean' },
    { key: 'username',       label: 'Username', type: 'text', placeholder: 'user@example.com' },
    { key: 'password',       label: 'Password', type: 'text', placeholder: '{{secret.Mail.password}}', hint: 'Supports {{secret.NAME.password}}.' },
    { key: 'folder',         label: 'Folder', type: 'text', placeholder: 'INBOX' },
    { key: 'unreadOnly',     label: 'Unread Only', type: 'boolean' },
    { key: 'limit',          label: 'Max Emails', type: 'text', placeholder: '25' },
    { key: 'outputVariable', label: 'Output Variable', type: 'text', placeholder: 'emails', hint: 'Array of email objects — use with For Each.' },
  ],
  execute: async (data, context, engine) => {
    const { simpleParser } = lazy('mailparser', 'email parsing');
    const config = imapConfigFrom(data, context);
    const folder = interpolate(data.folder || 'INBOX', context.variables) || 'INBOX';
    const limit  = Math.max(1, num(interpolate(String(data.limit || '25'), context.variables), 25));
    const out    = (data.outputVariable || 'emails').trim();

    engine.log('INFO', `Reading email from ${config.host}/${folder} (${bool(data.unreadOnly) ? 'unread' : 'all'})…`);

    const emails = await withImap(config, folder, async (client) => {
      let uids = await client.search(bool(data.unreadOnly) ? { seen: false } : { all: true }, { uid: true });
      uids = (uids || []).sort((a, b) => b - a).slice(0, limit);   // newest first
      const result = [];
      if (uids.length) {
        for await (const msg of client.fetch(uids, { uid: true, source: true }, { uid: true })) {
          const p = await simpleParser(msg.source);
          result.push({
            id:      msg.uid,
            subject: p.subject || '',
            from:    p.from?.text || '',
            to:      p.to?.text || '',
            date:    p.date ? p.date.toISOString() : '',
            body:    p.text || '',
            html:    p.html || '',
            attachments: (p.attachments || []).map(a => ({
              filename: a.filename || `attachment_${Date.now()}`,
              contentType: a.contentType || 'application/octet-stream',
              size: a.size || (a.content ? a.content.length : 0),
              contentBase64: a.content ? a.content.toString('base64') : '',
            })),
          });
        }
      }
      return result;
    });

    context.variables[out] = emails;
    // Remember the session so Move/Mark Read/Delete can reconnect by id.
    context.imap = { config, folder };
    engine.log('SUCCESS', `Read ${emails.length} email(s) → {{${out}}}`);
  },
};

// ── Save Attachment ───────────────────────────────────────────
const saveAttachment = {
  meta: { type: 'saveAttachment', label: 'Save Attachment', category: CAT, description: 'Save attachments of an email (or array) to disk', color: COLOR },
  defaults: { emailVariable: '{{item}}', saveDirectory: '', outputVariable: 'savedFiles' },
  schema: [
    { key: 'emailVariable',  label: 'Email Variable', type: 'text', placeholder: '{{item}}', hint: 'An email object (from For Each) or an array of emails.' },
    { key: 'saveDirectory',  label: 'Save Directory', type: 'text', placeholder: 'C:\\attachments' },
    { key: 'outputVariable', label: 'Output Variable', type: 'text', placeholder: 'savedFiles' },
  ],
  execute: async (data, context, engine) => {
    const raw = interpolate(data.emailVariable ?? '', context.variables);
    let email = raw;
    if (typeof raw === 'string') { try { email = JSON.parse(raw); } catch { /* leave */ } }
    const emails = Array.isArray(email) ? email : [email];

    const dir = (interpolate(data.saveDirectory || '', context.variables) || '').trim();
    if (!dir) throw new Error('Save Attachment: save directory is required.');
    fs.mkdirSync(dir, { recursive: true });

    const saved = [];
    for (const e of emails) {
      for (const a of (e?.attachments || [])) {
        if (!a.contentBase64) continue;
        let dest = path.join(dir, a.filename);
        let i = 1;
        while (fs.existsSync(dest)) {
          const ext = path.extname(a.filename), base = path.basename(a.filename, ext);
          dest = path.join(dir, `${base}_${i++}${ext}`);
        }
        fs.writeFileSync(dest, Buffer.from(a.contentBase64, 'base64'));
        saved.push(dest);
      }
    }
    const out = (data.outputVariable || 'savedFiles').trim();
    context.variables[out] = saved;
    engine.log('SUCCESS', `Saved ${saved.length} attachment(s) → {{${out}}}`);
  },
};

// ── Move / Mark Read / Delete (reuse Read Email session) ──────
const moveEmail = {
  meta: { type: 'moveEmail', label: 'Move Email', category: CAT, description: 'Move an email to another folder', color: COLOR },
  defaults: { emailId: '{{item.id}}', targetFolder: 'Archive' },
  schema: [
    { key: 'emailId',      label: 'Email Id (uid)', type: 'text', placeholder: '{{item.id}}' },
    { key: 'targetFolder', label: 'Target Folder', type: 'text', placeholder: 'Archive' },
  ],
  execute: async (data, context, engine) => {
    const { config, folder } = requireImapContext(context);
    const uid    = num(interpolate(String(data.emailId ?? ''), context.variables), 0);
    const target = interpolate(data.targetFolder || '', context.variables).trim();
    if (!uid) throw new Error('Move Email: emailId is required.');
    if (!target) throw new Error('Move Email: target folder is required.');
    await withImap(config, folder, client => client.messageMove(String(uid), target, { uid: true }));
    engine.log('SUCCESS', `Moved email #${uid} → ${target}`);
  },
};

const markEmailRead = {
  meta: { type: 'markEmailRead', label: 'Mark Email Read', category: CAT, description: 'Flag an email as read (\\Seen)', color: COLOR },
  defaults: { emailId: '{{item.id}}' },
  schema: [{ key: 'emailId', label: 'Email Id (uid)', type: 'text', placeholder: '{{item.id}}' }],
  execute: async (data, context, engine) => {
    const { config, folder } = requireImapContext(context);
    const uid = num(interpolate(String(data.emailId ?? ''), context.variables), 0);
    if (!uid) throw new Error('Mark Email Read: emailId is required.');
    await withImap(config, folder, client => client.messageFlagsAdd(String(uid), ['\\Seen'], { uid: true }));
    engine.log('SUCCESS', `Marked email #${uid} as read`);
  },
};

const deleteEmail = {
  meta: { type: 'deleteEmail', label: 'Delete Email', category: CAT, description: 'Delete an email from the mailbox', color: '#DC2626' },
  defaults: { emailId: '{{item.id}}' },
  schema: [{ key: 'emailId', label: 'Email Id (uid)', type: 'text', placeholder: '{{item.id}}' }],
  execute: async (data, context, engine) => {
    const { config, folder } = requireImapContext(context);
    const uid = num(interpolate(String(data.emailId ?? ''), context.variables), 0);
    if (!uid) throw new Error('Delete Email: emailId is required.');
    await withImap(config, folder, client => client.messageDelete(String(uid), { uid: true }));
    engine.log('SUCCESS', `Deleted email #${uid}`);
  },
};

module.exports = { handlers: [sendEmail, readEmail, saveAttachment, moveEmail, markEmailRead, deleteEmail] };
