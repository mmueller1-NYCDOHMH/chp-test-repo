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
// Updated 2026-08-04 — data vis palette pass. Applies across the ranked bar
// chart (buildBarChartSpec.js), the butterfly/pyramid comparison chart
// (ComparisonPyramidChart.jsx), and the dot distribution strips
// (DistributionStrip.jsx, ComparisonStatTilesClient.jsx's MicroStrip) so all
// data vis stays visually consistent. Each value chosen to meet WCAG AA
// against a white background.
export const SELECTED    = '#5646F5';  // Primary CD — most prominent/saturated; draws the eye
export const COMPARISON  = '#C94D18';  // Comparison CD — clearly distinct from primary, not attention-grabbing
export const CITYWIDE    = '#5F7699';  // NYC tick (indicator card) / bar (expanded view) — dark enough to read, not eye-catching
export const BOROUGH     = '#757575';  // Borough tick (indicator card) / bar (expanded view) — same treatment, one step lighter than NYC
// HOVER_MAP / HOVER_CHART — updated to match --color-brand (globals.css), the
// same blue used for header, primary nav, and brand buttons site-wide, so
// hover states read as one consistent theme color instead of an unrelated
// light blue/indigo. Both hover triggers (sidebar map vs. direct chart hover)
// intentionally share this value now. Rendered at 85% opacity (rgba, not a
// flat hex) — the full-strength navy read as too heavy/solid for a hover
// state against the light gray default bars.
export const HOVER_MAP   = 'rgba(30, 58, 138, 0.85)';  // brand blue — bar hovered via sidebar map
export const HOVER_CHART = 'rgba(30, 58, 138, 0.85)';  // brand blue — bar hovered directly in chart
export const BAR_DEFAULT = '#C7CCDB';  // Default/unselected CDs — neutral, doesn't compete, still has contrast for exports
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
    fillColor:   '#1E3A8A',  // brand blue — matches HOVER_MAP / HOVER_CHART
    color:       '#111827',  // gray-900
    weight:      2,
    fillOpacity: 0.7,
  },
  selected: {
    // Same SELECTED purple used for the primary CD everywhere else (bars,
    // dots, pyramid chart). fillOpacity 0.75 — high enough that the exact hue
    // still reads as SELECTED against the light CartoDB basemap (full 0.35
    // washed it out to a pale blue/lavender; this keeps some translucency
    // without losing the color).
    fillColor:   SELECTED,
    color:       SELECTED,
    weight:      3,
    fillOpacity: 0.75,
  },
  comparison: {
    // Same COMPARISON rust used for the comparison CD everywhere else. Same
    // opacity reasoning as selected above.
    fillColor:   COMPARISON,
    color:       COMPARISON,
    weight:      3,
    fillOpacity: 0.75,
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
