/**
 * FILE: dataPaths.js
 *
 * Single place that decides which data folder the site reads (2026-10-29).
 *
 *   data/            default — what production builds from (pulled from the
 *                    data repo by scripts/fetch-content.js)
 *   CHP_DATA_DIR=…   point the whole site at another folder with the same
 *                    indicators/ + metadata/ layout, e.g. a new delivery:
 *                      CHP_DATA_DIR=data-test npm run dev
 *                    (or `npm run dev:data-test`)
 *
 * METADATA FILE NAMES: the data team's exports have used both
 * `{key}-meta.json` (data/metadata) and plain `{key}.json`
 * (data-test/metadata, Oct 2026 delivery). Both are accepted, `-meta` first,
 * until one convention is settled.
 *
 * scripts/build-copy.js and scripts/publish-data-downloads.js read the same
 * CHP_DATA_DIR variable (they're CommonJS, so they repeat this logic).
 */

import path from 'path';

export const DATA_ROOT      = path.resolve(process.cwd(), process.env.CHP_DATA_DIR || 'data');
export const INDICATORS_DIR = path.join(DATA_ROOT, 'indicators');
export const METADATA_DIR   = path.join(DATA_ROOT, 'metadata');

/** Candidate metadata file names for a key, in lookup order. */
export function metadataFileNames(key) {
  return [`${key}-meta.json`, `${key}.json`];
}
