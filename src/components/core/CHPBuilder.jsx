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

import SectionWrapper from '@/components/layout/SectionWrapper';
import Block from '@/components/core/Block';

export default function CHPBuilder({ config, data }) {
  const templateContext = {
    neighborhood: data?.neighborhoodName,
    // geoId is the numeric GEOCODE for the selected neighborhood.
    // null when no neighborhood is selected yet.
    geoId:    data?.geoId    ?? null,
    borough:  data?.borough  ?? null,
    cdNumber: data?.cdNumber ?? null,
  };

  return (
    <div>
      {config.sections.map((section) => {
        const blocks = section.children ?? [section];

        return (
          <SectionWrapper key={section.id} id={section.id} layout={section.layout}>
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
        );
      })}
    </div>
  );
}
