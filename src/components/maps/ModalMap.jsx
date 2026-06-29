'use client';

/**
 * FILE: ModalMap.jsx
 *
 * PURPOSE:
 * An interactive Leaflet map of NYC community districts, purpose-built for
 * use inside the IntroModal neighborhood picker.
 *
 * DESCRIPTION:
 * Behaviorally similar to NeighborhoodMap but designed for a prop-driven,
 * modal context rather than a URL-driven, sidebar context:
 *
 *   - selectedId / hoveredId come in as props, not from useParams()
 *   - Clicking a district calls onSelect(neighborhood) rather than navigating
 *   - onHover(id | null) lets the parent sync list-hover state with map highlights
 *   - No expand button (the modal itself is the expanded view)
 *
 * WHY VANILLA LEAFLET (not react-leaflet):
 * The GeoJSON layer is created once via L.geoJSON() and its feature layers are
 * stored in a ref map. When hoveredId or selectedId change, we call
 * layer.setStyle() directly on the stored refs — no React re-render, no
 * remounting of the GeoJSON component, no tile-cache flush.
 *
 * WHY DYNAMIC IMPORT:
 * Same reason as NeighborhoodMap — Leaflet accesses `window` at module
 * evaluation time. Importing it inside useEffect keeps it out of the SSR
 * bundle entirely. Leaflet CSS is imported once in layout.js.
 *
 * PROPS:
 * - neighborhoods: Array<{ id, name, borough }> — used for onSelect lookup
 * - hoveredId:  string | null — feature slug to highlight (from list hover)
 * - onSelect:   (neighborhood) => void — called on map feature click
 * - onHover:    (id | null) => void   — called on map feature mouseover/out
 */
import { useEffect, useRef } from 'react';
import { slugify } from '@/lib/utils/slugify';
import { MODAL_MAP_STYLES, BOROUGH_PALETTE } from '@/lib/charts/chartColors';
import { fetchGeoJson } from '@/lib/utils/fetchGeoJson';

const NYC_CENTER = [40.7128, -74.006];
const NYC_ZOOM   = 10;
const CD_ZOOM    = 13;

// ── Style definitions — sourced from chartColors.js ────────────────────────
const BASE_STYLE     = MODAL_MAP_STYLES.base;
const HOVER_STYLE    = MODAL_MAP_STYLES.hover;
const SELECTED_STYLE = MODAL_MAP_STYLES.selected;

export default function ModalMap({ neighborhoods = [], hoveredId, visitedIds, onSelect, onHover }) {
  const containerRef    = useRef(null);  // DOM node for the Leaflet map
  const mapRef          = useRef(null);  // L.Map instance
  const layerRefs       = useRef({});   // { slugifiedName: L.Path } per feature
  // geoId lookup: slugifiedName → numeric geocode (needed for borough color)
  const geoIdRefs       = useRef({});

  // Keep callback refs stable so closures inside useEffect never go stale
  const neighborhoodsRef = useRef(neighborhoods);
  const onSelectRef      = useRef(onSelect);
  const onHoverRef       = useRef(onHover);
  const hoveredIdRef     = useRef(hoveredId);
  const visitedIdsRef    = useRef(visitedIds);

  useEffect(() => { neighborhoodsRef.current = neighborhoods; }, [neighborhoods]);
  useEffect(() => { onSelectRef.current = onSelect; },           [onSelect]);
  useEffect(() => { onHoverRef.current = onHover; },             [onHover]);
  useEffect(() => { hoveredIdRef.current = hoveredId; },         [hoveredId]);
  useEffect(() => { visitedIdsRef.current = visitedIds; },       [visitedIds]);

  // ── Initialise Leaflet map (runs once) ────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    let mapInstance;

    Promise.all([
      import('leaflet'),
      fetchGeoJson(),
    ]).then(([leafletModule, geo]) => {
      if (cancelled || !containerRef.current) return;

      const L = leafletModule.default ?? leafletModule;

      mapInstance = L.map(containerRef.current, {
        center:           NYC_CENTER,
        zoom:             NYC_ZOOM,
        scrollWheelZoom:  true,
        zoomControl:      true,
      });

      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        { attribution: '&copy; OpenStreetMap contributors &copy; CARTO' }
      ).addTo(mapInstance);

      // Helper: compute visited-CD borough style given a numeric geoId.
      function visitedStyle(geoId) {
        const boroughKey = geoId ? Math.floor(geoId / 100) : null;
        const palette    = boroughKey ? BOROUGH_PALETTE[boroughKey] : null;
        return palette
          ? { ...BASE_STYLE, fillColor: palette.fill, color: palette.stroke, weight: 1.5, fillOpacity: 0.55 }
          : null;
      }

      // Style function for initial layer creation.
      // Reads geoId directly from the feature because onEachFeature (which populates
      // geoIdRefs) hasn't run yet at this point — Leaflet calls style() before
      // onEachFeature() for each feature, so the ref lookup would always miss.
      function initialStyleFor(feature) {
        const fid = slugify(feature.properties.GEONAME);
        if (fid === hoveredIdRef.current) return HOVER_STYLE;
        if (visitedIdsRef.current?.has(fid)) {
          const style = visitedStyle(parseInt(feature.properties.GEOCODE, 10));
          if (style) return style;
        }
        return BASE_STYLE;
      }

      // Style function for event handlers (mouseover/mouseout).
      // At that point geoIdRefs is fully populated, so ref lookup is safe.
      function styleFor(fid) {
        if (fid === hoveredIdRef.current) return HOVER_STYLE;
        if (visitedIdsRef.current?.has(fid)) {
          const style = visitedStyle(geoIdRefs.current[fid]);
          if (style) return style;
        }
        return BASE_STYLE;
      }

      L.geoJSON(geo, {
        style: initialStyleFor,

        onEachFeature(feature, layer) {
          const fid      = slugify(feature.properties.GEONAME);
          const cleanName = feature.properties.GEONAME
            .replace(/\s*\(CD\d+\)/i, '').trim();

          // Store refs so we can update styles externally
          layerRefs.current[fid] = layer;
          geoIdRefs.current[fid] = parseInt(feature.properties.GEOCODE, 10);

          layer.bindTooltip(cleanName, { sticky: true, className: 'chp-map-tooltip' });

          layer.on('mouseover', () => {
            layer.setStyle(HOVER_STYLE);
            layer.bringToFront();
            onHoverRef.current?.(fid);
          });

          layer.on('mouseout', () => {
            layer.setStyle(styleFor(fid));
            onHoverRef.current?.(null);
          });

          layer.on('click', () => {
            const n = neighborhoodsRef.current.find(nb => nb.id === fid);
            if (n) onSelectRef.current?.(n);
          });
        },
      }).addTo(mapInstance);

      mapRef.current = mapInstance;
    });

    return () => {
      cancelled = true;
      if (mapInstance) mapInstance.remove();
      layerRefs.current = {};
      mapRef.current    = null;
    };
  }, []); // intentionally empty — map is created once

  // ── Sync highlight styles when hoveredId or visitedIds prop changes ─────────
  useEffect(() => {
    Object.entries(layerRefs.current).forEach(([fid, layer]) => {
      if (!layer?.setStyle) return;
      if (fid === hoveredId) {
        layer.setStyle(HOVER_STYLE);
        layer.bringToFront();
      } else if (visitedIds?.has(fid)) {
        const geoId      = geoIdRefs.current[fid];
        const boroughKey = geoId ? Math.floor(geoId / 100) : null;
        const palette    = boroughKey ? BOROUGH_PALETTE[boroughKey] : null;
        layer.setStyle(palette
          ? { ...BASE_STYLE, fillColor: palette.fill, color: palette.stroke, weight: 1.5, fillOpacity: 0.55 }
          : BASE_STYLE
        );
      } else {
        layer.setStyle(BASE_STYLE);
      }
    });
  }, [hoveredId, visitedIds]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="relative w-full h-full">
      {/* Loading skeleton shown until Leaflet is ready */}
      <div className="absolute inset-0 bg-gray-100 animate-pulse rounded-r-2xl" />
      {/* Leaflet mounts into this div */}
      <div ref={containerRef} className="absolute inset-0" />
    </div>
  );
}
