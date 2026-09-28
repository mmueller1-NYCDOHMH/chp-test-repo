'use client';

/**
 * FILE: NotesModal.jsx
 *
 * The "?" notes dialog on ExpandableChartCard — shows the full source
 * citation + description/MethodsNote for an indicator. Long Notes text is
 * clamped to 6 lines with a "Read more" toggle; short text gets no toggle.
 * Part of the 2026-09-04 split of ExpandableChartCard.jsx.
 *
 * Unlike ExpandedChartModal/EmbedModal, this dialog does not restore focus
 * to a trigger button on close (matches the original inline behavior).
 */

import { useRef, useState, useEffect } from 'react';
import { useModalVisibility } from './useModalVisibility';
import { useModalFocusTrap } from './useModalFocusTrap';
import { useOverflowClamp } from './useOverflowClamp';

export default function NotesModal({ open, title, indicatorDetail, sourceClean, sourceUrl, description, onClose }) {
  const dialogRef = useRef(null);
  const textRef   = useRef(null);
  const [notesExpanded, setNotesExpanded] = useState(false);

  const visible = useModalVisibility(open);

  // Reset the "Read more" toggle every time the modal is freshly opened, so
  // a previous expand doesn't carry over.
  useEffect(() => {
    if (open) setNotesExpanded(false);
  }, [open]);

  const notesClamped = useOverflowClamp(textRef, { deps: [open, description] });

  useModalFocusTrap({ isOpen: open, dialogRef, onClose });

  if (!open) return null;

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-[3000] flex items-center justify-center p-3 sm:p-8"
      style={{
        backgroundColor: visible ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0)',
        transition: 'background-color 180ms ease-out',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Source notes: ${title}`}
        className="relative bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden"
        style={{
          opacity:   visible ? 1 : 0,
          transform: visible ? 'scale(1)' : 'scale(0.97)',
          transition: 'opacity 180ms ease-out, transform 180ms ease-out',
        }}
      >
        {/* Header just names the indicator — no generic "Source & notes"
            label; the section labels below (Data source / Notes) already
            say what's in the panel. aria-label on the dialog keeps that
            context for screen readers even though it's not shown visually. */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close notes"
            className="text-gray-600 border border-transparent hover:text-brand hover:border-brand hover:bg-brand-tint transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-full p-1 shrink-0 ml-4"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-6 overflow-y-auto">
          {indicatorDetail && (
            <div>
              <p className="text-xs font-semibold text-gray-900 tracking-wider mb-1.5">Indicator details</p>
              <p className="text-sm text-gray-700 leading-relaxed">{indicatorDetail}</p>
            </div>
          )}

          {sourceClean && (
            <div>
              <p className="text-xs font-semibold text-gray-900 tracking-wider mb-1.5">Data source</p>
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
              <p className="text-xs font-semibold text-gray-900 tracking-wider mb-1.5">Notes</p>
              <p
                ref={textRef}
                className="text-sm text-gray-600 leading-relaxed"
                style={notesExpanded ? undefined : {
                  display: '-webkit-box',
                  WebkitLineClamp: 6,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {description}
              </p>
              {notesClamped && (
                <button
                  type="button"
                  onClick={() => setNotesExpanded(v => !v)}
                  aria-expanded={notesExpanded}
                  className="mt-1.5 text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
                >
                  {notesExpanded ? 'Show less' : 'Read more'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
