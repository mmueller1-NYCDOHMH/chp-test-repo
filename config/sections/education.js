/**
 * FILE: education.js
 *
 * PURPOSE:
 * Section config for the Education subcategory.
 * Rendered on the neighborhood profile page under Social.
 *
 * STATUS: Placeholder — indicators TBD. The section renders a coming-soon
 * text block only. Wire in charts once indicator data files are confirmed.
 *
 * INDICATORS (confirmed, data TBD):
 * - Highest level of education achieved
 * - On-time high school graduation
 * - Elementary school absenteeism
 *
 * NOTES:
 * - Once data files are ready, remove this section file entirely and use
 *   buildStandardSection('education') in neighborhoodProfile.js instead.
 * - Add indicator data to /data/indicators/{key}.json
 * - Add indicator metadata to /content/indicators/{key}.meta.json
 * - Add indicator keys to a new /content/sections/education.json
 */

import { EDUCATION_ID } from '../registries/sectionIds';

export const education = {
  id: EDUCATION_ID,
  layout: 'cardRow',
  children: [
    {
      id: 'education-header',
      type: 'sectionHeader',
      props: {
        title: 'Education',
      }
    },
    {
      id: 'education-placeholder',
      type: 'text',
      props: {
        content: 'Indicators for this section are currently being finalized. Check back soon.',
      }
    },
  ]
};
