/**
 * FILE: AvertableDeathsSection.jsx
 *
 * PURPOSE:
 * Block for the Avertable Deaths section (config/sections/avertableDeaths.js)
 * — replaces the standard indicatorChartGrid/bar-chart block for this one
 * indicator with the dot distribution chart Morgan asked for. Server
 * component (no "use client"): resolves the selected neighborhood's row, its
 * suppression fallback, and the on-card narrative paragraph, then hands
 * everything to the client chart (AvertableDeathsChart.jsx), which is the
 * piece that needs ComparisonContext. Same split as
 * PrematureDeathOverviewSection.jsx.
 *
 * NARRATIVE (2026-09-25, per Morgan's mockup): the card now shows a
 * paragraph under the subtitle ("Living in high-poverty neighborhoods… In
 * <Name>, …" + "read more"). The measure-copy pipeline's avertable-death
 * template (the copy deck — content/copy/indicatorCopy.json) can't be resolved yet — it
 * uses 4 bespoke conditional sub-tokens resolveNarrative.js doesn't support
 * (see that row's knownGap). Until it can, the paragraph is assembled here
 * from the mockup's lead sentence + one data sentence.
 * TODO(Morgan/copy): confirm wording, then move it into measure-copy.csv
 * once resolveNarrative supports the conditional tokens.
 *
 * Returns null if geoId is not set or the indicator has no data file yet
 * (same guard IndicatorChartGrid/PrematureDeathOverviewSection use).
 */

import { loadIndicatorData } from '@/lib/data/loadIndicatorData';
import { getIndicatorMeta } from '@/lib/data/getIndicatorMeta';
import { getAvertableDeathsFallback } from '@/lib/data/getAvertableDeathsFallback';
import AvertableDeathsChart from './AvertableDeathsChart';

const INDICATOR_KEY = 'avertable-death';

const FALLBACK_SUBTITLE =
  'Deaths that would be averted if this neighborhood had the same death rate as the 5 wealthiest neighborhoods';

const NARRATIVE_LEAD =
  'Living in high-poverty neighborhoods limits healthy options and makes it difficult to access health care and resources that promote health.';

function buildNarrative(selectedRow, neighborhoodName, fallback) {
  if (fallback?.suppressed) return `${NARRATIVE_LEAD} ${fallback.message}`;
  if (typeof selectedRow?.Value !== 'number') return NARRATIVE_LEAD;
  const pct = selectedRow.DisplayValue ?? `${Math.round(selectedRow.Value * 100)}%`;
  return (
    `${NARRATIVE_LEAD} In ${neighborhoodName}, ${pct} of deaths could have been averted ` +
    'if the neighborhood had the same death rate as the 5 wealthiest neighborhoods.'
  );
}

// Details flyout (2026-09-30): the data sentence as structured parts, so the
// flyout can render it below the map with the neighborhood value badge-styled
// like the standard cards' copy-deck comparison sentence.
function buildFlyoutComparison(selectedRow, neighborhoodName, fallback) {
  if (fallback?.suppressed) return [{ kind: 'text', text: fallback.message }];
  if (typeof selectedRow?.Value !== 'number') return null;
  const pct = selectedRow.DisplayValue ?? `${Math.round(selectedRow.Value * 100)}%`;
  return [
    { kind: 'text',  text: `In ${neighborhoodName}, ` },
    { kind: 'value', text: pct },
    { kind: 'text',  text: ' of deaths could have been averted if the neighborhood had the same death rate as the 5 wealthiest neighborhoods.' },
  ];
}

export default function AvertableDeathsSection({ context }) {
  const { geoId, neighborhood } = context ?? {};
  if (!geoId) return null;

  const rows = loadIndicatorData(INDICATOR_KEY);
  if (!rows.length) return null;

  const meta = getIndicatorMeta(INDICATOR_KEY);
  const selectedRow = rows.find((r) => r.GeoID === geoId);
  const neighborhoodName = neighborhood ?? selectedRow?.Geography ?? 'This neighborhood';
  const selectedFallback = getAvertableDeathsFallback(selectedRow, neighborhoodName);

  return (
    <AvertableDeathsChart
      title={meta?.title ?? 'Avertable Deaths'}
      subtitle={meta?.subtitle || FALLBACK_SUBTITLE}
      narrative={buildNarrative(selectedRow, neighborhoodName, selectedFallback)}
      flyoutContext={NARRATIVE_LEAD}
      flyoutComparison={buildFlyoutComparison(selectedRow, neighborhoodName, selectedFallback)}
      source={meta?.source}
      sourceUrl={meta?.sourceUrl}
      description={meta?.methodsNote}
      rows={rows}
      geoId={geoId}
      neighborhoodName={neighborhoodName}
      selectedFallback={selectedFallback}
      anchorId={`indicator-${INDICATOR_KEY}`}
    />
  );
}
