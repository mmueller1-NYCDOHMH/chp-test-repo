'use client';

/**
 * FILE: /app/indicator/[key]/IndicatorPageBody.jsx
 *
 * PURPOSE:
 * Everything on the standalone indicator page that depends on the selected
 * neighborhood (?geo=): breadcrumb, header eyebrow, picker values, the
 * CD-vs-citywide insight + rank, the narrative sentence, the highlighted bar
 * in the comparison chart, and the "Explore in context" CTA.
 *
 * WHY CLIENT-SIDE (PERF / STATIC HOSTING, 2026-10-13):
 * page.js used to read searchParams on the server, which forced Next to
 * render this route on every request (ƒ Dynamic) — it can't exist on the
 * static-only production host. page.js is now pre-built once per indicator
 * (citywide view, all data included) and this component reads ?geo= in the
 * browser with useSearchParams(). The Suspense fallback is the same body with
 * no neighborhood, so the pre-built HTML shows the full citywide page and the
 * neighborhood details fill in as soon as JS runs. No data is fetched or
 * transformed beyond what page.js already did — the same rows are reused.
 *
 * `methodology` is server-rendered by page.js and passed through as-is.
 */

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { resolveNarrative } from '@/lib/copy/resolveNarrative';
import { buildInsight, getFlaggedEstimateFootnote, getInsightBadgeClass, DIRECTION_ARROWS } from '@/lib/utils/compareIndicator';
import { SELECTED } from '@/lib/charts/chartColors';
import RankDotStrip from '@/components/data-display/RankDotStrip';
import { ComparisonProvider } from '@/lib/context/ComparisonContext';
import HydrationSignal from '@/components/layout/HydrationSignal';
import IndicatorComparisonChart from './IndicatorComparisonChart';
import IndicatorJumper from './IndicatorJumper';
import NeighborhoodJumper from './NeighborhoodJumper';

const PAGE_MAX_WIDTH = 'max-w-5xl'; // matches PageLayout's <main> content width

export default function IndicatorPageBody(props) {
  return (
    <Suspense fallback={<Body {...props} geoSlug={null} />}>
      <BodyWithGeo {...props} />
    </Suspense>
  );
}

function BodyWithGeo(props) {
  const searchParams = useSearchParams();
  return <Body {...props} geoSlug={searchParams?.get('geo') ?? null} />;
}

function Body({
  indicatorKey: key, title, subtitle, timePeriod, data, meta, isCount,
  neighborhoods, indicatorGroups, narrativeTemplate, methodology, geoSlug,
}) {
  const neighborhood = geoSlug
    ? neighborhoods.find(n => n.id === geoSlug) ?? null
    : null;

  // ── Neighborhood-specific narrative sentence ────────────────────────────
  // Only resolved when a neighborhood is selected (?geo=) and this indicator
  // has copy in content/copy/measure-copy.csv (Context + Comparison) — see
  // getNarrativeCopy.js and feedback_data_transforms_upstream.md.
  let narrative = null;
  if (neighborhood && narrativeTemplate) {
    narrative = resolveNarrative(narrativeTemplate, {
      rows: data,
      geoId: neighborhood.geoId,
      neighborhoodName: neighborhood.name,
      title,
    });
  }

  // ── CD-vs-citywide insight + flagged footnote + rank ────────────────────
  // Same building blocks IndicatorFlyoutContent.jsx uses for the "Details"
  // flyout, via compareIndicator.js, so the two surfaces never drift apart.
  const insight = neighborhood ? buildInsight(data, neighborhood.geoId, title) : null;

  const selectedRow = neighborhood
    ? (data ?? []).find(r => r.GeoID === neighborhood.geoId)
    : null;
  const flaggedFootnote = selectedRow?.ValueStatus === 'flagged'
    ? getFlaggedEstimateFootnote(meta?.dataSource, meta?.unit === '%')
    : null;

  // cdRows also feeds RankDotStrip below (positions each CD's dot by its
  // actual value, not just its position in this sort order).
  const cdRows = (data ?? [])
    .filter(r => r.GeoType === 'CD' && r.Value != null && !isNaN(Number(r.Value)))
    .sort((a, b) => Number(a.Value) - Number(b.Value));

  const rankData = (() => {
    if (!cdRows.length || !neighborhood) return null;
    const idx = cdRows.findIndex(r => r.GeoID === neighborhood.geoId);
    if (idx === -1) return null;
    return { rank: cdRows.length - idx, total: cdRows.length };
  })();

  // Neighborhoods offered as a comparison target should never include the
  // one already being profiled.
  const comparisonCandidates = neighborhood
    ? neighborhoods.filter(n => n.id !== neighborhood.id)
    : neighborhoods;


  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen bg-white focus:outline-none">

      {/* ── Top bar ────────────────────────────────────────────────────────── */}
      <div className="border-b border-gray-100 px-4 md:px-8 py-4">
        <div className={`${PAGE_MAX_WIDTH} mx-auto flex items-center gap-2 text-sm text-gray-600`}>
          <Link href="/" className="hover:text-blue-600 transition-colors">
            Community Health Profiles
          </Link>
          <span aria-hidden="true">›</span>
          {neighborhood ? (
            <>
              <Link
                href={`/neighborhood/${neighborhood.id}`}
                className="hover:text-blue-600 transition-colors"
              >
                {neighborhood.name}
              </Link>
              <span aria-hidden="true">›</span>
            </>
          ) : null}
          <span className="text-gray-800 font-medium truncate">{title}</span>
        </div>
      </div>

      {/* ── Page content ───────────────────────────────────────────────────── */}
      <div className={`${PAGE_MAX_WIDTH} mx-auto px-4 md:px-8 py-10 flex flex-col gap-8`}>

        {/* Header */}
        <div className="flex flex-col gap-2">
          {neighborhood && (
            <p className="text-base font-semibold text-blue-600">
              {neighborhood.name} · {neighborhood.borough}
            </p>
          )}
          <h1 className="text-3xl font-bold text-gray-900 leading-tight">{title}</h1>
          {subtitle && (
            <p className="text-base text-gray-600 leading-relaxed">{subtitle}</p>
          )}
          {timePeriod && (
            <p className="text-sm text-gray-600">{timePeriod}</p>
          )}
        </div>

        {/* ── Page controls ────────────────────────────────────────────────
            This page works as a template: pick any indicator and/or any
            neighborhood without leaving it. Grouped in one toolbar so the
            pair reads as "the controls for this page," not two unrelated
            widgets floating between the header and the content. */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6 rounded-xl border border-gray-100 bg-gray-50 px-4 py-4">
          <IndicatorJumper groups={indicatorGroups} currentKey={key} geoId={neighborhood?.id ?? ''} />
          <div className="hidden sm:block w-px self-stretch bg-gray-200" aria-hidden="true" />
          <NeighborhoodJumper
            neighborhoods={neighborhoods}
            indicatorKey={key}
            currentGeoId={neighborhood?.id ?? ''}
          />
        </div>

        {/* ── CD-vs-citywide insight ─────────────────────────────────────────
            Only when a neighborhood is selected and both rows resolved. */}
        {insight && (() => {
          const arrow = DIRECTION_ARROWS[insight.direction];
          const badge = getInsightBadgeClass(insight.direction, meta?.higherIsBetter ?? null);
          return (
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-5 py-4 flex flex-col gap-3">
              <p className="text-base text-gray-800 leading-relaxed">
                In {insight.name}, {insight.title.toLowerCase()} is{' '}
                <span className="font-semibold" style={{ color: SELECTED }}>{insight.cdDisplay}</span>.
              </p>
              <p className="text-sm text-gray-700 leading-relaxed">
                <span
                  className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border mr-1.5 ${badge}`}
                  aria-label={`${insight.label} citywide`}
                >
                  <span aria-hidden="true">{arrow}</span> {insight.label}
                </span>
                the citywide rate of {insight.cityDisplay}
              </p>
              {flaggedFootnote && (
                <p className="text-xs text-gray-600 italic leading-snug">{flaggedFootnote}</p>
              )}
              {rankData && (
                <div className="flex items-center gap-2.5 pt-1">
                  <p className="text-sm text-gray-700 leading-snug">
                    Ranked{' '}
                    <span className="font-semibold text-gray-900">{rankData.rank} of {rankData.total}</span>{' '}
                    community districts by value
                  </p>
                  <RankDotStrip cdRows={cdRows} selectedId={neighborhood.geoId} />
                </div>
              )}
            </div>
          );
        })()}

        {/* Neighborhood narrative — resolved from the copy deck (content/copy/indicatorCopy.json)
            against this neighborhood's actual data. Only renders when both a
            neighborhood is selected and the template resolved cleanly (see
            resolveNarrative.js). */}
        {narrative && (
          <div className="rounded-xl border border-gray-100 bg-blue-50/50 px-5 py-4">
            <p className="text-base text-gray-800 leading-relaxed">{narrative}</p>
          </div>
        )}

        {/* ── Cross-neighborhood comparison chart ─────────────────────────── */}
        <ComparisonProvider neighborhoods={neighborhoods}>
          <IndicatorComparisonChart
            data={data}
            geoId={neighborhood?.geoId ?? null}
            title={title}
            subtitle={subtitle}
            indicatorKey={key}
            metadataType={meta?.type}
            metadataOf={meta?.of}
            metadataDetail={meta?.detail}
            metadataUnits={meta?.units}
            isCount={isCount}
            neighborhoods={comparisonCandidates}
          />
        </ComparisonProvider>


        {methodology}

        {/* CTA — back to neighborhood profile */}
        <div className="flex flex-col gap-3 border-t border-gray-100 pt-8">
          <p className="text-base font-semibold text-gray-600">Explore in context</p>
          {neighborhood ? (
            <Link
              href={`/neighborhood/${neighborhood.id}`}
              className="inline-flex items-center gap-2 self-start px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              View {neighborhood.name} profile
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ) : (
            <Link
              href="/"
              className="inline-flex items-center gap-2 self-start px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              Browse neighborhoods
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )}
          <p className="text-xs text-gray-600">
            This indicator appears in neighborhood profiles alongside comparisons to borough and citywide averages.
          </p>
        </div>

      </div>
      <HydrationSignal />
    </main>
  );
}

