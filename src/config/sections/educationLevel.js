/**
 * FILE: educationLevel.js
 *
 * PURPOSE:
 * Bespoke section config for the "Highest level of education" split bar
 * chart (2026-09-29). Same pattern as avertableDeaths.js: registered as a
 * `custom` row in the Sections tab (content/copy/sections.csv) whose Keys are
 * the three educational-attainment indicators, so `npm run copy` gives those
 * keys topic 'education-level' (they drop out of the Education card grid) and
 * lists this section under Education's bespokeSections. neighborhoodProfile.js
 * then folds the block below (minus its header) into the Education grid as an
 * extra card.
 *
 * Heading / card title: the Heading column of that custom row.
 */

import { EDUCATION_LEVEL_ID } from '../registries/sectionIds';
import sectionTitles from '../content/sectionTitles.json';

const title = sectionTitles[EDUCATION_LEVEL_ID] ?? EDUCATION_LEVEL_ID;

export const educationLevel = {
  id: EDUCATION_LEVEL_ID,
  layout: 'cardRow',
  children: [
    {
      id:    `${EDUCATION_LEVEL_ID}-header`,
      type:  'sectionHeader',
      props: { title },
    },
    {
      id:    `${EDUCATION_LEVEL_ID}-chart`,
      type:  'educationLevelSection',
      props: { title },
    },
  ],
};
