/**
 * FILE: indicators/demographics.js
 *
 * PURPOSE:
 * Indicator definitions for the Who We Are / demographic topic.
 *
 * DESCRIPTION:
 * Five indicators surfaced in the neighborhood at-a-glance hero:
 *   - totalPopulation              (single value, count)
 *   - ageDistribution              (distribution, % per age bucket)
 *   - raceEthnicity                (distribution, % per group)
 *   - bornOutsideUS                (single value, %)
 *   - limitedEnglishProficiency    (single value, %)
 *
 * Distribution indicators carry an additional `kind: 'distribution'` flag
 * (read by NeighborhoodOverviewHero to switch tile renderers) and
 * `segments` metadata that mirrors the per-row Distribution array shipped
 * in the corresponding data file.
 *
 * ADDING AN INDICATOR:
 * 1. Add a data file at /data/indicators/{key}.json
 * 2. Add an entry below following the same shape
 * 3. Reference it in /config/sections/neighborhoodOverview.js via asStatTile()
 * No component code changes required for single-value indicators.
 *
 * FIELDS: see /config/registries/indicatorRegistry.js for full field docs.
 */

import { NEIGHBORHOOD_OVERVIEW_ID } from '../sectionIds';

export const demographicIndicators = {

  totalPopulation: {
    key:            'total-population',
    topic:          NEIGHBORHOOD_OVERVIEW_ID,
    title:          'Total Population',
    subtitle:       'Residents living in the area',
    source:         'Source: American Community Survey 5-Year Estimates (2019–2023)',
    timePeriod:     'ACS 2019–2023',
    label:          'People',
    unit:           'live in this area',
    displaySuffix:  '',
    deltaSuffix:    '',
    decimals:       0,
    higherIsBetter: null,   // population is neutral — no better/worse direction
    showDelta:      false,  // suppress the citywide delta badge for raw counts
  },

  ageDistribution: {
    key:            'age-distribution',
    topic:          NEIGHBORHOOD_OVERVIEW_ID,
    title:          'Age Distribution',
    subtitle:       'Share of residents by age group',
    source:         'Source: American Community Survey 5-Year Estimates (2019–2023)',
    timePeriod:     'ACS 2019–2023',
    label:          'Age',
    unit:           'breakdown of residents',
    kind:           'distribution',
    segments: [
      { key: 'under18',   label: 'Under 18' },
      { key: 'age18to24', label: '18–24' },
      { key: 'age25to44', label: '25–44' },
      { key: 'age45to64', label: '45–64' },
      { key: 'age65plus', label: '65+' },
    ],
  },

  raceEthnicity: {
    key:            'race-ethnicity',
    topic:          NEIGHBORHOOD_OVERVIEW_ID,
    title:          'Race & Ethnicity',
    subtitle:       'Share of residents by race/ethnicity',
    source:         'Source: American Community Survey 5-Year Estimates (2019–2023)',
    timePeriod:     'ACS 2019–2023',
    label:          'Race / Ethnicity',
    unit:           'of residents',
    kind:           'distribution',
    segments: [
      { key: 'hispanic', label: 'Hispanic/Latino' },
      { key: 'white',    label: 'White' },
      { key: 'black',    label: 'Black' },
      { key: 'asian',    label: 'Asian' },
      { key: 'other',    label: 'Other' },
    ],
  },

  bornOutsideUS: {
    key:            'born-outside-us',
    topic:          NEIGHBORHOOD_OVERVIEW_ID,
    title:          'Born Outside the U.S.',
    subtitle:       '% of residents born outside the U.S.',
    source:         'Source: American Community Survey 5-Year Estimates (2019–2023)',
    timePeriod:     'ACS 2019–2023',
    label:          'Born Outside the U.S.',
    unit:           'of residents',
    displaySuffix:  '',
    deltaSuffix:    ' pts',
    decimals:       0,
    higherIsBetter: null,
  },

  limitedEnglishProficiency: {
    key:            'limited-english-proficiency',
    topic:          NEIGHBORHOOD_OVERVIEW_ID,
    title:          'Limited English Proficiency',
    subtitle:       '% of residents with limited English proficiency',
    source:         'Source: American Community Survey 5-Year Estimates (2019–2023)',
    timePeriod:     'ACS 2019–2023',
    label:          'Limited English Proficiency',
    unit:           'of residents',
    displaySuffix:  '',
    deltaSuffix:    ' pts',
    decimals:       0,
    higherIsBetter: null,
  },

};
