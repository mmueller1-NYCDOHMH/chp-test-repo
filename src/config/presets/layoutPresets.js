/**
 * FILE: layoutPresets.js
 *
 * PURPOSE:
 * Defines reusable layout configurations for sections across CHP pages.
 *
 * DESCRIPTION:
 * Provides a set of named layout presets (e.g. 'stacked', 'twoColumn', 'hero')
 * that describe how content within a section should be arranged.
 *
 * These presets are referenced in page config and resolved at runtime
 * into Tailwind CSS classes via resolveLayoutClasses.
 *
 * DATA FLOW:
 * config.layout → layoutPresets → resolveLayoutClasses → SectionWrapper → UI
 *
 * RESPONSIBILITIES:
 * - Standardize layout patterns across the application
 * - Prevent repetition of layout logic in page config
 * - Provide a simple, semantic API for defining section layouts
 *
 * EXAMPLE:
 * layout: 'twoColumn'
 * → maps to:
 * {
 *   variant: 'grid',
 *   columns: 2,
 *   gap: 'lg',
 *   width: 'contained'
 * }
 *
 * NOTES:
 * - Presets are purely declarative (no logic)
 * - New layouts should be added here, not hardcoded in components
 * - Works in combination with resolveLayoutClasses to produce final styling
 *
 * FUTURE CONSIDERATIONS:
 * - Add responsive variants (e.g. mobile vs desktop layouts)
 * - Extend with alignment or ordering options
 */
export const layoutPresets = {
    stacked: {
      variant: "stack",
      gap: "md",
      width: "contained"
    },
  
    twoColumn: {
      variant: "grid",
      columns: 2,
      gap: "lg",
      width: "contained"
    },
  
    hero: {
      variant: "hero",
      gap: "lg",
      width: "contained"
    },
  
    split: {
      variant: "split",
      gap: "md",
      width: "contained"
    },

    // cardRow: section has no outer card wrapper.
    // Use when the section contains blocks that carry their own card styling
    // (e.g. IndicatorChartGrid, which renders individual chart cards).
    // The section title and footer blocks sit directly on the page background.
    cardRow: {
      variant: "stack",
      gap: "md",
      width: "contained",
      noCard: true
    }
  };