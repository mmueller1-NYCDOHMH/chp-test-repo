/**
 * FILE: /app/neighborhood/[id]/page.js
 *
 * PURPOSE:
 * Route-level entry point for a neighborhood Community Health Profile page.
 *
 * DESCRIPTION:
 * Fetches neighborhood data and passes config + data into the rendering system.
 * PageLayout lives in layout.js and is intentionally absent here — Next.js keeps
 * layout.js mounted across navigations so the sidebar and header don't re-render
 * on every neighborhood selection.
 *
 * ROUTING:
 * /neighborhood/[id]
 * Example: /neighborhood/harlem
 *
 * DATA FLOW:
 * params.id → getData({ geography: id }) → CHPBuilder → UI
 *
 * NOTES:
 * - Server component (no 'use client')
 * - Keep logic minimal — no presentation or transformation logic here
 */

import CHPBuilder from '@/components/core/CHPBuilder';
import IntroModal from '@/components/core/IntroModal';
import { pageRegistry } from '@/config/registries/pageRegistry';
import { getData } from '@/lib/data/getData';
import { getNeighborhoods } from '@/lib/data/getNeighborhoods';
import { notFound } from 'next/navigation';

const SITE_NAME = 'Community Health Profiles · NYC';

/**
 * Pre-render all 59 neighborhood pages at build time.
 * Without this, each page cold-starts as an SSR function on first hit.
 * With it, Netlify (and any other host) serves pre-built HTML instantly.
 */
export async function generateStaticParams() {
  const neighborhoods = await getNeighborhoods();
  return neighborhoods.map(n => ({ id: n.id }));
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  try {
    const data = await getData({ geography: id });
    const name = data.neighborhoodName ?? id;
    return {
      title:       `${name} · ${SITE_NAME}`,
      description: `Health indicators and outcomes for ${name}, including chronic conditions, social and economic factors, and demographic data compared to borough and citywide averages.`,
      openGraph: {
        title:       `${name} · ${SITE_NAME}`,
        description: `Explore health data for ${name}, one of NYC's 59 community districts.`,
        siteName:    SITE_NAME,
      },
    };
  } catch {
    return { title: SITE_NAME };
  }
}

export default async function NeighborhoodPage({ params }) {
  const { id } = await params;

  const config        = pageRegistry['neighborhood-profile'];
  const neighborhoods = await getNeighborhoods();

  // Validate the id against the known neighborhood list before fetching
  const isValid = neighborhoods.some(n => String(n.id) === id);
  if (!isValid) notFound();

  const data = await getData({ geography: id });

  return (
    <>
      {/* Intro modal — shown on first visit regardless of entry point */}
      <IntroModal neighborhoods={neighborhoods} />
      <CHPBuilder config={config} data={data} />
    </>
  );
}
