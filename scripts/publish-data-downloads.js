#!/usr/bin/env node
/**
 * FILE: scripts/publish-data-downloads.js
 *
 * PURPOSE:
 * Copies data/indicators/*.json, untouched, to public/data/indicators/ so the
 * "Download CSV" buttons can fetch an indicator's complete source file
 * (every column, every geography) as a plain static file.
 *
 * WHY (PERF, 2026-10-13):
 * Neighborhood pages now carry only the row fields the UI reads (see
 * PAGE_ROW_FIELDS in src/lib/data/loadIndicatorData.js), which keeps
 * confidence intervals, p-values and ValueType out of every page. The CSV
 * still includes them by fetching the full file on click (downloadCsv.js).
 *
 * ORDER: runs after fetch-content.js and build-copy.js (package.json predev /
 * prebuild), so in production it publishes whatever was just pulled from the
 * data repo. The output folder is generated — it's in .gitignore; never edit it.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC  = path.join(ROOT, 'data', 'indicators');
const DEST = path.join(ROOT, 'public', 'data', 'indicators');

fs.rmSync(DEST, { recursive: true, force: true });
fs.mkdirSync(DEST, { recursive: true });

let n = 0;
for (const name of fs.readdirSync(SRC)) {
  if (!name.endsWith('.json')) continue;
  fs.copyFileSync(path.join(SRC, name), path.join(DEST, name));
  n++;
}
console.log(`[publish-data-downloads] ${n} files -> public/data/indicators/`);
