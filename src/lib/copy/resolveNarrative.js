/**
 * FILE: resolveNarrative.js
 *
 * PURPOSE:
 * Resolves a narrative copy template (Context + Comparison from the copy
 * deck — see getNarrativeCopy.js) into a real sentence for one neighborhood,
 * by substituting <TOKEN> placeholders with values read from that
 * indicator's data file.
 *
 * BACKGROUND:
 * Templates come from the DOHMH copy deck (CHP CopyMeasure.csv), written
 * as Tableau-style calculated-field tokens, e.g.:
 *   "In <Name>, <SUM(Value Percentage)> of residents live in poverty,
 *    compared with <SUM(NYC reference (%))> of NYC residents."
 *
 * SUPPORTED TOKENS (case-insensitive on the inner argument):
 *   <Name>                          — neighborhood display name
 *   <SUM(...)> / <AVG(...)> / <MIN(...)>
 *     — arg contains "percentage"     → cdRow.DisplayValue (percent, e.g. "20%")
 *     — arg contains "nyc reference"  → nycRow.DisplayValue (citywide)
 *     — anything else (Value, Overallpop, ...) → cdRow.DisplayValue as-is
 *     All three aggregation names are treated identically: with one CD row
 *     selected there's only ever one value to aggregate, so SUM/AVG/MIN of
 *     a single row all resolve to that row's own value — the distinction
 *     only mattered in the original multi-row Tableau calculation.
 *   <AGG(NYC comparison)>
 *     — prefers the data's own NYCComparison field (DOHMH's statistical
 *       significance classification: lower/higher/similar) when present;
 *       falls back to a relative-difference heuristic (buildInsight) when
 *       the field is absent or 'na'.
 *   <AGG(Estimate description ...)>
 *     — buckets cdRow.Value (assumed 0-100 percentage) into a word:
 *       Most (>=75) / Many (50-74) / Some (25-49) / Few (<25).
 *       ASSUMPTION: this mirrors the common DOHMH health-profile
 *       word-bucketing convention; exact thresholds/wording should be
 *       confirmed against the source Tableau workbook if available.
 *   <Reliability> (and any variant containing "reliability")
 *     — "*" when cdRow.ValueStatus === 'flagged', else ''.
 *   <Value>                         — cdRow.DisplayValue
 *   <AGG(ZN(SUM([Value Percentage])))> — cdRow.DisplayValue
 *   <Suppression>                   — '' (suppressed rows never get this far)
 *
 * WHAT THIS DOES NOT HANDLE (by design — see CHP copy audit):
 * A handful of indicators (avertable-death, education composite,
 * farmers-markets, bike-coverage, infant-mort, child-obesity,
 * premature-mort-*) use bespoke conditional-text tokens whose exact
 * business logic isn't recoverable from the token name alone (e.g.
 * "<CD for avertable deaths 1>", "<Bikes text 1>"). Those indicators
 * have no `narrativeTemplate` set and this resolver is never called for
 * them — flagged separately for a follow-up pass once the intended
 * wording is confirmed.
 *
 * UNSUPPORTED TOKENS: if any token can't be resolved, the whole sentence
 * is dropped (returns null) and the caller falls back to the subtitle —
 * never a sentence with holes. Fix by rewording the copy-deck row with
 * supported tokens, or by adding the token here.
 *
 * NULL / SUPPRESSED DATA:
 * If the neighborhood's row for this indicator is missing or has a null
 * Value, resolveNarrative returns null — callers should render nothing
 * rather than a sentence with a hole in it.
 */

import { buildInsight } from '@/lib/utils/compareIndicator';
import phrases from '../../../content/site/phrases.json';

const TOKEN_RE = /<([^>]+)>/g;

// Templates already warned about (dev only) — keeps the log to one line each.
const warnedTemplates = new Set();

// Wording lives in content/site/phrases.json.
const NYC_COMPARISON_PHRASES = phrases.comparison;

function stripReliabilityMark(displayValue) {
  return typeof displayValue === 'string' ? displayValue.replace(/\*+$/, '') : displayValue;
}

// Words + thresholds live in content/site/phrases.json. Value may arrive as a
// 0–1 fraction (current data format) or a 0–100 percent; normalize first.
function estimateDescription(value) {
  if (value == null) return null;
  const pct = Math.abs(value) <= 1 ? value * 100 : value;
  const bucket = phrases.estimateDescription.find(b => pct >= b.atLeastPercent);
  return bucket?.word ?? null;
}

function resolveAggComparison(rows, cdRow, geoId, title) {
  const raw = cdRow.NYCComparison;
  if (raw && raw !== 'na' && NYC_COMPARISON_PHRASES[raw]) {
    return NYC_COMPARISON_PHRASES[raw];
  }
  // Fall back to a relative-difference heuristic against the citywide row.
  const insight = buildInsight(rows, geoId, title);
  return insight?.label ?? null;
}

/**
 * @param {string} template        — raw template string with <TOKEN> placeholders
 * @param {object} opts
 * @param {Array}  opts.rows       — full raw row array for this indicator (from loadIndicatorData)
 * @param {number} opts.geoId      — numeric GeoID of the selected neighborhood (CD-level)
 * @param {string} opts.neighborhoodName — clean display name (from displayName() / neighborhoods list)
 * @param {string} [opts.title]    — indicator title, passed through to buildInsight for its return shape only
 *
 * @returns {string|null} resolved sentence, or null if it can't be safely resolved
 */
export function resolveNarrative(template, { rows, geoId, neighborhoodName, title }) {
  if (!template) return null;

  const hasTokens = TOKEN_RE.test(template);
  TOKEN_RE.lastIndex = 0; // reset after .test()

  if (!hasTokens) return template; // fully static copy (e.g. New HIV diagnoses)

  if (!rows?.length || geoId == null) return null;

  const cdRow  = rows.find(r => r.GeoType === 'CD' && r.GeoID === geoId) ?? null;
  const nycRow = rows.find(r => r.GeoID === 0) ?? null;

  if (!cdRow || cdRow.Value == null) return null;

  let unresolved = false;

  const result = template.replace(TOKEN_RE, (_match, rawArg) => {
    const arg = rawArg.trim();
    const argLower = arg.toLowerCase();

    if (argLower === 'name') {
      return neighborhoodName ?? '';
    }

    if (argLower.startsWith('reliability')) {
      return cdRow.ValueStatus === 'flagged' ? '*' : '';
    }

    // Bare <Value> (copy deck 2026-09) — same as <SUM(Value)>.
    if (argLower === 'value') {
      return stripReliabilityMark(cdRow.DisplayValue) ?? '';
    }

    // <Suppression> — suppressed rows already return null above, so a row
    // that reaches here is never suppressed: render nothing.
    if (argLower === 'suppression') {
      return '';
    }

    const aggMatch = arg.match(/^(SUM|AVG|MIN)\((.+)\)$/i);
    if (aggMatch) {
      const inner = aggMatch[2].toLowerCase();
      if (inner.includes('nyc reference')) {
        if (!nycRow) { unresolved = true; return ''; }
        return stripReliabilityMark(nycRow.DisplayValue) ?? '';
      }
      // Percentage or plain value — DisplayValue already carries the right
      // formatting (% sign, thousands separators) and, after the 2026 data
      // audit fix, numerically matches Value exactly.
      return stripReliabilityMark(cdRow.DisplayValue) ?? '';
    }

    if (argLower.startsWith('agg(')) {
      const inner = arg.slice(4, -1).toLowerCase();
      if (inner.includes('nyc comparison')) {
        const phrase = resolveAggComparison(rows, cdRow, geoId, title);
        if (!phrase) { unresolved = true; return ''; }
        return phrase;
      }
      // e.g. <AGG(ZN(SUM([Value Percentage])))> — the CD's own value.
      if (inner.includes('value percentage')) {
        return stripReliabilityMark(cdRow.DisplayValue) ?? '';
      }
      if (inner.includes('estimate description')) {
        const word = estimateDescription(cdRow.Value);
        if (!word) { unresolved = true; return ''; }
        return word;
      }
      unresolved = true;
      return '';
    }

    // Unknown token (e.g. the copy deck's bespoke "<Bikes text 1>") — flag it.
    unresolved = true;
    return '';
  });

  // 2026-09-28: any unresolved token → return null so the card falls back to
  // its plain subtitle. Previously the sentence rendered with blanks where
  // the tokens were (e.g. "is home to  farmers markets") in production.
  // Warn once per template per server process, not on every render.
  if (unresolved) {
    if (process.env.NODE_ENV === 'development' && !warnedTemplates.has(template)) {
      warnedTemplates.add(template);
      console.warn(`[resolveNarrative] Unsupported token(s) — card shows its subtitle instead. Template: "${template}"`);
    }
    return null;
  }

  // Collapse any double spaces left by empty substitutions (e.g. Reliability = '').
  return result.replace(/[ \t]+/g, ' ').replace(/\s+([.,])/g, '$1').trim();
}
