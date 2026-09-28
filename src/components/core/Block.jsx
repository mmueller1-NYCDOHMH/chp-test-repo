/**
 * FILE: Block.jsx
 *
 * PURPOSE:
 * Renders a single config-defined block.
 *
 * DESCRIPTION:
 * Looks the block type up in BlockRegistry, injects the slice of page
 * data referenced by `dataKey`, and resolves any template variables in
 * the block's props against the provided context.
 *
 * INPUTS:
 * - block:   a block config node (type, dataKey, props, preset)
 * - data:    the full page-level data object
 * - context: template variable context (e.g. { neighborhood })
 *
 * OUTPUT:
 * - The resolved React component, or a small fallback if the block
 *   type is not registered.
 *
 * RESPONSIBILITIES:
 * - Registry lookup
 * - Missing-block fallback
 * - Data selection via dataKey
 * - Template resolution via resolveProps
 *
 * NOTES:
 * - Keeps CHPBuilder free of per-block rendering logic
 * - The rendered component remains "dumb" — it receives prepared props
 */

import { BlockRegistry } from '@/config/registries/blockRegistry';
import { resolveProps } from '@/lib/utils/resolveProps';
import { loadSectionIndicators, loadOverviewHeroConfig } from '@/lib/data/loadSectionIndicators';
import sectionTitles from '@/config/content/sectionTitles.json';

export default function Block({ block, data, context, sectionId }) {
  const Component = BlockRegistry[block.type];

  if (!Component) {
    return <div>Missing: {block.type}</div>;
  }

  const blockData = block.dataKey ? data?.[block.dataKey] : undefined;
  const resolvedProps = resolveProps(block.props, context);

  // For sectionHeader blocks, the heading comes from sectionTitles.json
  // (generated from the Sections tab, content/copy/sections.csv) by section ID.
  // To rename a section heading: edit the Heading column there.
  if (block.type === 'sectionHeader' && sectionId) {
    if (sectionTitles[sectionId]) resolvedProps.title = sectionTitles[sectionId];
    resolvedProps.sectionId = sectionId;
  }

  // For indicatorChartGrid blocks, inject the ordered indicator cards for this
  // section. Placement + order come from the copy deck
  // (content/copy/measure-copy.csv → indicatorCopy.json via `npm run copy`).
  // To add/remove/reorder indicators: edit the CSV — no JSON or JS needed.
  if (block.type === 'indicatorChartGrid' && sectionId) {
    const jsonCharts = loadSectionIndicators(sectionId);
    if (jsonCharts !== null) resolvedProps.charts = jsonCharts;
  }

  // For neighborhoodOverviewHero blocks, load statTile + pyramidChart config
  // from the copy deck's "At a glance" rows. To change which tiles appear or
  // their order: edit content/copy/measure-copy.csv.
  if (block.type === 'neighborhoodOverviewHero' && sectionId) {
    const heroConfig = loadOverviewHeroConfig();
    if (heroConfig) {
      resolvedProps.statTiles    = heroConfig.statTiles;
      resolvedProps.pyramidCharts = heroConfig.pyramidCharts;
      resolvedProps.sourceFootnote = heroConfig.sourceFootnote;
    }
  }

  // extraBlocks (2026-09-27): bespoke blocks folded into this block by the
  // page config (e.g. Avertable Deaths inside Economic's card grid). Rendered
  // here and passed as children so they share the parent's grid cells.
  const extras = block.extraBlocks?.length
    ? block.extraBlocks.map(extra => (
        <Block key={extra.id} block={extra} data={data} context={context} sectionId={sectionId} />
      ))
    : null;

  return (
    <Component
      data={blockData}
      preset={block.preset}
      context={context}
      {...resolvedProps}
    >
      {extras}
    </Component>
  );
}
