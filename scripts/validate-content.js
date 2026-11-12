#!/usr/bin/env node
/**
 * FILE: scripts/validate-content.js
 *
 * PURPOSE:
 * Checks data, metadata and the copy deck before they reach the site, and
 * writes a plain-language report for editors. Three levels:
 *
 *   ❌ error   — the site would break or show wrong numbers. Blocks merging.
 *   ⚠️ review  — may be intended, but a person should confirm (a big swing in
 *                a value, an indicator removed, a sentence that can't be
 *                filled in, an old year left in the copy…).
 *   ℹ️ summary — what the change does (indicators updated / added / removed,
 *                copy rows changed, biggest value changes).
 *
 * When --base is given (the live/main version of the same files), anything
 * that was already wrong before this change is listed separately and does
 * NOT block or need sign-off — editors only answer for what they changed.
 *
 * USAGE:
 *   npm run validate                        site repo's own data/ + content/
 *   npm run validate:data-test              same, against data-test/
 *   node scripts/validate-content.js \
 *     --content-root ../data-repo           folder holding data/ and content/
 *     --base ../data-repo-main              same layout, the version it replaces
 *     --report-md report.md --report-json report.json
 *
 * Settings (thresholds, acronyms, expected geography counts) live in
 * scripts/validate-config.json. Copy-deck structure checks are the ones in
 * build-copy.js (run here with --check-only), so there's one set of rules.
 * Sentence fill-in checks use the site's own src/lib/copy/resolveNarrative.js
 * (loaded with jiti, already installed via eslint/tailwind).
 *
 * Inside GitHub Actions it also prints ::error/::warning annotations so
 * problems show next to the file in the pull request's "Files changed" tab.
 *
 * EXIT: 1 if there are new errors, else 0. Review items never fail this
 * script; the workflow's sign-off step handles them.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const CONFIG = JSON.parse(fs.readFileSync(path.join(__dirname, 'validate-config.json'), 'utf8'));

// ── args ────────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const k = argv[i].slice(2);
      const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
      out[k] = v;
    }
  }
  return out;
}
const ARGS = parseArgs(process.argv.slice(2));

/** Where one version of the content lives. Paths in messages are relative to `root`. */
function layout(root, dataDirName) {
  const abs = path.resolve(root);
  return {
    root: abs,
    dataRoot: path.join(abs, dataDirName),
    indicatorsDir: path.join(abs, dataDirName, 'indicators'),
    metadataDir: path.join(abs, dataDirName, 'metadata'),
    copyDir: path.join(abs, 'content', 'copy'),
    rel: (p) => path.relative(abs, p).split(path.sep).join('/'),
  };
}

const HEAD = ARGS['content-root']
  ? layout(ARGS['content-root'], 'data')
  : layout(ROOT, process.env.CHP_DATA_DIR || 'data');
const BASE = ARGS.base ? layout(ARGS.base, ARGS['base-data-dir'] || 'data') : null;

// ── small helpers ───────────────────────────────────────────────────────────
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
const listDir = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir).sort() : null);
const isBlank = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
const pct = (x) => `${Math.round(x * 100)}%`;
const fmt = (v) => (typeof v === 'number' ? (Math.abs(v) >= 100 ? Math.round(v).toLocaleString('en-US') : String(+v.toPrecision(3))) : String(v));
const COPY_TEXT_FIELDS = ['Context', 'Comparison', 'indicatorDetail', 'detail'];

/** RFC4180 CSV parser that also records the file line each row starts on. */
function parseCsvWithLines(text) {
  const s = text.replace(/^﻿/, '').replace(/\r\n/g, '\n');
  const rows = [];
  let row = [], field = '', inQuotes = false, line = 1, rowLine = 1;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '\n') line++;
    if (inQuotes) {
      if (c === '"') { if (s[i + 1] === '"') { field += '"'; i++; } else inQuotes = false; }
      else field += c;
      continue;
    }
    if (c === '"') { inQuotes = true; continue; }
    if (c === ',') { row.push(field); field = ''; continue; }
    if (c === '\n') { row.push(field); row.line = rowLine; rows.push(row); row = []; field = ''; rowLine = line; continue; }
    field += c;
  }
  if (field.length || row.length) { row.push(field); row.line = rowLine; rows.push(row); }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

// ── issue collection ────────────────────────────────────────────────────────
function makeCollector() {
  const issues = [];
  const perFileCount = {};
  return {
    issues,
    add(level, code, message, { file = null, line = null, capKey = null } = {}) {
      if (capKey) {
        const k = `${file}|${capKey}`;
        perFileCount[k] = (perFileCount[k] || 0) + 1;
        if (perFileCount[k] > CONFIG.maxRowIssuesPerFile) return;
      }
      // id ignores row/line numbers so an item that only moved isn't "new".
      const id = `${code}|${file}|${message.replace(/\b(row|line) \d+\b/gi, '')}`;
      issues.push({ level, code, file, line, message, id });
    },
    finishCaps() {
      for (const [k, n] of Object.entries(perFileCount)) {
        if (n <= CONFIG.maxRowIssuesPerFile) continue;
        const [file, capKey] = k.split('|');
        const sample = issues.find((x) => x.file === file && x.code === capKey);
        issues.push({ level: sample.level, code: capKey, file, line: null,
          message: `…and ${n - CONFIG.maxRowIssuesPerFile} more like this in the same file.`,
          id: `${capKey}|${file}|more` });
      }
    },
  };
}

// ── loading ─────────────────────────────────────────────────────────────────
function load(L, c) {
  const content = { indicators: {}, rowsByKey: {}, meta: {}, copyRows: [], ok: true };

  const indFiles = listDir(L.indicatorsDir);
  const metaFiles = listDir(L.metadataDir);
  const copyFiles = listDir(L.copyDir);
  for (const [dir, files] of [[L.indicatorsDir, indFiles], [L.metadataDir, metaFiles], [L.copyDir, copyFiles]]) {
    if (!files) { c.add('error', 'missing-folder', `Required folder ${L.rel(dir)}/ is missing.`, { file: L.rel(dir) }); content.ok = false; }
  }
  if (!content.ok) return content;

  const ignored = new Set(CONFIG.ignoredFiles);
  const KEYNAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;

  // indicators
  for (const name of indFiles) {
    if (ignored.has(name)) continue;
    const file = L.rel(path.join(L.indicatorsDir, name));
    if (!name.endsWith('.json')) { c.add('error', 'bad-filename', 'Unexpected file — only .json data files belong in this folder.', { file }); continue; }
    const stem = name.slice(0, -5);
    if (!KEYNAME.test(stem)) {
      c.add('error', 'bad-filename', `File name "${name}" should be the indicator key in lowercase with dashes (no spaces, capitals or copy numbers like " (1)").`, { file });
      continue;
    }
    let json;
    try { json = readJson(path.join(L.indicatorsDir, name)); }
    catch (e) { c.add('error', 'bad-json', `This file isn't valid JSON (${e.message}). Re-export it rather than editing by hand.`, { file }); continue; }
    content.indicators[stem] = { file, json };
  }

  // metadata
  for (const name of metaFiles) {
    if (ignored.has(name)) continue;
    const file = L.rel(path.join(L.metadataDir, name));
    if (name.endsWith('.meta.json')) {
      c.add('error', 'bad-filename', `Metadata files end in "-meta.json" (dash), not ".meta.json" — rename to ${name.replace('.meta.json', '-meta.json')}.`, { file });
      continue;
    }
    if (!name.endsWith('.json') || !KEYNAME.test(name.slice(0, -5))) {
      c.add('error', 'bad-filename', `Unexpected file name "${name}" — expected {key}-meta.json in lowercase with dashes.`, { file });
      continue;
    }
    const key = name.replace(/-meta\.json$|\.json$/, '');
    try { content.meta[key] = { file, json: readJson(path.join(L.metadataDir, name)) }; }
    catch (e) { c.add('error', 'bad-json', `This file isn't valid JSON (${e.message}).`, { file }); }
  }

  // copy folder
  const allowed = new Set(CONFIG.copyDirFiles);
  for (const name of copyFiles) {
    if (ignored.has(name) || allowed.has(name)) continue;
    c.add('error', 'unexpected-file', `Unexpected file "${name}". If you meant to replace measure-copy.csv or sections.csv, the uploaded file must have exactly that name.`, { file: L.rel(path.join(L.copyDir, name)) });
  }
  const csvPath = path.join(L.copyDir, 'measure-copy.csv');
  if (fs.existsSync(csvPath)) {
    const rows = parseCsvWithLines(fs.readFileSync(csvPath, 'utf8'));
    const header = rows[0]?.map((h) => h.trim()) ?? [];
    content.copyRows = rows.slice(1).map((r, i) => {
      const o = { _line: r.line, _row: i + 2 };
      header.forEach((h, j) => { o[h] = (r[j] ?? '').replace(/\s+/g, ' ').trim(); });
      return o;
    });
  }

  // flatten rows per key (combined "Segments" files expose each SegmentKey)
  for (const [key, { json }] of Object.entries(content.indicators)) {
    if (!json || !Array.isArray(json.Data)) continue;
    content.rowsByKey[key] = json.Data;
    for (const geo of json.Data) {
      for (const seg of geo.Segments ?? []) {
        if (!seg.SegmentKey) continue;
        (content.rowsByKey[seg.SegmentKey] ??= []).push({ GeoType: geo.GeoType, GeoID: geo.GeoID, Geography: geo.Geography, ...seg, _file: key });
      }
    }
  }
  return content;
}

// ── data checks ─────────────────────────────────────────────────────────────
function checkData(C, c) {
  // Reference CD id set = the one most files agree on.
  const sets = {};
  for (const { json } of Object.values(C.indicators)) {
    if (!Array.isArray(json?.Data)) continue;
    const ids = json.Data.filter((r) => r.GeoType === 'CD').map((r) => r.GeoID).sort((a, b) => a - b).join(',');
    sets[ids] = (sets[ids] || 0) + 1;
  }
  const refIds = new Set((Object.entries(sets).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '').split(',').filter(Boolean).map(Number));

  const statuses = new Set(CONFIG.valueStatuses);
  const noValue = new Set(CONFIG.noValueStatuses);

  for (const [stem, { file, json }] of Object.entries(C.indicators)) {
    if (!json || typeof json !== 'object' || !Array.isArray(json.Data)) {
      c.add('error', 'bad-shape', 'File must be an object with "IndicatorKey" and a "Data" list.', { file });
      continue;
    }
    if (json.IndicatorKey !== stem) {
      c.add('error', 'key-mismatch', `IndicatorKey is "${json.IndicatorKey}" but the file is named ${stem}.json — they must match.`, { file });
    }
    const unit = C.meta[stem]?.json?.Unit;

    const checkValue = (v, where, unitForRow) => {
      const st = v.ValueStatus ?? null;
      if (st !== null && !statuses.has(st)) {
        const guess = [...statuses].find((s) => s[0] === String(st)[0]);
        c.add('error', 'bad-status', `${where}: ValueStatus "${st}" isn't recognized${guess ? ` — did you mean "${guess}"?` : ''} (allowed: ${[...statuses].join(', ')}, or empty).`, { file, capKey: 'bad-status' });
        return;
      }
      const hasValue = v.Value !== null && v.Value !== undefined;
      if (!hasValue) {
        if (!noValue.has(st)) c.add('error', 'no-value-status', `${where}: no Value, so ValueStatus must say why (${[...noValue].join(' or ')}).`, { file, capKey: 'no-value-status' });
        if (v.DisplayValue != null) c.add('error', 'display-without-value', `${where}: DisplayValue is "${v.DisplayValue}" but Value is empty — rows with no value need DisplayValue null.`, { file, capKey: 'display-without-value' });
        return;
      }
      if (noValue.has(st) && v.DisplayValue != null) {
        c.add('error', 'suppressed-display', `${where}: marked "${st}" but DisplayValue is "${v.DisplayValue}" — set DisplayValue to null so nothing shows.`, { file, capKey: 'suppressed-display' });
      }
      if (typeof v.Value !== 'number' || Number.isNaN(v.Value)) {
        c.add('error', 'bad-value', `${where}: Value "${v.Value}" isn't a number.`, { file, capKey: 'bad-value' });
        return;
      }
      if (v.DisplayValue != null && typeof v.DisplayValue !== 'string') {
        c.add('error', 'bad-display', `${where}: DisplayValue should be text, e.g. "26%".`, { file, capKey: 'bad-display' });
      }
      if (v.Value < 0) c.add('error', 'negative-value', `${where}: Value ${v.Value} is negative.`, { file, capKey: 'negative-value' });
      if (unitForRow === '%' && v.Value > 1) {
        c.add('error', 'percent-scale', `${where}: Value ${v.Value} is above 1, but this is a percent — percents must be fractions (0.26, not 26).`, { file, capKey: 'percent-scale' });
      }
    };

    const counts = {}, seen = new Set();
    for (const r of json.Data) {
      if (!(r.GeoType in CONFIG.expectedGeographies)) {
        c.add('error', 'bad-geotype', `Unknown GeoType "${r.GeoType}" (expected ${Object.keys(CONFIG.expectedGeographies).join(', ')}).`, { file, capKey: 'bad-geotype' });
        continue;
      }
      counts[r.GeoType] = (counts[r.GeoType] || 0) + 1;
      const k = `${r.GeoType}|${r.GeoID}`;
      if (seen.has(k)) c.add('error', 'duplicate-geo', `${r.Geography ?? r.GeoID} (${r.GeoType} ${r.GeoID}) appears more than once.`, { file, capKey: 'duplicate-geo' });
      seen.add(k);

      if (Array.isArray(r.Segments)) {
        for (const seg of r.Segments) {
          if (!seg.SegmentKey) c.add('error', 'bad-shape', `A segment for ${r.Geography} has no SegmentKey.`, { file, capKey: 'bad-shape' });
          checkValue(seg, `${r.Geography} · ${seg.SegmentKey}`, C.meta[seg.SegmentKey]?.json?.Unit ?? unit);
        }
      } else {
        checkValue(r, r.Geography ?? `${r.GeoType} ${r.GeoID}`, unit);
      }
    }
    for (const [type, n] of Object.entries(CONFIG.expectedGeographies)) {
      if ((counts[type] || 0) !== n) c.add('error', 'geo-count', `Expected ${n} ${type} row(s), found ${counts[type] || 0}.`, { file });
    }
    if (refIds.size) {
      const ids = new Set(json.Data.filter((r) => r.GeoType === 'CD').map((r) => r.GeoID));
      const missing = [...refIds].filter((x) => !ids.has(x));
      const extra = [...ids].filter((x) => !refIds.has(x));
      if (missing.length) c.add('error', 'geo-ids', `Missing community district GeoID(s): ${missing.join(', ')}.`, { file });
      if (extra.length) c.add('error', 'geo-ids', `Unrecognized community district GeoID(s): ${extra.join(', ')}.`, { file });
    }
  }

  // metadata
  for (const [key, { file, json }] of Object.entries(C.meta)) {
    if (!json || typeof json !== 'object') { c.add('error', 'bad-shape', 'Metadata must be a JSON object.', { file }); continue; }
    if (json.IndicatorKey && json.IndicatorKey !== key) {
      c.add('error', 'key-mismatch', `IndicatorKey is "${json.IndicatorKey}" but the file is named for "${key}".`, { file });
    }
    const missing = CONFIG.requiredMetaFields.filter((f) => isBlank(json[f]));
    if (missing.length) c.add('error', 'meta-missing', `Missing required field(s): ${missing.join(', ')}.`, { file });
    if (json.Decimals != null && !Number.isInteger(json.Decimals)) c.add('error', 'meta-decimals', `Decimals should be a whole number, got "${json.Decimals}".`, { file });
    if (isBlank(json.Unit)) c.add('review', 'meta-unit', 'No Unit — the delta pill and percent checks need it.', { file });
  }
  for (const [key, { file, json }] of Object.entries(C.indicators)) {
    const segmented = (json?.Data ?? []).some((r) => Array.isArray(r.Segments));
    if (!segmented && !C.meta[key]) c.add('review', 'no-meta', `No metadata file (${key}-meta.json) — the card will have no source, time period or notes.`, { file });
  }
}

// ── copy checks ─────────────────────────────────────────────────────────────
function runBuildCopy(L, c) {
  const res = spawnSync(process.execPath, [path.join(__dirname, 'build-copy.js'), '--check-only'], {
    cwd: ROOT, encoding: 'utf8',
    env: { ...process.env, CHP_COPY_DIR: L.copyDir, CHP_DATA_DIR: L.dataRoot },
  });
  const file = L.rel(path.join(L.copyDir, 'measure-copy.csv'));
  const lines = (res.stderr || '').split('\n');
  const items = lines.filter((l) => l.startsWith('[build-copy]   - ')).map((l) => l.replace('[build-copy]   - ', ''));
  const thrown = lines.find((l) => /^Error: /.test(l));
  const level = res.status === 0 ? 'review' : 'error';
  if (thrown) c.add('error', 'copy-deck', thrown.replace(/^Error: /, ''), { file });
  else if (res.status !== 0 && !items.length) c.add('error', 'copy-deck', `The copy deck check failed: ${(res.stderr || '').trim().split('\n').pop()}`, { file });
  for (const msg of items) {
    const m = msg.match(/^Row (\d+)/);
    // build-copy prints paths relative to the site repo; show them relative to this content root.
    const relRoot = path.relative(ROOT, L.root);
    let cleanMsg = msg.split(L.root + path.sep).join('');
    if (relRoot) cleanMsg = cleanMsg.split(relRoot + '/').join('');
    c.add(level, 'copy-deck', cleanMsg, { file, line: m ? Number(m[1]) : null });
  }
}

async function loadResolver() {
  try {
    const { createJiti } = require('jiti');
    const jiti = createJiti(path.join(ROOT, 'package.json'), { alias: { '@': path.join(ROOT, 'src') } });
    return await jiti.import(path.join(ROOT, 'src', 'lib', 'copy', 'resolveNarrative.js'));
  } catch (e) {
    return { error: e.message };
  }
}

function checkCopy(C, L, c, resolver) {
  const file = L.rel(path.join(L.copyDir, 'measure-copy.csv'));
  const acronyms = new Set(CONFIG.acronyms);
  const textCols = ['Measure', 'Context', 'Comparison', 'type', 'of', 'detail', 'units', 'indicatorDetail'];

  // build-copy reports "Row N" (sheet row); turn that into the real file line.
  const lineForRow = Object.fromEntries(C.copyRows.map((r) => [r._row, r._line]));
  for (const x of c.issues) if (x.code === 'copy-deck' && x.line) x.line = lineForRow[x.line] ?? x.line;

  for (const r of C.copyRows) {
    const at = { file, line: r._line };
    const label = r.Key || r.Measure || `row ${r._row}`;
    if (r.Key && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(r.Key)) {
      c.add('error', 'bad-key', `Key "${r.Key}" has unexpected characters — keys are lowercase letters, numbers and dashes (watch for spaces or curly quotes from Excel/Word).`, at);
    }
    for (const col of textCols) {
      const text = (r[col] || '').replace(/<[^>]*>/g, ' ');
      const caps = (text.match(/\b[A-Z]{3,}\b/g) || []).filter((w) => !acronyms.has(w));
      if (caps.length) {
        c.add('review', 'all-caps', `${label} · ${col}: all-caps word(s) ${[...new Set(caps)].map((w) => `"${w}"`).join(', ')} — NYC accessibility guidelines avoid all caps. If it's an acronym, add it to the list in scripts/validate-config.json.`, at);
      }
    }
    // Card Context only — category intro paragraphs (no Key) aren't clamped.
    const ctxLen = (r.Context || '').replace(/<[^>]*>/g, 'XXXX').length;
    if (r.Key && ctxLen > CONFIG.maxContextChars) {
      c.add('review', 'long-context', `${label}: Context is about ${ctxLen} characters; cards show roughly ${CONFIG.maxContextChars} before "read more".`, at);
    }

    // Will the sentences actually fill in? Use the site's own resolver.
    if (!r.Key || resolver.error) continue;
    const rows = C.rowsByKey[r.Key];
    if (!rows) continue;
    for (const col of ['Context', 'Comparison']) {
      const tpl = r[col];
      if (!tpl || !/<[^>]+>/.test(tpl)) continue;
      const cds = rows.filter((x) => x.GeoType === 'CD' && x.Value != null);
      if (!cds.length) continue;
      const warn = console.warn; console.warn = () => {};
      let filled = 0;
      try {
        for (const cd of cds) {
          if (resolver.resolveNarrative(tpl, { rows, geoId: cd.GeoID, neighborhoodName: cd.Geography, title: r.Measure })) filled++;
        }
      } catch { filled = -1; } finally { console.warn = warn; }
      if (filled === 0) {
        const tokens = [...new Set(tpl.match(/<[^>]+>/g))].join(' ');
        c.add('review', 'unfilled-sentence', `${label} · ${col}: the sentence can't be filled in for any neighborhood, so cards will show the subtitle instead. Check the token spelling: ${tokens}`, at);
      }
    }
  }
}

// ── compare with base ───────────────────────────────────────────────────────
function compare(H, B, HL) {
  const summary = { added: [], removed: [], updated: [], timePeriods: [], copyAdded: [], copyRemoved: [], copyChanged: [], biggest: [], newlySuppressed: 0, orderChanged: false };
  const reviews = []; // { code, message, file, line }
  const copyFile = HL.rel(path.join(HL.copyDir, 'measure-copy.csv'));

  const hk = new Set(Object.keys(H.indicators)), bk = new Set(Object.keys(B.indicators));
  for (const k of hk) if (!bk.has(k)) summary.added.push(k);
  for (const k of bk) if (!hk.has(k)) {
    summary.removed.push(k);
    reviews.push({ code: 'indicator-removed', message: `Indicator "${k}" was removed. Its card will disappear or show an empty state — confirm this is intended.`, file: B.indicators[k].file });
  }
  for (const k of hk) {
    if (bk.has(k) && JSON.stringify(H.indicators[k].json) !== JSON.stringify(B.indicators[k].json)) summary.updated.push(k);
  }

  // value changes (per key incl. segment keys)
  const valueMap = (rows) => Object.fromEntries((rows || []).filter((r) => r.Value !== undefined).map((r) => [`${r.GeoType}|${r.GeoID}`, r]));
  for (const key of Object.keys(H.rowsByKey)) {
    if (!B.rowsByKey[key]) continue;
    const threshold = (CONFIG.largeChange.byKey[key] ?? CONFIG.largeChange.default).relative;
    const hm = valueMap(H.rowsByKey[key]), bm = valueMap(B.rowsByKey[key]);
    const big = [];
    for (const [g, hr] of Object.entries(hm)) {
      const br = bm[g];
      if (!br) continue;
      if (br.Value != null && hr.Value == null) summary.newlySuppressed++;
      if (br.Value == null || hr.Value == null || br.Value === 0) continue;
      const rel = (hr.Value - br.Value) / Math.abs(br.Value);
      if (Math.abs(rel) > threshold) big.push({ key, geo: hr.Geography, from: br.DisplayValue ?? fmt(br.Value), to: hr.DisplayValue ?? fmt(hr.Value), rel });
    }
    if (big.length) {
      big.sort((a, b) => Math.abs(b.rel) - Math.abs(a.rel));
      const top = big[0];
      const fileKey = H.indicators[key] ? key : H.rowsByKey[key][0]?._file;
      reviews.push({ code: 'large-change', message: `${key}: ${big.length} geograph${big.length === 1 ? 'y' : 'ies'} changed by more than ${pct(threshold)} (largest: ${top.geo} ${top.from} → ${top.to}).`, file: H.indicators[fileKey]?.file ?? null });
      summary.biggest.push(...big);
    }
  }
  summary.biggest.sort((a, b) => Math.abs(b.rel) - Math.abs(a.rel));
  summary.biggest = summary.biggest.slice(0, CONFIG.maxBiggestChanges);

  // time periods + old years left behind in copy or metadata text
  const copyByKey = Object.fromEntries(H.copyRows.filter((r) => r.Key).map((r) => [r.Key, r]));
  for (const [key, { json, file }] of Object.entries(H.meta)) {
    const old = B.meta[key]?.json?.TimePeriod;
    const now = json?.TimePeriod;
    if (!old || !now || String(old) === String(now)) continue;
    summary.timePeriods.push({ key, from: old, to: now });
    const oldYears = (String(old).match(/\b(?:19|20)\d{2}\b/g) || []).filter((y) => !String(now).includes(y));
    if (!oldYears.length) continue;
    const row = copyByKey[key];
    const places = [
      ...(row ? COPY_TEXT_FIELDS.map((f) => ({ field: f, text: row[f], file: copyFile, line: row._line })) : []),
      { field: 'Subtitle', text: json.Subtitle, file, line: null },
      { field: 'MethodsNote', text: json.MethodsNote, file, line: null },
    ];
    for (const p of places) {
      const hit = oldYears.find((y) => String(p.text || '').includes(y));
      if (hit) reviews.push({ code: 'old-year', message: `${key}: time period changed ${old} → ${now}, but ${p.field} still mentions ${hit}.`, file: p.file, line: p.line });
    }
  }

  // copy deck rows
  const bCopy = Object.fromEntries(B.copyRows.filter((r) => r.Key).map((r) => [r.Key, r]));
  const fields = ['Measure', 'Context', 'Comparison', 'Section', 'Subsection', 'type', 'of', 'detail', 'units', 'indicatorDetail', 'FLAG'];
  for (const [k, r] of Object.entries(copyByKey)) {
    if (!bCopy[k]) { summary.copyAdded.push(k); continue; }
    const changed = fields.filter((f) => (r[f] || '') !== (bCopy[k][f] || ''));
    if (changed.length) summary.copyChanged.push({ key: k, fields: changed });
  }
  for (const k of Object.keys(bCopy)) if (!copyByKey[k]) summary.copyRemoved.push(k);
  const order = (rows) => rows.filter((r) => r.Key).map((r) => r.Key).join(',');
  summary.orderChanged = order(H.copyRows) !== order(B.copyRows) && !summary.copyAdded.length && !summary.copyRemoved.length;

  return { summary, reviews };
}

// ── report ──────────────────────────────────────────────────────────────────
function list(items, max = 8) {
  return items.length > max ? `${items.slice(0, max).join(', ')} and ${items.length - max} more` : items.join(', ');
}

function renderMarkdown(result) {
  const { blocking, review, preexisting, summary, resolverError, hasBase } = result;
  const line = (x) => `- ${x.file ? `**${x.file}${x.line ? `** (line ${x.line})` : '**'} — ` : ''}${x.message}`;
  const out = ['## Content checks', ''];

  if (!blocking.length && !review.length) out.push('✅ **All checks passed.**');
  else {
    const bits = [];
    if (blocking.length) bits.push(`❌ **${blocking.length} problem${blocking.length > 1 ? 's' : ''} must be fixed** before this can be merged`);
    if (review.length) bits.push(`⚠️ **${review.length} item${review.length > 1 ? 's' : ''} need${review.length > 1 ? '' : 's'} a reviewer's look**`);
    out.push(bits.join(' · '));
  }
  out.push('');

  if (blocking.length) {
    out.push('### ❌ Must fix', '', ...blocking.map(line), '',
      '_Fix the file and upload it again to this same pull request — the checks re-run on their own._', '');
  }
  if (review.length) {
    out.push('### ⚠️ Needs review', '', ...review.map(line), '',
      '_If these are expected, a reviewer adds the **warnings-reviewed** label to sign off._', '');
  }

  out.push('### What this change does', '');
  if (!hasBase) out.push('_No comparison with the live version was available._', '');
  else if (summary) {
    const s = summary;
    const parts = [];
    if (s.updated.length) parts.push(`- **Data updated:** ${s.updated.length} indicator file(s) — ${list(s.updated)}`);
    if (s.added.length) parts.push(`- **New indicators:** ${list(s.added)}`);
    if (s.removed.length) parts.push(`- **Removed indicators:** ${list(s.removed)}`);
    if (s.timePeriods.length) parts.push(`- **Time period changed:** ${s.timePeriods.map((t) => `${t.key} (${t.from} → ${t.to})`).join('; ')}`);
    if (s.newlySuppressed) parts.push(`- **Newly suppressed values:** ${s.newlySuppressed}`);
    if (s.copyChanged.length) parts.push(`- **Copy edited:** ${s.copyChanged.slice(0, 12).map((x) => `${x.key} (${x.fields.join(', ')})`).join('; ')}${s.copyChanged.length > 12 ? ` and ${s.copyChanged.length - 12} more` : ''}`);
    if (s.copyAdded.length) parts.push(`- **Copy rows added:** ${list(s.copyAdded)}`);
    if (s.copyRemoved.length) parts.push(`- **Copy rows removed:** ${list(s.copyRemoved)}`);
    if (s.orderChanged) parts.push('- **Card order changed** in the copy deck');
    out.push(...(parts.length ? parts : ['- No changes to data or copy detected.']), '');
    if (s.biggest.length) {
      out.push('<details><summary>Biggest value changes</summary>', '', '| Indicator | Geography | Before | After | Change |', '|---|---|---|---|---|',
        ...s.biggest.map((b) => `| ${b.key} | ${b.geo} | ${b.from} | ${b.to} | ${b.rel > 0 ? '+' : ''}${pct(b.rel)} |`), '', '</details>', '');
    }
  }

  if (preexisting.length) {
    out.push(`<details><summary>Already present before this change (${preexisting.length}) — not blocking</summary>`, '',
      ...preexisting.map((x) => `${line(x)}${x.level === 'error' ? ' _(error)_' : ''}`), '', '</details>', '');
  }
  if (resolverError) out.push(`_Sentence fill-in check skipped: ${resolverError}_`, '');
  return out.join('\n');
}

const escapeData = (s) => String(s).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
const escapeProp = (s) => escapeData(s).replace(/:/g, '%3A').replace(/,/g, '%2C');

// ── main ────────────────────────────────────────────────────────────────────
async function main() {
  const resolver = await loadResolver();

  function checkAll(L) {
    const c = makeCollector();
    const C = load(L, c);
    if (C.ok) {
      checkData(C, c);
      runBuildCopy(L, c);
      checkCopy(C, L, c, resolver);
    }
    c.finishCaps();
    return { C, c };
  }

  const head = checkAll(HEAD);
  let base = null, summary = null;
  const hasBase = !!(BASE && fs.existsSync(BASE.indicatorsDir) && fs.existsSync(BASE.copyDir));
  if (hasBase) {
    base = checkAll(BASE);
    if (head.C.ok && base.C.ok) {
      const cmp = compare(head.C, base.C, HEAD);
      summary = cmp.summary;
      for (const r of cmp.reviews) head.c.issues.push({ level: 'review', line: null, ...r, id: `${r.code}|${r.message}` });
    }
  }

  const baseIds = new Set(base ? base.c.issues.map((x) => x.id) : []);
  const isOld = (x) => baseIds.has(x.id);
  const issues = head.c.issues;
  const result = {
    blocking: issues.filter((x) => x.level === 'error' && !isOld(x)),
    review: issues.filter((x) => x.level === 'review' && !isOld(x)),
    preexisting: issues.filter(isOld),
    summary, hasBase,
    resolverError: resolver.error || null,
  };

  const md = renderMarkdown(result);
  if (ARGS['report-md']) fs.writeFileSync(ARGS['report-md'], md + '\n');
  if (ARGS['report-json']) {
    fs.writeFileSync(ARGS['report-json'], JSON.stringify({
      errors: result.blocking.length, review: result.review.length, preexisting: result.preexisting.length,
      issues: [...result.blocking, ...result.review, ...result.preexisting.map((x) => ({ ...x, preexisting: true }))],
      summary,
    }, null, 2) + '\n');
  }

  if (process.env.GITHUB_ACTIONS === 'true') {
    for (const x of [...result.blocking, ...result.review]) {
      const props = [x.file && `file=${escapeProp(x.file)}`, x.line && `line=${x.line}`, `title=${escapeProp(x.level === 'error' ? 'Must fix' : 'Needs review')}`].filter(Boolean).join(',');
      console.log(`::${x.level === 'error' ? 'error' : 'warning'} ${props}::${escapeData(x.message)}`);
    }
  }

  console.log(md);
  process.exit(result.blocking.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });
