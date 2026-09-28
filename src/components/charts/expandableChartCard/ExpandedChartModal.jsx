'use client';

/**
 * FILE: ExpandedChartModal.jsx
 *
 * The full-size chart modal opened from ExpandableChartCard's expand icon.
 * Renders via a portal at document.body so it sits above all stacking
 * contexts (backdrop-filter, transform, etc.) created by layout ancestors
 * (StickyContextBar, etc.). Owns the chart image export (copy / download as
 * PNG), the data export (download as CSV — 2026-09-28), and hosts the "Embed" trigger that opens EmbedModal. Part of the
 * 2026-09-04 split of ExpandableChartCard.jsx.
 */

import { useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import VegaLiteChart from '@/components/charts/VegaLiteChart';
import messages from '../../../../content/site/messages.json';
import { useComparison } from '@/lib/context/ComparisonContext';
import { useModalVisibility } from './useModalVisibility';
import { useModalFocusTrap } from './useModalFocusTrap';
import ExpandedChartLegend from './ExpandedChartLegend';
import SubtitleWithGlossary from './SubtitleWithGlossary';
import { buildLegendItems } from './chartCardUtils';
import { downloadCsv, hasCsvData } from './downloadCsv';

export default function ExpandedChartModal({
  open,
  indicatorKey,
  expandedSpec,
  title,
  subtitle,
  sourceClean,
  indicatorData,
  geoId,
  onClose,
  restoreFocusRef,
  embedBtnRef,
  onOpenEmbed,
}) {
  const { comparisonNeighborhood } = useComparison();
  const dialogRef       = useRef(null);
  const expandedViewRef = useRef(null); // captures the Vega view for image export
  const [copyState, setCopyState] = useState('idle'); // 'idle' | 'copying' | 'copied' | 'error'

  const visible = useModalVisibility(open);

  function handleClose() {
    onClose();
    restoreFocusRef?.current?.focus();
  }

  useModalFocusTrap({ isOpen: open, dialogRef, onClose: handleClose, autofocusSelector: '[data-modal-autofocus]' });

  const handleExpandedViewReady = useCallback((view) => {
    expandedViewRef.current = view;
  }, []);

  // ── Chart export helpers ──────────────────────────────────────────────────
  // The Vega spec has no title (to avoid doubling the HTML modal header).
  // For export we composite: title → subtitle → legend column → chart image.
  async function buildExportCanvas(view) {
    const scale    = 2;
    const chartUrl = await view.toImageURL('png', scale);

    const img = new Image();
    img.src   = chartUrl;
    await new Promise(resolve => { img.onload = resolve; });

    const FONT        = `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
    const PADDING     = 28 * scale;
    const TITLE_SIZE  = 15 * scale;
    const SUB_SIZE    = 12 * scale;
    const LINE_GAP    = 6  * scale;
    const BLOCK_GAP   = 16 * scale;
    const LEG_SIZE    = 11 * scale;   // legend text size
    const LEG_ROW     = 20 * scale;   // row height per legend item
    const DOT_R       = 5  * scale;   // circle radius

    const headerH = title
      ? PADDING + TITLE_SIZE + (subtitle ? LINE_GAP + SUB_SIZE : 0) + BLOCK_GAP
      : 0;

    const legendItems = buildLegendItems(indicatorData, geoId, comparisonNeighborhood);
    const legendH     = legendItems.length ? legendItems.length * LEG_ROW + BLOCK_GAP : 0;

    const canvas  = document.createElement('canvas');
    canvas.width  = img.width;
    canvas.height = img.height + headerH + legendH;

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ── Title + subtitle ───────────────────────────────────────────────────
    if (headerH > 0) {
      let y = PADDING + TITLE_SIZE;
      if (title) {
        ctx.fillStyle = '#111827';
        ctx.font      = `bold ${TITLE_SIZE}px ${FONT}`;
        ctx.fillText(title, PADDING, y);
        y += TITLE_SIZE;
      }
      if (subtitle) {
        y += LINE_GAP;
        ctx.fillStyle = '#6B7280';
        ctx.font      = `${SUB_SIZE}px ${FONT}`;
        ctx.fillText(subtitle, PADDING, y);
      }
    }

    // ── Legend — column of colored circles ────────────────────────────────
    if (legendItems.length) {
      ctx.font = `${LEG_SIZE}px ${FONT}`;
      legendItems.forEach((item, i) => {
        const cy = headerH + DOT_R + i * LEG_ROW + (LEG_ROW - DOT_R * 2) / 2;
        const tx = PADDING + DOT_R * 2 + 8 * scale;
        const ty = cy + LEG_SIZE * 0.36; // canvas text baseline offset

        // Circle
        ctx.beginPath();
        ctx.arc(PADDING + DOT_R, cy, DOT_R, 0, Math.PI * 2);
        ctx.fillStyle = item.color;
        ctx.fill();

        // Label
        ctx.fillStyle = '#374151';
        ctx.fillText(item.label, tx, ty);

        // Value (gray suffix)
        if (item.value) {
          const labelW = ctx.measureText(item.label).width;
          ctx.fillStyle = '#4B5563';
          ctx.fillText(` · ${item.value}`, tx + labelW, ty);
        }
      });
    }

    ctx.drawImage(img, 0, headerH + legendH);
    return canvas;
  }

  // ── Chart export actions ───────────────────────────────────────────────────
  async function handleDownloadImage() {
    const view = expandedViewRef.current;
    if (!view) return;
    try {
      const canvas = await buildExportCanvas(view);
      const a      = document.createElement('a');
      a.href        = canvas.toDataURL('image/png');
      a.download    = `${indicatorKey ?? title ?? 'chart'}.png`;
      a.click();
    } catch (err) {
      console.error('[ExpandableChartCard] download error:', err);
    }
  }

  async function handleCopyImage() {
    const view = expandedViewRef.current;
    if (!view) return;
    setCopyState('copying');
    try {
      const canvas = await buildExportCanvas(view);
      canvas.toBlob(async blob => {
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          setCopyState('copied');
          setTimeout(() => setCopyState('idle'), 2000);
        } catch (err) {
          console.error('[ExpandableChartCard] copy error:', err);
          setCopyState('error');
          setTimeout(() => setCopyState('idle'), 2000);
        }
      }, 'image/png');
    } catch (err) {
      console.error('[ExpandableChartCard] copy error:', err);
      setCopyState('error');
      setTimeout(() => setCopyState('idle'), 2000);
    }
  }

  if (!open) return null;

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
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Expanded chart: ${title}`}
        className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
        style={{
          opacity:   visible ? 1 : 0,
          transform: visible ? 'scale(1)' : 'scale(0.96)',
          transition: 'opacity 200ms ease-out, transform 200ms ease-out',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Modal header ─────────────────────────────────── */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100 shrink-0 rounded-t-xl bg-white gap-4">
          <h3 className="text-base font-semibold text-gray-900 min-w-0">{title}</h3>

          {/* Export actions + close — grouped: [Copy PNG CSV] | [Embed] | [Close] */}
          <div className="flex items-center gap-1.5 shrink-0">

            {/* Export group: Copy + PNG + CSV share the same action family */}
            <div className="flex items-center gap-1">
              {/* Copy image */}
              <button
                onClick={handleCopyImage}
                aria-label="Copy chart as image"
                title="Copy image"
                className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-gray-200 text-xs font-medium text-gray-600 hover:text-brand hover:border-brand hover:bg-brand-tint transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 whitespace-nowrap"
              >
                {copyState === 'copied' ? (
                  <><span className="text-green-600">✓</span> Copied</>
                ) : copyState === 'error' ? (
                  <><span className="text-red-500">✕</span> Failed</>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy
                  </>
                )}
              </button>

              {/* Download image */}
              <button
                onClick={handleDownloadImage}
                aria-label="Download chart as PNG"
                title="Download PNG"
                className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-gray-200 text-xs font-medium text-gray-600 hover:text-brand hover:border-brand hover:bg-brand-tint transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 whitespace-nowrap"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                PNG
              </button>

              {/* Download data — every geography in the indicator file, as CSV */}
              {hasCsvData(indicatorData) && (
                <button
                  onClick={() => downloadCsv(indicatorData, indicatorKey, title)}
                  aria-label={`Download data for ${title} as CSV`}
                  title="Download data (CSV)"
                  className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-gray-200 text-xs font-medium text-gray-600 hover:text-brand hover:border-brand hover:bg-brand-tint transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 whitespace-nowrap"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  CSV
                </button>
              )}
            </div>

            <div className="w-px h-5 bg-gray-200 mx-0.5" aria-hidden="true" />

            {/* Embed — different action type: share/publish, not export */}
            <button
              ref={embedBtnRef}
              onClick={onOpenEmbed}
              aria-label="Embed chart"
              title="Embed"
              className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-gray-200 text-xs font-medium text-gray-600 hover:text-brand hover:border-brand hover:bg-brand-tint transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 whitespace-nowrap"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              Embed
            </button>

            <div className="w-px h-5 bg-gray-200 mx-0.5" aria-hidden="true" />

            <button
              onClick={handleClose}
              aria-label="Close expanded chart"
              data-modal-autofocus
              className="inline-flex items-center gap-1.5 h-8 px-3 text-sm text-gray-600 hover:text-brand border border-gray-200 hover:border-brand hover:bg-brand-tint rounded-md transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 whitespace-nowrap"
            >
              Close
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Subtitle ─────────────────────────────────────────── */}
        {subtitle && (
          <div className="px-7 pt-4 pb-3">
            <p className="text-sm text-gray-600">
              <SubtitleWithGlossary text={subtitle} />
            </p>
          </div>
        )}

        {/* ── Reference legend ────────────────────────────────── */}
        <ExpandedChartLegend
          indicatorData={indicatorData}
          geoId={geoId}
          comparisonNeighborhood={comparisonNeighborhood}
        />

        {/* ── Chart ───────────────────────────────────────────── */}
        <div className="px-7 pb-6">
          {(!indicatorData || indicatorData.length === 0) ? (
            <div
              className="w-full flex items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-200"
              style={{ minHeight: '360px' }}
              aria-label={messages.chartNoData}
            >
              <p className="text-sm text-gray-600">{messages.chartNoData}</p>
            </div>
          ) : (
            <VegaLiteChart spec={expandedSpec} onViewReady={handleExpandedViewReady} />
          )}
        </div>

        {/* ── Source citation ─────────────────────────────────── */}
        {sourceClean && (
          <div className="px-7 pb-6 flex items-center gap-1.5 border-t border-gray-100 pt-4">
            <p className="text-xs text-gray-600">
              <span className="font-medium text-gray-700">Source:</span> {sourceClean}
            </p>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
