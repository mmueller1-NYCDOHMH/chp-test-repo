/**
 * FILE: EducationLevelSection.jsx
 *
 * PURPOSE:
 * "Highest level of education" split bar chart for the Education section
 * (2026-09-29). One back-to-back (butterfly) chart: the selected neighborhood
 * grows left, NYC (or the comparison neighborhood) grows right, one row per
 * attainment level. Replaces the three separate attainment cards
 * (edu-did-not-complete-hs, edu-hsgrad-some-college,
 * edu-college-degree-and-higher), which together sum to 100% per geography.
 *
 * Server component — resolves data/copy/metadata, then renders the shared
 * client PyramidChartSection (same chart + "Compare to city" toggle + Details
 * flyout the cancer-types card uses).
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

import PyramidChartSection from '@/components/data-display/PyramidChartSection';
import { loadIndicatorData } from '@/lib/data/loadIndicatorData';
import { getIndicatorMeta } from '@/lib/data/getIndicatorMeta';
import { getReadyNarrativeTemplate } from '@/lib/copy/getNarrativeCopy';
import { resolveNarrative } from '@/lib/copy/resolveNarrative';
import { pairDistributionSegments } from '@/lib/utils/distributionSegments';

const DISTRIBUTION_KEY = 'education-level';
const LEVEL_KEYS = [
  'edu-did-not-complete-hs',
  'edu-hsgrad-some-college',
  'edu-college-degree-and-higher',
];
// Card id / Details-flyout key. Search results for the other two levels are
// pointed at this card via ANCHOR_ALIASES in searchIndex.js.
const PRIMARY_KEY = 'edu-college-degree-and-higher';

// TODO(copy): move into the copy deck once a row/column exists for it.
const FALLBACK_SUBTITLE = 'Adults age 25+ by highest level of education completed';

export default function EducationLevelSection({ context, title }) {
  const { geoId, neighborhood } = context ?? {};
  if (!geoId) return null;

  const rows = loadIndicatorData(DISTRIBUTION_KEY);
  if (!rows.length) return null;

  const metas = LEVEL_KEYS.map(key => getIndicatorMeta(key));
  const primaryMeta = getIndicatorMeta(PRIMARY_KEY);

  const segmentCfg = LEVEL_KEYS.map((key, i) => ({
    key,
    label: metas[i]?.title ?? key,
  }));

  const primaryRow = rows.find(r => r.GeoID === geoId) ?? null;
  const cityRow    = rows.find(r => r.GeoID === 0) ?? null;
  const segments   = pairDistributionSegments(primaryRow, cityRow, segmentCfg);

  const neighborhoodLabel = neighborhood ?? primaryRow?.Geography ?? 'Neighborhood';

  // Read-more text from the college-degree copy row.
  const template = getReadyNarrativeTemplate(PRIMARY_KEY);
  const narrative =
    (template && resolveNarrative(template, {
      rows: loadIndicatorData(PRIMARY_KEY),
      geoId,
      neighborhoodName: neighborhoodLabel,
      title,
    })) || primaryMeta?.context || null;

  const periods = [...new Set(metas.map(m => m?.timePeriod).filter(Boolean))];

  const chart = {
    indicatorKey: PRIMARY_KEY,
    title:        title ?? 'Highest level of education',
    subtitle:     FALLBACK_SUBTITLE,
    narrative,
    segments,
    timePeriod:   periods.join(', ') || null,
    rawData:      rows,
    segmentCfg,
    valueSuffix:  '%', // display text comes from each file's DisplayValue
    description:  primaryMeta?.methodsNote ?? null,
    source:       primaryMeta?.sourceName ?? null,
    sourceUrl:    primaryMeta?.sourceUrl ?? null,
  };

  return (
    <PyramidChartSection
      charts={[chart]}
      neighborhoodLabel={neighborhoodLabel}
      geoId={geoId}
      fillHeight
      withDetails
    />
  );
}
