#!/usr/bin/env node
/**
 * FILE: scripts/build-copy.js
 *
 * PURPOSE:
 * Converts the DOHMH copy deck (content/copy/measure-copy.csv) into
 * content/copy/indicatorCopy.json — the ONLY source of indicator copy the
 * app reads (titles, context sentence, comparison sentence, type/of/detail/
 * units, indicator detail).
 *
 * 2026-09-26 (Morgan): the combined src/config/indicatorMeta.json is RETIRED.
 * All copy now comes from this CSV. Data facts (source, time period, methods
 * note, decimals, unit) still come from data/metadata/{key}-meta.json; UI-only
 * display rules (higherIsBetter, kind/segments, etc.) live in
 * src/config/presets/indicatorDisplay.js.
 *
 * USAGE:
 *   npm run copy          (also runs automatically before `npm run dev` / `npm run build`)
 *   node scripts/build-copy.js
 *
 * CSV COLUMNS (header row required, names as exported from the copy deck):
 *   FLAG            — editorial status note ("design in progress", "LK: ...",
 *                     "NOT IN SITE", etc.). Carried through; rows flagged
 *                     "design in progress" don't render their narrative yet.
 *   Section, Subsection, Measure
 *   Key             — indicator key; rows without one are parked under _unmapped
 *   Context         — static "why it matters" sentence(s); may contain <TOKENS>
 *   Comparison      — neighborhood sentence with <TOKENS>
 *   type, of, detail, units, indicatorDetail
 *
 * CATEGORY INTROS: a row with Section filled and Subsection + Key blank is
 * that category's intro; its Context is the paragraph under the heading.
 *
 * PLACEMENT (2026-09-26): the CSV also decides WHERE each card appears and in
 * what ORDER. Section/Subsection names map to a site section id via
 * the Sections tab (content/copy/sections.csv); within a section, cards follow CSV row order.
 * "At a glance" rows feed the At-a-Glance hero (stat tiles + pyramid charts,
 * split by kind in indicatorDisplay.js). content/sections/*.json is RETIRED.
 *
 * OUTPUTS (all generated — never hand-edit):
 *   content/copy/indicatorCopy.json     — copy per key, in sheet order, with
 *                                         topic = the section id it renders in.
 *                                         Section card lists are read straight
 *                                         from this (loadSectionIndicators.js).
 *   content/copy/structure.json         — categories → sections → rows, for the
 *                                         nav, page order and the print report
 *   src/config/content/sectionTitles.json — section id → on-page heading
 *
 * CHECKS:
 *   Errors (exit 1, nothing written): unknown Section/Subsection name,
 *   duplicate Key, a sectionIds.js id missing from sections.csv.
 *   Warnings: a keyed row with no data/indicators/{key}.json or no
 *   data/metadata/{key}-meta.json, blank type/of, a category with no intro.
 *
 * 2026-09-27: dropped two outputs nothing read — content/copy/sections.json
 * (derivable from indicatorCopy.json's topic + order) and
 * content/site/nav-labels.json (nav reads structure.json).
 */

const fs = require('fs');
const path = require('path');

const ROOT         = path.join(__dirname, '..');
const CSV_PATH     = path.join(ROOT, 'content', 'copy', 'measure-copy.csv');
const OUT_PATH           = path.join(ROOT, 'content', 'copy', 'indicatorCopy.json');
const SECTION_TITLES_OUT = path.join(ROOT, 'src', 'config', 'content', 'sectionTitles.json');
const STRUCTURE_OUT      = path.join(ROOT, 'content', 'copy', 'structure.json');

const SECTIONS_CSV     = path.join(ROOT, 'content', 'copy', 'sections.csv');
const SECTION_IDS_JS   = path.join(ROOT, 'src', 'config', 'registries', 'sectionIds.js');
const DISPLAY_JS       = path.join(ROOT, 'src', 'config', 'presets', 'indicatorDisplay.js');
const DATA_DIR         = path.join(ROOT, 'data', 'indicators');
const DATA_META_DIR    = path.join(ROOT, 'data', 'metadata');

/**
 * The "Sections" tab of the copy deck (content/copy/sections.csv) maps the
 * sheet's Section / Subsection names to site ids and headings. Columns:
 *   Level      category | section | custom
 *   Section    copy-deck Section name (category + section rows)
 *   Subsection copy-deck Subsection name (section rows; blank for At a glance)
 *   Id         site id (anchor, nav, category-card id)
 *   Heading    on-page section heading; blank = use the Subsection name
 *   Keys       custom rows only: indicator keys drawn by that bespoke section
 *              (semicolon-separated) instead of in their sheet subsection
 * Renaming a section = rename it in both sheets; no code change.
 */
function loadSectionsTab() {
  const rows = parseCsv(fs.readFileSync(SECTIONS_CSV, 'utf8'));
  const header = rows[0].map(h => h.trim());
  const col = Object.fromEntries(header.map((h, i) => [h, i]));
  for (const c of ['Level', 'Section', 'Subsection', 'Id', 'Heading', 'Keys']) {
    if (!(c in col)) throw new Error(`sections.csv is missing column: ${c}`);
  }
  const subsectionToSection = {};
  const sectionToCategory = {};
  const headings = {};
  const bespoke = {};
  for (const r of rows.slice(1)) {
    const get = (c) => clean(r[col[c]]);
    const level = get('Level').toLowerCase();
    const id = get('Id');
    if (!id) continue;
    if (level === 'category') sectionToCategory[get('Section')] = id;
    if (level === 'section') {
      subsectionToSection[`${get('Section')}|${get('Subsection')}`] = id;
      headings[id] = get('Heading') || get('Subsection');
    }
    if (level === 'custom') {
      headings[id] = get('Heading') || id;
      get('Keys').split(';').map(k => k.trim()).filter(Boolean).forEach(k => { bespoke[k] = id; });
    }
  }
  return { subsectionToSection, sectionToCategory, headings, bespoke };
}

const TITLES_NOTE = 'GENERATED by scripts/build-copy.js from content/copy/sections.csv — do not hand-edit. To rename a heading, change it in the Sections tab.';

/**
 * Keys whose data is split into per-segment files (age, race/ethnicity) —
 * they have no data/indicators/{key}.json of their own. Read from the
 * `kind: 'distribution'` entries in indicatorDisplay.js so there's one list.
 */
function distributionKeys() {
  const src = fs.readFileSync(DISPLAY_JS, 'utf8');
  return new Set([...src.matchAll(/set\('([^']+)',\s*\{\s*kind:\s*'distribution'/g)].map(m => m[1]));
}

/** Minimal RFC4180 CSV parser (quoted fields, embedded commas/newlines, "" escapes). */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  const s = text.replace(/^﻿/, '').replace(/\r\n/g, '\n');

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i++; }
        else { inQuotes = false; }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') { inQuotes = true; continue; }
    if (c === ',') { row.push(field); field = ''; continue; }
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue; }
    field += c;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter(r => r.some(cell => cell.trim() !== ''));
}

const clean = (v) => (v ?? '').replace(/\s+/g, ' ').trim();

let SUBSECTION_TO_SECTION, SECTION_TO_CATEGORY, SECTION_HEADINGS, BESPOKE_SECTION, DISTRIBUTION_KEYS;

function main() {
  ({ subsectionToSection: SUBSECTION_TO_SECTION, sectionToCategory: SECTION_TO_CATEGORY,
     headings: SECTION_HEADINGS, bespoke: BESPOKE_SECTION } = loadSectionsTab());
  DISTRIBUTION_KEYS = distributionKeys();

  const rows = parseCsv(fs.readFileSync(CSV_PATH, 'utf8'));
  const header = rows[0].map(h => h.trim());
  const idx = Object.fromEntries(header.map((h, i) => [h, i]));

  const required = ['FLAG', 'Section', 'Subsection', 'Key', 'Measure', 'Context', 'Comparison', 'type', 'of', 'detail', 'units', 'indicatorDetail'];
  const missing = required.filter(c => !(c in idx));
  if (missing.length) throw new Error(`measure-copy.csv is missing column(s): ${missing.join(', ')}`);

  const byKey = {};
  const errors = [];
  const unmapped = [];
  const warnings = [];

  // Sheet-order structure. Rows without a Key but with a valid
  // Section/Subsection are "planned" measures (NOT IN SITE yet) — the web
  // page skips them; the print report shows them as placeholders.
  const atAGlance = [];
  const categories = [];
  const catById = {};
  const secById = {};
  function place(entry, row) {
    if (entry.section === 'At a glance') { atAGlance.push(row); return; }
    const catId = SECTION_TO_CATEGORY[entry.section];
    if (!catId) return;
    if (!catById[catId]) {
      catById[catId] = { id: catId, label: entry.section, intro: '', sections: [] };
      categories.push(catById[catId]);
    }
    const secId = SUBSECTION_TO_SECTION[`${entry.section}|${entry.subsection}`];
    if (!secId) return;
    if (!secById[secId]) {
      secById[secId] = { id: secId, label: entry.subsection, rows: [], bespokeSections: [] };
      catById[catId].sections.push(secById[secId]);
    }
    const sec = secById[secId];
    if (!row) return;
    sec.rows.push(row);
    const bespoke = row.key && BESPOKE_SECTION[row.key];
    if (bespoke && !sec.bespokeSections.some(b => b.id === bespoke)) {
      sec.bespokeSections.push({ id: bespoke, label: SECTION_HEADINGS[bespoke] ?? bespoke });
    }
  }

  rows.slice(1).forEach((r, i) => {
    const get = (col) => clean(r[idx[col]]);
    const key = get('Key');

    const entry = {
      flag:            get('FLAG'),
      section:         get('Section'),
      subsection:      get('Subsection'),
      measure:         get('Measure'),
      context:         get('Context'),
      comparison:      get('Comparison'),
      type:            get('type'),
      of:              get('of'),
      detail:          get('detail'),
      units:           get('units'),
      indicatorDetail: get('indicatorDetail'),
    };

    // Category intro: Section filled, Subsection and Key blank. Context = the
    // intro paragraph under the category heading.
    if (!key && !entry.subsection && SECTION_TO_CATEGORY[entry.section]) {
      place(entry, null);
      catById[SECTION_TO_CATEGORY[entry.section]].intro = entry.context;
      return;
    }

    if (!key) {
      // navSection: the sheet's own section id, so search can list planned /
      // design-in-progress measures that render inside a bespoke block.
      const navSection = SUBSECTION_TO_SECTION[`${entry.section}|${entry.subsection}`];
      unmapped.push(navSection ? { ...entry, navSection } : entry);
      if (entry.measure) place(entry, { planned: true, measure: entry.measure, flag: entry.flag });
      return;
    }

    if (byKey[key]) { errors.push(`Row ${i + 2}: duplicate Key "${key}".`); return; }

    const sheetSection = SUBSECTION_TO_SECTION[`${entry.section}|${entry.subsection}`];
    if (!sheetSection) {
      errors.push(`Row ${i + 2} ("${key}"): unknown Section/Subsection "${entry.section}" / "${entry.subsection}". Valid: ${Object.keys(SUBSECTION_TO_SECTION).map(k => `"${k.replace('|', ' / ')}"`).join(', ')}`);
      return;
    }
    if (entry.section !== 'At a glance' && !SECTION_TO_CATEGORY[entry.section]) {
      errors.push(`Row ${i + 2} ("${key}"): Section "${entry.section}" has no nav category. Valid: ${Object.keys(SECTION_TO_CATEGORY).join(', ')}`);
      return;
    }
    const topic = BESPOKE_SECTION[key] ?? sheetSection;

    if (!entry.type || !entry.of) warnings.push(`Row ${i + 2} ("${key}"): blank type/of — its stat-tile / print sub-label will be empty.`);
    if (!DISTRIBUTION_KEYS.has(key)) {
      if (!fs.existsSync(path.join(DATA_DIR, `${key}.json`))) {
        warnings.push(`Row ${i + 2} ("${key}"): no data/indicators/${key}.json — card will show an empty state.`);
      }
      if (!fs.existsSync(path.join(DATA_META_DIR, `${key}-meta.json`))) {
        warnings.push(`Row ${i + 2} ("${key}"): no data/metadata/${key}-meta.json — no source/time period/methods note.`);
      }
    }

    // topic = where the card renders (a bespoke section id for custom Keys);
    // navSection = the sheet section it sits under in the nav (search uses it,
    // since bespoke sections like avertable-deaths aren't nav entries).
    byKey[key] = { key, topic, navSection: sheetSection, ...entry };
    place(entry, { key });
  });

  categories.filter(c => !c.intro).forEach(c =>
    warnings.push(`Category "${c.label}" has no intro text — fill Context on its intro row (Section "${c.label}", blank Subsection and Key).`));

  // Section-id constants used by custom layout files must exist in the Sections tab.
  const knownIds = new Set([...Object.values(SUBSECTION_TO_SECTION), ...Object.keys(SECTION_HEADINGS)]);
  for (const [, id] of fs.readFileSync(SECTION_IDS_JS, 'utf8').matchAll(/=\s*'([a-z0-9-]+)'/g)) {
    if (!knownIds.has(id)) errors.push(`src/config/registries/sectionIds.js uses "${id}", which isn't an Id in content/copy/sections.csv.`);
  }

  if (errors.length) {
    console.error(`[build-copy] ${errors.length} error(s) in measure-copy.csv — nothing written:`);
    errors.forEach(e => console.error(`[build-copy]   - ${e}`));
    process.exit(1);
  }

  const write = (file, obj) => fs.writeFileSync(file, JSON.stringify(obj, null, 2) + '\n', 'utf8');
  write(OUT_PATH, { ...byKey, _unmapped: unmapped });
  write(STRUCTURE_OUT, { _note: 'GENERATED by scripts/build-copy.js — do not hand-edit.', atAGlance, categories });
  write(SECTION_TITLES_OUT, { _note: TITLES_NOTE, ...SECTION_HEADINGS });

  const sectionCount = new Set(Object.values(byKey).map(r => r.topic)).size;
  console.log(`[build-copy] Wrote indicatorCopy.json, structure.json, sectionTitles.json — ${Object.keys(byKey).length} keyed rows in ${sectionCount} sections, ${unmapped.length} rows without a Key.`);
  warnings.forEach(w => console.warn(`[build-copy]   - ${w}`));
}

main();
