'use client';

/**
 * FILE: IndicatorFlyoutContent.jsx
 *
 * PURPOSE:
 * Body content for the indicator "Details" flyout panel.
 *
 * LAYOUT (top to bottom):
 *   1. Indicator name + context sentence          ← above the map
 *      (copy deck Context, resolved; falls back to the plain subtitle)
 *   2. Choropleth map with color legend overlaid  ← legend floats bottom-left of map
 *   3. Indicator-specific comparison sentence (copy deck Comparison,
 *      2026-09-28) — values rendered as badges: neighborhood value in the
 *      selected-CD color, NYC value in the citywide color, higher/lower/
 *      similar phrase as the directional insight badge. Replaces the old
 *      generic "In X, … is Y / ↑ higher than the citywide rate" text.
 *   3a. Small-sample-size footnote — only when the selected CD's row is
 *       itself flagged (ValueStatus: "flagged"); wording picked by
 *       dataSource/isPercent — see getFlaggedEstimateFootnote() in
 *       compareIndicator.js and CONTENT-GUIDE.md section 11
 *   4. CD rank line, with a dot-distribution marker riding alongside the text
 *      (2026-09-09) — every CD plotted as a small dot on the actual value
 *      range (RankDotStrip.jsx, shared with the standalone indicator page),
 *      not a fill/progress bar (fill implies "more = further along toward a
 *      goal," which doesn't hold here); no box or header of its own
 *   5. Mini bar (2026-09-09) — the same ranked bar chart (`compactSpec`) the
 *      originating card renders, passed through as-is so the flyout's chart
 *      visually matches the card. Replaces the old dot-on-a-line
 *      DistributionStrip. Hover-synced with the map above via the Vega
 *      view's `hoverGeoId` signal + standard mouseover/mouseout mark events
 *      (see handleMiniBarViewReady below) — no changes to VegaLiteChart.jsx
 *      itself, which stays a plain spec-in/view-out renderer.
 *   6. Description (if provided)
 *   7. Source row — inline text + ? notes modal   ← no "Data Source" label
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import {
  getFlaggedEstimateFootnote,
  getInsightBadgeClass,
  DIRECTION_ARROWS,
} from '@/lib/utils/compareIndicator';
import { useComparison } from '@/lib/context/ComparisonContext';
import VegaLiteChart from '@/components/charts/VegaLiteChart';
import RankDotStrip from '@/components/data-display/RankDotStrip';
import { CHOROPLETH_STOPS, SELECTED, CITYWIDE } from '@/lib/charts/chartColors';

const ChoroplethMap = dynamic(
  () => import('@/components/maps/ChoroplethMap'),
  {
    ssr: false,
    loading: () => <div className="h-full w-full bg-gray-100 animate-pulse" />,
  }
);

// DIRECTION_ARROWS / getInsightBadgeClass moved to compareIndicator.js
// (2026-09-09) so the standalone indicator page (app/indicator/[key]/page.js)
// can render the exact same up/down/neutral language without duplicating it
// here. Same logic/comment as ComparisonStatTilesClient.jsx's
// StatTileDetailModal, which still keeps its own copy.

// ── Comparison sentence (copy deck) with badge-styled values ───────────────
// `parts` comes from resolveNarrativeParts() (server-side, in
// IndicatorChartGrid) — text segments plus typed value segments.
const VALUE_BADGE = 'inline-flex items-center text-xs font-semibold px-1.5 py-0.5 rounded-md border align-baseline whitespace-nowrap';

function ComparisonSentence({ parts, higherIsBetter }) {
  return (
    <p className="text-sm text-gray-700 leading-7">
      {parts.map((p, i) => {
        if (p.kind === 'value') {
          return (
            <span
              key={i}
              className={VALUE_BADGE}
              style={{ color: SELECTED, backgroundColor: `${SELECTED}12`, borderColor: `${SELECTED}40` }}
            >
              {p.text}
            </span>
          );
        }
        if (p.kind === 'nyc') {
          return (
            <span
              key={i}
              className={VALUE_BADGE}
              style={{ color: CITYWIDE, backgroundColor: `${CITYWIDE}12`, borderColor: `${CITYWIDE}40` }}
            >
              {p.text}
            </span>
          );
        }
        if (p.kind === 'comparison') {
          return (
            <span
              key={i}
              className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border align-baseline whitespace-nowrap ${getInsightBadgeClass(p.direction, higherIsBetter)}`}
            >
              <span aria-hidden="true">{DIRECTION_ARROWS[p.direction] ?? DIRECTION_ARROWS.neutral}</span>
              {p.text}
            </span>
          );
        }
        return <span key={i}>{p.text}</span>;
      })}
    </p>
  );
}

function cleanSource(source) {
  if (!source) return '';
  return source.replace(/^source:\s*/i, '');
}

export default function IndicatorFlyoutContent({
  title,
  subtitle,
  source,
  sourceUrl,
  description,
  indicatorData,
  geoId,
  sectionLabel,
  dataSource,
  isPercent,
  higherIsBetter,
  contextText,      // copy-deck Context sentence, resolved — shown above the map
  comparisonParts,  // copy-deck Comparison sentence as segments — shown below the map
  compactSpec,
  chart,        // custom cards: their own chart element, shown in the mini-bar slot
}) {
  const { comparisonNeighborhood } = useComparison();

  // Small-sample-size footnote — only when the SELECTED CD's own row is
  // flagged, not just because the indicator has a flagged row somewhere
  // among its 59. The "*" itself is already baked into that row's
  // DisplayValue (e.g. "95%*") / the copy deck's <Reliability> token — this
  // just explains what it means.
  const selectedRow     = geoId != null ? (indicatorData ?? []).find(r => r.GeoID === geoId) : null;
  const flaggedFootnote = selectedRow?.ValueStatus === 'flagged'
    ? getFlaggedEstimateFootnote(dataSource, isPercent)
    : null;

  // ── CD rank + inline dot-distribution marker ────────────────────────────────
  // One sort (ascending, low → high — the same order buildBarChartSpec.js
  // uses) drives both the "Ranked X of Y" line and RankDotStrip below (which
  // positions each CD's dot by its actual value, not just this array order).
  // Directionality (higher vs lower is better) is intentionally not baked in
  // here — the insight badge already communicates that context.
  const cdRows = useMemo(() => {
    if (!indicatorData?.length) return [];
    return indicatorData
      .filter(r => r.GeoType === 'CD' && r.Value != null && !isNaN(Number(r.Value)))
      .sort((a, b) => Number(a.Value) - Number(b.Value));
  }, [indicatorData]);

  const hasMap = cdRows.length > 0;

  const rankData = useMemo(() => {
    if (!cdRows.length || geoId == null) return null;
    const idx = cdRows.findIndex(r => r.GeoID === geoId);
    if (idx === -1) return null;
    return {
      rank:  cdRows.length - idx, // 1 = highest value
      total: cdRows.length,
    };
  }, [cdRows, geoId]);

  const [mapHoveredGeoId,   setMapHoveredGeoId]   = useState(null);
  const [stripHoveredGeoId, setStripHoveredGeoId] = useState(null);
  const miniBarViewRef = useRef(null); // the mini bar's live Vega view, for hover-sync with the map

  // ── Mini bar ↔ map hover-sync ────────────────────────────────────────────
  // buildBarChartSpec.js already wires a `hoverGeoId` Vega signal for exactly
  // this purpose (elsewhere driven by a global window event between the
  // sidebar map and on-page cards); here the flyout's own map and mini bar
  // are local to the panel, so it's driven directly off mapHoveredGeoId
  // instead. The reverse direction (bar → map) uses Vega's standard
  // view-level mouseover/mouseout mark events — both wired without touching
  // VegaLiteChart.jsx itself.
  const handleMiniBarViewReady = useCallback((view) => {
    miniBarViewRef.current = view;
    view.addEventListener('mouseover', (_event, item) => {
      if (item?.datum?.GeoID != null) setStripHoveredGeoId(item.datum.GeoID);
    });
    view.addEventListener('mouseout', () => setStripHoveredGeoId(null));
  }, []);

  useEffect(() => {
    const view = miniBarViewRef.current;
    if (!view) return;
    try {
      view.signal('hoverGeoId', mapHoveredGeoId).run();
    } catch {
      // Signal may not exist if compactSpec was built before hoverGeoId was added
    }
  }, [mapHoveredGeoId]);

  // ── Notes modal ────────────────────────────────────────────────────────────
  const [notesOpen,    setNotesOpen]    = useState(false);
  const [notesVisible, setNotesVisible] = useState(false);

  useEffect(() => {
    if (notesOpen) {
      const raf = requestAnimationFrame(() => setNotesVisible(true));
      return () => cancelAnimationFrame(raf);
    } else {
      setNotesVisible(false);
    }
  }, [notesOpen]);

  useEffect(() => {
    if (!notesOpen) return;
    function onKey(e) { if (e.key === 'Escape') setNotesOpen(false); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [notesOpen]);

  const sourceClean = cleanSource(source);
  const hasNotes    = !!(description || sourceUrl);

  return (
    <>
      <div className="overflow-y-auto flex-1 min-h-0 overscroll-contain border-t border-gray-200">

        {/* ── 1. Title + context sentence (above map) ──────────────────────── */}
        {/* Context only — the comparison half of the copy lives below the map
            (section 3). Plain subtitle when the indicator has no copy-deck
            context (held rows, unsupported tokens, custom cards). */}
        {(title || contextText || subtitle) && (
          <div className="px-5 pt-3 pb-2 flex flex-col gap-0.5">
            {title && (
              <h2 className="text-sm font-semibold text-gray-900 leading-snug truncate min-w-0">
                {title}
              </h2>
            )}
            {(contextText || subtitle) && (
              <p className="text-xs text-gray-600 leading-snug">{contextText || subtitle}</p>
            )}
          </div>
        )}

        {/* ── 2. Map with color legend overlaid ────────────────────────────── */}
        {/* Only when there's a single numeric value per CD to shade by —
            distribution cards (causes of premature death, cancer types) pass
            no indicatorData, so there's nothing to map (2026-09-27). */}
        {hasMap && (
        <div className="flyout-map relative w-full h-[220px] sm:h-[340px] overflow-hidden border-y border-gray-100">
          {/* Note: the map is pan/zoomable (matching the main sidebar map), so on
              touch devices dragging over the map pans it rather than scrolling the
              flyout body. The "Back to origin" button resets the view. */}
          <ChoroplethMap
            indicatorData={indicatorData ?? []}
            geoId={geoId}
            subtitle={subtitle}
            onHoverGeoId={setMapHoveredGeoId}
            stripHoveredGeoId={stripHoveredGeoId}
            comparisonGeoId={comparisonNeighborhood?.geoId ?? null}
          />
          {/* Color legend — floats over map, bottom-left */}
          <div className="absolute bottom-3 left-3 z-[1000] flex items-center gap-1.5 bg-white/90 backdrop-blur-sm rounded-md px-2 py-1.5 shadow-sm border border-gray-200 pointer-events-none select-none">
            <span className="text-xs text-gray-600">Low</span>
            <div className="flex h-2 rounded overflow-hidden w-16">
              {CHOROPLETH_STOPS.map((c, i) => (
                <div key={i} className="flex-1" style={{ backgroundColor: c }} />
              ))}
            </div>
            <span className="text-xs text-gray-600">High</span>
          </div>
        </div>
        )}

        <div className="px-5 pt-4 pb-5 flex flex-col gap-4">

          {/* ── 3. Indicator-specific comparison (copy deck) ─────────────────
                Replaces the old generic insight text (2026-09-28). Nothing
                renders when the indicator has no resolvable Comparison copy. */}
          {comparisonParts?.length > 0 && (
            <ComparisonSentence parts={comparisonParts} higherIsBetter={higherIsBetter} />
          )}

          {/* ── 3a. Small-sample-size caveat — only when the selected CD's row
                is itself flagged. Explains the "*" on the CD's value. Text/eligibility per CONTENT-GUIDE.md section 11. ─────── */}
          {flaggedFootnote && (
            <p className={`text-xs text-gray-600 italic leading-snug ${comparisonParts?.length ? '-mt-2' : ''}`}>{flaggedFootnote}</p>
          )}



          {/* ── 4. CD rank — a dot-distribution marker riding next to the text ──
                Every CD plotted as a small dot on the actual value range
                (RankDotStrip.jsx, shared with the standalone indicator page),
                with this CD's dot enlarged and colored. Not a fill/progress
                bar (that implies "more filled = further along toward a
                goal," which isn't true here — higher isn't inherently better
                or worse). Purely decorative (aria-hidden) — the rank text
                next to it already carries the same information accessibly. */}
          {/* {rankData && (
            <div className="flex items-center gap-2.5">
              <p className="text-xs text-gray-600 leading-snug">
                Ranked{' '}
                <span className="font-semibold text-gray-700">
                  {rankData.rank} of {rankData.total}
                </span>{' '}
                community districts by value
              </p>
              <RankDotStrip cdRows={cdRows} selectedId={geoId} />
            </div>
          )} */}

          {/* ── 5. Mini bar — same ranked bar chart the card renders ─────────
                compactSpec is passed straight through from ExpandableChartCard
                (same object, not re-derived), so this is a visual match for
                the card rather than a different chart type. Replaces the old
                boxed dot-on-a-line DistributionStrip. No gray box here,
                deliberately — the point is that this reads as the same chart
                as the card, not a distinct flyout-only treatment. ─────────── */}
          {compactSpec && (
            <div>
              {/* <p className="text-xs font-semibold text-gray-700 tracking-wide mb-2">
                How this neighborhood compares
              </p> */}
              <VegaLiteChart spec={compactSpec} onViewReady={handleMiniBarViewReady} />
            </div>
          )}

          {/* ── 5b. Custom card chart (2026-09-27) — Avertable Deaths dot strip,
                causes/cancer bar + pyramid charts. Same slot as the mini bar,
                so custom cards get the same flyout layout as standard ones. */}
          {!compactSpec && chart && (
            <div className="min-w-0" data-flyout-chart>{chart}</div>
          )}

          {/* ── 5c. Description inline when there's no map/insight — otherwise
                a distribution card's flyout would be just a chart. ───────── */}
          {!hasMap && description && (
            <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
          )}

          {/* ── 6. Source row — no label, inline ? button ───────────────────── */}
          {sourceClean && (
            <div className="flex items-center gap-1.5 pt-1 border-t border-gray-100">
              <p className="text-xs text-gray-600 leading-snug">
                <span className="font-medium text-gray-600">Source:</span> {sourceClean}
              </p>
              {hasNotes && (
                <button
                  onClick={() => setNotesOpen(true)}
                  aria-label="View source notes"
                  className="w-5 h-5 flex items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 shrink-0 text-xs font-semibold"
                >
                  ?
                </button>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ── Notes modal ─────────────────────────────────────────────────────── */}
      {notesOpen && (
        <div
          role="presentation"
          className="fixed inset-0 z-[3000] flex items-center justify-center p-8"
          style={{
            backgroundColor: notesVisible ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0)',
            transition: 'background-color 180ms ease-out',
          }}
          onClick={e => { if (e.target === e.currentTarget) setNotesOpen(false); }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Source notes: ${title}`}
            className="relative bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden"
            style={{
              opacity:    notesVisible ? 1 : 0,
              transform:  notesVisible ? 'scale(1)' : 'scale(0.97)',
              transition: 'opacity 180ms ease-out, transform 180ms ease-out',
            }}
          >
            <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-gray-100">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Source &amp; notes</h3>
                <p className="text-xs text-gray-600 mt-0.5">{title}</p>
              </div>
              <button
                onClick={() => setNotesOpen(false)}
                aria-label="Close notes"
                className="text-gray-600 border border-transparent hover:text-brand hover:border-brand hover:bg-brand-tint transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded ml-4"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-5 flex flex-col gap-4 overflow-y-auto">
              {sourceClean && (
                <div>
                  <p className="text-sm font-semibold text-gray-600 mb-1.5">Data source</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{sourceClean}</p>
                  {sourceUrl && (
                    <a
                      href={sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-2 text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium"
                    >
                      View source data
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                </div>
              )}
              {description && (
                <div>
                  <p className="text-sm font-semibold text-gray-600 mb-1.5">Notes</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
