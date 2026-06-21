'use strict';

// Convenience launcher: starts the demo web app + SMTP sink together.
// `npm start` (inside qa-lab). Ctrl+C stops both.

const { fork } = require('child_process');
const path = require('path');

const procs = [
  fork(path.join(__dirname, 'server.js')),
  fork(path.join(__dirname, 'mail-mock.js')),
];

const stop = () => { procs.forEach(p => { try { p.kill(); } catch (_) {} }); process.exit(0); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
console.log('QA Lab running (web :4000 + SMTP :1025). Press Ctrl+C to stop.');
