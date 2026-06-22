/**
 * FILE: neighborhoodProfile.js
 *
 * PURPOSE:
 * Defines the structure and content configuration for a neighborhood profile page.
 *
 * DESCRIPTION:
 * This config drives the entire page layout. Each section is defined in its own
 * file under /config/sections/ and imported here. To add a new section, create
 * a file in /config/sections/, export the section object, and add it to the
 * sections array below.
 *
 * Section order here = render order on the page. Keep it in sync with
 * the category/subcategory order in siteNav.js.
 *
 * CATEGORY HEADERS:
 * Inline section objects with `category: true` render the overarching
 * category heading + intro text above each group of subcategory sections.
 * These are filtered out of the sidebar SectionNav (they are not scroll-spy
 * targets) but do render on the page as visual chapter dividers.
 *
 * RESPONSIBILITIES:
 * - Declare page structure (ordered list of sections)
 * - No logic, no formatting — configuration only
 *
 * NOTES:
 * - Section files own their own inline documentation
 * - Rendering behavior is handled by CHPBuilder
 */

import { neighborhoodOverview }   from '../sections/neighborhoodOverview';
import { communitySafety }        from '../sections/communitySafety';
import { economicConditions }     from '../sections/economicConditions';
import { avertableDeaths }        from '../sections/avertableDeaths';
import { substanceUse }           from '../sections/substanceUse';
import { mentalWellness }         from '../sections/mentalWellness';
import { environmentalRisk }      from '../sections/environmentalRisk';
import { foodEnvironment }        from '../sections/foodEnvironment';
import { housingQuality }         from '../sections/housingQuality';
import { transportationSafety }   from '../sections/transportationSafety';
import { healthCareAccess }       from '../sections/healthCareAccess';
import { healthCareUse }          from '../sections/healthCareUse';
import { prevention }             from '../sections/prevention';
import { maternal }               from '../sections/maternal';
import { infantChild }            from '../sections/infantChild';
import { chronicConditions }      from '../sections/chronicConditions';
import { infectiousDisease }      from '../sections/infectiousDisease';
import { healthOutcomes }         from '../sections/healthOutcomes';

export const neighborhoodProfile = {
  id: 'neighborhood-profile',

  sections: [
    neighborhoodOverview,

    // ── Social & Economic Wellness ────────────────────────────────────────────
    {
      id: 'cat-social-economic',
      category: true,
      layout: 'stacked',
      children: [
        {
          id: 'cat-social-economic-header',
          type: 'categoryHeader',
          props: {
            title: 'Social & Economic Wellness',
            intro: 'Social and economic factors shape the conditions in which people live, work, and age. Indicators in this category reflect the economic pressures, safety, and educational opportunities available to residents across NYC neighborhoods.',
          }
        },
        {
          id: 'cat-social-economic-info-cards',
          type: 'categoryInfoCards',
          props: {
            cards: [
              { title: "What's included",  contentKey: 'social-economic/what-is-included' },
              { title: 'Why it matters',   contentKey: 'social-economic/why-it-matters' },
              { title: 'How to read this', contentKey: 'social-economic/how-to-read' },
            ]
          }
        }
      ]
    },
    communitySafety,
    economicConditions,
    avertableDeaths,
    substanceUse,
    mentalWellness,

    // ── Neighborhood ──────────────────────────────────────────────────────────
    {
      id: 'cat-neighborhood',
      category: true,
      layout: 'stacked',
      children: [
        {
          id: 'cat-neighborhood-header',
          type: 'categoryHeader',
          props: {
            title: 'Neighborhood',
            intro: 'The physical and built environment of a neighborhood has a direct impact on the health of its residents. These indicators reflect environmental quality, food access, housing conditions, and transportation infrastructure across NYC community districts.',
          }
        },
        {
          id: 'cat-neighborhood-info-cards',
          type: 'categoryInfoCards',
          props: {
            cards: [
              { title: "What's included",  contentKey: 'neighborhood/what-is-included' },
              { title: 'Why it matters',   contentKey: 'neighborhood/why-it-matters' },
              { title: 'How to read this', contentKey: 'neighborhood/how-to-read' },
            ]
          }
        }
      ]
    },
    environmentalRisk,
    foodEnvironment,
    housingQuality,
    transportationSafety,

    // ── Health Care ───────────────────────────────────────────────────────────
    {
      id: 'cat-health-care',
      category: true,
      layout: 'stacked',
      children: [
        {
          id: 'cat-health-care-header',
          type: 'categoryHeader',
          props: {
            title: 'Health Care',
            intro: 'Access to affordable, high-quality health care is essential to keeping communities healthy. These indicators measure insurance coverage, unmet need, health care utilization patterns, and preventive service uptake across NYC neighborhoods.',
          }
        },
        {
          id: 'cat-health-care-info-cards',
          type: 'categoryInfoCards',
          props: {
            cards: [
              { title: "What's included",  contentKey: 'health-care/what-is-included' },
              { title: 'Why it matters',   contentKey: 'health-care/why-it-matters' },
              { title: 'How to read this', contentKey: 'health-care/how-to-read' },
            ]
          }
        }
      ]
    },
    healthCareAccess,
    healthCareUse,
    prevention,

    // ── Family Health ─────────────────────────────────────────────────────────
    {
      id: 'cat-family-health',
      category: true,
      layout: 'stacked',
      children: [
        {
          id: 'cat-family-health-header',
          type: 'categoryHeader',
          props: {
            title: 'Family Health',
            intro: 'The health of mothers and children reflects the quality and equity of care in a neighborhood. These indicators capture outcomes during pregnancy, birth, and early childhood across NYC community districts.',
          }
        },
        {
          id: 'cat-family-health-info-cards',
          type: 'categoryInfoCards',
          props: {
            cards: [
              { title: "What's included",  contentKey: 'family-health/what-is-included' },
              { title: 'Why it matters',   contentKey: 'family-health/why-it-matters' },
              { title: 'How to read this', contentKey: 'family-health/how-to-read' },
            ]
          }
        }
      ]
    },
    maternal,
    infantChild,

    // ── Diseases & Outcomes ───────────────────────────────────────────────────
    {
      id: 'cat-diseases-outcomes',
      category: true,
      layout: 'stacked',
      children: [
        {
          id: 'cat-diseases-outcomes-header',
          type: 'categoryHeader',
          props: {
            title: 'Diseases & Outcomes',
            intro: 'Chronic diseases and infectious conditions are the leading causes of death and disability in New York City. Indicators here track the prevalence of long-term conditions, infectious disease burden, and key population-level health outcomes across neighborhoods.',
          }
        },
        {
          id: 'cat-diseases-outcomes-info-cards',
          type: 'categoryInfoCards',
          props: {
            cards: [
              { title: "What's included",  contentKey: 'diseases-outcomes/what-is-included' },
              { title: 'Why it matters',   contentKey: 'diseases-outcomes/why-it-matters' },
              { title: 'How to read this', contentKey: 'diseases-outcomes/how-to-read' },
            ]
          }
        }
      ]
    },
    chronicConditions,
    infectiousDisease,
    healthOutcomes,
  ]

};
