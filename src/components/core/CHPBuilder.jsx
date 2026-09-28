/**
 * FILE: CHPBuilder.jsx
 *
 * PURPOSE:
 * Main rendering engine for Community Health Profile pages.
 *
 * DESCRIPTION:
 * Takes a page config object and corresponding data, then dynamically
 * renders sections and the blocks they contain based on configuration.
 *
 * RESPONSIBILITIES:
 * - Build the template context from the page-level data
 * - Loop through config.sections
 * - Wrap each section in SectionWrapper using its layout
 * - Delegate per-block rendering to <Block />
 *
 * INPUTS:
 * - config: structured definition of the page (sections, blocks, layouts)
 * - data:   data object scoped to the current geography
 *
 * OUTPUT:
 * - Fully rendered React component tree
 *
 * NOTES:
 * - Per-block logic (registry lookup, dataKey selection, template
 *   resolution) lives in:
 *     /components/core/Block.jsx
 *     /lib/utils/resolveProps.js
 * - A section may either declare `children` (a list of blocks) or be
 *   treated itself as a single block — both shapes go through the same
 *   render path here.
 * - This file should remain a thin orchestrator. No UI-specific logic.
 */

import { Fragment } from 'react';
import SectionWrapper from '@/components/layout/SectionWrapper';
import Block from '@/components/core/Block';
import ContinueToNextCategoryButton from '@/components/controls/ContinueToNextCategoryButton';
import { siteNav } from '@/config/nav/siteNav';

// EXPERIMENTAL (mobile pseudo-pages) — maps each section to the siteNav
// category it belongs to, so MobileCategoryPager.jsx (a client component)
// can show/hide sections by category without CHPBuilder itself needing to
// become a client component (Block.jsx does server-only content loading
// and must stay server-rendered). See MobileCategoryContext.jsx for the
// revert path — this mapping is additive and unused if that context/pager
// is removed.
const SUB_TO_CATEGORY = siteNav.reduce((map, cat) => {
  cat.subcategories.forEach((sub) => { map[sub.id] = cat.id; });
  return map;
}, {});

// Category order + labels for the "Continue to next category" CTA below —
// same order TopicNav's tabs render in, so "next" always matches what the
// user would have tapped next anyway.
const CATEGORY_ORDER  = siteNav.map((cat) => cat.id);
const CATEGORY_LABELS = siteNav.reduce((map, cat) => { map[cat.id] = cat.label; return map; }, {});

function sectionCategoryId(section) {
  if (section.category) return section.id.replace(/^cat-/, '');
  return SUB_TO_CATEGORY[section.id] ?? 'always'; // 'always' = never hidden (e.g. overview hero)
}

function nextCategoryOf(categoryId) {
  const idx = CATEGORY_ORDER.indexOf(categoryId);
  if (idx === -1 || idx === CATEGORY_ORDER.length - 1) return null;
  return CATEGORY_ORDER[idx + 1];
}

export default function CHPBuilder({ config, data }) {
  const templateContext = {
    neighborhood: data?.neighborhoodName,
    // geoId is the numeric GEOCODE for the selected neighborhood.
    // null when no neighborhood is selected yet.
    geoId:    data?.geoId    ?? null,
    borough:  data?.borough  ?? null,
    cdNumber: data?.cdNumber ?? null,
  };

  // EXPERIMENTAL (mobile pseudo-pages) — index of each category's LAST
  // matching section in config.sections, so the "Continue to next
  // category" CTA renders once, right after a category's final section,
  // regardless of how many sections that category has.
  const lastSectionIndexByCategory = {};
  config.sections.forEach((section, idx) => {
    const catId = sectionCategoryId(section);
    if (catId !== 'always') lastSectionIndexByCategory[catId] = idx;
  });

  return (
    <div>
      {config.sections.map((section, idx) => {
        const blocks = section.children ?? [section];
        const catId  = sectionCategoryId(section);
        const nextCatId = nextCategoryOf(catId);
        const isLastSectionOfCategory = catId !== 'always' && lastSectionIndexByCategory[catId] === idx;

        return (
          <Fragment key={section.id}>
            <SectionWrapper
              id={section.id}
              layout={section.layout}
              categoryId={catId}
            >
              {blocks.map((block) => (
                <Block
                  key={block.id}
                  block={block}
                  data={data}
                  context={templateContext}
                  sectionId={section.id}
                />
              ))}
            </SectionWrapper>

            {/* EXPERIMENTAL (mobile pseudo-pages) — mobile-only CTA; renders
                null on desktop and on the last category. See
                ContinueToNextCategoryButton.jsx. */}
            {isLastSectionOfCategory && (
              <ContinueToNextCategoryButton
                categoryId={catId}
                nextCategoryId={nextCatId}
                nextLabel={nextCatId ? CATEGORY_LABELS[nextCatId] : null}
              />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
