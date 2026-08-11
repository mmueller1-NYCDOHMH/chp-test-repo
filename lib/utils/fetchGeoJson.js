/**
 * FILE: /lib/utils/fetchGeoJson.js
 *
 * PURPOSE:
 * Module-level Promise cache for the NYC community district GeoJSON.
 *
 * WHY:
 * NeighborhoodMap, ModalMap, and ChoroplethMap all need the same GeoJSON
 * (~350 kB). Without a cache, opening any combination of these (e.g. sidebar
 * map + indicator flyout choropleth) triggers three separate network fetches
 * for the same file. The cache ensures the file is fetched once per browser
 * session and the Promise is shared across all callers.
 *
 * HOW:
 * A module-level variable holds the in-flight (or resolved) Promise. Any
 * subsequent call to fetchGeoJson() before the first resolves receives the
 * same Promise; calls after resolution receive the already-resolved Promise.
 * The cache is reset on error so a retry button can trigger a fresh fetch.
 *
 * USAGE:
 *   import { fetchGeoJson } from '@/lib/utils/fetchGeoJson';
 *   const geo = await fetchGeoJson();
 */

import { GEOJSON_URL } from '@/lib/utils/constants';

let cachedPromise = null;

/**
 * Returns a Promise that resolves to the parsed GeoJSON FeatureCollection.
 * Fetches once and reuses the result for all subsequent calls.
 */
export function fetchGeoJson() {
  if (!cachedPromise) {
    cachedPromise = fetch(GEOJSON_URL)
      .then(r => {
        if (!r.ok) throw new Error(`GeoJSON fetch failed: ${r.status}`);
        return r.json();
      })
      .catch(err => {
        // Clear cache on failure so callers can retry
        cachedPromise = null;
        throw err;
      });
  }
  return cachedPromise;
}

/**
 * Explicitly clears the cache. Call this when a retry is needed after an error.
 * Normally you don't need to call this — fetchGeoJson() clears on error automatically.
 */
export function clearGeoJsonCache() {
  cachedPromise = null;
}
