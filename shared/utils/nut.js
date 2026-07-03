'use strict';

// Lazy loader for @nut-tree-fork/nut-js shared by the Desktop node groups.
// Kept out of module top-level so nodes stay loadable where nut.js is missing
// or the OS can't do input; the helpful error surfaces only at run time.

let _nut = null;
function loadNut() {
  if (_nut) return _nut;
  try { _nut = require('@nut-tree-fork/nut-js'); }
  catch { throw new Error('Desktop automation requires "@nut-tree-fork/nut-js". Run: npm install @nut-tree-fork/nut-js'); }
  try {
    _nut.keyboard.config.autoDelayMs = 20;
    _nut.mouse.config.mouseSpeed     = 2000;
  } catch (_) {}
  return _nut;
}

module.exports = { loadNut };
