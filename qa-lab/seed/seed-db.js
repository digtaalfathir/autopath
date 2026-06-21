'use strict';

// Generates qa-lab/data/demo.db (SQLite) using sql.js (resolved from the
// repo root node_modules). Tables: users, vin_queue, execution_log — 50+ rows.

const path = require('path');
const fs   = require('fs');
const initSqlJs = require('sql.js');

const OUT = path.join(__dirname, '..', 'data', 'demo.db');

(async () => {
  const SQL = await initSqlJs();
  const db  = new SQL.Database();

  db.run(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY, name TEXT, email TEXT, role TEXT, active INTEGER
    );
    CREATE TABLE vin_queue (
      id INTEGER PRIMARY KEY, vin TEXT, status TEXT, assigned_to TEXT, created_at TEXT
    );
    CREATE TABLE execution_log (
      id INTEGER PRIMARY KEY, workflow TEXT, status TEXT, message TEXT, logged_at TEXT
    );
  `);

  const roles    = ['admin', 'operator', 'viewer'];
  const statuses = ['NEW', 'IN_PROGRESS', 'DONE', 'FAILED'];

  for (let i = 1; i <= 50; i++) {
    db.run('INSERT INTO users VALUES (?,?,?,?,?)',
      [i, `User ${i}`, `user${i}@example.com`, roles[i % 3], i % 5 === 0 ? 0 : 1]);
  }
  for (let i = 1; i <= 60; i++) {
    db.run('INSERT INTO vin_queue VALUES (?,?,?,?,?)',
      [i, `VIN${String(i).padStart(5, '0')}`, statuses[i % 4], `User ${1 + (i % 50)}`, '2026-01-01T08:00:00Z']);
  }
  for (let i = 1; i <= 50; i++) {
    db.run('INSERT INTO execution_log VALUES (?,?,?,?,?)',
      [i, `Workflow ${1 + (i % 10)}`, statuses[i % 4], `Run #${i}`, '2026-01-02T09:00:00Z']);
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, Buffer.from(db.export()));
  db.close();
  console.log(`✓ SQLite seeded → ${OUT} (users=50, vin_queue=60, execution_log=50)`);
})().catch(e => { console.error('seed-db failed:', e); process.exit(1); });
