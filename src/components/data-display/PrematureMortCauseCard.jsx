'use client';

/**
 * FILE: PrematureMortCauseCard.jsx
 *
 * PURPOSE:
 * Full card shell for "Leading Causes Of Premature Death" — its own
 * ranked-bar-chart card, styled like a standard indicator card (title,
 * subtitle, paragraph with a "read more" toggle, chart, source footer). The
 * bar chart itself is ComparisonBarChartClient.jsx → ComparisonBarChart.jsx;
 * this file only owns the card chrome.
 *
 * REV. 2026-09-25 (Morgan's updated mockup) — card chrome now matches the
 * Avertable Deaths card: larger bold title, small subtitle, paragraph
 * clamped at the first comma past the lead sentence with a bold inline
 * "read more"; footer "?" uses the shared NotesModal (was an inline panel)
 * and a new expand button opens a larger copy of the chart.
 *
 * REV. 2026-09-27 — standard card header (DetailsButton) + read-more block
 * (CardReadMore) and a Details flyout showing the chart + methods text.
 *
 * REV. 2026-09-28 — accepts `compareToCity` from PrematureDeathChartsRow so
 * this card and the cancer-types card share one "Compare to city" toggle.
 *
 * PROPS:
 *   title, source        — from getIndicatorMeta('premature-mort-cause-rate')
 *   insightText           — paragraph shown inline (clamped)
 *   subtitle              — small descriptor line under the title
 *   segments, primaryLabel, rawData, segmentCfg, geoId, valueSuffix
 *                          — forwarded to ComparisonBarChartClient
 */

import { useRef, useState } from 'react';
import { useComparison } from '@/lib/context/ComparisonContext';
import { getDistributionSuppressionNote } from '@/lib/utils/suppression';
import ComparisonBarChartClient from './ComparisonBarChartClient';
import NotesModal from '@/components/charts/expandableChartCard/NotesModal';
import CustomExpandedChartModal from '@/components/charts/expandableChartCard/CustomExpandedChartModal';
import EmbedModal from '@/components/charts/expandableChartCard/EmbedModal';
import CardReadMore from '@/components/charts/expandableChartCard/CardReadMore';
import DetailsButton from '@/components/charts/expandableChartCard/DetailsButton';
import { useCardDetailsShortcut } from '@/components/charts/expandableChartCard/useCardDetailsShortcut';
import { useFlyout } from '@/components/core/FlyoutShell';


const CITYWIDE_GEOID = 0;

export default function PrematureMortCauseCard({
  title = 'Top Causes of Premature Death',
  subtitle = 'Death before the age of 65; number and rate per 100,000 people',
  insightText,
  source,
  segments,
  primaryLabel,
  rawData,
  segmentCfg,
  geoId,
  valueSuffix = '',
  anchorId,   // card id, so indicator search can scroll to this chart
  indicatorKey = 'premature-mort-cause-rate',
  narrative = null, // optional on-card read-more text (standard clamp design)
  compareToCity,    // optional — shared toggle owned by PrematureDeathChartsRow (2026-09-28)
}) {
  const { open: openFlyout } = useFlyout();
  const [notesOpen, setNotesOpen] = useState(false);
  const [chartOpen, setChartOpen] = useState(false);
  const [embedOpen, setEmbedOpen] = useState(false);
  const expandBtnRef = useRef(null);
  const embedBtnRef = useRef(null);

  const sourceClean = source ? source.replace(/^source:\s*/i, '') : '';
  // title → sr-only table caption in ComparisonBarChart (A11Y 2026-09-26)
  // compareToCity flows into the card, Details flyout, and expanded modal, so
  // all three follow the one shared "Compare to city" toggle.
  const chartProps = { primaryLabel, segments, rawData, segmentCfg, geoId, valueSuffix, title, compareToCity };

  // Suppression note (2026-10-01) — any suppressed value among the causes +
  // geographies drawn (selected + comparison, or selected + Citywide —
  // mirrors ComparisonBarChartClient) → (?) dialog, expanded view, flyout.
  const { comparisonNeighborhood } = useComparison();
  const showingCitywide = !comparisonNeighborhood || !!compareToCity;
  const suppressionNote = getDistributionSuppressionNote(
    rawData,
    [geoId, showingCitywide ? CITYWIDE_GEOID : comparisonNeighborhood.geoId],
    segmentCfg?.map(s => s.key),
  );

  // Details flyout (2026-09-27) — standard indicator flyout layout. This is a
  // multi-cause distribution (no single value per CD), so no indicatorData is
  // passed: the flyout skips the map/insight and shows the chart + the
  // methods text inline instead.
  function handleDetails() {
    openFlyout({
      kind: 'indicator',
      indicatorKey,
      title,
      subtitle: narrative || subtitle,
      // 2026-09-30: flyout header shows both — subtitle line under the
      // title (metadataLine) and the narrative context sentence below it.
      metadataLine: subtitle,
      flyoutContext: narrative || null,
      source,
      sourceUrl: null,
      description: insightText,
      geoId,
      chart: <ComparisonBarChartClient {...chartProps} compact />,
      csvRows: rawData, // flyout export tray's CSV button (2026-09-29)
      suppressionNote,
    });
  }
  const shortcutProps = useCardDetailsShortcut(handleDetails);

  return (
    <>
      <div
        id={anchorId}
        className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col min-w-0"
        {...shortcutProps}
      >
        {/* ── Header — standard card layout: title + descriptor line left,
            "Details →" right (2026-09-27). ─────────────────────────────── */}
        <div className="flex items-start justify-between gap-2 sm:gap-3 px-4 sm:px-5 pt-4 sm:pt-5 pb-3">
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold text-gray-900 leading-snug">{title}</h4>
            {subtitle && <p className="text-xs text-gray-600">{subtitle}</p>}
          </div>
          <DetailsButton title={title} onClick={handleDetails} />
        </div>

        {/* ── Read-more text — standard card design (2-line clamp, fade,
            "See more" → flyout). Only renders when a `narrative` is passed;
            the methods paragraph (insightText) stays off the card face (removed
            2026-09-27 to keep card heights even) and lives in the flyout + ?
            notes instead. ───────────────────────────────────────────────── */}
        <CardReadMore text={narrative} onMore={handleDetails} />

        {/* ── Chart ──────────────────────────────────────────────────── */}
        <div className="px-4 sm:px-5 pb-4 min-w-0">
          <ComparisonBarChartClient {...chartProps} compact />
        </div>

        {/* ── Footer ─────────────────────────────────────────────────── */}
        <div className="border-t border-gray-100 px-4 sm:px-5 py-3 flex items-start justify-between gap-3 mt-auto">
          {sourceClean ? (
            <p className="text-xs text-gray-600 leading-snug min-w-0">
              <span className="font-semibold text-gray-800">Source:</span> {sourceClean}
            </p>
          ) : (
            <span aria-hidden="true" />
          )}

          <div className="flex items-center gap-1.5 shrink-0">
            {(insightText || sourceClean || suppressionNote) && (
              <button
                type="button"
                onClick={() => setNotesOpen(true)}
                aria-label={`Source notes for ${title}`} /* A11Y: names the indicator (was identical on every card) */
                className="flex w-9 h-9 items-center justify-center rounded-md border border-brand text-brand hover:text-white hover:bg-brand transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 text-xs font-semibold"
              >
                ?
              </button>
            )}
            {segments?.length > 0 && (
              <button
                ref={expandBtnRef}
                type="button"
                onClick={() => setChartOpen(true)}
                aria-label={`Expand chart: ${title}`}
                aria-haspopup="dialog"
                className="hidden sm:flex w-9 h-9 items-center justify-center rounded-md border border-brand text-brand hover:text-white hover:bg-brand transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      <NotesModal
        open={notesOpen}
        title={title}
        sourceClean={sourceClean}
        sourceUrl={null}
        description={insightText}
        note={suppressionNote}
        onClose={() => setNotesOpen(false)}
      />

      {/* Expanded view — same header buttons + sizing as the standard
          ExpandedChartModal (2026-09-27). */}
      <CustomExpandedChartModal
        open={chartOpen}
        indicatorKey={indicatorKey}
        title={title}
        subtitle={subtitle}
        sourceClean={sourceClean}
        onClose={() => setChartOpen(false)}
        restoreFocusRef={expandBtnRef}
        embedBtnRef={embedBtnRef}
        onOpenEmbed={() => setEmbedOpen(true)}
        csvRows={rawData}
        suppressionNote={suppressionNote}
      >
        <ComparisonBarChartClient {...chartProps} />
      </CustomExpandedChartModal>

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
