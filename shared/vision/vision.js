'use strict';

// Vision core (Tier 5) — Surface automation for Citrix / RDP / VNC and a
// universal image/OCR fallback for any desktop. Works on pixels only, so it
// needs no accessible UI tree (unlike Tier 4 UIA).
//
//   - Template matching: pure-JS (jimp) grayscale SAD with a coarse→fine
//     downsample search (no native OpenCV needed). Great for Citrix surfaces
//     where pixels render identically. Restrict to a region for speed.
//   - OCR: tesseract.js (WASM) — find/read text on screen.
//
// nut.js provides screen capture + mouse; jimp/tesseract are lazily required.

const fs   = require('fs');
const os   = require('os');
const path = require('path');
const { loadNut } = require('../utils/nut');

function lazyJimp() {
  try { const j = require('jimp'); return j.Jimp || j; }
  catch { throw new Error('Vision requires "jimp". Run: npm install jimp'); }
}
function lazyTesseract() {
  try { return require('tesseract.js'); }
  catch { throw new Error('OCR requires "tesseract.js". Run: npm install tesseract.js'); }
}

// ── Pure template matching (unit-testable, no deps) ───────────────
function toGray(bitmap) {
  const { data, width, height } = bitmap;      // RGBA
  const g = new Uint8Array(width * height);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    g[p] = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) | 0;
  }
  return { data: g, w: width, h: height };
}
function downsample(img, f) {
  if (f <= 1) return img;
  const w = Math.floor(img.w / f), h = Math.floor(img.h / f);
  const d = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) d[y * w + x] = img.data[(y * f) * img.w + (x * f)];
  return { data: d, w, h };
}
function sad(S, T, ox, oy) {
  let s = 0;
  for (let ty = 0; ty < T.h; ty++) {
    const sRow = (oy + ty) * S.w + ox, tRow = ty * T.w;
    for (let tx = 0; tx < T.w; tx++) s += Math.abs(S.data[sRow + tx] - T.data[tRow + tx]);
  }
  return s;
}
function searchBest(S, T) {
  let best = { score: -2, x: 0, y: 0 };
  const denom = T.w * T.h * 255;
  for (let oy = 0; oy <= S.h - T.h; oy++)
    for (let ox = 0; ox <= S.w - T.w; ox++) {
      const conf = 1 - sad(S, T, ox, oy) / denom;
      if (conf > best.score) best = { score: conf, x: ox, y: oy };
    }
  return best;
}

// Coarse (downsampled) search, then refine at full resolution around the hit.
function matchTemplate(screen, tmpl, opts = {}) {
  const { minConfidence = 0.85, factor = 4 } = opts;
  if (tmpl.w > screen.w || tmpl.h > screen.h || tmpl.w < 1 || tmpl.h < 1) return { found: false, score: 0 };
  const f = (Math.floor(tmpl.w / factor) >= 2 && Math.floor(tmpl.h / factor) >= 2) ? factor : 1;

  const coarse = searchBest(downsample(screen, f), downsample(tmpl, f));
  const cx = coarse.x * f, cy = coarse.y * f;

  let best = { score: -2, x: cx, y: cy };
  const denom = tmpl.w * tmpl.h * 255;
  const y0 = Math.max(0, cy - f), y1 = Math.min(screen.h - tmpl.h, cy + f);
  const x0 = Math.max(0, cx - f), x1 = Math.min(screen.w - tmpl.w, cx + f);
  for (let oy = y0; oy <= y1; oy++)
    for (let ox = x0; ox <= x1; ox++) {
      const conf = 1 - sad(screen, tmpl, ox, oy) / denom;
      if (conf > best.score) best = { score: conf, x: ox, y: oy };
    }
  return {
    found: best.score >= minConfidence, score: best.score, x: best.x, y: best.y,
    centerX: best.x + (tmpl.w >> 1), centerY: best.y + (tmpl.h >> 1),
  };
}

// ── Screen capture + image loading (needs a display) ──────────────
async function captureToFile(region) {
  const nut = loadNut();
  const dir = os.tmpdir();
  const name = `mc_vis_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  let file;
  if (region) file = await nut.screen.captureRegion(name, new nut.Region(region.x, region.y, region.width, region.height), undefined, dir);
  else        file = await nut.screen.capture(name, undefined, dir);
  return file;
}
async function pngToGray(file) {
  const Jimp = lazyJimp();
  const img = await Jimp.read(file);
  return toGray(img.bitmap);
}

// Find a template image on screen (optionally within a region).
// Returns absolute screen coords in centerX/centerY when found.
async function findImageOnScreen(templatePath, region, minConfidence) {
  const screenFile = await captureToFile(region);
  try {
    const screen = await pngToGray(screenFile);
    const tmpl   = await pngToGray(templatePath);
    const m = matchTemplate(screen, tmpl, { minConfidence });
    if (m.found && region) { m.centerX += region.x; m.centerY += region.y; }
    return m;
  } finally { try { fs.unlinkSync(screenFile); } catch (_) {} }
}

// OCR a region (or full screen). Returns { text, words:[{text, cx, cy}] } with
// word centers in absolute screen coords.
async function ocrScreen(region) {
  const T = lazyTesseract();
  const file = await captureToFile(region);
  try {
    const { data } = await T.recognize(file, 'eng');
    const ox = region ? region.x : 0, oy = region ? region.y : 0;
    const words = (data.words || []).map(w => ({
      text: w.text,
      cx: ox + ((w.bbox.x0 + w.bbox.x1) >> 1),
      cy: oy + ((w.bbox.y0 + w.bbox.y1) >> 1),
    }));
    return { text: data.text || '', words };
  } finally { try { fs.unlinkSync(file); } catch (_) {} }
}

module.exports = { toGray, downsample, matchTemplate, captureToFile, pngToGray, findImageOnScreen, ocrScreen };
