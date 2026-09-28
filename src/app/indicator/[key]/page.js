/**
 * FILE: /app/indicator/[key]/page.js
 *
 * PURPOSE:
 * Dedicated, standalone URL for a single indicator, optionally scoped to a
 * neighborhood — the destination for every flyout's "Full page" link (see
 * FlyoutShell.jsx's header actions). Meant to be lightweight and citable:
 * no sidebar/topic-nav/app-shell chrome (unlike /neighborhood/[id], which
 * lives inside PageLayout) — just the indicator itself, so a researcher or
 * journalist can link directly to one chart.
 *
 * CURRENT STATE (2026-09-09): filled out from the previous placeholder, then
 * (same day, per Morgan) turned into a general-purpose template — a reader
 * can pick ANY indicator and/or ANY neighborhood right from the page, not
 * just the one combination the flyout linked to. Renders everything the
 * underlying data actually supports:
 *   - a "page controls" toolbar with an indicator picker (IndicatorJumper.jsx,
 *     grouped by topic) and a neighborhood picker (NeighborhoodJumper.jsx) —
 *     both just navigate to a new `/indicator/[key]?geo=[id]` URL, so the
 *     page stays a plain server-rendered route, no client-side data fetch
 *   - the CD-vs-citywide insight sentence + flagged-estimate footnote +
 *     rank-among-59 marker (same building blocks as IndicatorFlyoutContent,
 *     via compareIndicator.js)
 *   - the neighborhood-specific narrative sentence (the copy deck — content/copy/indicatorCopy.json)
 *   - the full ranked bar chart across all 59 community districts, with a
 *     legend and a "compare to another neighborhood" control
 *     (IndicatorComparisonChart.jsx — client, needs ComparisonContext)
 *   - a methodology block: source, time period, methods note, denominator
 *     source, age adjustment — everything getIndicatorMeta() actually knows
 *   - CSV + PNG downloads of the chart/data
 *
 * Layout/spacing matches the rest of the site's PageLayout.jsx conventions
 * (max-w-5xl, px-4 md:px-8 py-10) rather than the placeholder's bespoke
 * max-w-3xl/px-6/py-12 — this page has no sidebar chrome of its own, but
 * should still feel like the same product once you land on it.
 *
 * NOT included — deliberately, not an oversight: trend history over time.
 * The site's data model is a single time period per indicator (see
 * data/indicators/*.json — one Value per GeoID, no per-year series), so
 * there is no real trend data to show. Building a fake or placeholder trend
 * chart here would misrepresent the underlying data; this page only shows
 * what /data/indicators + /data/metadata actually contain.
 *
 * URL STRUCTURE:
 *   /indicator/[key]           — indicator overview, no geography selected
 *   /indicator/[key]?geo=[id]  — indicator in context of a specific neighborhood
 *
 * EXAMPLE:
 *   /indicator/child-asthma?geo=mott-haven-and-melrose
 */

import Link from 'next/link';
import { getIndicatorMeta, getAllIndicatorMeta } from '@/lib/data/getIndicatorMeta';
import { getNeighborhoods } from '@/lib/data/getNeighborhoods';
import { loadIndicatorData } from '@/lib/data/loadIndicatorData';
import { getReadyNarrativeTemplate } from '@/lib/copy/getNarrativeCopy';
import { resolveNarrative } from '@/lib/copy/resolveNarrative';
import { buildInsight, getFlaggedEstimateFootnote, getInsightBadgeClass, DIRECTION_ARROWS } from '@/lib/utils/compareIndicator';
import { isCountDatatype } from '@/components/data-display/IndicatorChartGrid';
import { SELECTED } from '@/lib/charts/chartColors';
import RankDotStrip from '@/components/data-display/RankDotStrip';
import { ComparisonProvider } from '@/lib/context/ComparisonContext';
import sectionTitles from '@/config/content/sectionTitles.json';
import IndicatorComparisonChart from './IndicatorComparisonChart';
import IndicatorJumper from './IndicatorJumper';
import NeighborhoodJumper from './NeighborhoodJumper';

const PAGE_MAX_WIDTH = 'max-w-5xl'; // matches PageLayout's <main> content width

/**
 * Pre-render the citywide (no ?geo=) version of every standard ranked-bar
 * indicator at build time — mirrors /neighborhood/[id]'s generateStaticParams.
 * Distribution-kind indicators (age-distribution, race-ethnicity) are
 * excluded: they're rendered elsewhere via ComparisonPyramidChart, never
 * through ExpandableChartCard/FlyoutShell, so no "Full page" link ever
 * points at one — see PyramidChartSection.jsx, which has no flyout/indicatorKey
 * wiring at all.
 */
export async function generateStaticParams() {
  const allMeta = getAllIndicatorMeta();
  return Object.keys(allMeta)
    .filter(key => allMeta[key]?.kind !== 'distribution')
    .map(key => ({ key }));
}

export async function generateMetadata({ params }) {
  const { key } = await params;
  const meta  = getIndicatorMeta(key);
  const title = meta?.title ?? key;
  return {
    title: `${title} — NYC Community Health Profiles`,
    description: meta?.subtitle || meta?.methodsNote || `${title} across NYC's 59 community districts.`,
  };
}

/**
 * Groups every non-distribution indicator by topic for IndicatorJumper's
 * <optgroup> list, using the same section labels the sidebar nav uses
 * (content/sectionTitles.json) — so this ~90-entry list reads as the same
 * taxonomy a reader already knows from the neighborhood profile, rather
 * than a flat alphabetical dump or a set of raw topic ids. Group order
 * follows sectionTitles.json's own key order (its file header notes that's
 * the intended display order); any indicator with an unrecognized/missing
 * topic lands in a trailing "Other" group instead of being dropped.
 */
function buildIndicatorOptions(allMeta) {
  const byTopic = new Map();
  Object.entries(allMeta).forEach(([key, meta]) => {
    if (meta?.kind === 'distribution') return; // no standalone full page for these — see the guard below
    const topicId = meta?.topic && sectionTitles[meta.topic] ? meta.topic : '__other__';
    if (!byTopic.has(topicId)) byTopic.set(topicId, []);
    byTopic.get(topicId).push({ key, title: meta?.title || key });
  });

  const groups = Object.keys(sectionTitles)
    .filter(topicId => byTopic.has(topicId))
    .map(topicId => ({
      topicId,
      label: sectionTitles[topicId],
      indicators: byTopic.get(topicId).sort((a, b) => a.title.localeCompare(b.title)),
    }));

  if (byTopic.has('__other__')) {
    groups.push({
      topicId: '__other__',
      label: 'Other',
      indicators: byTopic.get('__other__').sort((a, b) => a.title.localeCompare(b.title)),
    });
  }

  return groups;
}

export default async function IndicatorPage({ params, searchParams }) {
  const { key }  = await params;
  const sp       = await searchParams;
  const geoSlug  = sp?.geo ?? null;

  const meta   = getIndicatorMeta(key);
  const data   = loadIndicatorData(key);

  const neighborhoods = getNeighborhoods();
  const neighborhood  = geoSlug
    ? neighborhoods.find(n => n.id === geoSlug) ?? null
    : null;

  const title      = meta?.title    ?? key;
  const subtitle   = meta?.subtitle ?? null;
  const source     = meta?.source   ?? null;
  const timePeriod = meta?.timePeriod ?? null;
  const isCount    = isCountDatatype(meta?.unit, data);
  const indicatorGroups = buildIndicatorOptions(getAllIndicatorMeta());

  // Distribution-kind indicators (age-distribution, race-ethnicity) carry a
  // { Distribution: [...] } shape per row, not the single Value/DisplayValue
  // this page's chart/insight logic expects — see buildBarChartSpec.js and
  // compareIndicator.js, both built for the standard shape. These two are
  // never linked to from a flyout's "Full page" button (they render via
  // ComparisonPyramidChart, which has no flyout/indicatorKey wiring — see
  // PyramidChartSection.jsx), so this only guards a hand-typed URL. Still
  // offers the indicator jumper so a reader who lands here isn't stuck.
  if (meta?.kind === 'distribution') {
    return (
      <main id="main-content" tabIndex={-1} className="min-h-screen bg-white focus:outline-none">
        <div className="border-b border-gray-100 px-4 md:px-8 py-4">
          <div className={`${PAGE_MAX_WIDTH} mx-auto flex items-center gap-2 text-sm text-gray-600`}>
            <Link href="/" className="hover:text-blue-600 transition-colors">
              Community Health Profiles
            </Link>
            <span aria-hidden="true">›</span>
            <span className="text-gray-800 font-medium truncate">{title}</span>
          </div>
        </div>
        <div className={`${PAGE_MAX_WIDTH} mx-auto px-4 md:px-8 py-10 flex flex-col gap-6`}>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-base text-gray-600 leading-relaxed">
            {title} is shown as a distribution breakdown rather than a single ranked value, so it
            isn&rsquo;t available as a standalone chart page. You can find it in the neighborhood
            profile&rsquo;s At a Glance section instead.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 sm:items-end rounded-xl border border-gray-100 bg-gray-50 px-4 py-4 max-w-md">
            <IndicatorJumper groups={indicatorGroups} currentKey={key} geoId={neighborhood?.id ?? ''} />
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 self-start px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Browse neighborhoods
          </Link>
        </div>
      </main>
    );
  }

  // ── Neighborhood-specific narrative sentence ────────────────────────────
  // Only resolved when a neighborhood is selected (?geo=) and this indicator
  // has copy in content/copy/measure-copy.csv (Context + Comparison) — see
  // getNarrativeCopy.js and feedback_data_transforms_upstream.md.
  let narrative = null;
  const narrativeTemplate = getReadyNarrativeTemplate(key);
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
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest">
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

        {/* ── Methodology ──────────────────────────────────────────────────── */}
        {(source || meta?.methodsNote || meta?.denominatorSource || meta?.ageAdjustment || timePeriod) && (
          <div className="flex flex-col gap-5 border-t border-gray-100 pt-8">
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Methodology</h2>

            {source && (
              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Data source</p>
                <p className="text-sm text-gray-700 leading-relaxed">{source}</p>
                {meta?.sourceUrl && (
                  <a
                    href={meta.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-1 text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium self-start"
                  >
                    View source data
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )}
              </div>
            )}

            {timePeriod && (
              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Time period</p>
                <p className="text-sm text-gray-700 leading-relaxed">{timePeriod}</p>
              </div>
            )}

            {meta?.methodsNote && (
              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">About this indicator</p>
                <p className="text-sm text-gray-700 leading-relaxed">{meta.methodsNote}</p>
              </div>
            )}

            {meta?.denominatorSource && (
              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Denominator source</p>
                <p className="text-sm text-gray-700 leading-relaxed">{meta.denominatorSource}</p>
              </div>
            )}

            {meta?.ageAdjustment && (
              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Age adjustment</p>
                <p className="text-sm text-gray-700 leading-relaxed">{meta.ageAdjustment}</p>
              </div>
            )}
          </div>
        )}

        {/* CTA — back to neighborhood profile */}
        <div className="flex flex-col gap-3 border-t border-gray-100 pt-8">
          <p className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Explore in context</p>
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
    </main>
  );
}
