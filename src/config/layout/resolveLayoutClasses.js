/**
 * FILE: resolveLayoutClasses.js
 *
 * PURPOSE:
 * Converts layout presets into Tailwind CSS class strings
 * used by SectionWrapper to render consistent layouts.
 *
 * DESCRIPTION:
 * Takes a normalized layout object (from layoutPresets) and maps its
 * properties (variant, columns, gap, width) into corresponding Tailwind
 * utility classes.
 *
 * This function acts as the translation layer between:
 * - Config-driven layout definitions
 * - Actual rendered CSS classes in the UI
 *
 * INPUT:
 * resolved (object)
 * - variant: layout type (e.g. 'stack', 'grid', 'split', 'hero')
 * - columns: number of columns (for grid layouts)
 * - gap: spacing between elements ('sm', 'md', 'lg')
 * - width: layout width ('full', 'contained')
 *
 * OUTPUT:
 * {
 *   outer: string  → controls section spacing + width
 *   card: string   → controls container styling (background, padding, border)
 *   inner: string  → controls layout behavior (flex/grid + gap)
 * }
 *
 * USAGE:
 * Called inside SectionWrapper to dynamically apply layout styles:
 *
 * layout → layoutPresets → resolveLayoutClasses → Tailwind classes → UI
 *
 * RESPONSIBILITIES:
 * - Map abstract layout config to concrete CSS classes
 * - Centralize layout styling logic
 * - Ensure consistency across all sections
 *
 * NOTES:
 * - This function contains no rendering logic — only class resolution
 * - Updating layout behavior should be done here, not in components
 * - Designed to scale with additional layout variants and spacing rules
 *
 * CHANGING CARD APPEARANCE:
 * Edit CARD_BASE and CARD_PADDING below — they apply to every section card.
 */

// ── Card style constants ───────────────────────────────────────────────────
// Edit these to change the appearance of all section cards site-wide.
const CARD_BASE    = 'bg-white border border-gray-200 shadow-sm';
// Corner radius kept separate from CARD_BASE so accents can swap it without
// two conflicting rounded-* utilities on the same element.
const CARD_RADIUS  = 'rounded-xl';
const CARD_PADDING = 'p-6';
// Optional card accents, opted into via a preset's `accent` key.
// 'top' = blue top edge (category intro cards). Blue matches SectionHeader's
// text-blue-600 eyebrow labels.
// Each accent supplies its own radius: 'top' rounds only the bottom corners,
// so the blue bar's corners are square.
const CARD_ACCENTS = {
  top: { classes: 'border-t-4 border-t-blue-600', radius: 'rounded-b-xl' },
};

// ── Section spacing ────────────────────────────────────────────────────────
const SECTION_MARGIN_BOTTOM = 'mb-12';
// Optional spacing overrides, opted into via a preset's `spacing` key.
// NOTE: sections are block siblings, so vertical margins COLLAPSE — the gap
// between two sections is max(prev mb, next mt), not the sum. mt-24 (96px)
// therefore doubles the default 48px gap above a category intro.
// 'categoryStart' (category intro cards): extra space ABOVE, to separate
// the new category from the previous one, and a tighter gap BELOW so the
// intro card reads as attached to its first subsection header.
const SECTION_SPACING = {
  categoryStart: 'mt-24 mb-6',
};

export function resolveLayoutClasses(resolved) {
    const {
      variant,
      columns = 1,
      gap = "md",
      width = "full",
      accent,
      spacing
    } = resolved;
  
    const gapClasses = {
      sm: "gap-2",
      md: "gap-4",
      lg: "gap-8",
    };
  
    const widthClasses = {
      full: "w-full",
      contained: "max-w-5xl mx-auto",
    };
  
    const gridCols = {
      1: "grid-cols-1",
      2: "grid-cols-2",
      3: "grid-cols-3",
    };
  
    const variantClasses = {
      stack: "flex flex-col",
      grid: `grid ${gridCols[columns] || "grid-cols-1"}`,
      split: "grid grid-cols-2",
      hero: "flex flex-col items-center text-center",
    };

    return {
      outer: `${SECTION_SPACING[spacing] || SECTION_MARGIN_BOTTOM} ${widthClasses[width]}`,
      inner: `${variantClasses[variant]} ${gapClasses[gap]}`,
      card:  [CARD_BASE, CARD_PADDING, CARD_ACCENTS[accent]?.classes, CARD_ACCENTS[accent]?.radius ?? CARD_RADIUS].filter(Boolean).join(' '),
    };
  }