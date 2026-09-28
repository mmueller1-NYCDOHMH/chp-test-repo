/**
 * FILE: blockRegistry.js
 *
 * PURPOSE:
 * Maps config-defined block types to actual React components.
 *
 * DESCRIPTION:
 * Acts as a lookup table used by CHPBuilder (via Block) to dynamically
 * render components.
 *
 * EXAMPLE:
 * "text" → TextBlock
 * "indicatorChartGrid" → IndicatorChartGrid
 *
 * NOTES:
 * - New block types must be registered here to be usable in config
 * - Keeps rendering logic decoupled from configuration
 */

import SectionHeader from '@/components/content/SectionHeader';
import CategoryHeader from '@/components/content/CategoryHeader';
import IndicatorChartGrid from '@/components/data-display/IndicatorChartGrid';
import NeighborhoodOverviewHero from '@/components/data-display/NeighborhoodOverviewHero';
import PrematureDeathOverviewSection from '@/components/data-display/PrematureDeathOverviewSection';
import AvertableDeathsSection from '@/components/data-display/AvertableDeathsSection';

export const BlockRegistry = {
  categoryHeader: CategoryHeader,
  sectionHeader: SectionHeader,
  neighborhoodOverviewHero: NeighborhoodOverviewHero,
  indicatorChartGrid: IndicatorChartGrid,
  prematureDeathOverviewSection: PrematureDeathOverviewSection,
  avertableDeathsSection: AvertableDeathsSection,
};
