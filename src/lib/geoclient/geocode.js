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
 *   Returns [{ label, neighborhood }] (up to MAX_RESULTS entries) for the
 *   address search dropdown — never throws. Addresses outside the 59
 *   districts (parks, airports) or outside NYC are skipped.
 *
 * QA rows 7/10/26 (2026-10-12): the dropdown used to show ONE suggestion
 * from /search, which is a full-address geocoder — partial input like
 * "163 west 85" matched "85 West 163 St" as readily as the right address.
 * Now /autocomplete (prefix matching, built for typing) and /search (fuzzy,
 * catches inputs autocomplete can't parse yet, e.g. "163 west 8") run in
 * parallel; autocomplete hits come first, duplicates are dropped, and up to
 * MAX_RESULTS are shown so the right address is usually in the list early.
 */

import { fetchGeoJson } from '@/lib/utils/fetchGeoJson';

const GEOSEARCH_BASE = 'https://geosearch.planninglabs.nyc/v2';
const MAX_RESULTS = 5;

/** GeoSearch features for one endpoint ('autocomplete' | 'search'); [] on any failure. */
async function fetchFeatures(endpoint, text) {
  try {
    const url = new URL(`${GEOSEARCH_BASE}/${endpoint}`);
    url.searchParams.set('text', text);
    url.searchParams.set('size', '10');
    const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
    if (!res.ok) return [];
    const body = await res.json();
    return body?.features ?? [];
  } catch {
    return [];
  }
}

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
    const [auto, fuzzy, geo] = await Promise.all([
      fetchFeatures('autocomplete', text),
      fetchFeatures('search', text),
      fetchGeoJson(),
    ]);

    const results = [];
    const seen = new Set();
    for (const feature of [...auto, ...fuzzy]) {
      if (results.length >= MAX_RESULTS) break;
      const [lng, lat] = feature?.geometry?.coordinates ?? [];
      if (typeof lng !== 'number' || typeof lat !== 'number') continue;

      const p = feature.properties ?? {};
      const label = [p.name, p.borough].filter(Boolean).join(', ') || p.label || text;
      const dedupeKey = label.toLowerCase();
      if (seen.has(dedupeKey)) continue;

      const geoId = findDistrictGeoId(lng, lat, geo);
      const nbhd = geoId != null ? neighborhoods.find(n => n.geoId === geoId) : null;
      if (!nbhd) continue;

      seen.add(dedupeKey);
      results.push({ label, neighborhood: nbhd });
    }
    return results;
  } catch {
    return [];
  }
}
