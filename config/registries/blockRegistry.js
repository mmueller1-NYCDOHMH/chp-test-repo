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

import TextBlock from '@/components/content/TextBlock';
import SectionHeader from '@/components/content/SectionHeader';
import CategoryHeader from '@/components/content/CategoryHeader';
import HeroCard from '@/components/data-display/HeroCard';
import IndicatorCard from '@/components/data-display/IndicatorCard';
import IndicatorChart from '@/components/data-display/IndicatorChart';
import IndicatorChartGrid from '@/components/data-display/IndicatorChartGrid';
import CardRow from '@/components/data-display/CardRow';
import NeighborhoodOverviewHero from '@/components/data-display/NeighborhoodOverviewHero';
import CategoryInfoCards from '@/components/content/CategoryInfoCards';

export const BlockRegistry = {
  text: TextBlock,
  categoryHeader: CategoryHeader,
  sectionHeader: SectionHeader,
  heroCard: HeroCard,
  neighborhoodOverviewHero: NeighborhoodOverviewHero,
  indicatorCard: IndicatorCard,
  indicatorChart: IndicatorChart,
  indicatorChartGrid: IndicatorChartGrid,
  cardRow: CardRow,
  categoryInfoCards: CategoryInfoCards,
};
