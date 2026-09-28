'use client';

/**
 * FILE: StatTileDetailModal.jsx
 *
 * Expand modal — click a tile for a fuller view. Centered dialog (matches
 * the chart "expand" modal pattern in ExpandableChartCard.jsx: backdrop
 * fade, focus trap, Escape-to-close, focus returns to the tile button on
 * close) rather than a side flyout.
 *
 * Deliberately NOT the full indicator "Details" flyout content (no map, no
 * choropleth legend) — per Morgan, just the distribution plot (the same
 * DistributionStrip used inside that flyout) plus the text that explains
 * it: subtitle, a plain-language insight sentence, CD rank, and source.
 * TO REVERT to the richer map-inclusive view: swap this component's body
 * for a lazy-loaded <IndicatorFlyoutContent /> (see git history / the
 * 2026-09-03 flyout-based pass of ComparisonStatTilesClient.jsx for the
 * exact shape). Part of the 2026-09-04 split of that file.
 */
import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { inertOthers } from '@/lib/utils/inertOthers';
import { createPortal } from 'react-dom';
import { useComparison } from '@/lib/context/ComparisonContext';
import DistributionStrip from '@/components/data-display/DistributionStrip';
import { buildInsight, getFlaggedEstimateFootnote } from '@/lib/utils/compareIndicator';
import { SELECTED } from '@/lib/charts/chartColors';
import { INSIGHT_ARROWS, getInsightBadgeClass } from './insightHelpers';

export default function StatTileDetailModal({ tile, geoId, onClose }) {
  const [visible, setVisible] = useState(false);
  const modalRef   = useRef(null);
  const triggerRef = useRef(null);
  const releaseInertRef = useRef(null);
  const { comparisonNeighborhood } = useComparison();

  // A11Y (2026-09-28): page behind is inert while this modal is open (see
  // lib/utils/inertOthers.js). Released explicitly in handleClose BEFORE
  // focus goes back to the tile — an inert element can't take focus.
  useLayoutEffect(() => {
    releaseInertRef.current = inertOthers(modalRef.current);
    return () => releaseInertRef.current?.();
  }, []);

  useEffect(() => {
    triggerRef.current = document.activeElement;
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  function handleClose() {
    setVisible(false);
    // Let the fade-out finish before unmounting, then return focus to
    // whichever tile button opened this modal.
    setTimeout(() => {
      releaseInertRef.current?.();
      onClose();
      triggerRef.current?.focus?.();
    }, 180);
  }

  // Focus trap + Escape — same pattern as ExpandableChartCard's chart modal.
  useEffect(() => {
    const raf = requestAnimationFrame(() => modalRef.current?.querySelector('[data-modal-autofocus]')?.focus());
    function onKey(e) {
      if (e.key === 'Escape') { handleClose(); return; }
      if (e.key === 'Tab' && modalRef.current) {
        const focusable = Array.from(
          modalRef.current.querySelectorAll('button, [href], input, [tabindex]:not([tabindex="-1"])')
        ).filter(el => !el.disabled);
        if (!focusable.length) { e.preventDefault(); return; }
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener('keydown', onKey);
    return () => { cancelAnimationFrame(raf); document.removeEventListener('keydown', onKey); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const title  = tile.title || tile.label;
  const rows   = tile.rows ?? [];
  const insight = buildInsight(rows, geoId, title);
  const sourceClean = tile.source ? tile.source.replace(/^source:\s*/i, '') : '';

  // Small-sample-size footnote — only when the SELECTED CD's own row is
  // flagged (ValueStatus: "flagged"), not just because the indicator has a
  // flagged row somewhere among its 59. The "*" itself is already baked
  // into that row's DisplayValue (e.g. "95%*"), shown above via
  // insight.cdDisplay — this just explains what it means.
  const selectedRow      = rows.find(r => r.GeoID === geoId);
  const flaggedFootnote  = selectedRow?.ValueStatus === 'flagged'
    ? getFlaggedEstimateFootnote(tile.dataSource, tile.isPercent)
    : null;

  // CD rank among all 59 — same calc IndicatorFlyoutContent uses. Sorted
  // descending by value so rank 1 = highest; directionality (higher/lower
  // is "better") isn't baked in here, the insight badge already covers that.
  const cdRank = (() => {
    if (!rows.length || geoId == null) return null;
    const cdRows = rows
      .filter(r => r.GeoType === 'CD' && r.Value != null && !isNaN(Number(r.Value)))
      .sort((a, b) => Number(b.Value) - Number(a.Value));
    const pos = cdRows.findIndex(r => r.GeoID === geoId);
    return pos === -1 ? null : { rank: pos + 1, total: cdRows.length };
  })();

  return createPortal(
    <div
      role="presentation"
      className="fixed inset-0 z-[2000] flex items-center justify-center p-3 sm:p-8"
      style={{
        backgroundColor: visible ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0)',
        transition: 'background-color 200ms ease-out',
      }}
      onClick={handleClose}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${title} details`}
        className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
        style={{
          opacity:    visible ? 1 : 0,
          transform:  visible ? 'scale(1)' : 'scale(0.96)',
          transition: 'opacity 200ms ease-out, transform 200ms ease-out',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Modal header ─────────────────────────────────── */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100 shrink-0 rounded-t-xl bg-white gap-4">
          <h3 className="text-base font-semibold text-gray-900 leading-snug min-w-0">{title}</h3>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            data-modal-autofocus
            className="inline-flex items-center gap-1.5 h-8 px-3 text-sm text-gray-600 hover:text-brand border border-gray-200 hover:border-brand hover:bg-brand-tint rounded-md transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 whitespace-nowrap shrink-0"
          >
            Close
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Body — subtitle, insight text, distribution plot, CD rank, source ── */}
        <div className="overflow-y-auto flex-1 min-h-0 overscroll-contain px-6 py-5 flex flex-col gap-4">

          {tile.subtitle && (
            <p className="text-sm text-gray-600 leading-snug">{tile.subtitle}</p>
          )}

          {/* Dynamic insight — same prose IndicatorFlyoutContent shows, minus
              the map-driven comparison-neighborhood clause (that read needs
              the map's hover wiring, which this lean modal doesn't have). */}
          {insight && (() => {
            const arrow = INSIGHT_ARROWS[insight.direction];
            const badge = getInsightBadgeClass(insight.direction, tile.higherIsBetter);
            return (
              <p className="text-sm text-gray-700 leading-relaxed">
                In {insight.name}, {title.toLowerCase()} is{' '}
                <span className="font-semibold" style={{ color: SELECTED }}>{insight.cdDisplay}</span>
                {' — '}
                <span
                  className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border mx-0.5 ${badge}`}
                  aria-label={`${insight.label} citywide`}
                >
                  <span aria-hidden="true">{arrow}</span> {insight.label}
                </span>
                {' '}the citywide rate of {insight.cityDisplay}.
              </p>
            );
          })()}

          {/* Small-sample-size caveat — only when the selected CD's row is
              itself flagged. Matches the "*" already shown on its value
              above. Text/eligibility per CONTENT-GUIDE.md section 11. */}
          {flaggedFootnote && (
            <p className="text-xs text-gray-600 italic leading-snug -mt-2">{flaggedFootnote}</p>
          )}

          {/* Distribution plot — where this neighborhood sits among all 59 CDs */}
          {rows.length > 0 && (
            <div className="border border-gray-200 rounded-lg bg-gray-50 px-4 py-3.5">
              <DistributionStrip
                indicatorData={rows}
                geoId={geoId}
                comparisonGeoId={comparisonNeighborhood?.geoId ?? null}
              />
            </div>
          )}

          {cdRank && (
            <p className="text-xs text-gray-600 leading-snug">
              Ranked{' '}
              <span className="font-semibold text-gray-700">{cdRank.rank} of {cdRank.total}</span>{' '}
              community districts by value
            </p>
          )}

          {sourceClean && (
            <p className="text-xs text-gray-600 leading-snug pt-1 border-t border-gray-100">
              <span className="font-medium text-gray-600">Source:</span> {sourceClean}
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
