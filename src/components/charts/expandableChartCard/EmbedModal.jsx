'use client';

/**
 * FILE: EmbedModal.jsx
 *
 * "Embed chart" dialog opened from inside ExpandedChartModal — shows an
 * <iframe> snippet that reopens this indicator's flyout when the embedded
 * page loads. Part of the 2026-09-04 split of ExpandableChartCard.jsx.
 */

import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useModalFocusTrap } from './useModalFocusTrap';

function buildEmbedCode({ indicatorKey, title }) {
  const base   = typeof window !== 'undefined' ? window.location.origin : '';
  const params = new URLSearchParams({ flyout: indicatorKey ?? '' });
  const src    = `${base}${typeof window !== 'undefined' ? window.location.pathname : ''}?${params}`;
  return `<iframe src="${src}" width="760" height="460" style="border:none;border-radius:12px;overflow:hidden;" title="${title}" loading="lazy"></iframe>`;
}

export default function EmbedModal({ open, indicatorKey, title, onClose, restoreFocusRef }) {
  const dialogRef = useRef(null);
  const [copied, setCopied] = useState(false);

  function handleClose() {
    onClose();
    restoreFocusRef?.current?.focus();
  }

  useModalFocusTrap({ isOpen: open, dialogRef, onClose: handleClose });

  if (!open) return null;

  const embedCode = buildEmbedCode({ indicatorKey, title });

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }

  return createPortal(
    <div
      role="presentation"
      className="fixed inset-0 z-[3500] flex items-center justify-center p-3 sm:p-8"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
      onClick={handleClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Embed chart: ${title}`}
        className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Embed chart</h3>
            <p className="text-xs text-gray-600 mt-0.5">{title}</p>
          </div>
          <button
            onClick={handleClose}
            aria-label="Close embed dialog"
            className="text-gray-600 border border-transparent hover:text-brand hover:border-brand hover:bg-brand-tint transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded ml-4"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5 flex flex-col gap-4">
          <p className="text-xs text-gray-600 leading-relaxed">
            Paste this code into any webpage to embed this indicator. The chart will open a detailed flyout when clicked.
          </p>
          <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed select-all">
            {embedCode}
          </pre>
          <button
            onClick={handleCopy}
            className="self-start inline-flex items-center gap-2 h-8 px-4 rounded-md border border-gray-200 text-xs font-medium text-gray-600 hover:text-gray-900 hover:border-gray-300 hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            {copied ? (
              <><span className="text-green-600">✓</span> Copied!</>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy code
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
