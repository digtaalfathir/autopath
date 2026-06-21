'use strict';

// Generates qa-lab/test-files/ with sample.txt, sample.json, sample.csv
// (fresh copies under qa-lab/data/test-files so destructive tests don't
// dirty the source). Read/Write/Move/Delete File nodes target these.

const path = require('path');
const fs   = require('fs');

const DIR = path.join(__dirname, '..', 'test-files');
fs.mkdirSync(DIR, { recursive: true });

fs.writeFileSync(path.join(DIR, 'sample.txt'),
  'Manufactura Connect QA Lab\nLine 2: hello world\nLine 3: VIN00001\n');

fs.writeFileSync(path.join(DIR, 'sample.json'),
  JSON.stringify({ project: 'Manufactura Connect', vins: ['VIN00001', 'VIN00002', 'VIN00003'], count: 3 }, null, 2));

let csv = 'id,vin,status\n';
for (let i = 1; i <= 20; i++) csv += `${i},VIN${String(i).padStart(5, '0')},${['NEW', 'DONE'][i % 2]}\n`;
fs.writeFileSync(path.join(DIR, 'sample.csv'), csv);

console.log(`✓ Test files created → ${DIR} (sample.txt, sample.json, sample.csv)`);
