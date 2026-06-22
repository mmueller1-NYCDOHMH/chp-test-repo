'use client';

/**
 * FILE: IndicatorFlyoutContent.jsx
 *
 * PURPOSE:
 * Body content for the indicator "Details" flyout panel.
 *
 * LAYOUT (top to bottom):
 *   1. Indicator name + subtitle                  ← above the map
 *   2. Choropleth map with color legend overlaid  ← legend floats bottom-left of map
 *   3. Dynamic insight (CD vs citywide)
 *   4. Distribution strip                         ← subtle box treatment
 *   5. Description (if provided)
 *   6. Source row — inline text + ? notes modal   ← no "Data Source" label
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { buildInsight } from '@/lib/utils/compareIndicator';
import DistributionStrip from '@/components/data-display/DistributionStrip';

const ChoroplethMap = dynamic(
  () => import('@/components/maps/ChoroplethMap'),
  {
    ssr: false,
    loading: () => <div className="h-full w-full bg-gray-100 animate-pulse" />,
  }
);

const DIRECTION_STYLES = {
  up:      { badge: 'bg-red-50 text-red-700 border-red-200',       arrow: '↑' },
  down:    { badge: 'bg-green-50 text-green-700 border-green-200', arrow: '↓' },
  neutral: { badge: 'bg-gray-100 text-gray-500 border-gray-200',   arrow: '~' },
};

function cleanSource(source) {
  if (!source) return '';
  return source.replace(/^source:\s*/i, '');
}

export default function IndicatorFlyoutContent({
  title,
  subtitle,
  source,
  sourceUrl,
  description,
  indicatorData,
  geoId,
  sectionLabel,
}) {
  const insight  = buildInsight(indicatorData, geoId, title);
  const [mapHoveredGeoId,   setMapHoveredGeoId]   = useState(null);
  const [stripHoveredGeoId, setStripHoveredGeoId] = useState(null);

  // ── Notes modal ────────────────────────────────────────────────────────────
  const [notesOpen,    setNotesOpen]    = useState(false);
  const [notesVisible, setNotesVisible] = useState(false);

  useEffect(() => {
    if (notesOpen) {
      const raf = requestAnimationFrame(() => setNotesVisible(true));
      return () => cancelAnimationFrame(raf);
    } else {
      setNotesVisible(false);
    }
  }, [notesOpen]);

  useEffect(() => {
    if (!notesOpen) return;
    function onKey(e) { if (e.key === 'Escape') setNotesOpen(false); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [notesOpen]);

  const sourceClean = cleanSource(source);
  const hasNotes    = !!(description || sourceUrl);

  return (
    <>
      <div className="overflow-y-auto flex-1 min-h-0 overscroll-contain">

        {/* ── 1. Section label + subtitle (above map) ──────────────────────── */}
        {(sectionLabel || subtitle) && (
          <div className="px-5 pt-3 pb-2 flex flex-col gap-0.5">
            {sectionLabel && (
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                {sectionLabel}
              </p>
            )}
            {subtitle && (
              <p className="text-xs text-gray-500 leading-snug">{subtitle}</p>
            )}
          </div>
        )}

        {/* ── 2. Map with color legend overlaid ────────────────────────────── */}
        <div className="flyout-map relative w-full h-[220px] sm:h-[340px] overflow-hidden border-y border-gray-100">
          {/* Mobile scroll-through overlay — sits above the map on touch devices
              so finger drags scroll the flyout instead of being eaten by Leaflet.
              Hidden on sm+ where mouse hover interactions work normally.          */}
          <div className="sm:hidden absolute inset-0 z-[1001]" aria-hidden="true" />
          <ChoroplethMap
            indicatorData={indicatorData ?? []}
            subtitle={subtitle}
            onHoverGeoId={setMapHoveredGeoId}
            stripHoveredGeoId={stripHoveredGeoId}
          />
          {/* Color legend — floats over map, bottom-left */}
          <div className="absolute bottom-3 left-3 z-[1000] flex items-center gap-1.5 bg-white/90 backdrop-blur-sm rounded-md px-2 py-1.5 shadow-sm border border-gray-200 pointer-events-none select-none">
            <span className="text-xs text-gray-500">Low</span>
            <div className="flex h-2 rounded overflow-hidden w-16">
              {['#dbeafe', '#93c5fd', '#60a5fa', '#2563eb', '#1e3a8a'].map((c, i) => (
                <div key={i} className="flex-1" style={{ backgroundColor: c }} />
              ))}
            </div>
            <span className="text-xs text-gray-500">High</span>
          </div>
        </div>

        <div className="px-5 pt-4 pb-5 flex flex-col gap-4">

          {/* ── 3. Dynamic insight ──────────────────────────────────────────── */}
          {insight && (() => {
            const { badge, arrow } = DIRECTION_STYLES[insight.direction];
            return (
              <div className="flex flex-col gap-1.5">
                <p className="text-sm text-gray-700 leading-relaxed">
                  In {insight.name}, {insight.title.toLowerCase()} is{' '}
                  <span className="font-semibold text-gray-900">{insight.cdDisplay}</span>.
                </p>
                <p className="text-sm text-gray-500 leading-relaxed">
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border mr-1.5 ${badge}`}
                    aria-label={`${insight.label} citywide`}
                  >
                    <span aria-hidden="true">{arrow}</span> {insight.label}
                  </span>
                  the citywide rate of {insight.cityDisplay}.
                </p>
              </div>
            );
          })()}

          {/* ── 4. Distribution strip — boxed ───────────────────────────────── */}
          {indicatorData?.length > 0 && (
            <div className="border border-gray-200 rounded-lg bg-gray-50 px-4 py-3.5">
              <DistributionStrip
                indicatorData={indicatorData}
                geoId={geoId}
                mapHoveredGeoId={mapHoveredGeoId}
                onHoverGeoId={setStripHoveredGeoId}
              />
            </div>
          )}

          {/* ── 5. Source row — no label, inline ? button ───────────────────── */}
          {sourceClean && (
            <div className="flex items-center gap-1.5 pt-1 border-t border-gray-100">
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

        </div>
      </div>

      {/* ── Notes modal ─────────────────────────────────────────────────────── */}
      {notesOpen && (
        <div
          role="presentation"
          className="fixed inset-0 z-[3000] flex items-center justify-center p-8"
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
              opacity:    notesVisible ? 1 : 0,
              transform:  notesVisible ? 'scale(1)' : 'scale(0.97)',
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
    </>
  );
}
