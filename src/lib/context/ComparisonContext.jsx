'use client';

/**
 * FILE: ComparisonContext.jsx
 *
 * PURPOSE:
 * Global context for two independent comparison systems:
 *
 *   1. Benchmark comparison (existing)
 *      comparison: 'citywide' | 'borough' | 'none'
 *      Controls which aggregate reference line/bar appears in charts.
 *      URL: ?compare=citywide
 *
 *   2. Neighborhood comparison (new)
 *      comparisonNeighborhood: { id, name, geoId } | null
 *      A second community district highlighted amber in every bar chart.
 *      URL: ?compareTo=bay-ridge
 *      Event: chp:comparison-changed { geoId: number | null }
 *
 * USAGE:
 *   const { comparison, setComparison } = useComparison();
 *   const { comparisonNeighborhood, setComparisonNeighborhood } = useComparison();
 *
 * NOTES:
 * - Client component — uses useState + context
 * - ComparisonProvider accepts a `neighborhoods` prop used only for
 *   hydrating comparisonNeighborhood from the URL on mount.
 * - Wrap the page tree once in PageLayout (inside FlyoutShell).
 */

import { createContext, useContext, useMemo, useState, useEffect, useCallback } from 'react';

const VALID_VALUES    = ['citywide', 'borough', 'none'];
const DEFAULT_VALUE   = 'citywide';
const URL_PARAM       = 'compare';
const COMPARE_TO_PARAM = 'compareTo';

const ComparisonContext = createContext(null);

export function useComparison() {
  const ctx = useContext(ComparisonContext);
  if (!ctx) throw new Error('useComparison must be used within <ComparisonProvider>');
  return ctx;
}

export function ComparisonProvider({ children, neighborhoods = [] }) {
  const [comparison,             _setComparison]             = useState(DEFAULT_VALUE);
  const [comparisonNeighborhood, _setComparisonNeighborhood] = useState(null);

  // ── Clear comparison on mobile viewports ────────────────────────────────
  // Comparison charts (amber highlight alongside blue) are unreadable at
  // narrow widths. Clear on mount if already mobile, and on resize crossing
  // the md breakpoint (768px).
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');

    function clearOnMobile(e) {
      if (e.matches) {
        _setComparisonNeighborhood(null);
        const url = new URL(window.location.href);
        url.searchParams.delete(COMPARE_TO_PARAM);
        history.replaceState(null, '', url.toString());
      }
    }

    // Run immediately in case we're already on mobile
    clearOnMobile(mq);
    mq.addEventListener('change', clearOnMobile);
    return () => mq.removeEventListener('change', clearOnMobile);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Hydrate both values from URL on mount ─────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    // Benchmark comparison
    const compareParam = params.get(URL_PARAM);
    if (compareParam && VALID_VALUES.includes(compareParam)) {
      _setComparison(compareParam);
    }

    // Neighborhood comparison — resolve slug → full object
    const compareTo = params.get(COMPARE_TO_PARAM);
    if (compareTo && neighborhoods.length > 0) {
      const n = neighborhoods.find(nb => String(nb.id) === compareTo);
      if (n) {
        _setComparisonNeighborhood({ id: n.id, name: n.name, geoId: n.geoId });
        // Don't dispatch the event here — VegaLiteChart's useEffect will
        // pick up the value from the context after it re-renders, and the
        // embed callback reads compGeoIdRef which is kept in sync.
      }
    }
  }, [neighborhoods]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Benchmark comparison setter ───────────────────────────────────────
  const setComparison = useCallback((value) => {
    if (!VALID_VALUES.includes(value)) return;
    _setComparison(value);
    const url = new URL(window.location.href);
    if (value === DEFAULT_VALUE) {
      url.searchParams.delete(URL_PARAM);
    } else {
      url.searchParams.set(URL_PARAM, value);
    }
    history.replaceState(null, '', url.toString());
  }, []);

  // ── Neighborhood comparison setter ────────────────────────────────────
  const setComparisonNeighborhood = useCallback((neighborhood) => {
    const next = neighborhood ?? null;
    _setComparisonNeighborhood(next);

    // Broadcast to all mounted VegaLiteChart instances so they can update
    // the comparisonGeoId signal without rebuilding the spec.
    window.dispatchEvent(new CustomEvent('chp:comparison-changed', {
      detail: { geoId: next?.geoId ?? null },
    }));

    // URL sync
    const url = new URL(window.location.href);
    if (next) {
      url.searchParams.set(COMPARE_TO_PARAM, next.id);
    } else {
      url.searchParams.delete(COMPARE_TO_PARAM);
    }
    history.replaceState(null, '', url.toString());
  }, []);

  const value = useMemo(
    () => ({ comparison, setComparison, comparisonNeighborhood, setComparisonNeighborhood }),
    [comparison, setComparison, comparisonNeighborhood, setComparisonNeighborhood]
  );

  return (
    <ComparisonContext.Provider value={value}>
      {children}
    </ComparisonContext.Provider>
  );
}
