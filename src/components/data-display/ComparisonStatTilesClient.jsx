'use client';

/**
 * FILE: ComparisonStatTilesClient.jsx
 *
 * PURPOSE:
 * Client-side stat tile row for the neighborhood "At a Glance" section.
 * Reads ComparisonContext and, when a comparison CD is active, shows its
 * value alongside the primary CD value in each tile.
 *
 * PROPS:
 *   tiles          — Array of pre-resolved tile objects from buildStatTile,
 *                    plus title/subtitle/source/sourceUrl/description/dataSource/
 *                    isPercent carried through by NeighborhoodOverviewHero.jsx for
 *                    the expand modal:
 *                    { key, label, unit, displayValue, timePeriod, delta, displaySuffix,
 *                      title, subtitle, source, sourceUrl, description, dataSource, isPercent }
 *   rawDataByKey   — Map of indicatorKey → full array of data rows (all CDs + Citywide)
 *   primaryLabel   — Display name of the primary neighborhood (e.g. "Mott Haven")
 *   geoId          — Numeric GeoID of the primary neighborhood
 *
 * COMPARISON DISPLAY:
 * Without comparison: single-column card with micro distribution strip.
 * With comparison: values side-by-side (blue | amber) with citywide ref below.
 *
 * CLICK TO EXPAND (2026-09-03):
 * Every tile (StatTileSingle and StatTileSplit) is a real <button> — clicking
 * it, or pressing Enter/Space while it's focused, opens a centered modal
 * (StatTileDetailModal) with a fuller view of that indicator: subtitle, a
 * plain-language insight sentence, the distribution plot (DistributionStrip
 * — where this CD sits among all 59), CD rank, and source. Deliberately no
 * map/choropleth — per Morgan, keep this to the distribution plot and its
 * accompanying text, not the whole indicator "Details" flyout.
 * title/subtitle/source/sourceUrl/description are resolved server-side from
 * indicator metadata and threaded through from NeighborhoodOverviewHero.jsx
 * → loadOverviewHeroConfig() in loadSectionIndicators.js.
 * TO REVERT: remove the onOpen prop + button wrapper from StatTileSingle /
 * StatTileSplit (swap back to a plain <div>), delete StatTileDetailModal,
 * and the expandedTile state / its render below.
 *
 * TO REVERT card additions:
 *   Single-mode strip → delete the MicroStrip component and its usage block
 *   Comparison-mode citywide ref → delete the marked block in StatTileSplit
 *
 * NOTES:
 * - As of 2026-09-04, MicroStrip, StatTilesLegend, StatTileSingle,
 *   StatTileSplit, StatTileDetailModal and the shared insight-badge helpers
 *   live in dedicated files under ./comparisonStatTiles/ — this file owns
 *   the comparison-value computation and the grid layout.
 */
import { useState } from 'react';
import { useComparison } from '@/lib/context/ComparisonContext';
import StatTilesLegend from './comparisonStatTiles/StatTilesLegend';
import StatTileSingle from './comparisonStatTiles/StatTileSingle';
import StatTileSplit from './comparisonStatTiles/StatTileSplit';
import StatTileDetailModal from './comparisonStatTiles/StatTileDetailModal';

export default function ComparisonStatTilesClient({
  tiles = [],
  rawDataByKey = {},
  primaryLabel = 'Neighborhood',
  geoId,
}) {
  const { comparisonNeighborhood } = useComparison();

  // Which tile's expand modal is open, if any — holds the full tile object
  // (title/subtitle/source/sourceUrl/description/rows) so StatTileDetailModal
  // has everything it needs. See ./comparisonStatTiles/StatTileDetailModal.jsx.
  const [expandedTile, setExpandedTile] = useState(null);

  const tilesWithComparison = tiles.map(tile => {
    const rows    = rawDataByKey[tile.key] ?? [];
    const suffix  = tile.displaySuffix ?? '';

    // Citywide reference value
    const nycRow  = rows.find(r => r.GeoID === 0);
    const nycValue = nycRow ? `${nycRow.DisplayValue}${suffix}` : null;

    if (!comparisonNeighborhood) {
      return { ...tile, compValue: null, compLabel: null, nycValue, rows };
    }

    const compRow = rows.find(r => r.GeoID === comparisonNeighborhood.geoId);
    return {
      ...tile,
      compValue: compRow ? `${compRow.DisplayValue}${suffix}` : null,
      compLabel: comparisonNeighborhood.name,
      nycValue,
      rows,
    };
  });

  const isComparing = !!comparisonNeighborhood;

  // 3-column breakpoint is lg (1024px), not sm (640px): the desktop
  // Sidebar (a fixed 360px <aside>) appears at md (768px), so a tablet in
  // the 768–1023px range — iPad portrait is 744–834px depending on model —
  // only has viewport-360-64(main padding) ≈ 280–410px of content width.
  // At sm:grid-cols-3 that's ~85–125px per tile, too narrow for the number
  // + label + delta pill + MicroStrip. Staying single-column full-width
  // through that range, and only going 3-up once there's genuinely enough
  // room (lg, 1024px: ≈600px content ÷ 3 ≈ 190px/tile), fixes it.
  //
  // 4-TILE UPDATE (2026-09-03, self-rep-health added to statTiles):
  // a straight lg:grid-cols-4 would give ≈150px/tile at 1024px — tighter
  // than the 190px above was already tuned to. Instead:
  //   md  (768px):  2x2. Content width ≈344px ÷ 2 ≈164px/tile — narrower
  //                 than the 190px comfort zone but well clear of the
  //                 85–125px range that forced single-column here in the
  //                 first place. Not verified in a running dev server —
  //                 spot-check before shipping; fall back to single-column
  //                 through lg (drop md:grid-cols-2 below) if 164px reads
  //                 cramped.
  //   lg  (1024px): still 2x2 (see 150px/tile math above).
  //   xl  (1280px): 4x1 — ≈880px content ÷ 4 ≈210px/tile, back in range.
  // Reverts cleanly to 3-up (md:grid-cols-1 lg:grid-cols-3) if a tile is
  // ever removed from statTiles instead of added.
  //
  // MOBILE COMPACTING (2026-08-11): below md, this is a horizontally
  // scrollable, scroll-snapped row instead of N stacked full-width cards —
  // one card's height instead of many. Each tile is ~85% of the row width
  // so the next card peeks at the edge as a "there's more" affordance, same
  // idea as TopicNav's mobile tab row. At md and up this reverts to the
  // grid above (md:grid overrides the flex display) — nothing about the
  // md+ layout is touched by the mobile-compacting change itself.
  // TO REVERT MOBILE COMPACTING: drop the flex/overflow/snap classes and
  // the wrapper div's shrink/width classes below, keeping only
  // "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-stretch".
  return (
    <div className="flex flex-col">
      <StatTilesLegend />
      <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1 md:grid md:grid-cols-2 xl:grid-cols-4 md:gap-4 md:overflow-visible md:snap-none md:pb-0 items-stretch">
        {tilesWithComparison.map((tile, i) => {
          const spanClass =
            tilesWithComparison.length % 2 !== 0 && i === tilesWithComparison.length - 1
              ? 'col-span-2 sm:col-span-1'
              : '';

          const { key: tileKey, ...tileProps } = tile;
          return (
            <div key={tileKey} id={`indicator-${tileKey}`} className="shrink-0 w-[85%] snap-start md:w-auto md:shrink">
              {isComparing && tile.compValue ? (
                <StatTileSplit
                  {...tileProps}
                  neighborhoodLabel={primaryLabel}
                  className={spanClass}
                  onOpen={() => setExpandedTile(tile)}
                />
              ) : (
                <StatTileSingle
                  {...tileProps}
                  neighborhoodLabel={primaryLabel}
                  rows={tile.rows}
                  geoId={geoId}
                  className={spanClass}
                  onOpen={() => setExpandedTile(tile)}
                />
              )}
            </div>
          );
        })}
      </div>

      {expandedTile && (
        <StatTileDetailModal
          tile={expandedTile}
          geoId={geoId}
          onClose={() => setExpandedTile(null)}
        />
      )}
    </div>
  );
}
