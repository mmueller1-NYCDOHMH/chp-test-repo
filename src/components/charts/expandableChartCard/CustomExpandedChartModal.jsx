'use client';

/**
 * FILE: CustomExpandedChartModal.jsx
 *
 * Expanded view for the custom (non-Vega) chart cards — Avertable Deaths,
 * Leading Causes of Premature Death. Added 2026-09-27 so these match the
 * standard ExpandedChartModal: same portal/z-index, same fade + scale-in,
 * same max-w-4xl / max-h-[90vh] sizing, same header row
 * ([Copy PNG CSV] | [Embed] | [Close]), same subtitle, body padding and
 * source footer. The chart itself is passed as children.
 *
 * Differences from the standard modal, and why:
 *   - Copy / Download: these charts are HTML/CSS, not Vega, so there's no
 *     view.toImageURL(). The chart area is rasterized with domToCanvas.js
 *     (dependency-free: computed styles inlined into an SVG foreignObject), then
 *     composited under the title + subtitle the same way the standard
 *     modal's buildExportCanvas does. Legends are part of `children` here,
 *     so they're captured in the image rather than redrawn on the canvas.
 *   - CSV: same downloadCsv() as the standard modal, fed by the optional
 *     `csvRows` prop (the card's raw data rows); button hidden if absent.
 *   - Embed: same EmbedModal (?flyout=<indicatorKey> iframe snippet), owned
 *     by the parent card exactly like ExpandableChartCard does.
 */

import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useModalVisibility } from './useModalVisibility';
import { useModalFocusTrap } from './useModalFocusTrap';
import SubtitleWithGlossary from './SubtitleWithGlossary';
import { domToCanvas } from './domToCanvas';
import { downloadCsv, hasCsvData } from './downloadCsv';
import { composeExportCanvas } from './chartExport';

const BTN =
  'inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-gray-200 text-xs font-medium text-gray-600 hover:text-brand hover:border-brand hover:bg-brand-tint transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 whitespace-nowrap';

export default function CustomExpandedChartModal({
  open,
  indicatorKey,
  title,
  subtitle,
  sourceClean,
  onClose,
  restoreFocusRef,
  embedBtnRef,
  onOpenEmbed,
  csvRows,      // optional — data rows for the "CSV" download (2026-09-28)
  children,
}) {
  const dialogRef  = useRef(null);
  const captureRef = useRef(null); // the chart area rasterized for Copy / Download
  const [copyState, setCopyState] = useState('idle'); // 'idle' | 'copying' | 'copied' | 'error'

  const visible = useModalVisibility(open);

  function handleClose() {
    onClose();
    restoreFocusRef?.current?.focus();
  }

  useModalFocusTrap({ isOpen: open, dialogRef, onClose: handleClose, autofocusSelector: '[data-modal-autofocus]' });

  // ── Export: chart area → canvas, with title + subtitle drawn above ────────
  async function buildExportCanvas() {
    const node = captureRef.current;
    if (!node) throw new Error('nothing to capture');
    const scale = 2;
    const chartCanvas = await domToCanvas(node, { pixelRatio: scale, backgroundColor: '#ffffff' });

    // Shared with the standard modal + flyout tray; wraps long title/subtitle
    // text instead of cropping it (2026-09-29).
    return composeExportCanvas({ chart: chartCanvas, title, subtitle, scale, chartInset: true });
  }

  async function handleDownloadImage() {
    try {
      const canvas = await buildExportCanvas();
      const a      = document.createElement('a');
      a.href       = canvas.toDataURL('image/png');
      a.download   = `${indicatorKey ?? title ?? 'chart'}.png`;
      a.click();
    } catch (err) {
      console.error('[CustomExpandedChartModal] download error:', err);
    }
  }

  async function handleCopyImage() {
    setCopyState('copying');
    const fail = (err) => {
      console.error('[CustomExpandedChartModal] copy error:', err);
      setCopyState('error');
      setTimeout(() => setCopyState('idle'), 2000);
    };
    try {
      const canvas = await buildExportCanvas();
      canvas.toBlob(async (blob) => {
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          setCopyState('copied');
          setTimeout(() => setCopyState('idle'), 2000);
        } catch (err) { fail(err); }
      }, 'image/png');
    } catch (err) { fail(err); }
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
        {/* ── Modal header — identical to ExpandedChartModal ──────────── */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100 shrink-0 rounded-t-xl bg-white gap-4">
          <h3 className="text-base font-semibold text-gray-900 min-w-0">{title}</h3>

          {/* [Copy PNG CSV] | [Embed] | [Close] */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="flex items-center gap-1">
              <button onClick={handleCopyImage} aria-label="Copy chart as image" title="Copy image" className={BTN}>
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

              <button onClick={handleDownloadImage} aria-label="Download chart as PNG" title="Download PNG" className={BTN}>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                PNG
              </button>

              {hasCsvData(csvRows) && (
                <button
                  onClick={() => downloadCsv(csvRows, indicatorKey, title)}
                  aria-label={`Download data for ${title} as CSV`}
                  title="Download data (CSV)"
                  className={BTN}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  CSV
                </button>
              )}
            </div>

            <div className="w-px h-5 bg-gray-200 mx-0.5" aria-hidden="true" />

            <button ref={embedBtnRef} onClick={onOpenEmbed} aria-label="Embed chart" title="Embed" className={BTN}>
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

        {/* Scrolls if a tall chart outgrows 90vh (header stays pinned) */}
        <div className="overflow-y-auto min-h-0">
          {/* ── Subtitle ─────────────────────────────────────────── */}
          {subtitle && (
            <div className="px-7 pt-4 pb-3">
              <p className="text-sm text-gray-600">
                <SubtitleWithGlossary text={subtitle} />
              </p>
            </div>
          )}

          {/* ── Chart (incl. its own legend) ─────────────────────── */}
          <div className={`px-7 pb-6 ${subtitle ? '' : 'pt-5'}`}>
            <div ref={captureRef} className="bg-white">
              {children}
            </div>
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
      </div>
    </div>,
    document.body
  );
}
