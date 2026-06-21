# Manufactura Connect — Regression Test Matrix

Run this suite after every change (new feature, refactor, dependency bump) to
confirm nothing regressed. Each row maps a **feature** → **demo workflow** →
**steps** → **expected result**.

**Prerequisites**
1. `cd qa-lab && npm install && npm run setup`
2. `npm start` (web `:4000` + SMTP sink `:1025`)
3. Launch the app (`npm run dev` from project root)
4. Demo login: **admin / admin123**

Legend: ✅ pass criteria. Workflows are in `qa-lab/flows/`.

---

## 1. Login Workflow — `01 Login Workflow.json`

| Feature | Step | Expected |
|---|---|---|
| Open Browser | Run workflow | Browser launches |
| Navigate URL | → `/login` | Login page loads |
| Input Text | fill `#username`, `#password` | Fields contain admin / admin123 |
| Click Element (wait nav) | click `#login-btn` | Form submits, page navigates |
| **Wait URL** | wait for `dashboard` | ✅ URL changes to `/dashboard` |
| Get Text | read `#current-user` | ✅ `user` = `admin`, logged to console |

## 2. Form Submit Workflow — `02 Form Submit Workflow.json`

| Feature | Step | Expected |
|---|---|---|
| Input Text | name / email / vin | Fields filled |
| **Select Dropdown** | `#status` = `in_progress` | Option selected |
| Scroll To Element | `#scroll-marker` | Page scrolls to bottom marker |
| Hover | `#submit-btn` | No error |
| Click (wait nav) | `#submit-btn` | Result page loads |
| Get Text | `#result` | ✅ `Saved: Budi | budi@example.com | VIN12345 | in_progress` |

## 3. Upload Workflow — `03 Upload Workflow.json`

| Feature | Step | Expected |
|---|---|---|
| **Upload File** | set `#file` = `sample.csv` | File attached to input |
| Click (wait nav) | `#upload-btn` | Upload submitted |
| Get Text | `#upload-result` | ✅ `Uploaded: sample.csv` |

## 4. Download Workflow — `04 Download Workflow.json`

| Feature | Step | Expected |
|---|---|---|
| **Download File** | trigger `#download-btn` | Download fires |
| (save) | to `qa-lab/data/downloads` | ✅ `csvPath` set, file saved on disk |

## 5. Popup Workflow — `05 Popup Workflow.json`

| Feature | Step | Expected |
|---|---|---|
| **Wait Popup / Switch Tab** | trigger `#open-popup-btn` | New tab captured & active |
| Get Text | `#popup-content` | ✅ contains `VIN-POPUP-001` |
| Close Tab | — | Returns to first tab |

## 6. Iframe Workflow — `06 Iframe Workflow.json`

| Feature | Step | Expected |
|---|---|---|
| **Switch Frame** | `#demo-frame` | Element nodes now act inside iframe |
| Input Text | `#frame-input` | Typed inside frame |
| Click | `#frame-btn` | Frame updates |
| Get Text | `#frame-result` | ✅ `Frame OK: hello-frame` |
| Exit Frame | — | Back to main page |

## 7. Database Workflow — `07 Database Workflow.json`

| Feature | Step | Expected |
|---|---|---|
| Connect DB | `qa-lab/data/demo.db` | Connected |
| **Query** | `SELECT ... vin_queue LIMIT 10` | `rows` = 10 records |
| ForEach | over `rows` | Logs each `VIN xxx = status` |
| Execute | INSERT into execution_log | Runs without error |
| Disconnect | — | ✅ Workflow SUCCESS |

## 8. Excel Workflow — `08 Excel Workflow.json`

| Feature | Step | Expected |
|---|---|---|
| Open Excel | `sample.xlsx` → `wb` | Workbook handle in `{{wb}}` |
| **Read Range** | `VIN!A2:D11` | `vinRows` = 10 rows |
| Write Cell | `Result!B2` = PROCESSED | Cell updated |
| Save Excel | → `sample-out.xlsx` | ✅ New file written |
| Close Excel | — | Workflow SUCCESS |

## 9. File Workflow — `09 File Workflow.json`

| Feature | Step | Expected |
|---|---|---|
| Write File | `data/work/out.txt` | File created |
| Read File | → `content` | Content read |
| Move File | out.txt → moved.txt | Renamed |
| Delete File | moved.txt | ✅ Removed, workflow SUCCESS |

## 10. Email Workflow — `10 Email Workflow.json`

| Feature | Step | Expected |
|---|---|---|
| **Send Email** | host `localhost:1025` | Sent to SMTP sink |
| (attachment) | `sample.csv` | ✅ `mailbox/mail_*.eml` appears; mail mock logs subject |

---

## Cross-cutting checks (run during any workflow)

| Capability | How to verify |
|---|---|
| **Variables / interpolation** | `{{user}}`, `{{vinRows.length}}` resolve in logs |
| **IF / ForEach / TryCatch** | DB workflow ForEach; add a Try/Catch around any step |
| **Resilient selector** | Edit a primary selector to a wrong value but keep `selectorFallbacks` → still resolves (WARN logged) |
| **Timeout guard** | Settings → Execution; set a low node timeout, point a wait at a missing element → fails fast |
| **Cycle detection** | Connect an edge backwards → validation blocks the run |
| **Credential Vault** | Store `Mail` secret; use `{{secret.Mail.password}}` in Send Email |
| **Screenshot-on-error** | Force a web step to fail → History report shows the screenshot |
| **Run History / Report** | Every run appears with status + duration |
| **Scheduler** | Schedule any published workflow; confirm it fires |

---

## Email § Full inbound testing (IMAP)

The bundled SMTP sink captures outgoing mail only. To test **Read Email / Save
Attachment / Move / Mark Read / Delete** locally, run a combined SMTP+IMAP test
server such as **GreenMail**:

```bash
docker run -d --name greenmail -p 3025:3025 -p 3143:3143 greenmail/standalone:latest
```

- Send Email → host `localhost`, port `3025`, SSL off
- Read Email → host `localhost`, port `3143`, SSL off, any user/pass (GreenMail auto-creates accounts)

Then run the email pipeline flow at the project root:
`flows/Demo Email Attachment Pipeline.json`.

---

## Suggested regression run order

1. Start lab (`npm start`) + app (`npm run dev`)
2. Run flows **01 → 10** in order; confirm each ✅
3. Spot-check the cross-cutting table
4. If all green → safe to ship. If any red → the last change regressed it.
