/**
 * FILE: /app/indicator/[key]/page.js
 *
 * PURPOSE:
 * Dedicated URL for a single indicator, optionally scoped to a neighborhood.
 *
 * CURRENT STATE: Placeholder — the full indicator page (trend history,
 * methodology, downloads, cross-neighborhood comparison) is planned for
 * Phase B. This route exists now so that flyout "Full page" links resolve
 * to a real URL that researchers and journalists can cite and bookmark.
 *
 * URL STRUCTURE:
 *   /indicator/[key]           — indicator overview, no geography selected
 *   /indicator/[key]?geo=[id]  — indicator in context of a specific neighborhood
 *
 * EXAMPLE:
 *   /indicator/child-asthma?geo=mott-haven-and-melrose
 */

import Link from 'next/link';
import { getIndicatorMeta } from '@/lib/data/getIndicatorMeta';
import { getIndicatorDescription } from '@/lib/utils/getIndicatorDescription';
import { getNeighborhoods } from '@/lib/data/getNeighborhoods';

export async function generateMetadata({ params, searchParams }) {
  const meta = getIndicatorMeta(params.key);
  const title = meta?.title ?? params.key;
  return {
    title: `${title} — NYC Community Health Profiles`,
  };
}

export default async function IndicatorPage({ params, searchParams }) {
  const { key }   = params;
  const geoSlug   = searchParams?.geo ?? null;

  const meta        = getIndicatorMeta(key);
  const description = getIndicatorDescription(key);
  const neighborhoods = getNeighborhoods();
  const neighborhood  = geoSlug
    ? neighborhoods.find(n => n.id === geoSlug) ?? null
    : null;

  const title    = meta?.title    ?? key;
  const subtitle = meta?.subtitle ?? null;
  const source   = meta?.source   ?? null;
  const timePeriod = meta?.timePeriod ?? null;

  return (
    <main className="min-h-screen bg-white">

      {/* ── Top bar ────────────────────────────────────────────────────────── */}
      <div className="border-b border-gray-100 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-2 text-sm text-gray-500">
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
      <div className="max-w-3xl mx-auto px-6 py-12 flex flex-col gap-8">

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
            <p className="text-sm text-gray-400">{timePeriod}</p>
          )}
        </div>

        {/* Placeholder notice */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 flex gap-3">
          <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-amber-800">Full indicator page coming soon</p>
            <p className="text-sm text-amber-700 leading-relaxed">
              This page will include trend history, methodology, downloads, and cross-neighborhood
              comparisons. For now, explore this indicator in a neighborhood profile.
            </p>
          </div>
        </div>

        {/* Description */}
        {description && (
          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">About this indicator</h2>
            <p className="text-base text-gray-700 leading-relaxed">{description}</p>
          </div>
        )}

        {/* Source */}
        {source && (
          <div className="flex flex-col gap-1 border-t border-gray-100 pt-6">
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Data source</p>
            <p className="text-sm text-gray-600 leading-relaxed">{source}</p>
            {meta?.sourceUrl && (
              <a
                href={meta.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-1 text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium"
              >
                View source data
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
          </div>
        )}

        {/* CTA — back to neighborhood profile */}
        <div className="flex flex-col gap-3 border-t border-gray-100 pt-6">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Explore in context</p>
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
          <p className="text-xs text-gray-400">
            This indicator appears in neighborhood profiles alongside comparisons to borough and citywide averages.
          </p>
        </div>

      </div>
    </main>
  );
}
