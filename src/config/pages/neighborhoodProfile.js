/**
 * FILE: neighborhoodProfile.js
 *
 * PURPOSE:
 * Defines the structure and content configuration for a neighborhood profile page.
 *
 * DESCRIPTION:
 * This config drives the entire page layout. The sections array is the
 * ordered list of everything that renders on the page.
 *
 * ADDING A SECTION:
 * Standard sections (header + chart grid) can be added with one line:
 *   buildStandardSection(SECTION_ID_CONSTANT)
 * Sections that need non-standard layouts keep their own file under /config/sections/.
 *
 * ADDING A CATEGORY:
 * 1. Add it to siteNav.js with a contentSlug
 * 2. Create /content/category-cards/{contentSlug}/ with intro.md and optional
 *    what-is-included.md, why-it-matters.md, how-to-read.md
 * 3. Insert buildCategorySection(siteNav.find(c => c.id === '...')) here
 *
 * EDITING CATEGORY INTRO TEXT:
 * Edit /content/category-cards/{contentSlug}/intro.md — no code changes needed.
 *
 * NOTES:
 * - Rendering behavior is handled by CHPBuilder
 * - See /CONTENT_GUIDE.md for step-by-step checklists
 */

import { siteNav }              from '../nav/siteNav';
import sectionTitles            from '../content/sectionTitles.json';
import { neighborhoodOverview } from '../sections/neighborhoodOverview';
import { education }            from '../sections/education';
import { injuryHospitalizations } from '../sections/injuryHospitalizations';

// ── Info card slots present in every category ─────────────────────────────────
// Edit titles here to rename them everywhere at once.
const INFO_CARDS = [
  { title: "What's included",  key: 'what-is-included' },
  { title: 'Why it matters',   key: 'why-it-matters'   },
  { title: 'How to read this', key: 'how-to-read'      },
];

/**
 * Builds the category header + info-card block for a top-level nav category.
 * Reads content from /content/category-cards/{cat.contentSlug}/.
 * Add/remove a card slot by editing INFO_CARDS above.
 *
 * @param {object} cat - a siteNav category entry (must have id, label, contentSlug)
 */
function buildCategorySection(cat) {
  const slug = cat.contentSlug ?? cat.id;
  return {
    id:       `cat-${cat.id}`,
    category: true,
    layout:   'stacked',
    children: [
      {
        id:   `cat-${cat.id}-header`,
        type: 'categoryHeader',
        props: {
          title:          cat.label,
          introContentKey: `${slug}/intro`,
        },
      },
      {
        id:   `cat-${cat.id}-info-cards`,
        type: 'categoryInfoCards',
        props: {
          cards: INFO_CARDS.map(({ title, key }) => ({
            title,
            contentKey: `${slug}/${key}`,
          })),
        },
      },
    ],
  };
}

/**
 * Builds a standard section: a section-header block + an indicatorChartGrid.
 * Reads the display title from /src/config/content/sectionTitles.json.
 * Indicator list is loaded automatically from /content/sections/{id}.json.
 *
 * Use this for every section that follows the standard layout.
 * Sections with non-standard layouts (overview hero, placeholder text, etc.)
 * keep their own file in /config/sections/ and are imported explicitly above.
 *
 * @param {string} id - section ID constant from sectionIds.js
 */
function buildStandardSection(id) {
  const title = sectionTitles[id] ?? id;
  return {
    id,
    layout: 'cardRow',
    children: [
      {
        id:    `${id}-header`,
        type:  'sectionHeader',
        props: { title },
      },
      {
        id:    `${id}-charts`,
        type:  'indicatorChartGrid',
        props: {
          sectionLabel: title,
          // indicators loaded from /content/sections/{id}.json
        },
      },
    ],
  };
}

// ── Flat ordered category list — drives both category blocks and section groupings ──
// To add a new top-level category: add it to siteNav.js (with contentSlug),
// then insert buildCategorySection(cat) at the right position below.
const [social, neighborhood, healthCare, maternalChildHealth, healthConditions] = siteNav;

export const neighborhoodProfile = {
  id: 'neighborhood-profile',

  sections: [
    neighborhoodOverview,

    // ── Social ────────────────────────────────────────────────────────────────
    buildCategorySection(social),
    buildStandardSection('community-safety'),
    buildStandardSection('economic-conditions'),
    education,                    // placeholder — no chart data yet

    // ── Neighborhood ──────────────────────────────────────────────────────────
    buildCategorySection(neighborhood),
    buildStandardSection('environmental-risk'),
    buildStandardSection('food-environment'),
    buildStandardSection('housing-quality'),
    buildStandardSection('transportation-safety'),

    // ── Health care ───────────────────────────────────────────────────────────
    buildCategorySection(healthCare),
    buildStandardSection('health-care-access'),
    injuryHospitalizations,       // kept explicit: section title differs from sectionTitles key
    buildStandardSection('prevention'),

    // ── Maternal & child health ───────────────────────────────────────────────
    buildCategorySection(maternalChildHealth),
    buildStandardSection('maternal'),
    buildStandardSection('infant-child'),

    // ── Health conditions ─────────────────────────────────────────────────────
    buildCategorySection(healthConditions),
    buildStandardSection('mental-wellness'),
    buildStandardSection('substance-use'),
    buildStandardSection('chronic-conditions'),
    buildStandardSection('infectious-disease'),
    buildStandardSection('health-outcomes'),
  ],
};
