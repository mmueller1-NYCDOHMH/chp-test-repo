/**
 * FILE: indicators/environmentalRisk.js
 *
 * PURPOSE:
 * Indicator definitions for the Environmental Risk subcategory,
 * under the Neighborhood nav category.
 *
 * ADDING AN INDICATOR:
 * 1. Add a data file at /data/indicators/{key}.json
 * 2. Add an entry below following the same shape
 * 3. Reference it in /config/sections/environmentalRisk.js via asChartConfig()
 * No component code changes required.
 *
 * FIELDS: see /config/registries/indicatorRegistry.js for full field docs.
 */

import { ENVIRONMENTAL_RISK_ID } from '../sectionIds';

export const environmentalRiskIndicators = {

  airQuality: {
    key:            'air-quality',
    topic:          ENVIRONMENTAL_RISK_ID,
    title:          'Air Quality',
    subtitle:       'Fine particulate matter (PM2.5) concentration (mcg/m³)',
    source:         'Source: NYC Community Air Survey',
    timePeriod:     'TBD',
    label:          'PM2.5 Concentration',
    unit:           'mcg/m³ annual average',
    displaySuffix:  '',
    deltaSuffix:    ' mcg/m³',
    decimals:       1,
    higherIsBetter: false,
  },

  heatVulnerabilityIndex: {
    key:            'heat-vulnerability-index',
    topic:          ENVIRONMENTAL_RISK_ID,
    title:          'Heat Vulnerability Index',
    subtitle:       'Index score reflecting risk of heat-related illness (1–5 scale)',
    source:         'Source: NYC DOHMH',
    timePeriod:     'TBD',
    label:          'Heat Vulnerability',
    unit:           'index score (1–5)',
    displaySuffix:  '',
    deltaSuffix:    ' pts',
    decimals:       1,
    higherIsBetter: false,
  },

};
