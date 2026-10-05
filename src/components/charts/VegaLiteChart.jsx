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
import messages from '../../../content/site/messages.json';

// React.memo prevents Vega from rebuilding when parent client components
// re-render (e.g. comparison context changes) but pass the same spec reference.
// Since specs are built in server components and serialized once, their object
// identity is stable across client re-renders, so shallow comparison is sufficient.
/**
 * A11Y (2026-09-27, axe svg-img-alt — ~85 hits per neighborhood page):
 * Vega exposes every mark group inside the chart <svg> as its own unnamed
 * "graphics-symbol" (spec config.aria:false doesn't reach layered marks).
 * Instead, the chart wrapper becomes ONE image (role="img") with a short
 * name taken from the spec's `description` (built in buildBarChartSpec.js:
 * title, subtitle, "Bar chart of NYC community districts."), and the <svg>
 * inside it is aria-hidden, so screen readers get a single, named chart.
 * The full text alternative (range, citywide, selected neighborhood) is
 * still ExpandableChartCard's sr-only description on the card itself.
 * Re-applied on resize because Vega can rebuild the <svg>.
 */
function labelChartSvg(container, label) {
  if (!container) return;
  // The vega-embed wrapper (our container div) is the one named image…
  container.setAttribute('role', 'img');
  container.setAttribute('aria-label', label || container.getAttribute('aria-label') || 'Chart');
  container.removeAttribute('aria-roledescription');
  // …and the drawing inside it is hidden, so its mark groups (which Vega
  // tags role="graphics-symbol" with no name) aren't exposed at all.
  const svg = container.querySelector('svg');
  if (svg) {
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
  }
}

/**
 * TOOLTIP DISMISSAL (2026-10-05):
 * Vega treats touch as hover — a finger passing over a chart while
 * scrolling the page fires its tooltip, and since a touchscreen never sends
 * a "mouse left" event, the tooltip (position: fixed, appended to <body>)
 * then stayed stuck on screen with no way to close it. Installed once for
 * the whole page:
 *   - While anything is scrolling, <html> gets .chp-scrolling, which hides
 *     the tooltip (globals.css) so it can't flash up mid-swipe; when the
 *     scroll settles the tooltip is closed for good.
 *   - Tapping/clicking anywhere outside a chart closes it.
 * A deliberate tap on a bar (no scrolling) still shows the tooltip.
 */
let tooltipDismissInstalled = false;
function installTooltipDismiss() {
  if (tooltipDismissInstalled || typeof window === 'undefined') return;
  tooltipDismissInstalled = true;
  const hide = () => document.getElementById('vg-tooltip-element')?.classList.remove('visible');
  let timer = null;
  const onScroll = () => {
    document.documentElement.classList.add('chp-scrolling');
    clearTimeout(timer);
    timer = setTimeout(() => {
      hide();
      document.documentElement.classList.remove('chp-scrolling');
    }, 200);
  };
  // capture: scroll doesn't bubble, and this also catches inner scrollers
  // (expanded-chart modal, flyout).
  document.addEventListener('scroll', onScroll, { passive: true, capture: true });
  document.addEventListener('pointerdown', (e) => {
    if (!e.target?.closest?.('.vega-embed')) hide();
  }, { passive: true, capture: true });
}

const VegaLiteChart = memo(function VegaLiteChart({ spec, tooltip = true, onViewReady }) {
  const containerRef  = useRef(null);
  const wrapperRef    = useRef(null);
  const viewRef       = useRef(null);
  const vegaReadyRef  = useRef(false); // true once vega-embed resolves
  const inViewRef     = useRef(false); // true once element is in the viewport
  const enteredRef    = useRef(false); // mirrors hasEntered — readable in async callbacks
  const [hasEntered, setHasEntered] = useState(false);
  const [embedError, setEmbedError] = useState(false);
  const outerRef = useRef(null);
  // PERF (2026-09-29): don't compile/render the Vega view until the chart is
  // near the viewport. A neighborhood page has ~50 charts; embedding them all
  // on mount (each one a Vega-Lite compile + SVG render) blocked the main
  // thread for seconds on load, mostly for charts far below the fold. The
  // 800px margin starts rendering well before the chart scrolls into view,
  // so it's normally ready by the time it's seen. Charts in modals/flyouts
  // are already on screen, so they render right away. Hidden charts
  // (display:none — e.g. mobile category pages) render when first shown.
  const [nearView, setNearView] = useState(false);

  useEffect(() => {
    const el = outerRef.current;
    if (!el || nearView) return;
    if (typeof IntersectionObserver === 'undefined') { setNearView(true); return; }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          observer.disconnect();
          setNearView(true);
        }
      },
      { rootMargin: '800px 0px' }
    );
    observer.observe(el);
    // Printing the page directly should still include every chart.
    const onBeforePrint = () => setNearView(true);
    window.addEventListener('beforeprint', onBeforePrint);
    return () => {
      observer.disconnect();
      window.removeEventListener('beforeprint', onBeforePrint);
    };
  }, [nearView]);

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

  useEffect(() => { if (tooltip) installTooltipDismiss(); }, [tooltip]);

  useEffect(() => {
    if (!containerRef.current || !spec || !nearView) return;

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
          // A11Y: one named image instead of dozens of unnamed mark groups
          const a11yLabel = spec?.description;
          labelChartSvg(containerRef.current, a11yLabel);
          try {
            result.view.addResizeListener(() => labelChartSvg(containerRef.current, a11yLabel));
          } catch { /* older vega: no resize event */ }
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
  }, [spec, nearView]);

  if (embedError) {
    return (
      <div
        className="w-full flex items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-200"
        style={{ minHeight: '175px' }}
        // A11Y (2026-09-26): a render failure used to show the same "No data
        // available" copy as a genuinely empty chart, so a broken load read as
        // missing data. Distinct copy now, and a no-role div's aria-label
        // (which assistive tech ignores) replaced by real text.
      >
        <p className="text-sm text-gray-600">{messages.chartLoadError}</p>
      </div>
    );
  }

  return (
    <div ref={outerRef} className="relative min-w-0" style={{ minHeight: '175px' }}>
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
