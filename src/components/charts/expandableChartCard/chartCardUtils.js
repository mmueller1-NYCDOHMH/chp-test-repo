/**
 * FILE: chartCardUtils.js
 *
 * Small pure helpers shared by ExpandableChartCard and its extracted
 * modals/legend (part of the 2026-09-04 split of ExpandableChartCard.jsx).
 */

import { deriveBoroughRow } from '@/lib/charts/buildBarChartSpec';
import { SELECTED, COMPARISON, CITYWIDE, BOROUGH } from '@/lib/charts/chartColors';
import { isSuppressedRow } from '@/lib/utils/suppression';

// Strip leading "Source: " prefix if already present so we can control formatting
export function cleanSource(source) {
  if (!source) return '';
  return source.replace(/^source:\s*/i, '');
}

// Metadata subtitle line under an indicator title, e.g.
// "Percent of adults, age-adjusted (percent)". Shared by the card header and
// the Details flyout (2026-09-29) so both read identically. Returns '' when
// there's nothing to show.
export function formatMetadataLine({ metadataOf, metadataDetail, metadataUnits } = {}) {
  const base = [
    metadataOf ? `${metadataOf.charAt(0).toUpperCase()}${metadataOf.slice(1)}` : null,
    metadataDetail,
  ].filter(Boolean).join(' ');
  return `${base}${metadataUnits ? ` (${metadataUnits})` : ''}`.trim();
}

// Strip trailing borough code from Geography strings, e.g. "Greenwich Village & Soho (MN2)" → "Greenwich Village & Soho"
export function stripCdCode(name) {
  if (!name) return '';
  return name.replace(/ \([A-Z]{2}\d+\)$/, '');
}

// Builds the legend items array shared by the HTML legend and the canvas export.
export function buildLegendItems(indicatorData, geoId, comparisonNeighborhood) {
  if (!indicatorData?.length) return [];
  const nycRow  = indicatorData.find(r => r.GeoType === 'Citywide');
  // Match the selected CD's own borough (Borough GeoIDs 1–5 = CD GeoID / 100) —
  // previously grabbed the first Borough row, which was always Manhattan.
  const boroughId = geoId != null ? Math.floor(geoId / 100) : null;
  const borRow  = indicatorData.find(r => r.GeoType === 'Borough' && r.GeoID === boroughId) ?? deriveBoroughRow(indicatorData, geoId);
  const cdRow   = geoId != null ? indicatorData.find(r => r.GeoID === geoId) : null;
  const compRow = comparisonNeighborhood?.geoId != null
    ? indicatorData.find(r => r.GeoID === comparisonNeighborhood.geoId)
    : null;
  // Suppressed rows (2026-10-01): `suppressed: true` + value 'Suppressed' —
  // ExpandedChartLegend renders "<Name> (Suppressed)" like the card's legend;
  // the canvas export reads "<Name> · Suppressed".
  const item = (row, color, label) => {
    const suppressed = isSuppressedRow(row);
    return { color, label, value: suppressed ? 'Suppressed' : row.DisplayValue, suppressed };
  };
  return [
    nycRow  && item(nycRow,  CITYWIDE,   'Citywide'),
    borRow  && item(borRow,  BOROUGH,    borRow.Geography),
    cdRow   && item(cdRow,   SELECTED,   stripCdCode(cdRow.Geography)),
    compRow && item(compRow, COMPARISON, stripCdCode(compRow.Geography)),
  ].filter(Boolean);
}
