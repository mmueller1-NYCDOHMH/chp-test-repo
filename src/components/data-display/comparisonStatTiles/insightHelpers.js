/**
 * FILE: insightHelpers.js
 *
 * Insight-badge direction styles and delta-pill styles shared by
 * StatTileSingle, StatTileSplit and StatTileDetailModal — same palette
 * IndicatorFlyoutContent uses for its "higher/lower than citywide" badge,
 * kept local here since this modal deliberately doesn't import that
 * (map-heavy) component. Part of the 2026-09-04 split of
 * ComparisonStatTilesClient.jsx.
 *
 * The arrow is purely numeric (↑ = CD value above citywide, ↓ = below,
 * regardless of what that means health-wise). The badge COLOR is a separate
 * judgment call — red/green should track whether this CD is doing better or
 * worse than citywide, which depends on the indicator's `higherIsBetter`
 * flag, not on the raw up/down direction. Getting this wrong is exactly how
 * self-rep-health (higherIsBetter: true — 95% is GOOD news) ended up with a
 * red "↑ higher than" badge: "up" was hardcoded to red as if every indicator
 * were a bad-outcome rate. getInsightBadgeClass() below fixes that; the old
 * per-direction object stayed just for the arrow glyphs.
 */
export const INSIGHT_ARROWS = { up: '↑', down: '↓', neutral: '–' };

/**
 * Badge color for the insight sentence's "higher/lower than citywide" pill.
 * `direction` is buildInsight()'s raw up/down/neutral (numeric only).
 * `higherIsBetter` is the indicator's own true/false/null flag.
 *
 * - direction "neutral", or higherIsBetter unknown (null): stay neutral gray
 *   — we have no basis to call it good or bad.
 * - otherwise: green when this direction is the "better" one for this
 *   indicator, red when it's the "worse" one.
 */
export function getInsightBadgeClass(direction, higherIsBetter) {
  if (direction === 'neutral' || higherIsBetter == null) {
    return 'bg-gray-100 text-gray-600 border-gray-200';
  }
  const isGood = higherIsBetter ? direction === 'up' : direction === 'down';
  return isGood
    ? 'bg-green-50 text-green-700 border-green-200'
    : 'bg-red-50 text-red-700 border-red-200';
}
