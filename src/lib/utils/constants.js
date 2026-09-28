/**
 * FILE: constants.js
 *
 * Shared application-wide constants.
 * Import from here rather than re-defining in individual components.
 */

/**
 * Borough display order used in grouped dropdowns throughout the app.
 * Must use exact borough names as they appear in neighborhood.borough
 * (derived from GeoJSON via getNeighborhoods).
 */
export const BOROUGH_ORDER = [
  'Manhattan',
  'Brooklyn',
  'Queens',
  'Bronx',
  'Staten Island',
];

/**
 * GeoJSON source for all 59 NYC community districts.
 * Used by map components and getNeighborhoods.
 * File lives at /public/data/CD.geojson and is committed to the repo.
 */
export const GEOJSON_URL = '/data/CD.geojson';

/**
 * Default neighborhood shown when navigating to a section from a non-profile
 * page, or when redirecting from the root route.
 * Must match a valid id in the neighborhoods list (slugified GeoJSON GEONAME).
 */
export const DEFAULT_NEIGHBORHOOD_ID = 'long-island-city-and-astoria';
