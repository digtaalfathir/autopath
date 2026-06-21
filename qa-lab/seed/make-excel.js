'use strict';

// Generates qa-lab/data/sample.xlsx using exceljs (resolved from repo root
// node_modules). Sheets: Users, VIN, Result — 100+ rows each.

const path = require('path');
const fs   = require('fs');
const ExcelJS = require('exceljs');

const OUT = path.join(__dirname, '..', 'data', 'sample.xlsx');

(async () => {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Manufactura Connect QA Lab';

  const users = wb.addWorksheet('Users');
  users.addRow(['ID', 'Name', 'Email', 'Role']);
  for (let i = 1; i <= 100; i++) users.addRow([i, `User ${i}`, `user${i}@example.com`, ['admin', 'operator', 'viewer'][i % 3]]);

  const vin = wb.addWorksheet('VIN');
  vin.addRow(['ID', 'VIN', 'Status', 'Owner']);
  for (let i = 1; i <= 100; i++) vin.addRow([i, `VIN${String(i).padStart(5, '0')}`, ['NEW', 'IN_PROGRESS', 'DONE'][i % 3], `User ${i}`]);

  const result = wb.addWorksheet('Result');
  result.addRow(['ID', 'VIN', 'Processed', 'Note']);
  for (let i = 1; i <= 100; i++) result.addRow([i, `VIN${String(i).padStart(5, '0')}`, '', '']);

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  await wb.xlsx.writeFile(OUT);
  console.log(`✓ Excel seeded → ${OUT} (Users/VIN/Result, 100 rows each)`);
})().catch(e => { console.error('make-excel failed:', e); process.exit(1); });
