import { cache } from 'react';
import { getNeighborhoods } from '@/lib/data/getNeighborhoods';

/**
 * Returns page-level data for a given geography slug.
 *
 * Wrapped with React cache() so generateMetadata and the page component
 * both calling getData({ geography: id }) within the same request share
 * a single result rather than running two fetches.
 *
 * Indicator data is loaded on-demand by individual server components
 * (NeighborhoodOverviewHero, IndicatorChartGrid) via loadIndicatorData(),
 * keeping this function lightweight.
 */
export const getData = cache(async function getData({ geography }) {
  const neighborhoods = await getNeighborhoods();
  const match = neighborhoods.find(n => n.id === geography);

  return {
    neighborhoodName: match?.name     ?? geography,
    geoId:            match?.geoId    ?? null,
    borough:          match?.borough  ?? null,
    cdNumber:         match?.cdNumber ?? null,
  };
});