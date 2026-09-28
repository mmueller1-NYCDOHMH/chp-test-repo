import path from 'path';
import { loadDistributionData, getTopDistributionKeys } from './joinDistributionFiles';

/**
 * FILE: getPrematureMortCauseData.js
 *
 * PURPOSE:
 * Data layer for the "Top Causes of Premature Death" butterfly chart (see
 * PrematureMortCauseSection.jsx). Reads the new-format per-cause value
 * files AND the new-format metadata file directly — Option A, same
 * pattern as getCancerRankingData.js: no old-format intermediary, no
 * content/indicators copy.
 *
 * BACKGROUND (as of 2026-09-01, per the Data Team Wednesday Meeting notes):
 * The data team's new export splits the 11 tracked causes of premature
 * death into 22 separate value files — premature-mort-cause-{cause}-
 * {count|rate}.json under /data/indicators/ — one pair per cause,
 * rather than one pre-ranked file. Two generic metadata shells exist at
 * /data/metadata/premature-mort-cause-{count,rate}-meta.json ("Leading
 * Causes Of Premature Death") but neither carries a per-cause label —
 * only a single MethodsNote sentence spelling out the 10 of 11 cause
 * names in prose ("Full labels are: Malignant Neoplasms (cancer), ...").
 * covid isn't in that sentence at all (added to the file set later than
 * the note was written) but does have its own data files.
 *
 * Same call as the cancer-type breakdown: rather than inventing a parallel
 * content/indicators file for display-only labels, CAUSE_LABELS is
 * hardcoded below from that MethodsNote (plus "COVID-19" for the cause the
 * note omits). Flag to Dan alongside the cancer-type labels ask: it'd be
 * cleaner as a structured field per file than a sentence to hand-parse.
 *
 * SHAPE: each cause file is { Section, Subsection, IndicatorKey, Data: [...] },
 * same wrapped shape as the cancer-type files — Data is unwrapped here,
 * consistent with the Option A approach already chosen.
 *
 * RANKING: "top causes" for a geography is a live sort over all 11 causes
 * by that geography's own rate value, computed in getTopCauseKeys() below
 * — the same narrowly-scoped frontend-ranking exception used for cancer
 * types (see [[feedback_data_transforms_upstream]]), justified the same
 * way: no pre-ranked file exists yet to read instead.
 *
 * METADATA: read through getIndicatorMeta() (the single data/metadata
 * reader) by PrematureDeathOverviewSection.jsx — this file only handles the
 * per-segment value files. Join/rank logic is shared with getCancerRankingData.js via
 * joinDistributionFiles.js.
 */

const DATA_DIR = path.join(process.cwd(), 'data', 'indicators');

// Maps each tracked cause's key to its new-format filename stem.
const CAUSE_FILES = {
  'heart-disease': 'premature-mort-cause-heart-disease',
  cancer:          'premature-mort-cause-cancer',
  covid:           'premature-mort-cause-covid',
  'drug-use':      'premature-mort-cause-drug-use',
  diabetes:        'premature-mort-cause-diabetes',
  suicide:         'premature-mort-cause-suicide',
  hiv:             'premature-mort-cause-hiv',
  stroke:          'premature-mort-cause-stroke',
  'liver-disease': 'premature-mort-cause-liver-disease',
  homicide:        'premature-mort-cause-homicide',
  accidents:       'premature-mort-cause-accidents',
};

// Display labels — hand-parsed from the shared MethodsNote (see file header).
// Short form for chart labels; the clinical name from the note is kept as a
// parenthetical source-of-truth comment, not shown in the UI.
export const CAUSE_LABELS = {
  'heart-disease': 'Heart Disease',              // Diseases of Heart
  cancer:          'Cancer',                      // Malignant Neoplasms
  covid:           'COVID-19',                    // not in the MethodsNote's list — file exists, name is unambiguous
  'drug-use':      'Drug Use',                     // Psych. Substance Use and Accidental Drug Poisoning
  diabetes:        'Diabetes',                     // Diabetes Mellitus
  suicide:         'Suicide',                      // Intentional Self-Harm
  hiv:             'HIV',                          // Human Immunodeficiency Virus Disease
  stroke:          'Stroke',                       // Cerebrovascular Disease
  'liver-disease': 'Liver Disease',                // Chronic Liver Disease and Cirrhosis
  homicide:        'Homicide',                     // Assault
  accidents:       'Accidents',                    // Accidents Except Drug Poisoning
};

const DEFAULT_TOP_N = 5;
const LOG_LABEL = '[getPrematureMortCauseData]';

/**
 * Joins all 11 cause files for ONE metric ('count' | 'rate') into one row
 * per geography, each carrying a Distribution array keyed by cause — same
 * shape as loadCancerDistributionData() in getCancerRankingData.js, so
 * this feeds the same ComparisonPyramidChart/PyramidChartSection pattern
 * (butterfly/pyramid chart with the built-in "compare to a chosen
 * neighborhood" toggle) rather than a bespoke layout. Delegates to
 * joinDistributionFiles.js's shared, cached join logic.
 *
 * @param {'count'|'rate'} metric
 * @returns {Array<{GeoType, GeoID, Geography, Distribution: Array<{key, value, displayValue}>}>}
 */
export function loadPrematureMortCauseData(metric = 'rate') {
  return loadDistributionData(DATA_DIR, CAUSE_FILES, metric, LOG_LABEL);
}

/**
 * Ranks one geography's causes by rate value (descending, nulls excluded)
 * and returns the top N keys — the dynamic, per-geography equivalent of a
 * static meta.json `segments` list. Rate (not count) drives the ranking so
 * it isn't biased toward more populous community districts, matching the
 * cancer-type ranking's same reasoning. Delegates to
 * joinDistributionFiles.js's shared ranking logic.
 *
 * @returns {string[]} top cause keys, e.g. ['heart-disease', 'cancer', 'covid']
 */
export function getTopCauseKeys(distributionRows, geoId, topN = DEFAULT_TOP_N) {
  return getTopDistributionKeys(distributionRows, geoId, topN);
}
