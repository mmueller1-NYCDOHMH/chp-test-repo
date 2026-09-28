import path from 'path';
import { loadDistributionData, getTopDistributionKeys } from './joinDistributionFiles';

/**
 * FILE: getCancerRankingData.js
 *
 * PURPOSE:
 * Data layer for the "leading types of cancer among premature deaths"
 * pyramid chart (see CancerRankingSection.jsx). Reads the new-format
 * per-cancer-type value files AND the new-format metadata file directly
 * — Option A: no old-format intermediary, no content/indicators copy.
 *
 * BACKGROUND (as of 2026-08-31):
 * The data team's new export splits cancer types into five separate
 * value files — cancer-{type}-{count|rate}.json under
 * /data/indicators/ — rather than delivering one pre-ranked file.
 * A metadata shell exists at /data/metadata/cancer-rank-{count,rate}-meta.json
 * ("Top 3 types of cancers among premature deaths") but the ranked data
 * itself has not been delivered. Per the 8/12 data-team sync notes, Dan
 * flagged this remodel as still in progress.
 *
 * LABELS: data/metadata/cancer-rank-{count,rate}-meta.json does NOT carry the per-cancer-type segment
 * labels or a few other display-only fields (they're UI decisions, not
 * data facts the data team would export), so those are hardcoded below
 * as CANCER_TYPE_LABELS rather than invented into a parallel content
 * file.
 *
 * RANKING: until a pre-ranked file exists, loadCancerDistributionData()
 * below joins the five raw value files into one row per geography (the
 * same one-Distribution-array-per-row shape age-distribution.json and
 * race-ethnicity.json already use) and getTopCancerTypeKeys() ranks them
 * per geography at read time. This is a deliberate, narrowly-scoped
 * exception to "no ranking logic in the frontend" — kept isolated to
 * this one function so it's a one-file swap for a plain
 * loadIndicatorData()-style read once Dan's team delivers the real
 * cancer-rank-{count,rate}.json file: replace loadCancerDistributionData()'s
 * body with that read and delete getTopCancerTypeKeys().
 *
 * METADATA: read through getIndicatorMeta() (the single data/metadata
 * reader) by PrematureDeathOverviewSection.jsx — this file only handles the
 * per-segment value files. Join/rank logic is shared with getPrematureMortCauseData.js via
 * joinDistributionFiles.js.
 */

const DATA_DIR = path.join(process.cwd(), 'data', 'indicators');

// Maps each tracked cancer type's key to its new-format filename stem.
const CANCER_TYPE_FILES = {
  lung:       'cancer-lung',
  breast:     'cancer-breast',
  liver:      'cancer-liver',
  colorectal: 'cancer-colorectal',
  pancreatic: 'cancer-pancreatic',
};

// Display-only fields data/metadata/cancer-rank-{metric}-meta.json does
// not carry (the data team's export has no notion of "how should this
// read in the UI"). Hardcoded here per Morgan's call (2026-08-31) rather
// than maintaining a separate content file for just these fields.
export const CANCER_TYPE_LABELS = {
  lung:       'Lung Cancer',
  breast:     'Breast Cancer (among women)',
  liver:      'Liver Cancer',
  colorectal: 'Colorectal Cancer',
  pancreatic: 'Pancreatic Cancer',
};

const DEFAULT_TOP_N = 3;
const LOG_LABEL = '[getCancerRankingData]';

/**
 * Joins all five cancer-type files for one metric ('count' | 'rate') into
 * one row per geography, each carrying a Distribution array keyed by
 * cancer type. Delegates to joinDistributionFiles.js's shared, cached
 * join logic (per-metric-per-request memoized via React cache(), same
 * pattern as getNeighborhoods()/getData()).
 *
 * @param {'count'|'rate'} metric
 * @returns {Array<{GeoType, GeoID, Geography, Distribution: Array<{key, value, displayValue}>}>}
 */
export function loadCancerDistributionData(metric = 'rate') {
  return loadDistributionData(DATA_DIR, CANCER_TYPE_FILES, metric, LOG_LABEL);
}

/**
 * Ranks one geography's cancer types by value (descending, nulls
 * excluded) and returns the top N keys — the dynamic, per-geography
 * equivalent of a static meta.json `segments` list. The comparison side
 * (citywide or a comparison CD) is shown for these SAME keys, even
 * though they may not be that geography's own top N — this mirrors the
 * screenshot pattern ("leading causes ... in <this CD>") where the
 * selected CD drives which causes are shown. Delegates to
 * joinDistributionFiles.js's shared ranking logic.
 *
 * @returns {string[]} top cancer-type keys, e.g. ['lung', 'breast', 'liver']
 */
export function getTopCancerTypeKeys(distributionRows, geoId, topN = DEFAULT_TOP_N) {
  return getTopDistributionKeys(distributionRows, geoId, topN);
}
