'use strict';

// Manufactura Connect — QA Lab demo web app (http://localhost:4000)
// Pure Express + multer. Server-rendered pages with STABLE selectors so
// regression workflows never break on layout changes.

const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

const PORT       = process.env.QA_PORT ? Number(process.env.QA_PORT) : 4000;
const ROOT       = __dirname;
const UPLOAD_DIR = path.join(ROOT, 'uploads');
const DL_FILE    = path.join(ROOT, 'data', 'sample-download.csv');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(path.dirname(DL_FILE), { recursive: true });

const app    = express();
const upload = multer({ dest: UPLOAD_DIR });
app.use(express.urlencoded({ extended: true }));

// ── Tiny cookie helpers (no extra deps) ──────────────────────
function getCookie(req, name) {
  const raw = req.headers.cookie || '';
  const m = raw.split(';').map(s => s.trim()).find(s => s.startsWith(name + '='));
  return m ? decodeURIComponent(m.split('=')[1]) : null;
}

function page(title, body) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<title>${title} — QA Lab</title>
<style>body{font-family:system-ui,Arial,sans-serif;margin:0;background:#f1f5f9;color:#0f172a}
.nav{background:#1e293b;color:#fff;padding:10px 16px;font-weight:600}
.wrap{max-width:760px;margin:24px auto;background:#fff;padding:24px;border-radius:10px;box-shadow:0 1px 4px rgba(0,0,0,.1)}
h1{font-size:20px;margin:0 0 16px} label{display:block;margin:10px 0 4px;font-size:13px;color:#475569}
input,select,button,textarea{font-size:14px;padding:8px 10px;border:1px solid #cbd5e1;border-radius:6px}
input,select{width:100%;box-sizing:border-box} button{background:#2563eb;color:#fff;border:none;cursor:pointer;margin-top:14px}
table{width:100%;border-collapse:collapse;font-size:13px;margin-top:12px} th,td{border:1px solid #e2e8f0;padding:6px 8px;text-align:left}
th{background:#1e293b;color:#fff} .ok{color:#15803d;font-weight:600} .err{color:#dc2626;font-weight:600}
a{color:#2563eb} iframe{width:100%;height:240px;border:1px solid #cbd5e1;border-radius:6px;margin-top:12px}</style>
</head><body><div class="nav">Manufactura Connect — QA Lab</div><div class="wrap">${body}</div></body></html>`;
}

// ── Home ─────────────────────────────────────────────────────
app.get('/', (_req, res) => res.redirect('/login'));
app.get('/health', (_req, res) => res.json({ ok: true, app: 'qa-lab', port: PORT }));

// ── 1. Login ─────────────────────────────────────────────────
app.get('/login', (req, res) => {
  const failed = req.query.error ? `<p id="login-error" class="err">Invalid credentials</p>` : '';
  res.send(page('Login', `
    <h1>Login</h1>${failed}
    <form id="login-form" method="POST" action="/login">
      <label for="username">Username</label>
      <input id="username" name="username" type="text" placeholder="admin" autocomplete="off">
      <label for="password">Password</label>
      <input id="password" name="password" type="password" placeholder="admin123">
      <button id="login-btn" type="submit">Sign In</button>
    </form>
    <p style="margin-top:16px;font-size:12px;color:#94a3b8">Demo credentials: admin / admin123</p>`));
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === 'admin123') {
    res.setHeader('Set-Cookie', `mc_user=${encodeURIComponent(username)}; Path=/`);
    return res.redirect('/dashboard');
  }
  res.redirect('/login?error=1');
});

// ── 2. Dashboard ─────────────────────────────────────────────
app.get('/dashboard', (req, res) => {
  const user = getCookie(req, 'mc_user');
  if (!user) return res.redirect('/login');
  res.send(page('Dashboard', `
    <h1 id="welcome">Welcome to the Dashboard</h1>
    <p>Current user: <strong id="current-user">${user}</strong></p>
    <p>Status: <span id="status-text">Logged in</span></p>
    <ul>
      <li><a href="/form">Form Page</a></li>
      <li><a href="/upload">Upload Page</a></li>
      <li><a href="/download">Download Page</a></li>
      <li><a href="/table">Table Page</a></li>
      <li><a href="/popup">Popup Page</a></li>
      <li><a href="/iframe">Iframe Page</a></li>
    </ul>
    <form method="POST" action="/logout"><button id="logout-btn" type="submit">Logout</button></form>`));
});

app.post('/logout', (_req, res) => {
  res.setHeader('Set-Cookie', 'mc_user=; Path=/; Max-Age=0');
  res.redirect('/login');
});

// ── 3. Form ──────────────────────────────────────────────────
app.get('/form', (_req, res) => {
  res.send(page('Form', `
    <h1>Vehicle Form</h1>
    <form id="vehicle-form" method="POST" action="/form">
      <label for="name">Nama</label><input id="name" name="name" type="text">
      <label for="email">Email</label><input id="email" name="email" type="email">
      <label for="vin">VIN</label><input id="vin" name="vin" type="text">
      <label for="status">Dropdown Status</label>
      <select id="status" name="status">
        <option value="">-- select --</option>
        <option value="new">New</option>
        <option value="in_progress">In Progress</option>
        <option value="done">Done</option>
      </select>
      <button id="submit-btn" type="submit">Submit</button>
    </form>
    <div style="height:600px"></div>
    <p id="scroll-marker">Bottom marker (scroll target)</p>`));
});

app.post('/form', (req, res) => {
  const { name, email, vin, status } = req.body;
  res.send(page('Form Result', `
    <h1>Submitted</h1>
    <p id="result" class="ok">Saved: ${name || ''} | ${email || ''} | ${vin || ''} | ${status || ''}</p>
    <a href="/form">Back to form</a>`));
});

// ── 4. Upload ────────────────────────────────────────────────
app.get('/upload', (_req, res) => {
  res.send(page('Upload', `
    <h1>Upload File</h1>
    <form id="upload-form" method="POST" action="/upload" enctype="multipart/form-data">
      <input id="file" name="file" type="file">
      <button id="upload-btn" type="submit">Upload</button>
    </form>`));
});

app.post('/upload', upload.single('file'), (req, res) => {
  const name = req.file ? req.file.originalname : '(none)';
  res.send(page('Upload Result', `
    <h1>Upload Complete</h1>
    <p id="upload-result" class="ok">Uploaded: ${name}</p>
    <a href="/upload">Upload another</a>`));
});

// ── 5. Download ──────────────────────────────────────────────
app.get('/download', (_req, res) => {
  res.send(page('Download', `
    <h1>Download Sample File</h1>
    <a id="download-btn" href="/download/file" download>Download Sample File</a>`));
});

app.get('/download/file', (_req, res) => {
  if (!fs.existsSync(DL_FILE)) {
    fs.writeFileSync(DL_FILE, 'id,name,vin\n1,Alpha,VIN0001\n2,Bravo,VIN0002\n3,Charlie,VIN0003\n');
  }
  res.download(DL_FILE, 'sample-download.csv');
});

// ── 6. Table (100 rows) ──────────────────────────────────────
app.get('/table', (_req, res) => {
  const statuses = ['New', 'In Progress', 'Done'];
  let rows = '';
  for (let i = 1; i <= 100; i++) {
    rows += `<tr><td>${i}</td><td>User ${i}</td><td>user${i}@example.com</td>` +
            `<td>VIN${String(i).padStart(5, '0')}</td><td>${statuses[i % 3]}</td></tr>`;
  }
  res.send(page('Table', `
    <h1>Data Table (100 rows)</h1>
    <table id="data-table">
      <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>VIN</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`));
});

// ── 7. Popup ─────────────────────────────────────────────────
app.get('/popup', (_req, res) => {
  res.send(page('Popup', `
    <h1>Popup Page</h1>
    <button id="open-popup-btn" onclick="window.open('/popup/window','_blank')">Open Popup</button>
    <button id="alert-btn" onclick="alert('Confirm this action')">Trigger Alert</button>`));
});

app.get('/popup/window', (_req, res) => {
  res.send(page('Popup Window', `
    <h1 id="popup-title">Popup Window</h1>
    <p id="popup-content">This is the popup content. VIN: VIN-POPUP-001</p>`));
});

// ── 8. Iframe ────────────────────────────────────────────────
app.get('/iframe', (_req, res) => {
  res.send(page('Iframe', `
    <h1>Iframe Page</h1>
    <p>The form below lives inside an iframe.</p>
    <iframe id="demo-frame" src="/iframe/inner"></iframe>`));
});

app.get('/iframe/inner', (_req, res) => {
  res.send(`<!DOCTYPE html><html><body style="font-family:system-ui;padding:14px">
    <input id="frame-input" placeholder="type here" style="padding:6px">
    <button id="frame-btn" onclick="document.getElementById('frame-result').textContent='Frame OK: '+document.getElementById('frame-input').value">Submit</button>
    <p id="frame-result">waiting</p></body></html>`);
});

app.listen(PORT, () => {
  console.log(`QA Lab web app  →  http://localhost:${PORT}`);
  console.log('Pages: /login /dashboard /form /upload /download /table /popup /iframe');
});
