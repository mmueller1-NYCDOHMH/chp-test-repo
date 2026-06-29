/**
 * FILE: chartColors.js
 *
 * PURPOSE:
 * Single source of truth for all semantic chart and map colors.
 *
 * DESCRIPTION:
 * All chart components and the bar chart spec builder import color values
 * from here. A color change is a single edit in this file — no hunting
 * across buildBarChartSpec.js, ExpandableChartCard.jsx, ChoroplethMap.jsx,
 * IndicatorFlyoutContent.jsx, NeighborhoodMap.jsx, and ModalMap.jsx.
 *
 * SEMANTIC ROLES:
 *   SELECTED        — the currently selected neighborhood (primary highlight)
 *   COMPARISON      — the user-chosen comparison neighborhood
 *   CITYWIDE        — the NYC citywide reference tick/bar
 *   BOROUGH         — the borough-level reference tick/bar
 *   HOVER_MAP       — a bar hovered via the sidebar map
 *   HOVER_CHART     — a bar hovered directly in the chart
 *   BAR_DEFAULT     — all unselected, unhovered bars
 *
 * CHOROPLETH_STOPS  — 5-step sequential scale (light → dark) used by the
 *                     flyout choropleth map and its legend. Both the map and
 *                     the legend must use the same array — change it once here.
 *
 * MAP_*             — Leaflet polygon fill/stroke styles for NeighborhoodMap
 *                     and ModalMap interaction states.
 *
 * BOROUGH_PALETTE   — Per-borough fill/stroke colors for the overview map legend.
 *
 * NOTE: Vega-Lite specs (buildBarChartSpec.js) do not support CSS variables —
 * they require literal hex values. These constants bridge that gap.
 */

// ── Bar chart semantic colors ──────────────────────────────────────────────
export const SELECTED    = '#2563EB';  // blue-600   — selected neighborhood bar
export const COMPARISON  = '#D97706';  // amber-600  — comparison neighborhood bar
export const CITYWIDE    = '#E24B4A';  // custom red — citywide reference
export const BOROUGH     = '#0D9488';  // teal-600   — borough reference
export const HOVER_MAP   = '#93c5fd';  // blue-300   — bar hovered via sidebar map
export const HOVER_CHART = '#c7d2fe';  // indigo-200 — bar hovered in chart
export const BAR_DEFAULT = '#D1D5DB';  // gray-300   — all other bars
export const BAR_INVALID = '#9CA3AF';  // gray-400   — suppressed / null value bars

// ── Choropleth map gradient ────────────────────────────────────────────────
// Used by ChoroplethMap.jsx (fill colors) AND IndicatorFlyoutContent.jsx
// (the legend gradient). Both must stay in sync — they share this array.
export const CHOROPLETH_STOPS = [
  '#dbeafe',  // blue-100 — lowest values
  '#93c5fd',  // blue-300
  '#60a5fa',  // blue-400
  '#2563eb',  // blue-600
  '#1e3a8a',  // blue-900 — highest values
];

// ── Leaflet map interaction styles ─────────────────────────────────────────
// Shared by NeighborhoodMap.jsx and ModalMap.jsx.
export const MAP_STYLES = {
  base: {
    fillColor:   '#e5e7eb',  // gray-200
    color:       '#4b5563',  // gray-600
    weight:      1,
    fillOpacity: 0.5,
  },
  hover: {
    fillColor:   '#c7d2fe',  // indigo-200 — matches HOVER_CHART
    color:       '#111827',  // gray-900
    weight:      2,
    fillOpacity: 0.7,
  },
  selected: {
    fillColor:   '#93c5fd',  // blue-300   — matches HOVER_MAP
    color:       '#1d4ed8',  // blue-700
    weight:      3,
    fillOpacity: 0.8,
  },
  comparison: {
    fillColor:   '#fcd34d',  // amber-300
    color:       '#b45309',  // amber-700
    weight:      3,
    fillOpacity: 0.8,
  },
};

// ModalMap uses slightly different weight/opacity — override only what differs
export const MODAL_MAP_STYLES = {
  base: {
    ...MAP_STYLES.base,
    color: '#6b7280',  // gray-500 (slightly lighter than sidebar map)
  },
  hover: {
    ...MAP_STYLES.hover,
    weight:      2,
    fillOpacity: 0.75,
  },
  selected: {
    ...MAP_STYLES.selected,
    color:  '#1d4ed8',
    weight: 2.5,
  },
};

// ── Borough palette — overview map legend ──────────────────────────────────
// Keyed by borough prefix integer (1–5).
export const BOROUGH_PALETTE = {
  1: { fill: '#fca5a5', stroke: '#dc2626' },  // Manhattan  — coral/red
  2: { fill: '#93c5fd', stroke: '#2563eb' },  // Bronx      — blue
  3: { fill: '#6ee7b7', stroke: '#059669' },  // Brooklyn   — teal
  4: { fill: '#c4b5fd', stroke: '#7c3aed' },  // Queens     — violet
  5: { fill: '#fdba74', stroke: '#ea580c' },  // Staten Island — orange
};

// ── User location pin ──────────────────────────────────────────────────────
export const MAP_USER_PIN = {
  fill:   '#fbbf24',  // amber-400
  stroke: '#b45309',  // amber-700
};

// ── Miscellaneous UI ───────────────────────────────────────────────────────
export const TOPICNAV_SEPARATOR = '#D1D5DB';  // gray-300 — chevron between nav items
export const MAP_HOVER_TOOLTIP_BORDER_ACTIVE = '#bfdbfe';  // blue-200
export const MAP_HOVER_TOOLTIP_BORDER_IDLE   = '#f3f4f6';  // gray-100
