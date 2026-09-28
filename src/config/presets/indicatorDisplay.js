/**
 * FILE: indicatorDisplay.js
 *
 * UI display rules per indicator — NOT copy, NOT data facts. Client-safe.
 *
 * 2026-09-26: replaces the non-copy half of the retired
 * src/config/indicatorMeta.json. Indicator metadata now has three homes:
 *   copy        → content/copy/measure-copy.csv  (→ indicatorCopy.json via `npm run copy`)
 *   data facts  → data/metadata/{key}-meta.json  (data team)
 *   display     → this file
 *
 * Only set what differs from the defaults:
 *   higherIsBetter  true | false        (default null → neutral delta badge)
 *   showDelta       false to hide the citywide delta badge
 *   dataSource      'survey' | 'administrative' — flagged-estimate footnote wording
 *                   (see compareIndicator.js getFlaggedEstimateFootnote, CONTENT-GUIDE §11)
 *   sourceUrl       link for the source citation
 *   kind/segments   distribution indicators (At-a-Glance pyramid charts)
 *   dataMetaKey     read data facts from a different data/metadata file
 *                   (for indicators split into per-segment files)
 *
 * deltaSuffix is NOT set here — getIndicatorMeta.js derives ' pts' from the
 * data team's Unit === '%'.
 */

const lowerIsBetter = [
  'air-pollution', 'assault-hosp', 'avertable-death', 'avoidable-adult-hosp',
  'binge-drink', 'child-asthma', 'child-obesity', 'diabetes',
  'edu-did-not-complete-hs', 'falls-hosp', 'heat-vulnerability-index',
  'hepc-reports', 'hiv-diagnosis', 'homes-roach', 'hypertension', 'infant-mort',
  'jail-incarceration', 'late-no-prenatal', 'obesity', 'pedestrian-hosp',
  'poverty', 'premature-mort-count', 'premature-mort-rate', 'preterm-births',
  'rent-burden', 'school-absent', 'smoking', 'sugary-drink', 'teen-births',
  'unemployment', 'uninsured', 'unmet-med-care',
];

const higherIsBetter = [
  'bike-coverage', 'edu-college-degree-and-higher', 'flu-vaccination', 'fruit-veg',
  'helpful-neighbor', 'homes-no-defects', 'hpv-vaccination-all', 'life-expectancy',
  'on-time-hs-grad', 'self-rep-health',
];

const surveyIndicators = [
  'binge-drink', 'diabetes', 'flu-vaccination', 'fruit-veg', 'homes-ac',
  'homes-no-defects', 'homes-roach', 'obesity', 'self-rep-health', 'smoking',
  'sugary-drink', 'uninsured', 'unmet-med-care',
];

const display = {};
const set = (key, fields) => { display[key] = { ...(display[key] ?? {}), ...fields }; };

lowerIsBetter.forEach(k => set(k, { higherIsBetter: false }));
higherIsBetter.forEach(k => set(k, { higherIsBetter: true }));
surveyIndicators.forEach(k => set(k, { dataSource: 'survey' }));

set('teen-births',     { dataSource: 'administrative' });
set('overall-pop',     { showDelta: false });
set('born-outside-us', { showDelta: true });
set('ltd-eng-prof',    { showDelta: true });
set('obesity',         { sourceUrl: 'https://www.nyc.gov/site/doh/data/data-sets/community-health-survey.page' });

set('age-distribution', {
  kind: 'distribution',
  dataMetaKey: 'age0to17',
  segments: [
    { key: 'under18',   label: 'Under 18' },
    { key: 'age18to24', label: '18–24' },
    { key: 'age25to44', label: '25–44' },
    { key: 'age45to64', label: '45–64' },
    { key: 'age65plus', label: '65+' },
  ],
});

set('race-ethnicity', {
  kind: 'distribution',
  dataMetaKey: 'race-asian',
  segments: [
    { key: 'asian',    label: 'Asian' },
    { key: 'black',    label: 'Black' },
    { key: 'hispanic', label: 'Hispanic/Latino' },
    { key: 'white',    label: 'White' },
    { key: 'other',    label: 'Other' },
  ],
});

export const indicatorDisplay = display;
