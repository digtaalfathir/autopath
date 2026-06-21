# Manufactura Connect — QA Lab

A self-contained **local demo environment** for regression-testing Manufactura
Connect after every change. No public sites, no real email, no cloud — every
service runs on your machine.

What's inside:

| Service | What it provides | For testing |
|---|---|---|
| Demo Web App (`:4000`) | 8 pages: login, dashboard, form, upload, download, table, popup, iframe | All web automation nodes |
| Demo Database | `data/demo.db` (SQLite) — users / vin_queue / execution_log | DB nodes |
| Demo Excel | `data/sample.xlsx` — Users / VIN / Result (100 rows each) | Excel nodes |
| Demo Files | `test-files/sample.{txt,json,csv}` | File System nodes |
| Email Mock (`:1025`) | SMTP sink saving messages to `mailbox/` | Send Email node |
| 10 Demo Workflows | `flows/*.json` | End-to-end regression |
| `TESTING_GUIDE.md` | Regression test matrix | Manual/repeatable QA |

---

## 1. One-time setup

```bash
cd qa-lab
npm install          # express + multer + smtp-server (web + mail mock)
npm run setup        # generate demo.db, sample.xlsx, test-files, download sample
```

> The seed scripts reuse `exceljs` and `sql.js` from the project root
> `node_modules` (Node resolves them up the tree) — no duplicate install.

## 2. Start the lab

```bash
npm start            # web app (:4000) + SMTP sink (:1025) together
# or individually:
npm run web          # http://localhost:4000
npm run mail         # SMTP sink on localhost:1025
```

Verify: open <http://localhost:4000> → login with **admin / admin123**.

## 3. Run the regression suite

1. Launch Manufactura Connect (`npm run dev` from the project root).
2. **Open** each workflow in `qa-lab/flows/` (the Open dialog can browse here).
3. Press **Run** and confirm the expected result (see `TESTING_GUIDE.md`).

Demo credentials: **admin / admin123**

---

## Folder structure

```text
qa-lab/
├── package.json          # web + mail mock deps + scripts
├── setup.js              # generates all demo data
├── server.js             # Express demo web app (:4000)
├── mail-mock.js          # SMTP sink (:1025) → mailbox/*.eml
├── start-all.js          # run web + mail together (npm start)
├── seed/
│   ├── seed-db.js        # SQLite demo.db (sql.js)
│   ├── make-excel.js     # sample.xlsx (exceljs)
│   └── make-files.js     # sample.txt / .json / .csv
├── flows/                # 10 demo workflows (01..10)
├── test-files/           # generated source files (read/move/delete targets)
├── data/                 # generated: demo.db, sample.xlsx, downloads/ (gitignored)
├── uploads/              # received uploads (gitignored)
├── mailbox/              # captured emails (gitignored)
└── TESTING_GUIDE.md      # regression test matrix
```

## Notes on paths

Workflow file/DB/Excel paths are written **relative to the app's working
directory** (the project root in `npm run dev`), e.g. `qa-lab/data/demo.db`.
On a packaged/installed build, change them to absolute paths.

## Email: Send vs Read

- **Send Email** is fully testable with the bundled SMTP sink (`npm run mail`).
- **Read Email / Move / Mark Read / Delete** need an IMAP server. The sink does
  not serve IMAP. To test the full inbound flow locally, run **GreenMail**
  (SMTP+IMAP) — see `TESTING_GUIDE.md` § Email.
