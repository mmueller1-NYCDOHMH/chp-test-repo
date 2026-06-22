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
 */

export function resolveLayoutClasses(resolved) {
    const {
      variant,
      columns = 1,
      gap = "md",
      width = "full"
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

    const cardStyles = {
        base: "bg-white border border-gray-200 rounded-xl shadow-sm",
        padded: "p-6",
      };
  
    return {
      outer: `mb-12 ${widthClasses[width]}`,
      inner: `${variantClasses[variant]} ${gapClasses[gap]}`,
      card: `${cardStyles.base} ${cardStyles.padded}`

    };

    
  }