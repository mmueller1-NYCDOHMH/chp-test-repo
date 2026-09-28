import { readFileSync } from 'fs';
import path from 'path';
import { cache } from 'react';
import { slugify } from '@/lib/utils/slugify';

/**
 * GeoID encoding: the first digit is the borough code, the last two digits
 * are the community district number within that borough.
 * e.g. 305 → Brooklyn (3), CD 5
 */
const BOROUGH_BY_CODE = {
  1: 'Manhattan',
  2: 'Bronx',
  3: 'Brooklyn',
  4: 'Queens',
  5: 'Staten Island',
};

/**
 * Returns the list of neighborhoods derived from CD.geojson (public/data/CD.geojson).
 * IDs are always in sync with the map and with the /neighborhood/[id] route.
 *
 * Reads from the filesystem (not fetch) so it works at build time and during SSR
 * without needing an absolute URL. React cache() deduplicates within a request.
 *
 * Each entry:
 *   id       — URL slug (slugified GEONAME)
 *   name     — human-readable name (GEONAME, CD suffix stripped)
 *   geoId    — numeric GEOCODE (e.g. 305)
 *   borough  — borough name derived from first digit of geoId
 *   cdNumber — community district number within the borough (geoId % 100)
 */
export const getNeighborhoods = cache(function getNeighborhoods() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'CD.geojson');
    const geo = JSON.parse(readFileSync(filePath, 'utf-8'));

    return geo.features
      .map((f) => {
        const geoId       = parseInt(f.properties.GEOCODE, 10);
        const boroughCode = Math.floor(geoId / 100);
        const cdNumber    = geoId % 100;
        // Strip the "(CD#)" suffix that the source GeoJSON appends to GEONAME
        const rawName = f.properties.GEONAME;
        const cleanName = rawName.replace(/\s*\(CD\d+\)/i, '').trim();
        return {
          id:       slugify(rawName),
          name:     cleanName,
          geoId,
          borough:  BOROUGH_BY_CODE[boroughCode] ?? 'Unknown',
          cdNumber,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (err) {
    console.error('[getNeighborhoods] Failed to load GeoJSON, falling back to static list.', err);
    // Fallback so the page still renders if the external fetch fails
    return [];
  }
});