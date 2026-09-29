/**
 * FILE: EducationLevelSection.jsx
 *
 * PURPOSE:
 * "Highest level of education achieved" split bar chart for the Education
 * section (2026-09-29). Small multiples per Morgan's mockup: one column per
 * attainment level, one row per geography (neighborhood / comparison /
 * Citywide) — rendered by EducationSplitBarChart.jsx. Replaces the three separate attainment cards
 * (edu-did-not-complete-hs, edu-hsgrad-some-college,
 * edu-college-degree-and-higher), which together sum to 100% per geography.
 *
 * Server component — resolves data/copy/metadata, then renders the client
 * EducationSplitBarChart card.
 *
 * DATA: loadIndicatorData('education-level') joins the three per-level files
 * into one Distribution row per geography (see loadIndicatorData.js) — no
 * new data file needed.
 *
 * COPY (all from the copy deck, no hardcoded labels except the fallback
 * subtitle):
 *   - Card title: Heading of the `education-level` custom row in sections.csv
 *   - Row labels: each key's Measure in measure-copy.csv
 *   - Read-more text: the college-degree row's Context + Comparison, resolved
 *     by resolveNarrative(); falls back to Context alone while the Comparison
 *     sentence still uses tokens resolveNarrative doesn't support.
 *
 * ⚠ DATA VINTAGE: the metadata lists 2012-2016 for two levels and 2015-2019
 * for college degree+, yet the three values sum to exactly 100% — likely one
 * vintage mislabeled. Confirm with the data team; the footer shows whatever
 * the metadata says until then.
 */

import EducationSplitBarChart from '@/components/data-display/EducationSplitBarChart';
import { loadIndicatorData } from '@/lib/data/loadIndicatorData';
import { getIndicatorMeta } from '@/lib/data/getIndicatorMeta';
import { getReadyNarrativeTemplate } from '@/lib/copy/getNarrativeCopy';
import { resolveNarrative } from '@/lib/copy/resolveNarrative';

const DISTRIBUTION_KEY = 'education-level';
const LEVEL_KEYS = [
  'edu-did-not-complete-hs',
  'edu-hsgrad-some-college',
  'edu-college-degree-and-higher',
];
// Card id / Details-flyout key (its map shows college degree or higher).
// Search results for the other two levels are pointed at this card via
// ANCHOR_ALIASES in searchIndex.js.
const PRIMARY_KEY = 'edu-college-degree-and-higher';

// TODO(copy): move into the copy deck once a row/column exists for it.
const FALLBACK_SUBTITLE = 'Percent of adults 25 years and older';

export default function EducationLevelSection({ context, title }) {
  const { geoId, neighborhood } = context ?? {};
  if (!geoId) return null;

  const rows = loadIndicatorData(DISTRIBUTION_KEY);
  if (!rows.length) return null;

  const metas = LEVEL_KEYS.map(key => getIndicatorMeta(key));
  const primaryMeta = getIndicatorMeta(PRIMARY_KEY);
  const primaryRows = loadIndicatorData(PRIMARY_KEY);

  const levels = LEVEL_KEYS.map((key, i) => ({ key, label: metas[i]?.title ?? key }));

  const primaryRow = rows.find(r => r.GeoID === geoId) ?? null;
  const neighborhoodName = neighborhood ?? primaryRow?.Geography ?? 'Neighborhood';
  const cardTitle = title ?? 'Highest level of education achieved';

  // Read-more text from the college-degree copy row; falls back to its
  // Context sentence while the Comparison tokens can't be resolved.
  const template = getReadyNarrativeTemplate(PRIMARY_KEY);
  const narrative =
    (template && resolveNarrative(template, {
      rows: primaryRows,
      geoId,
      neighborhoodName,
      title: cardTitle,
    })) || primaryMeta?.context || null;

  const periods = [...new Set(metas.map(m => m?.timePeriod).filter(Boolean))];
  const sourceName = primaryMeta?.sourceName ?? null;
  const source = sourceName
    ? `${sourceName.replace(/\.$/, '')}${periods.length ? ` (${periods.join(', ')})` : ''}`
    : null;

  return (
    <EducationSplitBarChart
      title={cardTitle}
      subtitle={FALLBACK_SUBTITLE}
      narrative={narrative}
      source={source}
      sourceUrl={primaryMeta?.sourceUrl ?? null}
      description={primaryMeta?.methodsNote ?? null}
      levels={levels}
      rawData={rows}
      geoId={geoId}
      neighborhoodName={neighborhoodName}
      indicatorKey={PRIMARY_KEY}
      indicatorData={primaryRows}
      anchorId={`indicator-${PRIMARY_KEY}`}
    />
  );
}
