import { useState, useEffect, useRef } from 'react';
import { slugify } from '@/lib/utils/slugify';
import { BOROUGH_PALETTE, MAP_USER_PIN } from '@/lib/charts/chartColors';
import { baseStyle, hoverStyle, selectedStyle, comparisonStyle } from './mapStyles';

/**
 * FILE: useMapHoverInteractions.js
 *
 * District hover/click behavior for the GeoJSON layer's onEachFeature, plus
 * the state it drives:
 *   - hoveredDistrict — surfaced to MapHoverTooltip via the chp:map-hover
 *     event, and used here only to hide the first-visit hint while hovering.
 *   - showMapHint — one-time hint surfacing the map↔chart hover sync
 *     feature, dismissed on first hover interaction.
 *   - The "all 59 explored" achievement: tracks every distinct district
 *     hovered this session (hoveredSetRef) and, once every district has
 *     been hovered, fires chp:all-explored and runs the borough-wave
 *     animation before restoring normal styles.
 *   - touchstart dispatches chp:map-hover so MapHoverTooltip works on
 *     mobile (mouseover doesn't fire there); click calls onSelect.
 * Part of the 2026-09-04 split of NeighborhoodMap.jsx.
 */
export function useMapHoverInteractions({ geoLayerRef, hoveredLayerRef, selectedIdRef, comparisonIdRef, geo, onSelect }) {
  const [hoveredDistrict, setHoveredDistrict] = useState(null);
  // One-time hint surfacing the map↔chart hover sync feature
  const [showMapHint, setShowMapHint] = useState(false);

  const mapHintShownRef  = useRef(false); // tracks whether hint has been dismissed this session
  const hoveredSetRef    = useRef(new Set()); // tracks districts hovered this session
  const achievementFired = useRef(false);     // ensures achievement fires once

  // ── Show first-visit hint for map↔chart hover sync ────────────────────────
  useEffect(() => {
    try {
      if (!localStorage.getItem('chp_map_hint_seen')) setShowMapHint(true);
    } catch { /* localStorage unavailable */ }
  }, []);

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

  return { hoveredDistrict, showMapHint, onEachFeature };
}
