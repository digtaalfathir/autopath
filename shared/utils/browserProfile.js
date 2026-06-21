'use strict';

const os   = require('os');
const path = require('path');

// Shared location for the "user / persistent" browser profile so that BOTH the
// Element Picker and the Open Browser node use the SAME session (cookies,
// logins, extensions) — keeping captured selectors consistent with execution.
function defaultUserDataDir() {
  return path.join(os.homedir(), '.manufactura-connect', 'chrome-profile');
}

module.exports = { defaultUserDataDir };
