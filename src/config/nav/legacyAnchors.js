/**
 * FILE: legacyAnchors.js
 *
 * QA (2026-10-12): section/category anchors were renamed to match their
 * on-page labels (e.g. "Food" was #food-environment, "Community conditions"
 * was #community-safety). The ids live in content/copy/sections.csv; this
 * maps the OLD ids to the new ones so links shared before the rename still
 * land on the right section (used by useScrollSpy's hash restore).
 *
 * Add a line here whenever an Id is renamed in sections.csv.
 */
const RENAMED = {
  'community-safety':        'community-conditions',
  'economic-conditions':     'economic',
  'food-environment':        'food',
  'transportation-safety':   'transport-and-safety',
  'health-care-access':      'access-to-care',
  'injury-hospitalizations': 'injury-and-hospitalization',
  'infant-child':            'infant-and-child',
  'mental-wellness':         'mental-health',
  // category headers
  'cat-maternal-child-health':     'cat-family-and-child-health',
  'cat-mental-health-substance-use': 'cat-mental-health-and-substance-use',
};

/** '#old-id' or 'old-id' → current id (unchanged if it wasn't renamed). */
export function resolveLegacyAnchor(hashOrId) {
  const id = String(hashOrId ?? '').replace(/^#/, '');
  return RENAMED[id] ?? id;
}
