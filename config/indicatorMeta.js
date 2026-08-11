/**
 * FILE: indicatorMeta.js
 *
 * Static barrel that imports every indicator meta.json file.
 * Safe for client and server bundles — no fs, no runtime file I/O.
 *
 * WHEN ADDING A NEW INDICATOR:
 * 1. Create /content/indicators/{key}.meta.json
 * 2. Add one import line below (follow the existing pattern)
 * 3. Add the identifier to the indicatorMeta export object
 *
 * The meta.json file itself does not need JS knowledge to edit.
 * This file is the only JS touch-point for new indicators.
 */

import ageDistribution from '../../content/indicators/age-distribution.meta.json';
import airConditioning from '../../content/indicators/air-conditioning.meta.json';
import airQuality from '../../content/indicators/air-quality.meta.json';
import avoidableHospitalizations from '../../content/indicators/avoidable-hospitalizations.meta.json';
import bicycleNetwork from '../../content/indicators/bicycle-network.meta.json';
import bingeDrinking from '../../content/indicators/binge-drinking.meta.json';
import bornOutsideUs from '../../content/indicators/born-outside-us.meta.json';
import childAsthma from '../../content/indicators/child-asthma.meta.json';
import cockroaches from '../../content/indicators/cockroaches.meta.json';
import educationLevel from '../../content/indicators/education-level.meta.json';
import fallRelatedHospitalizations from '../../content/indicators/fall-related-hospitalizations.meta.json';
import farmersMarkets from '../../content/indicators/farmers-markets.meta.json';
import fluVaccination from '../../content/indicators/flu-vaccination.meta.json';
import fruitsVeggies from '../../content/indicators/fruits-veggies.meta.json';
import heatVulnerabilityIndex from '../../content/indicators/heat-vulnerability-index.meta.json';
import hpvVaccination from '../../content/indicators/hpv-vaccination.meta.json';
import incarcerations from '../../content/indicators/incarcerations.meta.json';
import latePrenatalCare from '../../content/indicators/late-prenatal-care.meta.json';
import lifeExpectancy from '../../content/indicators/life-expectancy.meta.json';
import limitedEnglishProficiency from '../../content/indicators/limited-english-proficiency.meta.json';
import maintenanceProblems from '../../content/indicators/maintenance-problems.meta.json';
import newHepCReports from '../../content/indicators/new-hep-c-reports.meta.json';
import newHivDiagnoses from '../../content/indicators/new-hiv-diagnoses.meta.json';
import obesity from '../../content/indicators/obesity.meta.json';
import pedestrianInjuries from '../../content/indicators/pedestrian-injuries.meta.json';
import poverty from '../../content/indicators/poverty.meta.json';
import pretermBirths from '../../content/indicators/preterm-births.meta.json';
import psychiatricHospitalizations from '../../content/indicators/psychiatric-hospitalizations.meta.json';
import publicTransitUse from '../../content/indicators/public-transit-use.meta.json';
import raceEthnicity from '../../content/indicators/race-ethnicity.meta.json';
import smoking from '../../content/indicators/smoking.meta.json';
import sugaryDrinks from '../../content/indicators/sugary-drinks.meta.json';
import teenPregnancy from '../../content/indicators/teen-pregnancy.meta.json';
import totalPopulation from '../../content/indicators/total-population.meta.json';
import unemployment from '../../content/indicators/unemployment.meta.json';
import uninsured from '../../content/indicators/uninsured.meta.json';
import unmetMedicalNeed from '../../content/indicators/unmet-medical-need.meta.json';

export const indicatorMeta = {
  'age-distribution': ageDistribution,
  'air-conditioning': airConditioning,
  'air-quality': airQuality,
  'avoidable-hospitalizations': avoidableHospitalizations,
  'bicycle-network': bicycleNetwork,
  'binge-drinking': bingeDrinking,
  'born-outside-us': bornOutsideUs,
  'child-asthma': childAsthma,
  'cockroaches': cockroaches,
  'education-level': educationLevel,
  'fall-related-hospitalizations': fallRelatedHospitalizations,
  'farmers-markets': farmersMarkets,
  'flu-vaccination': fluVaccination,
  'fruits-veggies': fruitsVeggies,
  'heat-vulnerability-index': heatVulnerabilityIndex,
  'hpv-vaccination': hpvVaccination,
  'incarcerations': incarcerations,
  'late-prenatal-care': latePrenatalCare,
  'life-expectancy': lifeExpectancy,
  'limited-english-proficiency': limitedEnglishProficiency,
  'maintenance-problems': maintenanceProblems,
  'new-hep-c-reports': newHepCReports,
  'new-hiv-diagnoses': newHivDiagnoses,
  'obesity': obesity,
  'pedestrian-injuries': pedestrianInjuries,
  'poverty': poverty,
  'preterm-births': pretermBirths,
  'psychiatric-hospitalizations': psychiatricHospitalizations,
  'public-transit-use': publicTransitUse,
  'race-ethnicity': raceEthnicity,
  'smoking': smoking,
  'sugary-drinks': sugaryDrinks,
  'teen-pregnancy': teenPregnancy,
  'total-population': totalPopulation,
  'unemployment': unemployment,
  'uninsured': uninsured,
  'unmet-medical-need': unmetMedicalNeed,
};
