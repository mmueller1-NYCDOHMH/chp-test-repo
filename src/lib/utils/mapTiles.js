/**
 * FILE: /lib/utils/mapTiles.js
 *
 * PURPOSE:
 * Single source of truth for the Leaflet basemap tiles used across all
 * three map components (NeighborhoodMap, ChoroplethMap, ModalMap).
 *
 * WHY (2026-09-01):
 * CARTO's basemaps.cartocdn.com now requires an API key, and the key that
 * had been configured here (NEXT_PUBLIC_CARTO_API_KEY) was being rejected
 * by CARTO in both local dev and production — every map showed the
 * repeated "API key required" watermark instead of clean tiles, regardless
 * of environment. Rather than depend on a CARTO account/key at all, this
 * now points at Esri's "Light Gray Canvas" basemap
 * (server.arcgisonline.com/.../Canvas/World_Light_Gray_*), which requires
 * no API key or signup and is visually very close to the CARTO Positron
 * look this app was designed around: the same muted, minimal light-gray
 * base.
 *
 * Esri ships this basemap as two separate tile layers, which conveniently
 * maps onto the exact split this file already had:
 *   - World_Light_Gray_Base: the plain light-gray base map, no labels.
 *     Used alone by ChoroplethMap (TILE_URL_BASE) so street/place names
 *     don't clutter the color-filled districts — same reasoning as the old
 *     CARTO "light_nolabels" tile.
 *   - World_Light_Gray_Reference: place/street labels only, transparent
 *     background. Stack this ON TOP of TILE_URL_BASE (as a second Leaflet
 *     tile layer) wherever labels are wanted — NeighborhoodMap and
 *     ModalMap both do this to reproduce the old CARTO "light_all" look.
 *
 * NOTE ON {r} (retina/@2x tiles): CARTO's endpoint supported a {r} suffix
 * for high-DPI screens; Esri's classic REST tile service does not, so
 * these URLs have no {r}.
 *
 * NOTE ON {s} subdomains: CARTO/OSM round-robin across lettered
 * subdomains; Esri serves from a single host, so there's no {s} in these
 * URLs. TILE_SUBDOMAINS has been removed — it used to be exported as
 * `undefined` "for back-compat", but passing `subdomains={undefined}`
 * explicitly to react-leaflet's <TileLayer> overrides Leaflet's own
 * internal default ('abc') instead of leaving it alone. Leaflet's
 * TileLayer only normalizes `options.subdomains` when it's a string
 * (`typeof options.subdomains === 'string'`); left as `undefined` it stays
 * `undefined`, and the first tile request crashes on
 * `this.options.subdomains.length`. Call sites should simply not pass a
 * `subdomains` prop at all for these Esri URLs.
 */

const ESRI_CANVAS =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas';

// Base layer only, no labels — used alone by ChoroplethMap, and as the
// bottom layer wherever labels are shown too (see TILE_URL_LABELS).
export const TILE_URL_BASE = `${ESRI_CANVAS}/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}`;

// Back-compat name: ChoroplethMap already imports TILE_URL_LIGHT_NOLABELS.
export const TILE_URL_LIGHT_NOLABELS = TILE_URL_BASE;

// Labels-only overlay (transparent PNG) — stack this as a second tile
// layer on top of TILE_URL_BASE to reproduce the old "light_all" (base +
// labels) look. There is no single combined-URL equivalent with Esri, so
// callers that want labels must render both layers.
export const TILE_URL_LABELS = `${ESRI_CANVAS}/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}`;

export const TILE_ATTRIBUTION =
  'Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors, and the GIS community';
