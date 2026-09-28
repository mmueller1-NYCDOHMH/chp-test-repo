import { MAP_STYLES } from '@/lib/charts/chartColors';

/**
 * FILE: mapStyles.js
 *
 * Style helpers and geometry math shared by NeighborhoodMap's hooks. Kept
 * as plain functions/constants (not inside any component or hook) so
 * anything that references them — like the stable `initialStyle` callback
 * in useMapSelectionSync — never needs them in a dependency array and never
 * loses referential stability. Part of the 2026-09-04 split of
 * NeighborhoodMap.jsx.
 */
export function baseStyle()       { return { ...MAP_STYLES.base,       color: '#4b5563' }; }
export function hoverStyle()      { return { ...MAP_STYLES.hover }; }
export function selectedStyle()   { return { ...MAP_STYLES.selected }; }
export function comparisonStyle() { return { ...MAP_STYLES.comparison }; }

export const NYC_CENTER = [40.7128, -74.006];
export const NYC_ZOOM   = 10;
export const CD_ZOOM    = 13;

export function computeBounds(geometry) {
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
