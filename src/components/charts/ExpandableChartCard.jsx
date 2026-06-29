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

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import VegaLiteChart from '@/components/charts/VegaLiteChart';
import { useFlyout } from '@/components/core/FlyoutShell';
import GlossaryTerm from '@/components/content/GlossaryTerm';
import { parseGlossaryTerms } from '@/lib/glossary';
import { useComparison } from '@/lib/context/ComparisonContext';
import { deriveBoroughRow } from '@/lib/charts/buildBarChartSpec';
import { SELECTED, COMPARISON, CITYWIDE, BOROUGH } from '@/lib/charts/chartColors';

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

// Strip trailing borough code from Geography strings, e.g. "Greenwich Village & Soho (MN2)" → "Greenwich Village & Soho"
function stripCdCode(name) {
  if (!name) return '';
  return name.replace(/ \([A-Z]{2}\d+\)$/, '');
}

// Builds the legend items array shared by the HTML legend and the canvas export.
function buildLegendItems(indicatorData, geoId, comparisonNeighborhood) {
  if (!indicatorData?.length) return [];
  const nycRow  = indicatorData.find(r => r.GeoType === 'Citywide');
  const borRow  = indicatorData.find(r => r.GeoType === 'Borough') ?? deriveBoroughRow(indicatorData, geoId);
  const cdRow   = geoId != null ? indicatorData.find(r => r.GeoID === geoId) : null;
  const compRow = comparisonNeighborhood?.geoId != null
    ? indicatorData.find(r => r.GeoID === comparisonNeighborhood.geoId)
    : null;
  return [
    nycRow  && { color: CITYWIDE,   label: 'Citywide',                     value: nycRow.DisplayValue  },
    borRow  && { color: BOROUGH,    label: borRow.Geography,               value: borRow.DisplayValue  },
    cdRow   && { color: SELECTED,   label: stripCdCode(cdRow.Geography),   value: cdRow.DisplayValue   },
    compRow && { color: COMPARISON, label: stripCdCode(compRow.Geography), value: compRow.DisplayValue },
  ].filter(Boolean);
}

// Column of colored circles rendered above the expanded chart.
function ExpandedChartLegend({ indicatorData, geoId, comparisonNeighborhood }) {
  const items = buildLegendItems(indicatorData, geoId, comparisonNeighborhood);
  if (!items.length) return null;

  return (
    <div className="px-7 pb-3 flex flex-col gap-1.5">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2 min-w-0">
          <span
            className="shrink-0 w-3 h-3 rounded-full"
            style={{ background: item.color }}
            aria-hidden="true"
          />
          <span className="text-xs text-gray-700 whitespace-nowrap">
            {item.label}
            {item.value && (
              <span className="text-gray-400 ml-1">· {item.value}</span>
            )}
          </span>
        </div>
      ))}
    </div>
  );
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
  const [isExpanded,     setIsExpanded]     = useState(false);
  const [modalVisible,   setModalVisible]   = useState(false);
  const [notesOpen,      setNotesOpen]      = useState(false);
  const [notesVisible,   setNotesVisible]   = useState(false);
  const [copyState,      setCopyState]      = useState('idle'); // 'idle' | 'copying' | 'copied' | 'error'
  const [embedOpen,      setEmbedOpen]      = useState(false);
  const [embedCopied,    setEmbedCopied]    = useState(false);

  const { open: openFlyout } = useFlyout();
  const { comparisonNeighborhood } = useComparison();
  const modalRef        = useRef(null);
  const notesDialogRef  = useRef(null);
  const embedDialogRef  = useRef(null);
  const embedBtnRef     = useRef(null);
  const expandBtnRef    = useRef(null);
  const isHovered       = useRef(false);
  const isFocused       = useRef(false); // keyboard focus is inside this card
  const expandedViewRef = useRef(null);  // captures Vega view from the expanded chart

  const handleExpandedViewReady = useCallback((view) => {
    expandedViewRef.current = view;
  }, []);

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
    const raf = requestAnimationFrame(() => modalRef.current?.querySelector('[data-modal-autofocus]')?.focus());
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
    // Move focus into the dialog on open
    const raf = requestAnimationFrame(() => {
      const first = notesDialogRef.current?.querySelector('button, [href], input, [tabindex]:not([tabindex="-1"])');
      first?.focus();
    });
    function onKey(e) {
      if (e.key === 'Escape') { setNotesOpen(false); return; }
      if (e.key === 'Tab' && notesDialogRef.current) {
        const focusable = Array.from(
          notesDialogRef.current.querySelectorAll('button, [href], input, [tabindex]:not([tabindex="-1"])')
        ).filter(el => !el.disabled);
        if (!focusable.length) { e.preventDefault(); return; }
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener('keydown', onKey);
    return () => { cancelAnimationFrame(raf); document.removeEventListener('keydown', onKey); };
  }, [notesOpen]);

  // ── Focus trap + Escape for embed modal ───────────────────────────────────
  useEffect(() => {
    if (!embedOpen) return;
    const raf = requestAnimationFrame(() => {
      const first = embedDialogRef.current?.querySelector('button, [href], input, [tabindex]:not([tabindex="-1"])');
      first?.focus();
    });
    function onKey(e) {
      if (e.key === 'Escape') { setEmbedOpen(false); embedBtnRef.current?.focus(); return; }
      if (e.key === 'Tab' && embedDialogRef.current) {
        const focusable = Array.from(
          embedDialogRef.current.querySelectorAll('button, [href], input, [tabindex]:not([tabindex="-1"])')
        ).filter(el => !el.disabled);
        if (!focusable.length) { e.preventDefault(); return; }
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener('keydown', onKey);
    return () => { cancelAnimationFrame(raf); document.removeEventListener('keydown', onKey); };
  }, [embedOpen]);

  const descId = title ? `chart-desc-${title.replace(/\s+/g, '-').toLowerCase()}` : undefined;

  function handleDetails() {
    openFlyout({
      kind: 'indicator',
      indicatorKey,
      title, subtitle, source, sourceUrl, description,
      indicatorData, geoId, sectionLabel,
    });
  }

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
          ctx.fillStyle = '#9CA3AF';
          ctx.fillText(` · ${item.value}`, tx + labelW, ty);
        }
      });
    }

    ctx.drawImage(img, 0, headerH + legendH);
    return canvas;
  }

  // ── Chart export actions (expanded modal) ─────────────────────────────────
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

  function getEmbedCode() {
    const base   = typeof window !== 'undefined' ? window.location.origin : '';
    const params = new URLSearchParams({ flyout: indicatorKey ?? '' });
    const src    = `${base}${typeof window !== 'undefined' ? window.location.pathname : ''}?${params}`;
    return `<iframe src="${src}" width="760" height="460" style="border:none;border-radius:12px;overflow:hidden;" title="${title}" loading="lazy"></iframe>`;
  }

  async function handleCopyEmbed() {
    try {
      await navigator.clipboard.writeText(getEmbedCode());
      setEmbedCopied(true);
      setTimeout(() => setEmbedCopied(false), 2000);
    } catch { /* ignore */ }
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
        {/* Mobile: title stacks above buttons. Desktop: title + buttons in one row. */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3 px-4 sm:px-5 pt-4 sm:pt-5 pb-3">
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-gray-900 leading-snug">
              {title}
            </h4>
            {subtitle && (
              <p className="text-xs text-gray-600 mt-0.5 leading-snug">
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
              title={`Details (i)`}
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
              <p className="text-sm text-gray-500">No data available</p>
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
              <p className="text-xs text-gray-600 leading-snug">
                <span className="font-medium text-gray-700">Source:</span> {sourceClean}
              </p>
              {hasNotes && (
                <button
                  onClick={() => setNotesOpen(true)}
                  aria-label="View source notes"
                  className="w-5 h-5 flex items-center justify-center rounded-full border border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 shrink-0 text-xs font-semibold"
                >
                  ?
                </button>
              )}
            </div>
          )}

          {/* Similar indicators */}
          {relatedIndicators.length > 0 && (
            <p className="text-xs text-gray-600 leading-snug">
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
            ref={notesDialogRef}
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

      {/* ── Expanded chart modal — rendered via portal at document.body so it
           sits above all stacking contexts (backdrop-filter, transform, etc.)
           created by layout ancestors (StickyContextBar, etc.)            ── */}
      {isExpanded && createPortal(
        <div
          role="presentation"
          className="fixed inset-0 z-[2000] flex items-center justify-center p-3 sm:p-8"
          style={{
            backgroundColor: modalVisible ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0)',
            transition: 'background-color 200ms ease-out',
          }}
          onClick={() => { setIsExpanded(false); expandBtnRef.current?.focus(); }}
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
            onClick={e => e.stopPropagation()}
          >
            {/* ── Modal header ─────────────────────────────────── */}
            <div className="flex items-start justify-between px-7 py-5 border-b border-gray-100 shrink-0 rounded-t-xl bg-white gap-4">
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-gray-900">{title}</h3>
                {subtitle && (
                  <p className="text-sm text-gray-600 mt-0.5">
                    <SubtitleWithGlossary text={subtitle} />
                  </p>
                )}
              </div>

              {/* Export actions + close — grouped: [Copy Download] | [Embed] | [Close] */}
              <div className="flex items-center gap-1.5 shrink-0">

                {/* Export group: Copy + Download share the same action family */}
                <div className="flex items-center gap-1">
                  {/* Copy image */}
                  <button
                    onClick={handleCopyImage}
                    aria-label="Copy chart as image"
                    title="Copy image"
                    className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-gray-200 text-xs font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 whitespace-nowrap"
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
                    className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-gray-200 text-xs font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 whitespace-nowrap"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download
                  </button>
                </div>

                <div className="w-px h-5 bg-gray-200 mx-0.5" aria-hidden="true" />

                {/* Embed — different action type: share/publish, not export */}
                <button
                  ref={embedBtnRef}
                  onClick={() => setEmbedOpen(true)}
                  aria-label="Embed chart"
                  title="Embed"
                  className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-gray-200 text-xs font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 whitespace-nowrap"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                  Embed
                </button>

                <div className="w-px h-5 bg-gray-200 mx-0.5" aria-hidden="true" />

                <button
                  onClick={() => { setIsExpanded(false); expandBtnRef.current?.focus(); }}
                  aria-label="Close expanded chart"
                  data-modal-autofocus
                  className="inline-flex items-center gap-1.5 h-8 px-3 text-sm text-gray-500 hover:text-gray-700 border border-gray-300 hover:border-gray-400 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 whitespace-nowrap"
                >
                  Close
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

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
                  aria-label="No data available"
                >
                  <p className="text-sm text-gray-500">No data available</p>
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
      )}

      {/* ── Embed code modal ──────────────────────────────────────────────── */}
      {embedOpen && createPortal(
        <div
          role="presentation"
          className="fixed inset-0 z-[3500] flex items-center justify-center p-3 sm:p-8"
          style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
          onClick={() => { setEmbedOpen(false); embedBtnRef.current?.focus(); }}
        >
          <div
            ref={embedDialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={`Embed chart: ${title}`}
            className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden"
          >
            <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-gray-100">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Embed chart</h3>
                <p className="text-xs text-gray-500 mt-0.5">{title}</p>
              </div>
              <button
                onClick={() => { setEmbedOpen(false); embedBtnRef.current?.focus(); }}
                aria-label="Close embed dialog"
                className="text-gray-400 hover:text-gray-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded ml-4"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-5 flex flex-col gap-4">
              <p className="text-xs text-gray-500 leading-relaxed">
                Paste this code into any webpage to embed this indicator. The chart will open a detailed flyout when clicked.
              </p>
              <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed select-all">
                {getEmbedCode()}
              </pre>
              <button
                onClick={handleCopyEmbed}
                className="self-start inline-flex items-center gap-2 h-8 px-4 rounded-md border border-gray-200 text-xs font-medium text-gray-600 hover:text-gray-900 hover:border-gray-300 hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                {embedCopied ? (
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
      )}
    </>
  );
}
