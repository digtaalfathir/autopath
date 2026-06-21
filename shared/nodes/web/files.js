'use strict';

const fs   = require('fs');
const path = require('path');
const os   = require('os');
const { interpolate }            = require('../../utils/interpolate');
const { requirePage, findLocator } = require('../../utils/browser');

const uploadFile = {
  meta: { type: 'uploadFile', label: 'Upload File', category: 'Browser Files', description: 'Set a file on an <input type="file">', color: '#0891B2' },
  defaults: { selector: 'input[type=file]', filePath: '' },
  schema: [
    { key: 'selector', label: 'File Input Selector', type: 'text', placeholder: 'input[type=file]', isSelector: true },
    { key: 'filePath', label: 'File Path', type: 'text', placeholder: 'C:\\data\\report.xlsx', hint: 'Absolute path. Supports {{variable}}.' },
  ],
  execute: async (data, context, engine) => {
    requirePage(context);
    const filePath = interpolate(data.filePath || '', context.variables).trim();
    if (!filePath) throw new Error('Upload File: file path is required.');
    if (!fs.existsSync(filePath)) throw new Error(`Upload File: file not found — ${filePath}`);
    // File inputs are frequently hidden — match by attached state.
    const { locator, used } = await findLocator(context, data, engine, { state: 'attached' });
    engine.log('INFO', `Uploading "${filePath}" → "${used}"`);
    await locator.setInputFiles(filePath);
  },
};

const downloadFile = {
  meta: { type: 'downloadFile', label: 'Download File', category: 'Browser Files', description: 'Wait for a download and save it to disk', color: '#0891B2' },
  defaults: { triggerSelector: '', saveDirectory: '', outputVariable: 'downloadedFilePath', waitForDownload: '30000' },
  schema: [
    { key: 'triggerSelector', label: 'Trigger Selector (optional)', type: 'text', placeholder: 'a.download-btn', isSelector: true,
      hint: 'Clicked while waiting for the download. Leave blank if another node triggers it.' },
    { key: 'saveDirectory',   label: 'Save Directory', type: 'text', placeholder: 'C:\\downloads', hint: 'Defaults to your Downloads folder.' },
    { key: 'outputVariable',  label: 'Output Variable', type: 'text', placeholder: 'downloadedFilePath' },
    { key: 'waitForDownload', label: 'Timeout (ms)', type: 'text', placeholder: '30000' },
  ],
  execute: async (data, context, engine) => {
    const page    = requirePage(context);
    const timeout = Math.max(1000, parseInt(interpolate(String(data.waitForDownload || '30000'), context.variables), 10) || 30000);
    const dir     = interpolate(data.saveDirectory || '', context.variables).trim() || path.join(os.homedir(), 'Downloads');
    const out     = (data.outputVariable || 'downloadedFilePath').trim();
    fs.mkdirSync(dir, { recursive: true });

    engine.log('INFO', `Waiting for download (timeout ${timeout}ms)…`);
    const waitDownload = page.waitForEvent('download', { timeout });

    const trigger = interpolate(data.triggerSelector || '', context.variables).trim();
    if (trigger) {
      const { locator } = await findLocator(context, { selector: data.triggerSelector, selectorFallbacks: data.selectorFallbacks }, engine);
      await locator.click();
    }

    const download = await waitDownload;
    const dest = path.join(dir, download.suggestedFilename() || `download_${Date.now()}`);
    await download.saveAs(dest);
    context.variables[out] = dest;
    engine.log('INFO', `Downloaded → ${dest}  ({{${out}}})`);
  },
};

const takeScreenshot = {
  meta: { type: 'takeScreenshot', label: 'Take Screenshot', category: 'Browser Files', description: 'Capture a screenshot of the page', color: '#0891B2' },
  defaults: { filePath: '', fullPage: false, outputVariable: 'screenshotPath' },
  schema: [
    { key: 'filePath',       label: 'File Path (optional)', type: 'text', placeholder: 'C:\\shots\\page.png', hint: 'Auto-generated if blank.' },
    { key: 'fullPage',       label: 'Full Page', type: 'boolean' },
    { key: 'outputVariable', label: 'Output Variable', type: 'text', placeholder: 'screenshotPath' },
  ],
  execute: async (data, context, engine) => {
    const page = requirePage(context);
    let fp = interpolate(data.filePath || '', context.variables).trim();
    if (!fp) {
      const dir = path.join(os.homedir(), 'Documents', 'ManufacturaConnect', 'screenshots');
      fp = path.join(dir, `screenshot_${Date.now()}.png`);
    }
    fs.mkdirSync(path.dirname(fp), { recursive: true });
    await page.screenshot({ path: fp, fullPage: data.fullPage === true || data.fullPage === 'true' });
    const out = (data.outputVariable || 'screenshotPath').trim();
    context.variables[out] = fp;
    engine.log('INFO', `Screenshot saved → ${fp}  ({{${out}}})`);
  },
};

module.exports = { handlers: [uploadFile, downloadFile, takeScreenshot] };
