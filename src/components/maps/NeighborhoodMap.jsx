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
 * All Leaflet modules are imported inside `useEffect` (see
 * ./neighborhoodMap/useGeoJsonLoader.js) so Turbopack can't include them in
 * the SSR bundle. Leaflet CSS is imported once in layout.js.
 *
 * MAP BEHAVIOR:
 * - fitBounds pans and zooms to the selected CD on selection change.
 * - GeoJSON layer uses a stable key and is never remounted; styles are updated
 *   imperatively via geoLayerRef.eachLayer(). Event handlers read selection
 *   state from refs to avoid stale closures.
 * - Expand modal inherits the current center/zoom rather than resetting to NYC.
 * - Re-center button snaps back to the selected CD after manual pan/zoom.
 * - touchstart dispatches chp:map-hover so MapHoverTooltip works on mobile.
 * - On mouseout, selected/comparison layers are re-raised so they're never
 *   covered by an adjacent hovered district.
 *
 * NOTES:
 * - As of 2026-09-04, style helpers/geometry math live in
 *   ./neighborhoodMap/mapStyles.js, the Leaflet+GeoJSON loading state lives
 *   in ./neighborhoodMap/useGeoJsonLoader.js, the selection→style sync
 *   (refs, initialStyle, fly-to-fit, imperative restyle, re-center) lives in
 *   ./neighborhoodMap/useMapSelectionSync.js, and the hover/click/achievement
 *   behavior lives in ./neighborhoodMap/useMapHoverInteractions.js. These are
 *   plain hooks called directly within this component's render — NOT
 *   separate rendered components — so they add no new fiber and carry none
 *   of the React Strict Mode double-invoke risk that a wrapping component
 *   around this map would (see the caution in Sidebar.jsx's renderTabs for
 *   why that distinction matters here). This file owns the shared refs,
 *   the expand-modal state, and the JSX tree.
 */

import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useActiveNeighborhoodId } from '@/lib/utils/pendingNeighborhood';
import { useComparison } from '@/lib/context/ComparisonContext';
import { TILE_URL_BASE, TILE_URL_LABELS, TILE_ATTRIBUTION } from '@/lib/utils/mapTiles';
import { NYC_CENTER, NYC_ZOOM } from './neighborhoodMap/mapStyles';
import { useGeoJsonLoader } from './neighborhoodMap/useGeoJsonLoader';
import { useMapSelectionSync } from './neighborhoodMap/useMapSelectionSync';
import { useMapHoverInteractions } from './neighborhoodMap/useMapHoverInteractions';
import messages from '../../../content/site/messages.json';
import { useModalFocusTrap } from '@/components/charts/expandableChartCard/useModalFocusTrap';

export default function NeighborhoodMap({ onSelect }) {
  const [isExpanded,       setIsExpanded]       = useState(false);
  // A11Y (2026-09-28): the expanded map is now a real modal dialog — named,
  // focus moves in (to Close) and is trapped, Escape closes, page behind is
  // inert, and focus returns to the "Expand map" button (useModalFocusTrap).
  const expandedDialogRef = useRef(null);
  useModalFocusTrap({
    isOpen: isExpanded,
    dialogRef: expandedDialogRef,
    onClose: () => setIsExpanded(false),
    autofocusSelector: '[data-modal-autofocus]',
  });
  const [modalInitialView, setModalInitialView] = useState(null);

  const mapRef          = useRef(null); // Leaflet L.Map instance
  const geoLayerRef     = useRef(null); // main map GeoJSON layer group
  const hoveredLayerRef = useRef(null); // currently hovered Leaflet layer

  // Optimistic: reflects a just-clicked neighborhood immediately instead of
  // waiting for the route change to commit (see pendingNeighborhood.js).
  const selectedId                 = useActiveNeighborhoodId();
  const { comparisonNeighborhood } = useComparison();
  const comparisonId               = comparisonNeighborhood?.id ?? null;

  const { leaflet, geo, geoError, mapVisible, fetchGeo } = useGeoJsonLoader();

  const { selectedIdRef, comparisonIdRef, initialStyle, handleRecenter } = useMapSelectionSync({
    leaflet, geo, selectedId, comparisonId, mapRef, geoLayerRef, hoveredLayerRef,
  });

  const { hoveredDistrict, showMapHint, onEachFeature } = useMapHoverInteractions({
    geoLayerRef, hoveredLayerRef, selectedIdRef, comparisonIdRef, geo, onSelect,
  });

  // ── Error state ───────────────────────────────────────────────────────────
  if (geoError) {
    return (
      <div className="h-full w-full bg-gray-50 flex flex-col items-center justify-center gap-2 p-4">
        <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>
        <p className="text-xs text-gray-600 text-center">{messages.mapLoadFailed}</p>
        <button
          onClick={fetchGeo}
          className="text-xs text-blue-600 hover:text-blue-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
        >
          {messages.retry}
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

  const buttonClass = 'w-7 h-7 flex items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 hover:text-brand hover:border-brand hover:bg-brand-tint transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 shadow-sm';

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

        {/* attributionControl={false} hides the Leaflet/Esri banner. That
            attribution is legally required — it should be surfaced in the
            About page or app footer instead. */}
        <MapContainer
          ref={mapRef}
          center={NYC_CENTER}
          zoom={NYC_ZOOM}
          minZoom={NYC_ZOOM}
          scrollWheelZoom
          attributionControl={false}
          className="w-full h-full"
        >
          {/* Esri Light Gray Canvas: base layer + labels overlay stacked
              on top, standing in for CARTO's old "light_all" tile now
              that CARTO requires an API key. See lib/utils/mapTiles.js. */}
          <TileLayer
            url={TILE_URL_BASE}
            attribution={TILE_ATTRIBUTION}
          />
          <TileLayer
            url={TILE_URL_LABELS}
          />
          {mainGeoLayer}
        </MapContainer>
      </div>

      {isExpanded && createPortal(
        <div
          className="fixed inset-0 z-[9000] bg-black/60 flex items-center justify-center p-6"
          onClick={(e) => { if (e.target === e.currentTarget) setIsExpanded(false); }}
        >
          <div
            ref={expandedDialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Expanded neighborhood map"
            className="relative w-[80vw] h-[80vh] bg-white rounded-xl overflow-hidden shadow-2xl"
          >
            <button
              data-modal-autofocus
              onClick={() => setIsExpanded(false)}
              aria-label="Close expanded map"
              className="absolute top-3 right-3 z-[9100] inline-flex items-center gap-1.5 h-8 px-3 text-sm text-gray-600 bg-white hover:text-brand border border-gray-200 hover:border-brand hover:bg-brand-tint rounded-md shadow transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 whitespace-nowrap"
            >
              Close
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <MapContainer
              center={modalInitialView?.center ?? NYC_CENTER}
              zoom={modalInitialView?.zoom ?? NYC_ZOOM}
              minZoom={NYC_ZOOM}
              scrollWheelZoom
              attributionControl={false}
              className="w-full h-full"
            >
              <TileLayer
                url={TILE_URL_BASE}
                attribution={TILE_ATTRIBUTION}
              />
              <TileLayer
                url={TILE_URL_LABELS}
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
