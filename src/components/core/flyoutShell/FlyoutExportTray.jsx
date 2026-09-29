'use client';

/**
 * FILE: FlyoutExportTray.jsx
 *
 * Export tray for the indicator Details flyout (2026-09-29). Opened by the
 * single "Export" toggle next to "Copy link" in FlyoutShell's header; slides
 * open as a row under the header holding the same actions as the expanded
 * chart modal, in the same grouping and button style:
 *
 *   [Copy] [PNG] [CSV]  |  [Embed]
 *
 * What gets exported — same output as the expanded modal, not the flyout's
 * compact mini bar:
 *   - Standard (Vega) cards: the card passes `expandedSpecOptions` in the
 *     flyout payload. The expanded spec is built on demand and rendered
 *     offscreen (renderSpecToImage), then composited with title / subtitle /
 *     legend by the same composeExportCanvas() the modal uses.
 *   - Custom cards (Avertable Deaths, causes, cancer types): no Vega spec, so
 *     the flyout's own chart slot ([data-flyout-chart]) is rasterized with
 *     domToCanvas — the same technique CustomExpandedChartModal uses.
 *   - CSV: payload `csvRows` if the card supplies them, else `indicatorData`.
 *     Button hidden when there are no rows (same rule as the modals).
 *   - Embed: the same EmbedModal the cards use.
 */

import { useRef, useState } from 'react';
import { useComparison } from '@/lib/context/ComparisonContext';
import { buildBarChartSpec } from '@/lib/charts/buildBarChartSpec';
import EmbedModal from '@/components/charts/expandableChartCard/EmbedModal';
import { buildLegendItems } from '@/components/charts/expandableChartCard/chartCardUtils';
import { downloadCsv, hasCsvData } from '@/components/charts/expandableChartCard/downloadCsv';
import { domToCanvas } from '@/components/charts/expandableChartCard/domToCanvas';
import {
  composeExportCanvas,
  renderSpecToImage,
  downloadCanvas,
  copyCanvas,
} from '@/components/charts/expandableChartCard/chartExport';

// Same button style as ExpandedChartModal / CustomExpandedChartModal
const BTN =
  'inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-gray-200 bg-white text-xs font-medium text-gray-600 hover:text-brand hover:border-brand hover:bg-brand-tint transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 whitespace-nowrap disabled:opacity-60 disabled:cursor-wait';

const DownloadIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

/** Whether a flyout payload has anything the tray can export. */
export function flyoutHasExports(flyout) {
  if (!flyout || flyout.kind !== 'indicator') return false;
  return Boolean(
    flyout.expandedSpecOptions || flyout.chart || flyout.indicatorKey ||
    hasCsvData(flyout.csvRows ?? flyout.indicatorData)
  );
}

export default function FlyoutExportTray({ id, open, flyout, panelRef }) {
  const { comparisonNeighborhood } = useComparison();
  const embedBtnRef = useRef(null);
  const [embedOpen, setEmbedOpen] = useState(false);
  const [copyState, setCopyState] = useState('idle'); // 'idle' | 'copying' | 'copied' | 'error'
  const [pngBusy,   setPngBusy]   = useState(false);

  const {
    indicatorKey, title, subtitle, indicatorData, geoId,
    expandedSpecOptions, chart, csvRows,
  } = flyout ?? {};

  const hasSpec  = Boolean(expandedSpecOptions && indicatorData?.length);
  const hasImage = hasSpec || Boolean(chart);
  const rows     = csvRows ?? indicatorData;
  const hasCsv   = hasCsvData(rows);

  async function buildExportCanvas() {
    const scale = 2;
    if (hasSpec) {
      const spec = buildBarChartSpec({ ...expandedSpecOptions, data: indicatorData, geoId, expanded: true });
      const img  = await renderSpecToImage(spec, {
        scale,
        signals: { comparisonGeoId: comparisonNeighborhood?.geoId ?? null },
      });
      const legendItems = buildLegendItems(indicatorData, geoId, comparisonNeighborhood);
      return composeExportCanvas({ chart: img, title, subtitle, legendItems, scale });
    }
    const node = panelRef?.current?.querySelector('[data-flyout-chart]');
    if (!node) throw new Error('nothing to capture');
    const canvas = await domToCanvas(node, { pixelRatio: scale, backgroundColor: '#ffffff' });
    return composeExportCanvas({ chart: canvas, title, subtitle, scale, chartInset: true });
  }

  async function handleDownloadImage() {
    setPngBusy(true);
    try {
      downloadCanvas(await buildExportCanvas(), `${indicatorKey ?? title ?? 'chart'}.png`);
    } catch (err) {
      console.error('[FlyoutExportTray] download error:', err);
    }
    setPngBusy(false);
  }

  async function handleCopyImage() {
    setCopyState('copying');
    try {
      await copyCanvas(await buildExportCanvas());
      setCopyState('copied');
    } catch (err) {
      console.error('[FlyoutExportTray] copy error:', err);
      setCopyState('error');
    }
    setTimeout(() => setCopyState('idle'), 2000);
  }

  return (
    <>
      {/* Height animates via the grid 0fr → 1fr trick; inert when closed so
          the hidden buttons stay out of the Tab order and the a11y tree. */}
      <div
        id={id}
        role="group"
        aria-label={`Export ${title ?? 'chart'}`}
        inert={!open || undefined}
        className={`grid shrink-0 transition-[grid-template-rows] duration-200 ease-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        <div className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-1.5 px-5 py-2.5 bg-gray-50 border-t border-gray-100">
            {hasImage && (
              <>
                <button type="button" onClick={handleCopyImage} disabled={copyState === 'copying'} aria-label="Copy chart as image" title="Copy image" className={BTN}>
                  {copyState === 'copied' ? (
                    <><span className="text-green-600" aria-hidden="true">✓</span> Copied</>
                  ) : copyState === 'error' ? (
                    <><span className="text-red-500" aria-hidden="true">✕</span> Failed</>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy
                    </>
                  )}
                </button>

                <button type="button" onClick={handleDownloadImage} disabled={pngBusy} aria-label="Download chart as PNG" title="Download PNG" className={BTN}>
                  <DownloadIcon />
                  PNG
                </button>
              </>
            )}

            {hasCsv && (
              <button
                type="button"
                onClick={() => downloadCsv(rows, indicatorKey, title)}
                aria-label={`Download data for ${title} as CSV`}
                title="Download data (CSV)"
                className={BTN}
              >
                <DownloadIcon />
                CSV
              </button>
            )}

            {indicatorKey && (
              <>
                {(hasImage || hasCsv) && <div className="w-px h-5 bg-gray-200 mx-0.5" aria-hidden="true" />}
                <button
                  ref={embedBtnRef}
                  type="button"
                  onClick={() => setEmbedOpen(true)}
                  aria-label="Embed chart"
                  aria-haspopup="dialog"
                  title="Embed"
                  className={BTN}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                  Embed
                </button>
              </>
            )}

            {/* Status for screen readers — the visual ✓/✕ swap isn't announced */}
            <span className="sr-only" aria-live="polite">
              {copyState === 'copied' ? 'Chart image copied' : copyState === 'error' ? 'Copy failed' : ''}
            </span>
          </div>
        </div>
      </div>

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
