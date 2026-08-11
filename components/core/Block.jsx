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
import { getFlyoutContent } from '@/lib/utils/getFlyoutContent';
import { getCategoryCardContent } from '@/lib/utils/getCategoryCardContent';
import { loadSectionIndicators, loadOverviewHeroConfig } from '@/lib/data/loadSectionIndicators';
import sectionTitles from '@/config/content/sectionTitles.json';

export default function Block({ block, data, context, sectionId }) {
  const Component = BlockRegistry[block.type];

  if (!Component) {
    return <div>Missing: {block.type}</div>;
  }

  const blockData = block.dataKey ? data?.[block.dataKey] : undefined;
  const resolvedProps = resolveProps(block.props, context);

  // If this block declares a flyoutKey, load the markdown from /content/flyouts/
  // and inject it as the `content` prop. Non-developers edit the .md file directly.
  if (block.props?.flyoutKey) {
    resolvedProps.content = getFlyoutContent(block.props.flyoutKey);
  }

  // If this block declares an introContentKey, load the intro paragraph from
  // /content/category-cards/{slug}/intro.md and inject it as the `intro` prop.
  // To edit a category intro: open the matching intro.md file — no code changes needed.
  if (block.props?.introContentKey) {
    resolvedProps.intro = getCategoryCardContent(block.props.introContentKey) ?? resolvedProps.intro;
  }

  // For sectionHeader blocks, look up the display title from /src/config/content/sectionTitles.json
  // using the parent section's ID. The JSON value wins over the inline `title` prop.
  // To rename a section heading: edit sectionTitles.json — no section config changes needed.
  if (block.type === 'sectionHeader' && sectionId) {
    if (sectionTitles[sectionId]) resolvedProps.title = sectionTitles[sectionId];
    resolvedProps.sectionId = sectionId;
  }

  // For indicatorChartGrid blocks, load the ordered indicator list from
  // /content/sections/{sectionId}.json and resolve metadata from
  // /content/indicators/{key}.meta.json. Injects the charts prop automatically.
  // To add/remove/reorder indicators: edit content/sections/{sectionId}.json — no JS needed.
  if (block.type === 'indicatorChartGrid' && sectionId) {
    const jsonCharts = loadSectionIndicators(sectionId);
    if (jsonCharts !== null) resolvedProps.charts = jsonCharts;
  }

  // For neighborhoodOverviewHero blocks, load statTile + pyramidChart config from
  // /content/sections/neighborhood-overview.json, resolving metadata from meta.json.
  // To change which tiles appear: edit content/sections/neighborhood-overview.json.
  if (block.type === 'neighborhoodOverviewHero' && sectionId) {
    const heroConfig = loadOverviewHeroConfig();
    if (heroConfig) {
      resolvedProps.statTiles    = heroConfig.statTiles;
      resolvedProps.pyramidCharts = heroConfig.pyramidCharts;
    }
  }

  return (
    <Component
      data={blockData}
      preset={block.preset}
      context={context}
      {...resolvedProps}
    />
  );
}
