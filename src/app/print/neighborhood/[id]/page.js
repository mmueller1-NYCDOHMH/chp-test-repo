/**
 * FILE: /app/print/neighborhood/[id]/page.js
 *
 * PURPOSE:
 * Route-level entry point for the printable/accessible Community Health
 * Profile — a dense, two-column indicator summary matching the NYC
 * DOHMH-style mockup Morgan shared 2026-09-09, meant to be viewed as a
 * print preview and/or sent to the browser's print-to-PDF.
 *
 * ROUTING:
 * /print/neighborhood/[id]
 * Example: /print/neighborhood/sunset-park
 * (See layout.js for why this lives under /print/... rather than nested
 * under /neighborhood/[id]/print.)
 *
 * DATA FLOW:
 * params.id → getData({ geography: id }) for the neighborhood identity +
 * loadPrintManifest() for every indicator's resolved meta/data → UI.
 * Both are the same underlying data the on-screen profile page uses
 * (getData.js, getIndicatorMeta.js, loadIndicatorData.js are untouched) —
 * only the manifest (content/print/reportManifest.json) and the layout
 * are new.
 *
 * NOTES:
 * - Server component (no 'use client')
 * - generateStaticParams mirrors src/app/neighborhood/[id]/page.js so all
 *   59 print pages prebuild at the same time as the 59 profile pages.
 */

import { notFound } from 'next/navigation';
import { getData } from '@/lib/data/getData';
import { getNeighborhoods } from '@/lib/data/getNeighborhoods';
import { loadPrintManifest } from '@/lib/data/loadPrintManifest';
import PrintButton from '@/components/print/PrintButton';
import PrintReportHeader from '@/components/print/PrintReportHeader';
import PrintLegend from '@/components/print/PrintLegend';
import PrintCategoryBlock from '@/components/print/PrintCategoryBlock';
import PrintReportFooter from '@/components/print/PrintReportFooter';

const SITE_NAME = 'Community Health Profiles · NYC';

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
      title: `Printable report · ${name} · ${SITE_NAME}`,
      description: `Printable Community Health Profile for ${name} — health indicators compared to the citywide average.`,
    };
  } catch {
    return { title: `Printable report · ${SITE_NAME}` };
  }
}

export default async function PrintNeighborhoodPage({ params }) {
  const { id } = await params;

  const neighborhoods = await getNeighborhoods();
  const isValid = neighborhoods.some(n => String(n.id) === id);
  if (!isValid) notFound();

  const data     = await getData({ geography: id });
  const manifest = loadPrintManifest();

  if (!manifest) {
    // Manifest file missing/malformed — fail loudly rather than silently
    // rendering an empty report (see loadPrintManifest.js).
    notFound();
  }

  return (
    <main
      id="main-content"
      tabIndex={-1}
      aria-label={`Printable Community Health Profile for ${data.neighborhoodName}`}
      className="max-w-[1100px] mx-auto px-6 py-6 focus:outline-none"
    >
      <PrintButton />
      <PrintReportHeader
        neighborhoodName={data.neighborhoodName}
        borough={data.borough}
        cdNumber={data.cdNumber}
      />
      <PrintLegend />

      <div className="print-columns">
        {manifest.categories.map(category => (
          <PrintCategoryBlock key={category.id} category={category} geoId={data.geoId} />
        ))}
      </div>

      <PrintReportFooter neighborhoodId={id} />
    </main>
  );
}
