'use client';

/**
 * FILE: VegaLiteChart.jsx
 *
 * PURPOSE:
 * Client-side wrapper that renders a Vega-Lite v5 spec using vega-embed.
 *
 * DESCRIPTION:
 * Receives a fully-built spec object and renders it into a DOM container.
 * All spec construction happens in buildBarChartSpec.js — this component
 * is purely a rendering boundary between server and browser.
 *
 * NOTES:
 * - Must be a client component ("use client") because vega-embed
 *   requires DOM access.
 * - Uses dynamic import to keep vega-embed out of the server bundle.
 * - Cleans up the Vega view on unmount to prevent memory leaks.
 * - spec changes trigger a full re-render (view is finalized and rebuilt).
 */
import { useEffect, useRef, useState } from 'react';
import { useComparison } from '@/lib/context/ComparisonContext';

export default function VegaLiteChart({ spec, tooltip = true }) {
  const containerRef = useRef(null);
  const viewRef      = useRef(null);
  const [embedError, setEmbedError] = useState(false);

  // Track the current comparison geoId in a ref so the embed callback
  // (async) can read it without capturing a stale closure value.
  const { comparisonNeighborhood } = useComparison();
  const compGeoIdRef = useRef(comparisonNeighborhood?.geoId ?? null);

  // Keep the ref in sync and drive the signal on runtime changes.
  useEffect(() => {
    compGeoIdRef.current = comparisonNeighborhood?.geoId ?? null;
    const view = viewRef.current;
    if (!view) return;
    try {
      view.signal('comparisonGeoId', compGeoIdRef.current).run();
    } catch { /* signal may not exist in specs built before this change */ }
  }, [comparisonNeighborhood]);

  // Listen for sidebar-map hover events and drive the hoverGeoId Vega signal.
  // This highlights the hovered bar across all visible charts without
  // rebuilding or remounting the spec.
  useEffect(() => {
    function onMapHover(e) {
      const view = viewRef.current;
      if (!view) return;
      try {
        // null resets all bars to gray; a geoId lights up the matching bar
        view.signal('hoverGeoId', e.detail.geoId ?? null).run();
      } catch {
        // Signal may not exist in specs built before this change — fail silently
      }
    }

    window.addEventListener('chp:map-hover', onMapHover);
    return () => window.removeEventListener('chp:map-hover', onMapHover);
  }, []); // viewRef.current is always current; no deps needed

  useEffect(() => {
    if (!containerRef.current || !spec) return;

    setEmbedError(false);
    let cancelled = false;

    import('vega-embed').then(({ default: embed }) => {
      if (cancelled || !containerRef.current) return;

      // Finalize any existing view before creating a new one
      if (viewRef.current) {
        viewRef.current.finalize();
        viewRef.current = null;
      }

      embed(containerRef.current, spec, {
        actions: false,
        renderer: 'svg',
        tooltip,
      }).then((result) => {
        if (!cancelled) {
          viewRef.current = result.view;
          // Apply comparison highlight immediately after mounting.
          // compGeoIdRef may already be set if the context hydrated from the
          // URL before this async embed completed.
          if (compGeoIdRef.current !== null) {
            try {
              result.view.signal('comparisonGeoId', compGeoIdRef.current).run();
            } catch { /* signal may not exist in older specs */ }
          }
        } else {
          result.view.finalize();
        }
      }).catch((err) => {
        if (!cancelled) {
          console.error('[VegaLiteChart] embed error:', err);
          setEmbedError(true);
        }
      });
    });

    return () => {
      cancelled = true;
      if (viewRef.current) {
        viewRef.current.finalize();
        viewRef.current = null;
      }
    };
  }, [spec]);

  if (embedError) {
    return (
      <div
        className="w-full flex items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-200"
        style={{ minHeight: '175px' }}
        aria-label="Chart unavailable"
      >
        <p className="text-sm text-gray-400">No data available</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full"
    />
  );
}
