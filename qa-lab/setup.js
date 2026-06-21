'use strict';

// One-shot QA Lab data setup: SQLite + Excel + test files + download sample.
// Run from repo root or qa-lab: `node qa-lab/setup.js`  /  `npm run setup`.

const { execFileSync } = require('child_process');
const path = require('path');
const fs   = require('fs');

const here = __dirname;
const run  = f => execFileSync(process.execPath, [path.join(here, 'seed', f)], { stdio: 'inherit' });

console.log('— Manufactura Connect QA Lab setup —');
run('seed-db.js');
run('make-excel.js');
run('make-files.js');

// Sample download file (also created lazily by the server)
const dl = path.join(here, 'data', 'sample-download.csv');
fs.mkdirSync(path.dirname(dl), { recursive: true });
fs.writeFileSync(dl, 'id,name,vin\n1,Alpha,VIN0001\n2,Bravo,VIN0002\n3,Charlie,VIN0003\n');

console.log('\n✓ QA Lab ready. Next:');
console.log('  cd qa-lab && npm install   (first time, for web + mail mock)');
console.log('  npm run web                (http://localhost:4000)');
console.log('  npm run mail               (SMTP sink on :1025)');
