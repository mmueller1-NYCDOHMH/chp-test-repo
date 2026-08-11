'use client';

/**
 * FILE: ChoroplethMap.jsx
 *
 * PURPOSE:
 * Choropleth Leaflet map that colors each NYC community district by the
 * value of a given indicator.
 *
 * DESCRIPTION:
 * Accepts a flat array of indicator records (one per CD) and a GeoJSON of
 * all 59 CDs. Each feature is colored on a sequential blue scale based on
 * where its value falls between the dataset min and max, EXCEPT the
 * selected and comparison CDs, which get a solid semantic fill (SELECTED /
 * COMPARISON from chartColors.js) instead of their value-scale color, so
 * they're findable at a glance rather than blending into the gradient.
 * Hovering shows a tooltip with the district name and its value, and fires
 * onHoverGeoId so sibling components (e.g. DistributionStrip) can react.
 *
 * The map is display-only — dragging, zooming, and clicking are all disabled.
 *
 * COLOR SCALE:
 * Linear interpolation across 5 steps from light blue (#dbeafe) to
 * dark blue (#1e3a8a), computed per-feature at render time from the
 * dataset min/max.
 *
 * PROPS:
 *   indicatorData  — array of { GeoID, Value, Geography, DisplayValue }
 *                    Only CD-level rows are used (GeoType === 'CD')
 *   subtitle       — unit label shown in the legend (e.g. "% below poverty")
 *   geoId          — numeric GeoID of the primary/selected neighborhood.
 *                    Compared directly against each feature's parsed
 *                    GEOCODE (see NOTES) rather than slug-matching against
 *                    the route param — slug matching was fragile (silently
 *                    fell through to the value-scale color on any mismatch)
 *                    and comparisonGeoId already uses numeric GeoID, so this
 *                    keeps both consistent.
 *   onHoverGeoId   — optional (geoId: number | null) => void, fired on CD hover
 *
 * NOTES:
 * - onHoverGeoId is stored in a ref so Leaflet's event handlers always call
 *   the latest version even though onEachFeature is only called once at layer
 *   creation time.
 * - GeoJSON GEOCODE is a string; indicator GeoID is a number — parsed on join
 */

import { useEffect, useRef, useState } from 'react';
import { CHOROPLETH_STOPS, MAP_STYLES, SELECTED, COMPARISON } from '@/lib/charts/chartColors';
import { fetchGeoJson } from '@/lib/utils/fetchGeoJson';

const NYC_CENTER = [40.7128, -74.006];
const NYC_ZOOM   = 10;
const NYC_ZOOM_MOBILE = 9.3; // slightly more zoomed out below 767px
const MOBILE_BREAKPOINT = 767;

const COLOR_STOPS = CHOROPLETH_STOPS;

function valueToColor(t) {
  if (t <= 0) return COLOR_STOPS[0];
  if (t >= 1) return COLOR_STOPS[COLOR_STOPS.length - 1];
  const scaled = t * (COLOR_STOPS.length - 1);
  const lo     = Math.floor(scaled);
  const hi     = Math.ceil(scaled);
  const frac   = scaled - lo;
  return blendHex(COLOR_STOPS[lo], COLOR_STOPS[hi], frac);
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function blendHex(a, b, t) {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const r  = Math.round(ar + (br - ar) * t);
  const g  = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${bl.toString(16).padStart(2,'0')}`;
}

export default function ChoroplethMap({ indicatorData = [], geoId = null, onHoverGeoId, stripHoveredGeoId = null, comparisonGeoId = null }) {
  const [leaflet, setLeaflet]     = useState(null);
  const [geo, setGeo]             = useState(null);
  const [geoError, setGeoError]   = useState(false);
  const [zoom, setZoom]           = useState(NYC_ZOOM); // default to desktop; corrected on mount

  // Keep stable refs so Leaflet event handlers never go stale
  const onHoverGeoIdRef      = useRef(onHoverGeoId);
  const stripHoveredGeoIdRef = useRef(stripHoveredGeoId);
  const comparisonGeoIdRef   = useRef(comparisonGeoId);
  const geoJsonLayerRef      = useRef(null); // holds the Leaflet GeoJSON layer instance

  useEffect(() => { onHoverGeoIdRef.current = onHoverGeoId; }, [onHoverGeoId]);

  // When the strip hover changes, imperatively restyle all features
  useEffect(() => {
    stripHoveredGeoIdRef.current = stripHoveredGeoId;
    if (!geoJsonLayerRef.current) return;
    geoJsonLayerRef.current.eachLayer(layer => {
      if (layer.feature) layer.setStyle(featureStyle(layer.feature));
    });
  // featureStyle is recreated each render so omit from deps — the ref values are current
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stripHoveredGeoId]);

  // When comparison neighborhood changes, imperatively restyle all features
  useEffect(() => {
    comparisonGeoIdRef.current = comparisonGeoId;
    if (!geoJsonLayerRef.current) return;
    geoJsonLayerRef.current.eachLayer(layer => {
      if (layer.feature) layer.setStyle(featureStyle(layer.feature));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comparisonGeoId]);

  // Build a GeoID → value lookup from CD-level rows only
  const valueMap = {};
  let minVal = Infinity, maxVal = -Infinity;
  indicatorData
    .filter(r => r.GeoType === 'CD')
    .forEach(r => {
      valueMap[r.GeoID] = r;
      if (r.Value < minVal) minVal = r.Value;
      if (r.Value > maxVal) maxVal = r.Value;
    });
  const range = maxVal - minVal || 1;

  // ── Load Leaflet + GeoJSON ────────────────────────────────────────────────
  // Leaflet CSS is loaded globally in layout.js (import 'leaflet/dist/leaflet.css').
  useEffect(() => {
    import('react-leaflet').then(mod => {
      setLeaflet({ MapContainer: mod.MapContainer, TileLayer: mod.TileLayer, GeoJSON: mod.GeoJSON, useMap: mod.useMap });
    });

    fetchGeoJson()
      .then(setGeo)
      .catch(() => setGeoError(true));
  }, []);

  // ── Responsive zoom ──────────────────────────────────────────────────────
  // Leaflet reads zoom only once on mount, so MapContainer needs a `key` tied
  // to the breakpoint to force it to re-init if the viewport crosses 767px
  // (e.g. device rotation) rather than silently ignoring the new zoom prop.
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    const applyZoom = () => setZoom(mql.matches ? NYC_ZOOM_MOBILE : NYC_ZOOM);
    applyZoom();
    mql.addEventListener('change', applyZoom);
    return () => mql.removeEventListener('change', applyZoom);
  }, []);

  // ── Style helpers ─────────────────────────────────────────────────────────
  function featureStyle(feature) {
    const featureGeoId   = parseInt(feature.properties.GEOCODE, 10);
    const row            = valueMap[featureGeoId];
    const isSelected     = geoId != null && geoId === featureGeoId;
    const isComparison   = comparisonGeoIdRef.current != null && comparisonGeoIdRef.current === featureGeoId;
    const isStripHovered = stripHoveredGeoIdRef.current === featureGeoId;

    return {
      // Selected CD is now a solid fill (like comparison) rather than a
      // value-colored fill with just a highlight border — makes it findable
      // at a glance instead of blending into the choropleth gradient.
      fillColor:   isSelected     ? SELECTED     // same purple used for the primary CD everywhere else
                 : isComparison   ? COMPARISON   // same rust used for comparison CD everywhere else
                 : row            ? valueToColor((row.Value - minVal) / range)
                 :                  MAP_STYLES.base.fillColor,
      // Selected/comparison fillOpacity is high (0.75) rather than fully
      // opaque — keeps a touch of translucency but avoids the wash-out that
      // happened at lower opacities (e.g. 5646F5 reading as pale lavender at
      // 0.35 over the CartoDB light basemap).
      fillOpacity: isSelected     ? 0.75
                 : isComparison   ? 0.75
                 : row            ? (isStripHovered ? 1 : 0.82)
                 :                  0.3,
      color:       isSelected     ? SELECTED
                 : isComparison   ? COMPARISON
                 : isStripHovered ? '#111827'
                 :                  '#9ca3af',
      weight:      isSelected ? 2 : isComparison ? 1 : isStripHovered ? 2 : 0.8,
    };
  }

  function onEachFeature(feature, layer) {
    const featureGeoId = parseInt(feature.properties.GEOCODE, 10);
    const row          = valueMap[featureGeoId];
    const cleanName    = feature.properties.GEONAME.replace(/\s*\(CD\d+\)/i, '').trim();
    const label        = row ? `${cleanName}: ${row.DisplayValue ?? row.Value}` : cleanName;

    layer.bindTooltip(label, { sticky: true });

    layer.on('mouseover', () => {
      layer.setStyle({ weight: 2, color: '#111827', fillOpacity: 1 });
      layer.bringToFront();
      onHoverGeoIdRef.current?.(featureGeoId);
    });
    layer.on('mouseout', () => {
      layer.setStyle(featureStyle(feature));
      onHoverGeoIdRef.current?.(null);
    });

    // Suppress all click interactions
    layer.on('click', e => e.originalEvent.stopPropagation());
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (geoError || (!indicatorData.filter(r => r.GeoType === 'CD').length && leaflet)) {
    return (
      <div className="h-full w-full bg-gray-50 flex flex-col items-center justify-center gap-2 text-center px-6">
        <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503-10.498 4.875 2.437a.75.75 0 0 1 .374.65v8.163a.75.75 0 0 1-1.127.65L15 18.13l-4.5 2.25-4.5-2.25-3.125 1.563A.75.75 0 0 1 2 18.98v-8.163a.75.75 0 0 1 .374-.65L7.25 7.73l4.5 2.25 4.5-2.25-.497-.498Z" />
        </svg>
        <p className="text-sm text-gray-500">Map unavailable</p>
        <p className="text-xs text-gray-500">Could not load geographic data</p>
      </div>
    );
  }

  if (!leaflet) return <div className="h-full w-full bg-gray-100 animate-pulse" />;

  const { MapContainer, TileLayer, GeoJSON, useMap } = leaflet;


  return (
    <div className="relative h-full w-full overflow-hidden">
      <MapContainer
        key={zoom}
        center={NYC_CENTER}
        zoom={zoom}
        scrollWheelZoom={false}
        touchZoom={false}
        dragging={false}
        tap={false}
        zoomControl={false}
        attributionControl={false}
        className="w-full h-full"
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
        />
        {geo && (
          <GeoJSON
            key={geoId ?? 'none'}
            data={geo}
            style={featureStyle}
            onEachFeature={onEachFeature}
            ref={layer => { geoJsonLayerRef.current = layer; }}
          />
        )}
      </MapContainer>
    </div>
  );
}
