'use client';

/**
 * FILE: NeighborhoodMap.jsx
 *
 * PURPOSE:
 * Interactive Leaflet map of NYC community districts.
 *
 * WHY DYNAMIC IMPORT:
 * Leaflet accesses `window` at module-evaluation time. With Turbopack,
 * even a `next/dynamic` wrapper with `ssr: false` can include the module
 * in the SSR bundle during static analysis, causing "window is not defined"
 * crashes on the server.
 *
 * The only reliable fix is to NEVER import react-leaflet/leaflet statically.
 * All Leaflet modules are imported inside `useEffect` so Turbopack can't
 * include them in the SSR bundle. Leaflet CSS is imported once in layout.js.
 *
 * MAP BEHAVIOR:
 * - fitBounds pans and zooms to the selected CD on selection change.
 * - GeoJSON layer uses a stable key and is never remounted; styles are updated
 *   imperatively via geoLayerRef.eachLayer(). Event handlers read selection
 *   state from refs to avoid stale closures.
 * - Expand modal inherits the current center/zoom rather than resetting to NYC.
 * - Re-center button snaps back to the selected CD after manual pan/zoom.
 * - Hover overlay shows district name inline over the map (short viewport fix).
 * - touchstart dispatches chp:map-hover so MapHoverTooltip works on mobile.
 * - On mouseout, selected/comparison layers are re-raised so they're never
 *   covered by an adjacent hovered district.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'next/navigation';
import { slugify } from '@/lib/utils/slugify';
import { useComparison } from '@/lib/context/ComparisonContext';
import { MAP_STYLES, BOROUGH_PALETTE, MAP_USER_PIN } from '@/lib/charts/chartColors';
import { fetchGeoJson, clearGeoJsonCache } from '@/lib/utils/fetchGeoJson';

// ── Style helpers — defined outside component so they're never re-created ─────
// Keeping these out of render is important: initialStyle (below) is a stable
// useCallback that reads from refs. If style helpers were inside the component,
// initialStyle would need them in its deps and lose stability.
function baseStyle()       { return { ...MAP_STYLES.base,       color: '#4b5563' }; }
function hoverStyle()      { return { ...MAP_STYLES.hover }; }
function selectedStyle()   { return { ...MAP_STYLES.selected }; }
function comparisonStyle() { return { ...MAP_STYLES.comparison }; }

const NYC_CENTER = [40.7128, -74.006];
const NYC_ZOOM   = 10;
const CD_ZOOM    = 13;

function computeBounds(geometry) {
  const coords = [];
  if (geometry.type === 'Polygon') {
    geometry.coordinates[0].forEach(c => coords.push(c));
  } else if (geometry.type === 'MultiPolygon') {
    geometry.coordinates.forEach(poly => poly[0].forEach(c => coords.push(c)));
  }
  if (!coords.length) return null;
  const lats = coords.map(c => c[1]);
  const lngs = coords.map(c => c[0]);
  return [
    [Math.min(...lats), Math.min(...lngs)],
    [Math.max(...lats), Math.max(...lngs)],
  ];
}

export default function NeighborhoodMap({ onSelect }) {
  const [leaflet,          setLeaflet]          = useState(null);
  const [geo,              setGeo]              = useState(null);
  const [geoError,         setGeoError]         = useState(false);
  const [isExpanded,       setIsExpanded]       = useState(false);
  const [mapVisible,       setMapVisible]       = useState(false);
  const [modalInitialView, setModalInitialView] = useState(null);
  const [hoveredDistrict,  setHoveredDistrict]  = useState(null);
  // One-time hint surfacing the map↔chart hover sync feature
  const [showMapHint,      setShowMapHint]      = useState(false);

  const mapHintShownRef   = useRef(false); // tracks whether hint has been dismissed this session

  const mapRef            = useRef(null); // Leaflet L.Map instance
  const geoLayerRef       = useRef(null); // main map GeoJSON layer group
  const hoveredLayerRef   = useRef(null); // currently hovered Leaflet layer
  const hoveredSetRef     = useRef(new Set()); // tracks districts hovered this session
  const achievementFired  = useRef(false);     // ensures achievement fires once

  const params                     = useParams();
  const selectedId                 = params?.id ? String(params.id) : null;
  const { comparisonNeighborhood } = useComparison();
  const comparisonId               = comparisonNeighborhood?.id ?? null;

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

  // ── GeoJSON fetch — uses shared module-level cache ───────────────────────
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

  // ── Show first-visit hint for map↔chart hover sync ────────────────────────
  useEffect(() => {
    try {
      if (!localStorage.getItem('chp_map_hint_seen')) setShowMapHint(true);
    } catch { /* localStorage unavailable */ }
  }, []);

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

  function onEachFeature(feature, layer) {
    const fid          = slugify(feature.properties.GEONAME);
    const featureGeoId = parseInt(feature.properties.GEOCODE, 10);
    const cleanName    = feature.properties.GEONAME.replace(/\s*\(CD\d+\)/i, '').trim();

    layer.on('mouseover', () => {
      // Reset the previously hovered layer before styling this one.
      // Without this, rapid mouse movement or synthetic events from bringToFront()
      // can leave multiple districts stuck in hoverStyle simultaneously.
      const prev = hoveredLayerRef.current;
      if (prev && prev !== layer) {
        const prevFid = slugify(prev.feature.properties.GEONAME);
        const sid = selectedIdRef.current;
        const cid = comparisonIdRef.current;
        if (sid && prevFid === sid)      prev.setStyle(selectedStyle());
        else if (cid && prevFid === cid) prev.setStyle(comparisonStyle());
        else                             prev.setStyle(baseStyle());
      }
      hoveredLayerRef.current = layer;
      layer.setStyle(hoverStyle());
      layer.bringToFront();
      setHoveredDistrict({ name: cleanName });

      // Dismiss first-visit hint on first interaction
      if (!mapHintShownRef.current) {
        mapHintShownRef.current = true;
        setShowMapHint(false);
        try { localStorage.setItem('chp_map_hint_seen', '1'); } catch { /* ignore */ }
      }
      window.dispatchEvent(new CustomEvent('chp:map-hover', {
        detail: { geoId: featureGeoId, name: cleanName },
      }));

      // All-59 achievement: track every distinct district hovered
      if (!achievementFired.current) {
        hoveredSetRef.current.add(fid);
        if (geo && hoveredSetRef.current.size >= geo.features.length) {
          achievementFired.current = true;
          window.dispatchEvent(new CustomEvent('chp:all-explored'));

          // ── Borough wave animation ──────────────────────────────────────
          // Each borough lights up in its own colour sequentially, then all
          // merge into gold before restoring to normal map styles.
          const gl = geoLayerRef.current;
          if (gl) {
            const sid = selectedIdRef.current;
            const cid = comparisonIdRef.current;

            // Borough prefix → { fill, stroke } — colors sourced from BOROUGH_PALETTE in chartColors.js
            const WAVE = [1, 2, 3, 4, 5].map(prefix => ({
              prefix,
              fill:   BOROUGH_PALETTE[prefix].fill,
              stroke: BOROUGH_PALETTE[prefix].stroke,
            }));
            const STEP      = 180;  // ms between boroughs
            const ALL_GOLD  = STEP * WAVE.length + 100;
            const RESTORE   = ALL_GOLD + 900;

            WAVE.forEach(({ prefix, fill, stroke }, i) => {
              setTimeout(() => {
                gl.eachLayer(l => {
                  const geocode = parseInt(l.feature?.properties?.GEOCODE ?? '0', 10);
                  if (Math.floor(geocode / 100) === prefix) {
                    l.setStyle({ fillColor: fill, color: stroke, weight: 2, fillOpacity: 0.85 });
                  }
                });
              }, i * STEP);
            });

            // All districts flip to user-pin gold simultaneously
            setTimeout(() => {
              gl.eachLayer(l => l.setStyle({
                fillColor: MAP_USER_PIN.fill, color: MAP_USER_PIN.stroke, weight: 2, fillOpacity: 0.9,
              }));
            }, ALL_GOLD);

            // Restore normal styles — read refs at restore time (not from the
            // closure) so navigation during the animation doesn't apply stale state.
            setTimeout(() => {
              const restoreSid = selectedIdRef.current;
              const restoreCid = comparisonIdRef.current;
              gl.eachLayer(l => {
                const lfid = slugify(l.feature?.properties?.GEONAME ?? '');
                if (restoreSid && lfid === restoreSid)      l.setStyle(selectedStyle());
                else if (restoreCid && lfid === restoreCid) l.setStyle(comparisonStyle());
                else                                         l.setStyle(baseStyle());
              });
            }, RESTORE);
          }
        }
      }
    });

    layer.on('mouseout', () => {
      if (hoveredLayerRef.current === layer) hoveredLayerRef.current = null;
      const sid = selectedIdRef.current;
      const cid = comparisonIdRef.current;
      if (sid && sid !== 'undefined' && fid === sid)        layer.setStyle(selectedStyle());
      else if (cid && cid !== 'undefined' && fid === cid)   layer.setStyle(comparisonStyle());
      else                                                    layer.setStyle(baseStyle());

      // Re-raise selected/comparison so they're never covered by the hovered district
      const mainLayer = geoLayerRef.current;
      if (mainLayer) {
        mainLayer.eachLayer(l => {
          const lfid = slugify(l.feature.properties.GEONAME);
          if ((sid && lfid === sid) || (cid && lfid === cid)) l.bringToFront();
        });
      }

      setHoveredDistrict(null);
      window.dispatchEvent(new CustomEvent('chp:map-hover', {
        detail: { geoId: null, name: null },
      }));
    });

    // On touch: dispatch hover event so MapHoverTooltip shows district info
    // before navigation. On desktop this is a no-op (mouseover fires instead).
    layer.on('touchstart', () => {
      window.dispatchEvent(new CustomEvent('chp:map-hover', {
        detail: { geoId: featureGeoId, name: cleanName },
      }));
    });

    layer.on('click', () => { onSelect?.(fid); });
    // Tooltip removed — district name is shown in the hover overlay instead
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (geoError) {
    return (
      <div className="h-full w-full bg-gray-50 flex flex-col items-center justify-center gap-2 p-4">
        <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>
        <p className="text-xs text-gray-500 text-center">Map failed to load</p>
        <button
          onClick={fetchGeo}
          className="text-xs text-blue-600 hover:text-blue-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
        >
          Retry
        </button>
      </div>
    );
  }

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (!leaflet || !mapVisible) {
    return <div className="h-full w-full bg-gray-100 animate-pulse" />;
  }

  const { MapContainer, TileLayer, GeoJSON } = leaflet;

  // Stable key so GeoJSON never remounts. Main map gets the ref for imperative
  // style updates. Modal gets its own element so they don't share geoLayerRef.
  const mainGeoLayer = geo ? (
    <GeoJSON
      key="geolayer"
      ref={geoLayerRef}
      data={geo}
      style={initialStyle}
      onEachFeature={onEachFeature}
    />
  ) : null;

  const modalGeoLayer = geo ? (
    <GeoJSON
      key="modal-geolayer"
      data={geo}
      style={initialStyle}
      onEachFeature={onEachFeature}
    />
  ) : null;

  const buttonClass = 'w-7 h-7 flex items-center justify-center rounded-md border border-gray-200 bg-white text-gray-400 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 shadow-sm';

  return (
    <>
      <div className="relative h-full w-full overflow-hidden">

        {/* First-visit hint — surfaces the map↔chart hover sync feature */}
        {showMapHint && !hoveredDistrict && (
          <div
            className="absolute top-2 left-2 right-10 z-[1000] pointer-events-none"
            aria-hidden="true"
          >
            <div className="bg-gray-900/85 text-white text-xs px-2.5 py-1.5 rounded-md leading-snug flex items-start gap-1.5">
              <svg className="w-3 h-3 shrink-0 mt-px text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Hover a district to highlight it in the charts below
            </div>
          </div>
        )}

        {/* Hover overlay — district name shown inline for short-viewport users */}
        {hoveredDistrict && (
          <div
            className="absolute bottom-2 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none"
            aria-hidden="true"
          >
            <div className="bg-gray-900/90 text-white text-xs font-medium px-2.5 py-1 rounded-md whitespace-nowrap">
              {hoveredDistrict.name}
            </div>
          </div>
        )}

        {/* Map control buttons */}
        <div className="absolute top-2 right-2 z-[1000] flex items-center gap-1">
          {/* Re-center — only shown when a CD is selected */}
          {selectedId && (
            <button
              onClick={handleRecenter}
              aria-label="Re-center on selected district"
              className={buttonClass}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <circle cx="12" cy="12" r="3" />
                <path strokeLinecap="round" d="M12 2v3M12 19v3M2 12h3M19 12h3" />
              </svg>
            </button>
          )}

          {/* Expand */}
          <button
            onClick={() => {
              const map = mapRef.current;
              setModalInitialView(map
                ? { center: map.getCenter(), zoom: map.getZoom() }
                : null
              );
              setIsExpanded(true);
            }}
            aria-label="Expand map"
            aria-haspopup="dialog"
            className={buttonClass}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>
        </div>

        {/* attributionControl={false} hides the Leaflet/OSM banner.
            OSM + CARTO attribution is legally required — it should be
            surfaced in the About page or app footer instead. */}
        <MapContainer
          ref={mapRef}
          center={NYC_CENTER}
          zoom={NYC_ZOOM}
          scrollWheelZoom
          attributionControl={false}
          className="w-full h-full"
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
          {mainGeoLayer}
        </MapContainer>
      </div>

      {isExpanded && createPortal(
        <div className="fixed inset-0 z-[9000] bg-black/60 flex items-center justify-center p-6">
          <div className="relative w-[80vw] h-[80vh] bg-white rounded-xl overflow-hidden shadow-2xl">
            <button
              onClick={() => setIsExpanded(false)}
              className="absolute top-3 right-3 z-[9100] bg-white px-3 py-1 text-sm rounded shadow"
            >
              Close
            </button>
            <MapContainer
              center={modalInitialView?.center ?? NYC_CENTER}
              zoom={modalInitialView?.zoom ?? NYC_ZOOM}
              scrollWheelZoom
              attributionControl={false}
              className="w-full h-full"
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              />
              {modalGeoLayer}
            </MapContainer>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
