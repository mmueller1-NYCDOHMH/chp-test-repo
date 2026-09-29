'use client';

/**
 * FILE: ExpandableChartCard.jsx
 *
 * PURPOSE:
 * Card shell for a single indicator chart.
 *
 * HEADER:
 *   Title (left)                                   [Details →] (right)
 *
 * CONTEXT TEXT:
 *   Full-width, below the header and above the chart: the `subtitle` line.
 *   Clamped to 2 lines with a bottom fade over the second row when it
 *   overflows (measured, so short subtitles show no fade at all). No
 *   expand control — the text itself acts as an extension of the Details
 *   button: clicking it opens the same flyout (`handleDetails`), which is
 *   where the full subtitle/description actually lives. (The longer
 *   `description`/MethodsNote text is NOT shown here — it stays
 *   modal-only, opened via the ? button below.)
 *
 * FOOTER (left → right):
 *   Source: <citation>                              [?]  [expand icon]
 *
 * The ? button opens NotesModal (full source citation + description). The
 * expand icon opens ExpandedChartModal, which itself hosts EmbedModal.
 * Both are grouped bottom-right as in-place card utilities, intentionally
 * separate from the top-right Details button (which navigates to the
 * flyout instead of acting on this card).
 *
 * "Similar" related-indicator links are temporarily removed — deferred,
 * not deleted (see relatedIndicators prop below).
 *
 * MODULE LAYOUT (split 2026-09-04 — this file was 950 lines on its own):
 *   ./expandableChartCard/chartCardUtils.js        — cleanSource, stripCdCode, buildLegendItems
 *   ./expandableChartCard/SubtitleWithGlossary.jsx — subtitle text w/ glossary tooltips
 *   ./expandableChartCard/ExpandedChartLegend.jsx  — legend swatches shown above the expanded chart
 *   ./expandableChartCard/useModalVisibility.js    — delayed-mount fade-in flag (Notes + Expanded modals)
 *   ./expandableChartCard/useModalFocusTrap.js     — focus-trap + Escape-to-close, shared by all 3 dialogs
 *   ./expandableChartCard/useOverflowClamp.js      — "does this clamped text actually overflow" measurement
 *   ./expandableChartCard/CardReadMore.jsx         — 2-line clamped text + fade + "See more" (shared w/ custom cards)
 *   ./expandableChartCard/DetailsButton.jsx        — header "Details →" button (shared w/ custom cards)
 *   ./expandableChartCard/NotesModal.jsx           — the "?" source/notes dialog
 *   ./expandableChartCard/ExpandedChartModal.jsx   — the full-size chart dialog + image export
 *   ./expandableChartCard/EmbedModal.jsx           — the "Embed chart" dialog
 * This file keeps only the compact card itself plus the three booleans
 * that decide which dialog (if any) is open.
 *
 * PROPS:
 * - compactSpecOptions  buildBarChartSpec options for the card chart
 * - expandedSpecOptions buildBarChartSpec options for the expanded modal chart
 *                       (both specs are built client-side from indicatorData;
 *                       the expanded one only while its modal is open)
 * - title              Indicator name
 * - subtitle           Description shown full-width under the title, above
 *                       the chart (clamped to 2 lines with a fade if it
 *                       overflows); used by the Details flyout and narrative copy
 * - metadataOf, metadataDetail, metadataUnits
 *                       Measure details from the indicator metadata, shown
 *                       under the title on the card
 * - source             Short citation string (e.g. "NYC Community Health Survey, 2021")
 * - sourceUrl          Optional URL for "View source data" link in flyout
 * - description        Longer plain-language notes — shown ONLY in the ?
 *                       modal, not inline on the card
 * - relatedIndicators  Array of { title, indicatorKey } — accepted but not
 *                       currently rendered; the "Similar" row is deferred,
 *                       not removed from the data model
 * - indicatorData      Raw data rows passed to flyout for insight rendering
 * - geoId              Currently selected neighborhood geoId
 * - ariaDescription    Screen-reader description
 * - sectionLabel       Section context passed to flyout
 * - dataSource, isPercent
 *                       Passed to flyout so a flagged CD row (small sample
 *                       size) shows the right caveat footnote — see
 *                       getFlaggedEstimateFootnote() in compareIndicator.js
 * - higherIsBetter     Passed to flyout so the insight badge can color by
 *                       good/bad rather than raw up/down direction
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import VegaLiteChart from '@/components/charts/VegaLiteChart';
import { buildBarChartSpec } from '@/lib/charts/buildBarChartSpec';
import { useFlyout } from '@/components/core/FlyoutShell';
import messages from '../../../content/site/messages.json';
import { cleanSource } from './expandableChartCard/chartCardUtils';
import CardReadMore from './expandableChartCard/CardReadMore';
import DetailsButton from './expandableChartCard/DetailsButton';
import NotesModal from './expandableChartCard/NotesModal';
import ExpandedChartModal from './expandableChartCard/ExpandedChartModal';
import EmbedModal from './expandableChartCard/EmbedModal';
import { areShortcutsEnabled } from '@/lib/utils/shortcutsPreference';

export default function ExpandableChartCard({
  indicatorKey,
  compactSpecOptions,  // buildBarChartSpec options for the card chart
  expandedSpecOptions, // buildBarChartSpec options for the expand modal (built lazily — see below)
  title,
  subtitle,
  metadataOf,
  metadataDetail,
  metadataUnits,
  indicatorDetail,
  source,
  sourceUrl,
  description,
  dataSource,
  isPercent,
  higherIsBetter,
  flyoutContext,    // copy-deck Context sentence, resolved (flyout: above map)
  flyoutComparison, // copy-deck Comparison sentence as segments (flyout: below map)
  relatedIndicators = [],
  indicatorData,
  geoId,
  ariaDescription,
  sectionLabel,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [notesOpen,  setNotesOpen]  = useState(false);
  const [embedOpen,  setEmbedOpen]  = useState(false);

  // PERF (2026-09-29): chart specs are built here, on the client, from the
  // indicator rows this card already receives — they used to be prebuilt on
  // the server and shipped alongside those same rows (see the PERF note in
  // IndicatorChartGrid.jsx). The expanded spec is only built while its modal
  // is open (the modal renders nothing when closed). useMemo keeps the
  // compact spec's identity stable, which VegaLiteChart (memo'd, re-embeds on
  // spec change) relies on.
  const compactSpec = useMemo(
    () => (compactSpecOptions
      ? buildBarChartSpec({ ...compactSpecOptions, data: indicatorData ?? [], geoId })
      : null),
    [compactSpecOptions, indicatorData, geoId],
  );
  const expandedSpec = useMemo(
    () => (isExpanded && expandedSpecOptions
      ? buildBarChartSpec({ ...expandedSpecOptions, data: indicatorData ?? [], geoId, expanded: true })
      : null),
    [isExpanded, expandedSpecOptions, indicatorData, geoId],
  );

  const { open: openFlyout } = useFlyout();
  const expandBtnRef    = useRef(null); // also restores focus when ExpandedChartModal closes
  const embedBtnRef     = useRef(null); // "Embed" button lives inside ExpandedChartModal; also restores focus when EmbedModal closes
  const isHovered       = useRef(false);
  const isFocused       = useRef(false); // keyboard focus is inside this card

  const descId = title ? `chart-desc-${title.replace(/\s+/g, '-').toLowerCase()}` : undefined;

  function handleDetails() {
    openFlyout({
      kind: 'indicator',
      indicatorKey,
      title, subtitle, source, sourceUrl, description,
      indicatorData, geoId, sectionLabel,
      dataSource, isPercent, higherIsBetter,
      flyoutContext, flyoutComparison,
      // Same spec object already built for this card's own chart — passed
      // through so the flyout's mini bar is pixel-identical to the card,
      // not a re-derived lookalike. See IndicatorFlyoutContent.jsx.
      compactSpec,
      // Export tray (2026-09-29): the flyout builds the expanded spec from
      // these on demand, so its PNG matches the expanded modal's.
      expandedSpecOptions,
    });
  }

  function handleCardMouseEnter() {
    isHovered.current = true;
    window.__chp_hovered_card_open = handleDetails;
  }
  function handleCardMouseLeave() {
    isHovered.current = false;
    // Only clear if focus isn't still inside the card
    if (!isHovered.current) window.__chp_hovered_card_open = null;
  }

  // Mirror hover registration for keyboard users: set/clear the global whenever
  // focus moves into or out of this card so the `i` and `e` shortcuts work without hover.
  function handleCardFocus() {
    isFocused.current = true;
    window.__chp_hovered_card_open = handleDetails;
  }
  function handleCardBlur(e) {
    // relatedTarget is where focus is going — only clear if it's leaving the card
    if (!e.currentTarget.contains(e.relatedTarget)) {
      isFocused.current = false;
      window.__chp_hovered_card_open = null;
    }
  }

  // Enter on the card wrapper itself (i.e. focus is on the group div, not a child
  // button) opens the Details flyout — same as clicking the Details button.
  // Child interactive elements handle their own Enter so we guard against double-firing.
  function handleCardKeyDown(e) {
    if (e.key !== 'Enter') return;
    const tag = document.activeElement?.tagName?.toLowerCase();
    // Let native buttons/links handle their own Enter
    if (tag === 'button' || tag === 'a' || tag === 'input') return;
    e.preventDefault();
    handleDetails();
  }

  // Press `e` while hovering OR focusing a card to expand it
  useEffect(() => {
    function onKey(e) {
      if (!areShortcutsEnabled()) return; // WCAG 2.1.4 — user can turn these off
      if ((e.key === 'e' || e.key === 'E') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const tag = document.activeElement?.tagName?.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || document.activeElement?.isContentEditable) return;
        if (!isHovered.current && !isFocused.current) return;
        e.preventDefault();
        setIsExpanded(true);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const sourceClean = cleanSource(source);
  const hasNotes    = !!(description || sourceUrl);

  return (
    <>
      {/* ── Compact card ──────────────────────────────────────────────────── */}
      <div
        id={indicatorKey ? `indicator-${indicatorKey}` : undefined}
        className="group bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col min-w-0"
        role="group"
        aria-labelledby={descId}
        aria-keyshortcuts="e i"
        onMouseEnter={handleCardMouseEnter}
        onMouseLeave={handleCardMouseLeave}
        onFocus={handleCardFocus}
        onBlur={handleCardBlur}
        onKeyDown={handleCardKeyDown}
      >
        {ariaDescription && (
          <p id={descId} className="sr-only">{ariaDescription}</p>
        )}

        {/* ── Card header ─────────────────────────────────────────────────── */}
        {/* Title left, Details right — the only top-level header action now;
            expand + notes moved down to the footer as in-place card utilities. */}
        <div className="flex items-start justify-between gap-2 sm:gap-3 px-4 sm:px-5 pt-4 sm:pt-5 pb-3">
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold text-gray-900 leading-snug">
              {title}
            </h4>
            <p className="text-xs text-gray-600">
              {[metadataOf ? `${metadataOf.charAt(0).toUpperCase()}${metadataOf.slice(1)}` : null, metadataDetail].filter(Boolean).join(' ')}
              {metadataUnits ? ` (${metadataUnits})` : ''}
            </p>
          </div>

          {/* Details button — opens flyout */}
          <DetailsButton title={title} onClick={handleDetails} />
        </div>

        {/* ── Context text — full width, above the chart ────────────────────── */}
        {/* Subtitle only (NOT description/MethodsNote — that stays modal-only,
            via the ? button in the footer). 2-line clamp + measured fade +
            pointer-only "See more" pill → Details flyout. Shared with the
            custom chart cards via CardReadMore.jsx (2026-09-27). */}
        <CardReadMore text={subtitle} onMore={handleDetails} />

        {/* ── Chart ───────────────────────────────────────────────────────── */}
        <div className="px-4 sm:px-5 pb-4 min-w-0">
          {(!indicatorData || indicatorData.length === 0) ? (
            <div
              className="w-full flex items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-200"
              style={{ minHeight: '175px' }}
              aria-label={messages.chartNoData}
            >
              <p className="text-sm text-gray-600">{messages.chartNoData}</p>
            </div>
          ) : (
            <VegaLiteChart spec={compactSpec} />
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        {/* Source on the left; "?" (notes) + expand grouped bottom-right,
            sharing one button style. Deliberately no flex-wrap here — with
            justify-between, a wrapped lone item lands at flex-start (left),
            not the end, so a long source citation would push the buttons to
            the left on their own line. Instead the row itself never wraps;
            the source text wraps within its own column and the button group
            stays pinned to the right, top-aligned with it. "Similar"
            related-indicator row is temporarily removed — see
            relatedIndicators in the props doc above (deferred, not deleted
            from the data model). */}
        <div className="border-t border-gray-100 px-4 sm:px-5 py-3 flex items-start justify-between gap-3 mt-auto">
          {sourceClean ? (
            <p className="text-xs text-gray-600 leading-snug min-w-0">
              <span className="font-medium text-gray-700">Source:</span> {sourceClean}
            </p>
          ) : <span aria-hidden="true" />}

          <div className="flex items-center gap-1.5 shrink-0">
            {hasNotes && (
              <button
                onClick={() => setNotesOpen(true)}
                aria-label={`Source notes for ${title}`} /* A11Y: names the indicator (was identical on every card) */
                className="flex w-9 h-9 items-center justify-center rounded-md border border-brand text-brand hover:text-white hover:bg-brand transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 text-xs font-semibold"
              >
                ?
              </button>
            )}

            {/* Expand icon — desktop only; on mobile the full-width chart is sufficient */}
            <button
              ref={expandBtnRef}
              onClick={() => setIsExpanded(true)}
              aria-label={`Expand chart: ${title}`}
              aria-haspopup="dialog"
              className="hidden sm:flex w-9 h-9 items-center justify-center rounded-md border border-brand text-brand hover:text-white hover:bg-brand transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <NotesModal
        open={notesOpen}
        title={title}
        indicatorDetail={indicatorDetail}
        sourceClean={sourceClean}
        sourceUrl={sourceUrl}
        description={description}
        onClose={() => setNotesOpen(false)}
      />

      <ExpandedChartModal
        open={isExpanded}
        indicatorKey={indicatorKey}
        expandedSpec={expandedSpec}
        title={title}
        subtitle={subtitle}
        sourceClean={sourceClean}
        indicatorData={indicatorData}
        geoId={geoId}
        onClose={() => setIsExpanded(false)}
        restoreFocusRef={expandBtnRef}
        embedBtnRef={embedBtnRef}
        onOpenEmbed={() => setEmbedOpen(true)}
      />

      <EmbedModal
        open={embedOpen}
        indicatorKey={indicatorKey}
        title={title}
        onClose={() => setEmbedOpen(false)}
        restoreFocusRef={embedBtnRef}
      />
    </>
  );
}
