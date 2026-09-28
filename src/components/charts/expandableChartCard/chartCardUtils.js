/**
 * FILE: chartCardUtils.js
 *
 * Small pure helpers shared by ExpandableChartCard and its extracted
 * modals/legend (part of the 2026-09-04 split of ExpandableChartCard.jsx).
 */

import { deriveBoroughRow } from '@/lib/charts/buildBarChartSpec';
import { SELECTED, COMPARISON, CITYWIDE, BOROUGH } from '@/lib/charts/chartColors';

// Strip leading "Source: " prefix if already present so we can control formatting
export function cleanSource(source) {
  if (!source) return '';
  return source.replace(/^source:\s*/i, '');
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
  return [
    nycRow  && { color: CITYWIDE,   label: 'Citywide',                     value: nycRow.DisplayValue  },
    borRow  && { color: BOROUGH,    label: borRow.Geography,               value: borRow.DisplayValue  },
    cdRow   && { color: SELECTED,   label: stripCdCode(cdRow.Geography),   value: cdRow.DisplayValue   },
    compRow && { color: COMPARISON, label: stripCdCode(compRow.Geography), value: compRow.DisplayValue },
  ].filter(Boolean);
}
