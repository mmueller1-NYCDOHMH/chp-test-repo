/**
 * FILE: NeighborhoodOverviewHero.jsx
 *
 * PURPOSE:
 * Neighborhood profile hero — surfaces five demographic Who-We-Are
 * indicators for the selected community district with comparison to NYC.
 *
 * DESCRIPTION:
 * Server component that renders:
 * 1. A neighborhood identity header (name, borough, CD number)
 * 2. A row of three StatTiles: total population, nativity, language
 * 3. Two ComparisonPyramidCharts side by side: Age Breakdown and Race / Ethnicity,
 *    each showing Neighborhood vs. NYC Citywide bars back-to-back per category.
 *
 * All data is read at server-render time from /data/indicators/*.json.
 * Adding, removing, or reordering tiles/charts requires only a config change.
 *
 * STAT TILE CONFIG SHAPE (each item in the `statTiles` prop array):
 *   indicatorKey    — matches a file in /data/indicators/ (e.g. 'total-population')
 *   label           — tile heading
 *   unit            — sub-label shown below the value
 *   displaySuffix   — appended to DisplayValue
 *   deltaSuffix     — appended to the delta figure
 *   decimals        — decimal places for the delta value (default 0)
 *   higherIsBetter  — true / false / null
 *                     true  = higher is healthier (e.g. life expectancy)
 *                     false = lower is healthier (e.g. obesity)
 *                     null  = direction-less; delta renders in neutral styling
 *   showDelta       — explicit false to suppress the delta badge entirely
 *
 * PYRAMID CHART CONFIG SHAPE (each item in the `pyramidCharts` prop array):
 *   indicatorKey    — matches a file in /data/indicators/ with a Distribution array
 *   title           — chart heading
 *   segments        — [{ key, label }] — keys match Distribution entries in the data
 *
 * CONTEXT (injected by CHPBuilder):
 *   context.geoId        — numeric GeoID used to look up the neighborhood row
 *   context.neighborhood — human-readable name
 *   context.borough      — borough name
 *   context.cdNumber     — community district number within the borough
 *
 * NOTES:
 * - Server component — no "use client"
 * - Returns null if geoId is not set (no neighborhood selected)
 * - Gracefully renders "—" tiles when a data file is missing or the geoId
 *   has no matching row
 * - Data resolution lives in @/lib/data/resolveOverviewData
 * - Delta calculations live in @/lib/utils/compareIndicator
 */

import ComparisonPyramidChart from '@/components/data-display/ComparisonPyramidChart';
import AnimatedValue           from '@/components/data-display/AnimatedValue';
import {
  resolveIndicatorRows,
  buildStatTile,
  buildPyramidChart,
} from '@/lib/data/resolveOverviewData';

// ─── Sub-components ──────────────────────────────────────────────────────────

const DELTA_STYLES = {
  better:  'text-green-700 bg-green-50',
  worse:   'text-red-700 bg-red-50',
  neutral: 'text-gray-600 bg-gray-50',
};

/** Single-value tile: big number + label/unit + (optional) delta + period. */
function StatTile({ label, unit, displayValue, timePeriod, delta, animationDelay = 0, className = '' }) {
  const deltaStyle = delta ? DELTA_STYLES[delta.direction] : '';

  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-1.5 min-w-0 ${className}`}>
      <div className="text-2xl font-semibold text-gray-900 leading-none">
        <AnimatedValue key={displayValue} value={displayValue ?? '—'} delay={animationDelay} />
      </div>

      <div className="text-xs font-semibold text-gray-700 leading-snug">{label}</div>
      {unit && <div className="text-xs text-gray-500 leading-snug">{unit}</div>}

      {delta && (
        <span
          className={`mt-1 self-start text-xs font-medium px-1.5 py-0.5 rounded-full leading-snug ${deltaStyle}`}
        >
          {delta.text}
        </span>
      )}

      {timePeriod && (
        <div className="text-xs text-gray-500 mt-auto pt-1">{timePeriod}</div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function NeighborhoodOverviewHero({
  statTiles     = [],
  pyramidCharts = [],
  context,
}) {
  const { geoId, neighborhood, borough } = context ?? {};

  if (!geoId) return null;

  const resolvedTiles = statTiles.map((cfg) => {
    const { cdRow, nycRow } = resolveIndicatorRows(cfg.indicatorKey, geoId);
    return buildStatTile(cfg, cdRow, nycRow);
  });

  const resolvedPyramids = pyramidCharts.map(cfg => buildPyramidChart(cfg, geoId));

  return (
    <div className="flex flex-col gap-6">

      {/* ── Identity header ─────────────────────────────────── */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900">
          {neighborhood ?? 'Neighborhood'} at a Glance
        </h3>
        {borough && (
          <p className="text-sm text-gray-500 mt-0.5">{borough}</p>
        )}
      </div>

      {/* ── Stat tiles (population, nativity, language) ──────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 items-stretch">
        {resolvedTiles.map(({ key, ...tile }, i) => (
          <StatTile
            key={key}
            {...tile}
            animationDelay={0}
            className={
              // Odd tile count: last tile spans both columns on mobile only
              resolvedTiles.length % 2 !== 0 && i === resolvedTiles.length - 1
                ? 'col-span-2 sm:col-span-1'
                : ''
            }
          />
        ))}
      </div>

      {/* ── Comparison pyramid charts (age + race/ethnicity) ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        {resolvedPyramids.map(chart => (
          <ComparisonPyramidChart
            key={`${chart.indicatorKey}-${neighborhood}`}
            title={chart.title}
            neighborhoodLabel={neighborhood ?? 'Neighborhood'}
            segments={chart.segments}
            timePeriod={chart.timePeriod}
          />
        ))}
      </div>

      {/* ── Source footnote ─────────────────────────────────── */}
      <p className="text-xs text-gray-500 border-t border-gray-100 pt-4">
        Source: American Community Survey 5-Year Estimates. Population, age,
        race/ethnicity, nativity, and limited English proficiency reflect the
        most recent available ACS release. Single-value metrics compare the
        neighborhood to NYC citywide.
      </p>

    </div>
  );
}
