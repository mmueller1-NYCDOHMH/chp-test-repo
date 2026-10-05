/**
 * FILE: /lib/geoclient/geocode.js
 *
 * PURPOSE:
 * Address -> neighborhood lookup, entirely in the browser (no server, no key).
 *
 * HOW (2026-10-02 — replaces the /api/geocode Geoclient proxy so the site can
 * be built as static files):
 *   1. NYC Planning's GeoSearch (https://geosearch.planninglabs.nyc) turns the
 *      typed address into a point. It is keyless, so nothing secret ships.
 *   2. The point is matched against the community district polygons in
 *      CD.geojson — the same file (and cached fetch) the maps already use.
 *
 * The folder is still named "geoclient" only to keep existing imports working.
 *
 * searchAddresses(query, neighborhoods)
 *   Returns [{ label, neighborhood }] (0 or 1 entries) for the address search
 *   dropdown — never throws. An address outside the 59 districts (parks,
 *   airports) or outside NYC returns [].
 */

import { fetchGeoJson } from '@/lib/utils/fetchGeoJson';

const GEOSEARCH_URL = 'https://geosearch.planninglabs.nyc/v2/search';

/** Even-odd ray cast over every ring, so holes are excluded correctly. */
function pointInRings(lng, lat, rings) {
  let inside = false;
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }
  }
  return inside;
}

/**
 * Numeric GEOCODE (e.g. 105) of the district containing the point, or null.
 *
 * @param {number} lng
 * @param {number} lat
 * @param {object} geo — CD.geojson FeatureCollection
 */
export function findDistrictGeoId(lng, lat, geo) {
  for (const f of geo?.features ?? []) {
    const g = f.geometry;
    if (!g) continue;
    const polygons = g.type === 'Polygon' ? [g.coordinates]
      : g.type === 'MultiPolygon' ? g.coordinates
      : [];
    if (polygons.some(rings => pointInRings(lng, lat, rings))) {
      return parseInt(f.properties?.GEOCODE, 10);
    }
  }
  return null;
}

/**
 * @param {string} query          — partial or full address typed by the user
 * @param {Array}  neighborhoods  — full neighborhoods array from getNeighborhoods()
 * @returns {Promise<Array<{ label: string, neighborhood: object }>>}
 */
export async function searchAddresses(query, neighborhoods) {
  const text = query?.trim();
  if (!text || text.length < 3) return [];

  try {
    const url = new URL(GEOSEARCH_URL);
    url.searchParams.set('text', text);
    url.searchParams.set('size', '5');

    const [res, geo] = await Promise.all([
      fetch(url.toString(), { headers: { Accept: 'application/json' } }),
      fetchGeoJson(),
    ]);
    if (!res.ok) return [];

    const body = await res.json();

    // Best match first; take the first one that lands inside a district.
    for (const feature of body?.features ?? []) {
      const [lng, lat] = feature?.geometry?.coordinates ?? [];
      if (typeof lng !== 'number' || typeof lat !== 'number') continue;

      const geoId = findDistrictGeoId(lng, lat, geo);
      const nbhd = geoId != null ? neighborhoods.find(n => n.geoId === geoId) : null;
      if (!nbhd) continue;

      const p = feature.properties ?? {};
      const label = [p.name, p.borough].filter(Boolean).join(', ') || p.label || text;
      return [{ label, neighborhood: nbhd }];
    }
    return [];
  } catch {
    return [];
  }
}
