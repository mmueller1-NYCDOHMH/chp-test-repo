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
import { useEffect, useRef, useState, memo } from 'react';
import { useComparison } from '@/lib/context/ComparisonContext';

// React.memo prevents Vega from rebuilding when parent client components
// re-render (e.g. comparison context changes) but pass the same spec reference.
// Since specs are built in server components and serialized once, their object
// identity is stable across client re-renders, so shallow comparison is sufficient.
const VegaLiteChart = memo(function VegaLiteChart({ spec, tooltip = true, onViewReady }) {
  const containerRef  = useRef(null);
  const wrapperRef    = useRef(null);
  const viewRef       = useRef(null);
  const vegaReadyRef  = useRef(false); // true once vega-embed resolves
  const inViewRef     = useRef(false); // true once element is in the viewport
  const enteredRef    = useRef(false); // mirrors hasEntered — readable in async callbacks
  const [hasEntered, setHasEntered] = useState(false);
  const [embedError, setEmbedError] = useState(false);

  // ── Entrance animation ────────────────────────────────────────────────────
  // Gate on BOTH the element being in view AND Vega having finished rendering.
  // This prevents two failure modes:
  //   1. Fading in an empty box (Vega hasn't drawn yet)
  //   2. No visible transition (IntersectionObserver fires before the browser
  //      has painted the initial opacity:0 state)
  // Double RAF guarantees the invisible state is committed to the screen before
  // we flip to visible, so the CSS transition always plays.
  // enteredRef is used instead of hasEntered because async callbacks (IntersectionObserver,
  // vega-embed .then()) capture stale closure values of useState variables.
  function tryEnterAnimation() {
    if (vegaReadyRef.current && inViewRef.current && !enteredRef.current) {
      enteredRef.current = true;
      requestAnimationFrame(() => requestAnimationFrame(() => setHasEntered(true)));
    }
  }

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          inViewRef.current = true;
          observer.disconnect();
          tryEnterAnimation();
        }
      },
      { threshold: 0.05 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
          // Notify parent so it can capture the view for image export, etc.
          onViewReady?.(result.view);
          // Signal that Vega has rendered — try to start the entrance animation.
          // If the element is already in view, this triggers it immediately.
          // If it's still off-screen, the IntersectionObserver will trigger it later.
          vegaReadyRef.current = true;
          tryEnterAnimation();
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
        <p className="text-sm text-gray-500">No data available</p>
      </div>
    );
  }

  return (
    <div className="relative min-w-0" style={{ minHeight: '175px' }}>
      {/* Skeleton — visible while vega-embed loads and animates in.
          Sits behind the chart wrapper so the fade-in transition plays
          over it rather than over blank white space. */}
      {!hasEntered && (
        <div
          className="absolute inset-0 rounded-lg bg-gray-100 animate-pulse"
          aria-hidden="true"
        />
      )}

      <div
        ref={wrapperRef}
        className="min-w-0"
        style={{
          opacity:    hasEntered ? 1 : 0,
          transform:  hasEntered ? 'translateY(0)' : 'translateY(10px)',
          transition: 'opacity 450ms ease-out, transform 450ms ease-out',
        }}
      >
        <div ref={containerRef} className="w-full min-w-0 overflow-hidden" />
      </div>
    </div>
  );
});

export default VegaLiteChart;
