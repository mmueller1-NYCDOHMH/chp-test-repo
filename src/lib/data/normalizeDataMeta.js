/**
 * FILE: normalizeDataMeta.js
 *
 * PURPOSE:
 * Shared PascalCase → camelCase field mapping for a raw
 * data/metadata/{key}-meta.json object, used by getIndicatorMeta.js (the
 * single reader of data/metadata/ — cancer-rank and premature-mort-cause
 * metadata go through it too as of 2026-09-27).
 *
 * Fallback semantics matter and are preserved exactly as each caller
 * originally used them: `||` for string fields (a blank string from the
 * data team's export — e.g. the known avertable-death/edu-hsgrad-some-college
 * blank-Unit case — should fall through to null, not be treated as a real
 * value), `??` for `decimals` (0 is a meaningful, real decimals value and
 * must NOT be treated as "missing").
 *
 * NOTE: `decimals` and `ageAdjustment` get simple defaults here (0 / null).
 * getIndicatorMeta.js reads dataMeta.Decimals / dataMeta.AgeAdjustment
 * directly, which is equivalent.
 */

/**
 * @param {object|null} raw — parsed data/metadata/{key}-meta.json content
 * @returns {{
 *   title: string|null, subtitle: string|null,
 *   source: string|null, timePeriod: string|null, label: string|null,
 *   unit: string|null,
 *   decimals: number, methodsNote: string|null,
 *   denominatorSource: string|null, ageAdjustment: *|null,
 * }|null}
 */
export function normalizeDataMetaFields(raw) {
  if (!raw) return null;
  return {
    title:             raw.Title || null,
    subtitle:          raw.Subtitle || null,
    source:            raw.Source || null,
    timePeriod:        raw.TimePeriod || null,
    label:             raw.Label || null,
    unit:              raw.Unit || null,
    decimals:          raw.Decimals ?? 0,
    methodsNote:       raw.MethodsNote || null,
    denominatorSource: raw.DenominatorSource || null,
    ageAdjustment:     raw.AgeAdjustment ?? null,
  };
}

/**
 * Builds the "Source: X (Y)" citation string used wherever a raw Source +
 * TimePeriod pair need to collapse into one display string. Returns null
 * when source is blank, matching every caller's existing "no source, no
 * citation" behavior.
 *
 * @param {string|null} source
 * @param {string|null} timePeriod
 * @returns {string|null}
 */
export function formatSourceCitation(source, timePeriod) {
  if (!source) return null;
  return `Source: ${source}${timePeriod ? ` (${timePeriod})` : ''}`;
}
