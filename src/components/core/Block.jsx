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

export default function Block({ block, data, context }) {
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

  return (
    <Component
      data={blockData}
      preset={block.preset}
      context={context}
      {...resolvedProps}
    />
  );
}
