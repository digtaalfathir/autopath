'use strict';

const os   = require('os');
const path = require('path');

// App-managed persistent profile (a dedicated, initially-empty profile that
// keeps whatever you log into *inside* automation across runs). Good for
// unattended robots/servers that have no real Chrome to borrow from.
function defaultUserDataDir() {
  return path.join(os.homedir(), '.manufactura-connect', 'chrome-profile');
}

// The REAL system Chrome "User Data" directory — contains the user's actual
// profiles (Default, Profile 1, ...) with their logins, cookies and extensions.
// Used by "user" profile mode. NOTE: Chrome locks this while it is running, so
// it must be fully closed before automation can open it.
function systemChromeUserDataDir() {
  switch (process.platform) {
    case 'win32':
      return path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'),
                       'Google', 'Chrome', 'User Data');
    case 'darwin':
      return path.join(os.homedir(), 'Library', 'Application Support', 'Google', 'Chrome');
    default: // linux
      return path.join(os.homedir(), '.config', 'google-chrome');
  }
}

// Heuristic: does an error look like "profile is locked / Chrome already running"?
function isProfileLockError(message = '') {
  return /singleton|already (in use|running)|process_?singleton|lock|cannot create|being used|in use by/i.test(message);
}

module.exports = { defaultUserDataDir, systemChromeUserDataDir, isProfileLockError };
