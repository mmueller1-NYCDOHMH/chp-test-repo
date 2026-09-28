/**
 * FILE: Bone.jsx
 *
 * PURPOSE:
 * Shared skeleton-loading placeholder block.
 *
 * DESCRIPTION:
 * Renders a rounded, shimmering rectangle. Used by every route's
 * loading.jsx (neighborhood, indicator, about) so all skeletons across the
 * app share one visual language instead of each route redefining its own.
 *
 * Uses the `.skeleton-shimmer` class (globals.css) — a light diagonal band
 * sweeping across the block — rather than Tailwind's flat `animate-pulse`,
 * which reads as "greyed out" rather than "actively loading". The sweep is
 * an overlay (::after), so passing a different base color (e.g. bg-blue-500
 * for bones sitting on the brand-colored header bar) still works exactly
 * like it did before — see the CSS comment in globals.css for why.
 * prefers-reduced-motion is handled entirely in CSS.
 *
 * PROPS:
 * - className {string} — sizing/spacing/color classes (h-4 w-24, bg-blue-500, etc.)
 *
 * NOTES:
 * - Pure presentational, no state, no props besides className
 * - Previously defined inline inside neighborhood/[id]/loading.jsx; pulled
 *   out (2026-09-02) so indicator/[key]/loading.jsx and about/loading.jsx
 *   can share it instead of each redefining their own copy.
 */
export default function Bone({ className }) {
  return (
    <div className={`bg-gray-200 rounded skeleton-shimmer ${className ?? ''}`} />
  );
}
