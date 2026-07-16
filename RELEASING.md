# Releasing Manufactura Connect (Windows)

Builds run on **GitHub Actions (Windows runner)** — no local build, no wine.
nut.js native binaries, the FlaUI UIA sidecar, and the NSIS installer are all
built natively on Windows, then attached to a GitHub Release.

## One-time setup
1. Push this repo to GitHub (with `.github/workflows/release.yml`):
   ```bash
   git remote -v                      # must point to your GitHub repo
   git push origin feature/desktop-automation   # or main
   ```
   No secrets to configure — the workflow uses the built-in `GITHUB_TOKEN`.

## Cut a release
1. Set the version in `package.json` (this names the installer, e.g.
   `Manufactura Connect Setup 1.2.0.exe`):
   ```jsonc
   "version": "1.2.0"
   ```
2. Commit it:
   ```bash
   git commit -am "release: v1.2.0"
   git push
   ```
3. Tag and push the tag (must match, prefixed with `v`):
   ```bash
   git tag v1.2.0
   git push origin v1.2.0
   ```
4. GitHub Actions builds and publishes automatically. Watch it under the repo's
   **Actions** tab; the installer appears under **Releases** when done.

Manual run (no tag → artifact only, no Release): Actions tab → *Release Windows*
→ **Run workflow**.

## What the workflow produces
- `Manufactura Connect Setup <version>.exe` — the installer to share. Self-
  contained; bundles Electron, Node, all node modules (incl. nut.js Windows
  binary), the UIA sidecar, and demo flows.
- `latest.yml` + `*.blockmap` — auto-update metadata (only needed if you later
  enable auto-update).

## Notes for the target Windows machine
- Install **Google Chrome / Edge** for web automation (browsers aren't bundled).
- Tier 4 (UIA) works out of the box — the sidecar is bundled.
- Vision OCR downloads the tesseract `eng` data on first run (needs internet once).

## The build is unsigned
No code-signing certificate is configured, so Windows SmartScreen may warn on
first launch ("More info → Run anyway"). To sign later, add a cert and set
`CSC_LINK` / `CSC_KEY_PASSWORD` secrets, then reference them in the workflow.
