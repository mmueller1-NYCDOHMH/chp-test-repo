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

// NYCComparison field value / buildInsight direction → badge direction.
const COMPARISON_DIRECTION = { higher: 'up', lower: 'down', similar: 'neutral' };

function resolveAggComparisonPart(rows, cdRow, geoId, title) {
  const raw = cdRow.NYCComparison;
  if (raw && raw !== 'na' && NYC_COMPARISON_PHRASES[raw]) {
    return { text: NYC_COMPARISON_PHRASES[raw], direction: COMPARISON_DIRECTION[raw] ?? 'neutral' };
  }
  const insight = buildInsight(rows, geoId, title);
  return insight?.label ? { text: insight.label, direction: insight.direction } : null;
}

/**
 * Structured version of resolveNarrative (2026-09-28) — same token rules,
 * but returns an array of segments so callers can style data values
 * (e.g. the flyout's comparison sentence renders values as badges):
 *   { kind: 'text',       text }
 *   { kind: 'value',      text }             — the neighborhood's own value
 *   { kind: 'nyc',        text }             — the citywide reference value
 *   { kind: 'comparison', text, direction }  — higher/lower/similar phrase;
 *                                              direction 'up'|'down'|'neutral'
 * Plain JSON, so it can cross the server → client boundary as a prop.
 *
 * @returns {Array|null} segments, or null if it can't be safely resolved
 */
export function resolveNarrativeParts(template, { rows, geoId, neighborhoodName, title }) {
  if (!template) return null;

  const hasTokens = TOKEN_RE.test(template);
  TOKEN_RE.lastIndex = 0; // reset after .test()

  if (!hasTokens) return [{ kind: 'text', text: template.trim() }]; // fully static copy

  if (!rows?.length || geoId == null) return null;

  const cdRow  = rows.find(r => r.GeoType === 'CD' && r.GeoID === geoId) ?? null;
  const nycRow = rows.find(r => r.GeoID === 0) ?? null;

  if (!cdRow || cdRow.Value == null) return null;

  const cdValue = stripReliabilityMark(cdRow.DisplayValue) ?? '';
  const parts = [];
  let unresolved = false;
  let last = 0;
  const pushText = (text) => { if (text) parts.push({ kind: 'text', text }); };

  // Direction of this CD vs NYC, shared by the bespoke tokens below.
  const cmp = () => resolveAggComparisonPart(rows, cdRow, geoId, title);

  function resolveToken(arg) {
    const argLower = arg.toLowerCase();

    // ── Bespoke copy-deck tokens (2026-09-28) ────────────────────────────
    // The deck's Tableau calculated fields for these aren't available, so
    // their output is reconstructed from the surrounding sentence. BEST
    // GUESSES — confirm wording with the copy/data team.
    const bespoke = resolveBespokeToken(argLower, { cdRow, nycRow, cdValue, cmp });
    if (bespoke !== undefined) return bespoke;

    if (argLower === 'name') return { kind: 'text', text: neighborhoodName ?? '' };
    if (argLower.startsWith('reliability')) {
      return { kind: 'text', text: cdRow.ValueStatus === 'flagged' ? '*' : '' };
    }
    // Bare <Value> (copy deck 2026-09) — same as <SUM(Value)>.
    if (argLower === 'value') return { kind: 'value', text: cdValue };
    // <Suppression> — suppressed rows already returned null above.
    if (argLower === 'suppression') return { kind: 'text', text: '' };

    const aggMatch = arg.match(/^(SUM|AVG|MIN)\((.+)\)$/i);
    if (aggMatch) {
      const inner = aggMatch[2].toLowerCase();
      if (inner.includes('nyc reference')) {
        if (!nycRow) return null;
        return { kind: 'nyc', text: stripReliabilityMark(nycRow.DisplayValue) ?? '' };
      }
      // Percentage or plain value — DisplayValue already carries the right
      // formatting (% sign, thousands separators).
      return { kind: 'value', text: cdValue };
    }

    if (argLower.startsWith('agg(')) {
      const inner = arg.slice(4, -1).toLowerCase();
      if (inner.includes('nyc comparison')) {
        const c = resolveAggComparisonPart(rows, cdRow, geoId, title);
        return c ? { kind: 'comparison', text: c.text, direction: c.direction } : null;
      }
      // e.g. <AGG(ZN(SUM([Value Percentage])))> — the CD's own value.
      if (inner.includes('value percentage')) return { kind: 'value', text: cdValue };
      if (inner.includes('estimate description')) {
        const word = estimateDescription(cdRow.Value);
        return word ? { kind: 'text', text: word } : null;
      }
      return null;
    }

    // Unknown token (e.g. the copy deck's bespoke "<Bikes text 1>").
    return null;
  }

  let m;
  while ((m = TOKEN_RE.exec(template)) !== null) {
    pushText(template.slice(last, m.index));
    const res = resolveToken(m[1].trim());
    if (!res) unresolved = true;
    else for (const seg of [].concat(res)) {
      if (seg.kind === 'text') pushText(seg.text);
      else parts.push(seg);
    }
    last = m.index + m[0].length;
  }
  TOKEN_RE.lastIndex = 0;
  pushText(template.slice(last));

  // 2026-09-28: any unresolved token → null so the card falls back to its
  // plain subtitle. Warn once per template per server process.
  if (unresolved) {
    if (process.env.NODE_ENV === 'development' && !warnedTemplates.has(template)) {
      warnedTemplates.add(template);
      console.warn(`[resolveNarrative] Unsupported token(s) — card shows its subtitle instead. Template: "${template}"`);
    }
    return null;
  }

  // Merge adjacent text segments, then tidy whitespace the same way the
  // string version always has (double spaces from empty substitutions,
  // space before punctuation).
  const merged = [];
  for (const p of parts) {
    const prev = merged[merged.length - 1];
    if (p.kind === 'text' && prev?.kind === 'text') prev.text += p.text;
    else merged.push({ ...p });
  }
  merged.forEach((p, i) => {
    if (p.kind !== 'text') return;
    const prev = merged[i - 1];
    // Copy-deck slips the badge layout makes obvious (2026-09-28):
    //   "<AGG(NYC comparison)> than the rest" → "higher than than the rest"
    if (prev?.kind === 'comparison' && /\bthan$/i.test(prev.text)) {
      p.text = p.text.replace(/^\s*than\b/i, '');
    }
    //   "<SUM(Value)><Reliability>of adults" → "14%of adults" / "14%*of adults"
    if (prev && prev.kind !== 'text') p.text = p.text.replace(/^(\*?)([A-Za-z])/, '$1 $2');
    p.text = p.text.replace(/[ \t]+/g, ' ');
    if (i === 0) p.text = p.text.replace(/^\s+/, '');
    if (i === merged.length - 1) p.text = p.text.replace(/\s+$/, '');
    p.text = p.text.replace(/\s+([.,])/g, '$1');
  });
  return merged.filter(p => p.kind !== 'text' || p.text);
}

/**
 * Bespoke tokens → segment, null (can't resolve), or undefined (not bespoke).
 *   <Farmer's market text 1/2>  "is home to <1> <2> farmers markets"
 *                               → 1 = the count ("no" when 0), 2 = nothing
 *   <Bikes text 1><Cockroaches and bikes text 2>roads …
 *                               → 1 = Most/Many/Some/Few, 2 = the space
 *   <AGG(HO infant mortality narrative text)> <AGG(NYC comparison)><AGG(NYC comparison 2)>
 *                               → " of <value> per 1,000 live births is",
 *                                 "<higher than…>", " the citywide rate."
 *   <AGG(If NYC and CD are the same omit City - child obesity)>
 *                               → " of <NYC value>" unless similar to NYC
 *   <AGG(However for premature mort)>
 *                               → "At <value> per 100,000 people," — the
 *                                 neighborhood's premature mortality rate
 */
function resolveBespokeToken(argLower, { cdRow, nycRow, cdValue, cmp }) {
  const nycValue = nycRow ? stripReliabilityMark(nycRow.DisplayValue) : null;

  if (argLower.startsWith("farmer's market text") || argLower.startsWith('farmers market text')) {
    if (argLower.endsWith('1')) {
      return Number(cdRow.Value) === 0 ? { kind: 'text', text: 'no' } : { kind: 'value', text: cdValue };
    }
    return { kind: 'text', text: '' };
  }
  if (argLower === 'bikes text 1') {
    const word = estimateDescription(cdRow.Value);
    return word ? { kind: 'text', text: word } : null;
  }
  if (argLower === 'cockroaches and bikes text 2') {
    return { kind: 'text', text: ' ' };
  }

  if (!argLower.startsWith('agg(')) return undefined;
  const inner = argLower.slice(4, -1);

  if (inner === 'nyc comparison 2') return { kind: 'text', text: ' the citywide rate.' };
  if (inner.startsWith('ho infant mortality narrative text')) {
    return [
      { kind: 'text', text: ' of ' },
      { kind: 'value', text: `${cdValue} per 1,000 live births` },
      { kind: 'text', text: ' is' },
    ];
  }
  if (inner.startsWith('if nyc and cd are the same omit city')) {
    const c = cmp();
    if (!c || c.direction === 'neutral' || !nycValue) return { kind: 'text', text: '' };
    return [{ kind: 'text', text: ' of ' }, { kind: 'nyc', text: nycValue }];
  }
  if (inner.startsWith('however for premature mort')) {
    // 2026-10-07 (Morgan): this token is the neighborhood's own premature
    // mortality rate, not a conditional "However,". Lead-in wording ("At …,")
    // is ours so the rate reads as a rate, not a count of residents — confirm
    // with the copy team. Units match the copy deck's units column.
    return [
      { kind: 'text', text: 'At ' },
      { kind: 'value', text: `${cdValue} per 100,000 people` },
      { kind: 'text', text: ',' },
    ];
  }
  return undefined;
}

/** Flatten segments from resolveNarrativeParts back into one string. */
export function narrativePartsToString(parts) {
  if (!parts) return null;
  return parts.map(p => p.text).join('').replace(/[ \t]+/g, ' ').replace(/\s+([.,])/g, '$1').trim();
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
export function resolveNarrative(template, opts) {
  return narrativePartsToString(resolveNarrativeParts(template, opts));
}
