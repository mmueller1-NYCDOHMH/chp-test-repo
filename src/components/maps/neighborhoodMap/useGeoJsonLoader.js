import { useState, useCallback, useEffect } from 'react';
import { fetchGeoJson, clearGeoJsonCache } from '@/lib/utils/fetchGeoJson';

/**
 * FILE: useGeoJsonLoader.js
 *
 * Loads react-leaflet's components (browser only — see the WHY DYNAMIC
 * IMPORT note in NeighborhoodMap.jsx for why this can't be a static
 * import) and the shared CD GeoJSON (via the module-level cache in
 * fetchGeoJson, so the network request happens once per session
 * regardless of how many map instances mount). Also guards against
 * rendering the map during a React Strict Mode double-invocation cycle.
 * Part of the 2026-09-04 split of NeighborhoodMap.jsx.
 */
export function useGeoJsonLoader() {
  const [leaflet,    setLeaflet]    = useState(null);
  const [geo,        setGeo]        = useState(null);
  const [geoError,   setGeoError]   = useState(false);
  const [mapVisible, setMapVisible] = useState(false);

  // fetchGeoJson() returns the same Promise across all map instances so the
  // network request is made only once per session. clearGeoJsonCache() on error
  // lets the retry button trigger a fresh fetch.
  const fetchGeo = useCallback(() => {
    setGeoError(false);
    fetchGeoJson()
      .then(setGeo)
      .catch(() => { clearGeoJsonCache(); setGeoError(true); });
  }, []);

  // ── Load Leaflet + GeoJSON (browser only) ────────────────────────────────
  // Leaflet CSS is loaded globally in layout.js (import 'leaflet/dist/leaflet.css').
  useEffect(() => {
    import('react-leaflet').then((mod) => {
      setLeaflet({
        MapContainer: mod.MapContainer,
        TileLayer:    mod.TileLayer,
        GeoJSON:      mod.GeoJSON,
      });
    });

    fetchGeo();
  }, [fetchGeo]);

  // ── Guard against React Strict Mode double-invocation ────────────────────
  useEffect(() => {
    setMapVisible(true);
    return () => setMapVisible(false);
  }, []);

  return { leaflet, geo, geoError, mapVisible, fetchGeo };
}
