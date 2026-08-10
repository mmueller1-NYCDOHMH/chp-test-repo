/**
 * FILE: /app/about/page.js
 *
 * PURPOSE:
 * Static "About this tool" page — how to use the site, what the data means,
 * and non-obvious interaction tips.
 *
 * NOTES:
 * - Server component (no "use client")
 * - Uses PageLayout with an empty sections config so the sidebar and header
 *   render normally, but StickyContextBar and SectionNav are suppressed
 *   (both return null when sections is empty).
 * - Prose content (paragraphs) lives in /content/site/about.json — edit there,
 *   no code changes needed. Tip boxes and structured elements (keyboard
 *   shortcuts, code snippets) stay here because they need JSX formatting.
 */

import Link from 'next/link';
import PageLayout from '@/components/layout/PageLayout';
import copy from '../../../content/site/about.json';

const SITE_NAME    = 'Community Health Profiles · NYC';
const EMPTY_CONFIG = { sections: [] };

const PAGE_NAV = [
  { href: '#navigating',   label: 'Navigating the site' },
  { href: '#comparing',    label: 'Comparing neighborhoods' },
  { href: '#tips',         label: 'Things that aren\'t obvious' },
  { href: '#data',         label: 'Understanding the data' },
  { href: '#detail-panel', label: 'Indicator detail panel' },
  { href: '#sources',      label: 'Data and methods' },
];

export const metadata = {
  title:       `About · ${SITE_NAME}`,
  description: copy.pageDescription,
};

// ─── Prose components ─────────────────────────────────────────────────────────

function H2({ id, children }) {
  return (
    <h2
      id={id}
      className="text-xl font-semibold text-gray-900 mt-12 mb-4 pt-8 border-t border-gray-100 first:mt-0 first:pt-0 first:border-t-0"
    >
      {children}
    </h2>
  );
}

function H3({ children }) {
  return (
    <h3 className="text-base font-semibold text-gray-800 mt-6 mb-2">{children}</h3>
  );
}

function P({ children }) {
  return <p className="text-base text-gray-600 leading-relaxed mb-4">{children}</p>;
}

function Tip({ children }) {
  return (
    <div className="my-5 bg-blue-50 border border-blue-100 rounded-xl px-5 py-4 flex gap-3">
      <span className="text-blue-400 shrink-0 mt-0.5 text-base leading-none" aria-hidden="true">↗</span>
      <p className="text-sm text-blue-800 leading-relaxed m-0">{children}</p>
    </div>
  );
}

function Key({ children }) {
  return (
    <kbd className="inline-block font-mono text-xs bg-gray-100 border border-gray-300 rounded px-1.5 py-0.5 text-gray-700 leading-none mx-0.5">
      {children}
    </kbd>
  );
}

function ShortcutRow({ keys, description }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-600">{description}</span>
      <div className="flex gap-1 shrink-0 ml-4">
        {keys.map(k => <Key key={k}>{k}</Key>)}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AboutPage() {
  return (
    <PageLayout config={EMPTY_CONFIG} pageLabel="About" pageNav={PAGE_NAV}>
      <article>

        {/* ── Page header ────────────────────────────────────────────── */}
        <div className="mb-10 pb-10 border-b border-gray-100">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-3">
            {copy.deptLabel}
          </p>
          <h1 className="text-3xl font-bold text-gray-900 leading-tight mb-4">
            {copy.pageTitle}
          </h1>
          <p className="text-lg text-gray-500 leading-relaxed max-w-2xl">
            {copy.intro}
          </p>
        </div>

        {/* ── Two-column body ────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-12 items-start">

          {/* Left — main prose */}
          <div className="min-w-0">

            {/* ── Navigating the site ──────────────────────────────── */}
            <H2 id="navigating">Navigating the site</H2>

            <H3>Choosing a neighborhood</H3>
            <P>{copy.navigating.choosingNeighborhood}</P>
            <Tip>
              Press <Key>/</Key> anywhere on the page (outside a text field) to jump instantly
              to the neighborhood search.
            </Tip>

            <H3>Topic navigation</H3>
            <P>{copy.navigating.topicNavigation}</P>

            <H3>Finding a specific indicator</H3>
            <P>{copy.navigating.findingIndicator}</P>

            {/* ── Comparing neighborhoods ──────────────────────────── */}
            <H2 id="comparing">Comparing neighborhoods</H2>

            <P>{copy.comparing.p1}</P>
            <P>{copy.comparing.p2}</P>
            <P>{copy.comparing.p3}</P>

            <Tip>
              The comparison is saved in the page URL, so you can share a direct link
              to a specific two-neighborhood comparison.
            </Tip>

            {/* ── Non-obvious interactions ─────────────────────────── */}
            <H2 id="tips">Things that aren&rsquo;t obvious</H2>

            <P>{copy.nonObvious.intro}</P>

            <Tip>
              Once you&rsquo;ve scrolled past the page header, your neighborhood name appears
              in the thin bar below the topic navigation.{' '}
              <strong>Clicking it reopens the neighborhood picker</strong>, so you can switch
              districts without scrolling back to the top.
            </Tip>

            <Tip>
              Every indicator chart card has a <strong>Details</strong> button in the header.
              Pressing <Key>i</Key> while hovering or focusing a card opens the same panel
              without using the mouse.
            </Tip>

            <Tip>
              Press <Key>j</Key> and <Key>k</Key> to jump between sections without scrolling.
              Press <Key>?</Key> for a full list of keyboard shortcuts.
            </Tip>

            {/* ── Understanding the data ───────────────────────────── */}
            <H2 id="data">Understanding the data</H2>

            <H3>Community districts</H3>
            <P>{copy.understandingData.communityDistricts}</P>

            <H3>Indicators</H3>
            <P>{copy.understandingData.indicators}</P>

            <H3>Comparisons</H3>
            <P>{copy.understandingData.comparisons}</P>

            <H3>Reading the charts</H3>
            <P>{copy.understandingData.readingCharts}</P>

            {/* ── Indicator detail panel ───────────────────────────── */}
            <H2 id="detail-panel">The indicator detail panel</H2>

            <P>{copy.detailPanel.intro}</P>

            <H3>Choropleth map</H3>
            <P>{copy.detailPanel.choropleth}</P>

            <H3>Distribution strip</H3>
            <P>{copy.detailPanel.distributionStrip}</P>

            <H3>Source and description</H3>
            <P>{copy.detailPanel.sourceDescription}</P>

            {/* ── Data sources ─────────────────────────────────────── */}
            <H2 id="sources">Data and methods</H2>

            <P>{copy.dataSources.p1}</P>
            <P>
              For full methodology, data definitions, and source documentation, refer to the{' '}
              <a
                href={copy.dataSources.sourceLink.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline underline-offset-2"
              >
                {copy.dataSources.sourceLink.text}
              </a>
              .
            </P>

            {/* ── Footer nav ───────────────────────────────────────── */}
            <div className="mt-12 pt-6 border-t border-gray-100">
              <Link href="/" className="text-sm text-blue-600 hover:text-blue-800 transition-colors">
                ← Back to neighborhood profiles
              </Link>
            </div>

          </div>

          {/* Right — keyboard shortcuts reference */}
          <aside className="hidden lg:block">
            <div className="sticky top-32">
              <div className="bg-gray-50 border border-gray-200 rounded-xl px-5 py-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
                  Keyboard shortcuts
                </p>
                <ShortcutRow keys={['/']}   description="Search neighborhoods" />
                <ShortcutRow keys={['f']}   description="Search indicators" />
                <ShortcutRow keys={['m']}   description="Open neighborhood picker" />
                <ShortcutRow keys={['j']}   description="Next section" />
                <ShortcutRow keys={['k']}   description="Previous section" />
                <ShortcutRow keys={['i']}   description="Open indicator details" />
                <ShortcutRow keys={['e']}   description="Expand chart" />
                <ShortcutRow keys={['Esc']} description="Close panel / clear search" />
                <ShortcutRow keys={['?']}   description="Show shortcuts menu" />
              </div>
            </div>
          </aside>

        </div>
      </article>
    </PageLayout>
  );
}
