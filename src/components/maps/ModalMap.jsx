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
import { GEOJSON_URL } from '@/lib/utils/constants';

const NYC_CENTER = [40.7128, -74.006];
const NYC_ZOOM   = 10;
const CD_ZOOM    = 13;

// ── Style definitions ──────────────────────────────────────────────────────
const BASE_STYLE     = { color: '#6b7280', weight: 1,   fillColor: '#e5e7eb', fillOpacity: 0.5 };
const HOVER_STYLE    = { color: '#111827', weight: 2,   fillColor: '#c7d2fe', fillOpacity: 0.75 };
const SELECTED_STYLE = { color: '#1d4ed8', weight: 2.5, fillColor: '#93c5fd', fillOpacity: 0.8 };

export default function ModalMap({ neighborhoods = [], hoveredId, onSelect, onHover }) {
  const containerRef    = useRef(null);  // DOM node for the Leaflet map
  const mapRef          = useRef(null);  // L.Map instance
  const layerRefs       = useRef({});   // { slugifiedName: L.Path } per feature

  // Keep callback refs stable so closures inside useEffect never go stale
  const neighborhoodsRef = useRef(neighborhoods);
  const onSelectRef      = useRef(onSelect);
  const onHoverRef       = useRef(onHover);
  const hoveredIdRef     = useRef(hoveredId);

  useEffect(() => { neighborhoodsRef.current = neighborhoods; }, [neighborhoods]);
  useEffect(() => { onSelectRef.current = onSelect; },         [onSelect]);
  useEffect(() => { onHoverRef.current = onHover; },           [onHover]);
  useEffect(() => { hoveredIdRef.current = hoveredId; },       [hoveredId]);

  // ── Initialise Leaflet map (runs once) ────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    let mapInstance;

    Promise.all([
      import('leaflet'),
      fetch(GEOJSON_URL).then(r => r.json()),
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

      // Helper: compute current style for a feature id
      function styleFor(fid) {
        if (fid === hoveredIdRef.current) return HOVER_STYLE;
        return BASE_STYLE;
      }

      L.geoJSON(geo, {
        style: (feature) => styleFor(slugify(feature.properties.GEONAME)),

        onEachFeature(feature, layer) {
          const fid      = slugify(feature.properties.GEONAME);
          const cleanName = feature.properties.GEONAME
            .replace(/\s*\(CD\d+\)/i, '').trim();

          // Store ref so we can update styles externally
          layerRefs.current[fid] = layer;

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

  // ── Sync highlight styles when hoveredId prop changes ─────────────────────
  useEffect(() => {
    Object.entries(layerRefs.current).forEach(([fid, layer]) => {
      if (!layer?.setStyle) return;
      if (fid === hoveredId) {
        layer.setStyle(HOVER_STYLE);
        layer.bringToFront();
      } else {
        layer.setStyle(BASE_STYLE);
      }
    });
  }, [hoveredId]);

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
