import { useCallback, useEffect, useRef } from 'react';
import { slugify } from '@/lib/utils/slugify';
import { baseStyle, selectedStyle, comparisonStyle, computeBounds, CD_ZOOM } from './mapStyles';

/**
 * FILE: useMapSelectionSync.js
 *
 * Keeps the map's visual selection state in sync with the active
 * (selectedId) and comparison (comparisonId) community districts:
 *   - selectedIdRef/comparisonIdRef mirror the latest values so event
 *     handlers registered once (in useMapHoverInteractions) never read a
 *     stale closure.
 *   - initialStyle is a stable style() callback for the GeoJSON layer's
 *     first mount — reads from the refs above so it's always current
 *     without ever changing reference (react-leaflet calls setStyle() on
 *     every feature whenever the `style` prop reference changes, which
 *     would wipe any hover highlight Leaflet is applying directly).
 *   - The fly-to-fit effect pans/zooms to the selected (and comparison)
 *     district's bounds whenever they change.
 *   - The imperative style-update effect re-applies fill styles across all
 *     features via geoLayerRef.eachLayer() (the layer itself is never
 *     remounted) and clears hoveredLayerRef, since navigation resets hover
 *     state.
 *   - handleRecenter snaps the map back to the selected CD's bounds.
 * Part of the 2026-09-04 split of NeighborhoodMap.jsx.
 */
export function useMapSelectionSync({ leaflet, geo, selectedId, comparisonId, mapRef, geoLayerRef, hoveredLayerRef }) {
  // Refs so event handlers (registered once on mount) always read current values
  const selectedIdRef   = useRef(selectedId);
  const comparisonIdRef = useRef(comparisonId);

  useEffect(() => { selectedIdRef.current   = selectedId;   }, [selectedId]);
  useEffect(() => { comparisonIdRef.current = comparisonId; }, [comparisonId]);

  // Stable style function for the initial GeoJSON mount. Reads from refs so it
  // is always current, but its reference never changes. This is critical:
  // react-leaflet calls setStyle() on ALL features whenever the `style` prop
  // reference changes, which would wipe any hover highlight set by Leaflet
  // directly. A stable reference prevents that re-application on re-render.
  const initialStyle = useCallback((feature) => {
    const fid = slugify(feature.properties.GEONAME);
    const sid = selectedIdRef.current;
    const cid = comparisonIdRef.current;
    if (sid && sid !== 'undefined' && fid === sid) return selectedStyle();
    if (cid && cid !== 'undefined' && fid === cid) return comparisonStyle();
    return baseStyle();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fly to fit selected (and comparison) neighborhood(s) ─────────────────
  useEffect(() => {
    if (!leaflet || !geo || !selectedId || selectedId === 'undefined') return;

    const raf = requestAnimationFrame(() => {
      const map = mapRef.current;
      if (!map) return;

      const primaryFeature = geo.features.find(
        f => slugify(f.properties.GEONAME) === selectedId
      );
      if (!primaryFeature) return;

      const primaryBounds = computeBounds(primaryFeature.geometry);
      if (!primaryBounds) return;

      if (comparisonId && comparisonId !== 'undefined') {
        const compFeature = geo.features.find(
          f => slugify(f.properties.GEONAME) === comparisonId
        );
        const compBounds = compFeature ? computeBounds(compFeature.geometry) : null;

        if (compBounds) {
          const combined = [
            [Math.min(primaryBounds[0][0], compBounds[0][0]), Math.min(primaryBounds[0][1], compBounds[0][1])],
            [Math.max(primaryBounds[1][0], compBounds[1][0]), Math.max(primaryBounds[1][1], compBounds[1][1])],
          ];
          map.fitBounds(combined, { padding: [32, 32], maxZoom: CD_ZOOM });
          return;
        }
      }

      map.fitBounds(primaryBounds, { padding: [24, 24], maxZoom: CD_ZOOM });
    });

    return () => cancelAnimationFrame(raf);
  }, [geo, selectedId, comparisonId, leaflet]);

  // ── Imperative style update ───────────────────────────────────────────────
  useEffect(() => {
    const layer = geoLayerRef.current;
    if (!layer || !geo) return;
    // Clear any lingering hover ref — navigation resets the hover state.
    hoveredLayerRef.current = null;
    layer.eachLayer(l => {
      const fid = slugify(l.feature.properties.GEONAME);
      if (selectedId && selectedId !== 'undefined' && fid === selectedId) {
        l.setStyle(selectedStyle());
      } else if (comparisonId && comparisonId !== 'undefined' && fid === comparisonId) {
        l.setStyle(comparisonStyle());
      } else {
        l.setStyle(baseStyle());
      }
    });
  }, [selectedId, comparisonId, geo]);

  // ── Re-center on selected CD ──────────────────────────────────────────────
  function handleRecenter() {
    const map = mapRef.current;
    if (!map || !geo || !selectedId) return;
    const feature = geo.features.find(f => slugify(f.properties.GEONAME) === selectedId);
    if (!feature) return;
    const bounds = computeBounds(feature.geometry);
    if (bounds) map.fitBounds(bounds, { padding: [24, 24], maxZoom: CD_ZOOM });
  }

  return { selectedIdRef, comparisonIdRef, initialStyle, handleRecenter };
}
