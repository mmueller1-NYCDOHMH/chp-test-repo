'use client';

/**
 * FILE: ExpandableChartCard.jsx
 *
 * PURPOSE:
 * Card shell for a single indicator chart.
 *
 * HEADER ACTIONS (left → right):
 *   [expand icon]  — opens full-size chart modal
 *   [Details →]    — opens right-side flyout (map, description, source)
 *
 * FOOTER:
 *   [?]  Source: <citation>
 *   Similar: <related indicator links>
 *
 * The ? button opens a notes modal with the longer indicator description
 * and source notes. "Similar" links scroll to other indicator cards within
 * the same section.
 *
 * PROPS:
 * - compactSpec        Vega-Lite spec for the card chart
 * - expandedSpec       Vega-Lite spec for the expanded modal chart
 * - title              Indicator name
 * - subtitle           Unit / description shown below title
 * - source             Short citation string (e.g. "NYC Community Health Survey, 2021")
 * - sourceUrl          Optional URL for "View source data" link in flyout
 * - description        Longer plain-language notes, shown in ? modal
 * - relatedIndicators  Array of { title, indicatorKey } for the Similar footer
 * - indicatorData      Raw data rows passed to flyout for insight rendering
 * - geoId              Currently selected neighborhood geoId
 * - ariaDescription    Screen-reader description
 * - sectionLabel       Section context passed to flyout
 */

import { useState, useEffect, useRef } from 'react';
import VegaLiteChart from '@/components/charts/VegaLiteChart';
import { useFlyout } from '@/components/core/FlyoutShell';
import GlossaryTerm from '@/components/content/GlossaryTerm';
import { parseGlossaryTerms } from '@/lib/glossary';

function SubtitleWithGlossary({ text }) {
  if (!text) return null;
  const segments = parseGlossaryTerms(text);
  return (
    <>
      {segments.map((seg, i) =>
        typeof seg === 'string'
          ? <span key={i}>{seg}</span>
          : <GlossaryTerm key={i} term={seg.term} definition={seg.definition} />
      )}
    </>
  );
}

// Strip leading "Source: " prefix if already present so we can control formatting
function cleanSource(source) {
  if (!source) return '';
  return source.replace(/^source:\s*/i, '');
}

export default function ExpandableChartCard({
  indicatorKey,
  compactSpec,
  expandedSpec,
  title,
  subtitle,
  source,
  sourceUrl,
  description,
  relatedIndicators = [],
  indicatorData,
  geoId,
  ariaDescription,
  sectionLabel,
}) {
  const [isExpanded,   setIsExpanded]   = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [notesOpen,    setNotesOpen]    = useState(false);
  const [notesVisible, setNotesVisible] = useState(false);

  const { open: openFlyout } = useFlyout();
  const modalRef     = useRef(null);
  const expandBtnRef = useRef(null);
  const isHovered    = useRef(false);

  // ── Expand modal animation ─────────────────────────────────────────────────
  useEffect(() => {
    if (isExpanded) {
      const raf = requestAnimationFrame(() => setModalVisible(true));
      return () => cancelAnimationFrame(raf);
    } else {
      setModalVisible(false);
    }
  }, [isExpanded]);

  // ── Notes modal animation ──────────────────────────────────────────────────
  useEffect(() => {
    if (notesOpen) {
      const raf = requestAnimationFrame(() => setNotesVisible(true));
      return () => cancelAnimationFrame(raf);
    } else {
      setNotesVisible(false);
    }
  }, [notesOpen]);

  // ── Focus trap + Escape for expand modal ──────────────────────────────────
  useEffect(() => {
    if (!isExpanded) return;
    const raf = requestAnimationFrame(() => modalRef.current?.querySelector('button')?.focus());
    function onKey(e) {
      if (e.key === 'Escape') { setIsExpanded(false); expandBtnRef.current?.focus(); return; }
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
  }, [isExpanded]);

  // ── Focus trap + Escape for notes modal ───────────────────────────────────
  useEffect(() => {
    if (!notesOpen) return;
    function onKey(e) {
      if (e.key === 'Escape') { setNotesOpen(false); return; }
      if (e.key === 'Tab') {
        const dialog = document.querySelector('[aria-label^="Source notes:"]');
        if (!dialog) return;
        const focusable = Array.from(
          dialog.querySelectorAll('button, [href], input, [tabindex]:not([tabindex="-1"])')
        ).filter(el => !el.disabled);
        if (!focusable.length) { e.preventDefault(); return; }
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [notesOpen]);

  const descId = title ? `chart-desc-${title.replace(/\s+/g, '-').toLowerCase()}` : undefined;

  function handleDetails() {
    openFlyout({
      kind: 'indicator',
      title, subtitle, source, sourceUrl, description,
      indicatorData, geoId, sectionLabel,
    });
  }

  function handleCardMouseEnter() {
    isHovered.current = true;
    window.__chp_hovered_card_open = handleDetails;
  }
  function handleCardMouseLeave() {
    isHovered.current = false;
    window.__chp_hovered_card_open = null;
  }

  // Press `e` while hovering a card to expand it
  useEffect(() => {
    function onKey(e) {
      if ((e.key === 'e' || e.key === 'E') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const tag = document.activeElement?.tagName?.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || document.activeElement?.isContentEditable) return;
        if (!isHovered.current) return;
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
        onMouseEnter={handleCardMouseEnter}
        onMouseLeave={handleCardMouseLeave}
      >
        {ariaDescription && (
          <p id={descId} className="sr-only">{ariaDescription}</p>
        )}

        {/* ── Card header ─────────────────────────────────────────────────── */}
        {/* Mobile: title stacks above buttons. Desktop: title + buttons in one row. */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3 px-4 sm:px-5 pt-4 sm:pt-5 pb-3">
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-gray-900 leading-snug">
              {title}
            </h4>
            {subtitle && (
              <p className="text-xs text-gray-500 mt-0.5 leading-snug">
                <SubtitleWithGlossary text={subtitle} />
              </p>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Expand icon — desktop only; on mobile the full-width chart is sufficient */}
            <button
              ref={expandBtnRef}
              onClick={() => setIsExpanded(true)}
              aria-label={`Expand chart: ${title}`}
              aria-haspopup="dialog"
              className="hidden sm:flex w-9 h-9 items-center justify-center rounded-md border border-gray-200 text-gray-400 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>

            {/* Details button — opens flyout */}
            <button
              onClick={handleDetails}
              aria-label={`Details about ${title}`}
              className="inline-flex items-center gap-1 h-8 sm:h-9 px-2.5 rounded-md border border-gray-200 text-xs font-medium text-gray-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 whitespace-nowrap"
            >
              Details
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Chart ───────────────────────────────────────────────────────── */}
        <div className="px-4 sm:px-5 pb-4">
          {(!indicatorData || indicatorData.length === 0) ? (
            <div
              className="w-full flex items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-200"
              style={{ minHeight: '175px' }}
              aria-label="No data available"
            >
              <p className="text-sm text-gray-400">No data available</p>
            </div>
          ) : (
            <VegaLiteChart spec={compactSpec} />
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div className="border-t border-gray-100 px-4 sm:px-5 py-3 flex flex-col gap-1.5 mt-auto">

          {/* Source row */}
          {sourceClean && (
            <div className="flex items-center gap-1.5">
              <p className="text-xs text-gray-500 leading-snug">
                <span className="font-medium text-gray-600">Source:</span> {sourceClean}
              </p>
              {hasNotes && (
                <button
                  onClick={() => setNotesOpen(true)}
                  aria-label="View source notes"
                  className="w-4 h-4 flex items-center justify-center rounded-full border border-gray-300 text-gray-400 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 shrink-0 text-xs font-semibold"
                >
                  ?
                </button>
              )}
            </div>
          )}

          {/* Similar indicators */}
          {relatedIndicators.length > 0 && (
            <p className="text-xs text-gray-500 leading-snug">
              <span className="font-medium text-gray-600">Similar:</span>{' '}
              {relatedIndicators.map((rel, i) => (
                <span key={rel.indicatorKey}>
                  <a
                    href={`#indicator-${rel.indicatorKey}`}
                    onClick={e => {
                      e.preventDefault();
                      document.getElementById(`indicator-${rel.indicatorKey}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                    className="text-blue-600 hover:text-blue-800 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 rounded"
                  >
                    {rel.title}
                  </a>
                  {i < relatedIndicators.length - 1 && <span className="text-gray-300 mx-1">|</span>}
                </span>
              ))}
            </p>
          )}
        </div>
      </div>

      {/* ── Notes modal ───────────────────────────────────────────────────── */}
      {notesOpen && (
        <div
          role="presentation"
          className="fixed inset-0 z-[3000] flex items-center justify-center p-3 sm:p-8"
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
              opacity:   notesVisible ? 1 : 0,
              transform: notesVisible ? 'scale(1)' : 'scale(0.97)',
              transition: 'opacity 180ms ease-out, transform 180ms ease-out',
            }}
          >
            <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-gray-100">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Source &amp; notes</h3>
                <p className="text-xs text-gray-500 mt-0.5">{title}</p>
              </div>
              <button
                onClick={() => setNotesOpen(false)}
                aria-label="Close notes"
                className="text-gray-400 hover:text-gray-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded ml-4"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-5 flex flex-col gap-4 overflow-y-auto">
              {sourceClean && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Data source</p>
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
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Notes</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Expanded chart modal ───────────────────────────────────────────── */}
      {isExpanded && (
        <div
          role="presentation"
          className="fixed inset-0 z-[2000] flex items-center justify-center p-3 sm:p-8"
          style={{
            backgroundColor: modalVisible ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0)',
            transition: 'background-color 200ms ease-out',
          }}
          onClick={e => { if (e.target === e.currentTarget) { setIsExpanded(false); expandBtnRef.current?.focus(); } }}
        >
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-label={`Expanded chart: ${title}`}
            className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
            style={{
              opacity:   modalVisible ? 1 : 0,
              transform: modalVisible ? 'scale(1)' : 'scale(0.96)',
              transition: 'opacity 200ms ease-out, transform 200ms ease-out',
            }}
          >
            <div className="flex items-start justify-between px-7 py-5 border-b border-gray-100 shrink-0 rounded-t-xl bg-white">
              <div>
                <h3 className="text-base font-semibold text-gray-900">{title}</h3>
                {subtitle && (
                  <p className="text-sm text-gray-500 mt-0.5">
                    <SubtitleWithGlossary text={subtitle} />
                  </p>
                )}
              </div>
              <button
                onClick={() => { setIsExpanded(false); expandBtnRef.current?.focus(); }}
                aria-label="Close expanded chart"
                className="ml-6 shrink-0 text-sm text-gray-500 hover:text-gray-700 border border-gray-300 hover:border-gray-400 rounded-md px-3 py-1.5 transition-colors"
              >
                Close ✕
              </button>
            </div>
            <div className="px-7 py-6 rounded-b-xl">
              {(!indicatorData || indicatorData.length === 0) ? (
                <div
                  className="w-full flex items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-200"
                  style={{ minHeight: '360px' }}
                  aria-label="No data available"
                >
                  <p className="text-sm text-gray-400">No data available</p>
                </div>
              ) : (
                <VegaLiteChart spec={expandedSpec} />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
