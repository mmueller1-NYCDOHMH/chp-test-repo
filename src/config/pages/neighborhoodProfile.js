/**
 * FILE: neighborhoodProfile.js
 *
 * PURPOSE:
 * The ordered list of everything that renders on a neighborhood profile page.
 *
 * 2026-09-26: ORDER COMES FROM THE COPY DECK. Categories and sections are
 * laid out in the order they appear in content/copy/measure-copy.csv (via
 * siteNav.js / structure.json). To add, remove or reorder a section, change
 * the sheet — not this file.
 *
 * This file only decides HOW a section renders:
 *   - most sections: buildStandardSection(id) — header + indicator card grid
 *   - sections with bespoke layouts: CUSTOM_SECTIONS below (own file under /config/sections/)
 *   - bespoke sections nested under another section (Avertable Deaths under
 *     Economic): their blocks (minus their own header) are appended INSIDE
 *     the parent section, from structure.json's bespokeSections — so they
 *     read as part of that subcategory, not a standalone section
 *     (2026-09-27, per Morgan).
 *
 * EDITING CATEGORY INTRO TEXT:
 * Edit the category's intro row in content/copy/measure-copy.csv (Section
 * filled, Subsection and Key blank, intro in Context).
 */

import { siteNav }              from '../nav/siteNav';
import structure                from '../../../content/copy/structure.json';
import sectionTitles            from '../content/sectionTitles.json';
import { neighborhoodOverview } from '../sections/neighborhoodOverview';
import { avertableDeaths } from '../sections/avertableDeaths';
import { healthOutcomes } from '../sections/healthOutcomes';

/**
 * Builds the category header block (title + intro) for a top-level nav category.
 * Intro text comes from the sheet's category intro row (via siteNav).
 * 2026-09-25: the three info cards (What's included / Why it matters /
 * How to read this) were removed from category intros.
 *
 * @param {object} cat - a siteNav category entry (must have id, label, contentSlug)
 */
function buildCategorySection(cat) {
  return {
    id:       `cat-${cat.id}`,
    category: true,
    layout:   'categoryIntro',
    children: [
      {
        id:   `cat-${cat.id}-header`,
        type: 'categoryHeader',
        props: {
          title:          cat.label,
          intro:          cat.intro,
        },
      },
    ],
  };
}

/**
 * Builds a standard section: a section-header block + an indicatorChartGrid.
 * Heading from sectionTitles.json (generated from the Sections tab); the
 * cards are injected by Block.jsx from the copy deck.
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
          // indicators injected by Block.jsx from the copy deck
        },
      },
    ],
  };
}

// Sections with their own layout file. Everything else is a standard section.
const CUSTOM_SECTIONS = {
  'health-outcomes':         healthOutcomes,
  'avertable-deaths':        avertableDeaths,
};

const renderSection = (id) => CUSTOM_SECTIONS[id] ?? buildStandardSection(id);

// Parent section + its bespoke sections' blocks folded in (no extra header).
function renderSectionWithBespoke(id, bespokeSections = []) {
  const parent = renderSection(id);
  if (!bespokeSections.length) return parent;
  const extraBlocks = bespokeSections.flatMap(b =>
    (renderSection(b.id).children ?? []).filter(block => block.type !== 'sectionHeader')
  );
  // 2026-09-27 (per Morgan): bespoke cards render as extra cells INSIDE the
  // parent's indicator grid (Block.jsx → IndicatorChartGrid children), so
  // e.g. Avertable Deaths sits next to Rent Burden at the same width/height.
  // Falls back to appending below if the parent has no card grid.
  const hasGrid = parent.children.some(block => block.type === 'indicatorChartGrid');
  if (!hasGrid) return { ...parent, children: [...parent.children, ...extraBlocks] };
  return {
    ...parent,
    children: parent.children.map(block =>
      block.type === 'indicatorChartGrid'
        ? { ...block, extraBlocks: [...(block.extraBlocks ?? []), ...extraBlocks] }
        : block
    ),
  };
}

const sectionsById = Object.fromEntries(
  structure.categories.flatMap(cat => cat.sections.map(sec => [sec.id, sec]))
);

export const neighborhoodProfile = {
  id: 'neighborhood-profile',

  sections: [
    neighborhoodOverview,
    ...siteNav.flatMap(cat => [
      buildCategorySection(cat),
      ...cat.subcategories.map(sub =>
        renderSectionWithBespoke(sub.id, sectionsById[sub.id]?.bespokeSections)
      ),
    ]),
  ],
};
