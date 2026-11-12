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
 *   shortcuts) stay here because they need JSX formatting.
 * - 2026-10-01 review: every instruction on this page was checked against
 *   the current UI. Removed j/k (never implemented) and the sticky-bar
 *   neighborhood-name tip (that name was removed from StickyContextBar);
 *   detail-panel copy updated for the mini bar chart that replaced the
 *   DistributionStrip; colors updated to purple/orange; added "Saving and
 *   sharing" (export tray, copy link, print, language).
 * - SHORTCUTS below must stay in sync with SHORTCUTS in
 *   components/layout/KeyboardShortcutsButton.jsx. It can't be imported
 *   here: that file is 'use client', so a server component would receive a
 *   client reference instead of the array.
 */

import BackToProfileLink from '@/components/controls/BackToProfileLink';
import PageLayout from '@/components/layout/PageLayout';
import copy from '../../../content/site/about.json';

import HydrationSignal from '@/components/layout/HydrationSignal';
const SITE_NAME    = 'Community Health Profiles · NYC';
const EMPTY_CONFIG = { sections: [] };

const PAGE_NAV = [
  { href: '#sources',      label: 'Data and methods' },
  { href: '#data',         label: 'Understanding the data' },
  { href: '#comparing',    label: 'Comparing neighborhoods' },
  { href: '#sharing',      label: 'Saving and sharing' },
  { href: '#navigating',   label: 'Navigating the site' },
  { href: '#tips',         label: 'Things that aren\'t obvious' },
  { href: '#detail-panel', label: 'Indicator detail panel' },
];

const SHORTCUTS = [
  { keys: ['/'],   description: 'Search neighborhoods' },
  { keys: ['f'],   description: 'Search indicators' },
  { keys: ['m'],   description: 'Open neighborhood map picker' },
  { keys: ['e'],   description: 'Expand chart (hover or focus it)' },
  { keys: ['i'],   description: 'Open indicator details (hover or focus card)' },
  { keys: ['Esc'], description: 'Close panel / clear search' },
  { keys: ['?'],   description: 'Show help menu' },
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
      className="text-xl font-semibold text-gray-900 mt-14 mb-4 first:mt-0 scroll-mt-28"
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
  return <p className="text-base text-gray-700 leading-relaxed mb-4">{children}</p>;
}

function Tip({ children }) {
  // Lightbulb (not ↗, which reads as "external link"); brand tokens instead
  // of generic Tailwind blues (2026-10-09).
  return (
    <div className="my-5 bg-brand-tint border border-brand/10 rounded-xl px-5 py-4 flex gap-3">
      <svg className="w-4 h-4 text-brand shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
      </svg>
      <p className="text-sm text-gray-800 leading-relaxed m-0">{children}</p>
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

function ShortcutsCard() {
  return (
    // Plain section (no card) so it matches the "On this page" nav above it
    // in the sidebar (2026-10-09).
    <section aria-labelledby="sidebar-shortcuts-heading">
      <p id="sidebar-shortcuts-heading" className="text-sm font-semibold text-gray-600 mb-2">
        Keyboard shortcuts
      </p>
      {SHORTCUTS.map(s => (
        <ShortcutRow key={s.keys.join('+')} keys={s.keys} description={s.description} />
      ))}
      <p className="text-xs text-gray-600 leading-snug mt-3">
        Shortcuts work anywhere outside a text field. You can turn them off from the
        ? menu at the top of any profile page; Esc keeps working either way.
      </p>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AboutPage() {
  return (
    <PageLayout
      config={EMPTY_CONFIG}
      pageLabel="About"
      pageNav={PAGE_NAV}
      /* Desktop sidebar shows back link + "On this page" + shortcuts instead
         of the neighborhood search and map (2026-10-09). */
      sidebarContent={<ShortcutsCard />}
    >
      <article>

        {/* ── Back link (mobile only) ───────────────────────────────────
            On desktop the sidebar shows the back link (sticky, always in
            view), so these in-page ones are md:hidden to keep exactly one
            back button visible at a time (2026-10-09). Repeated at the
            bottom of the prose for mobile. */}
        <BackToProfileLink className="mb-6 md:hidden" />

        {/* ── Page header ────────────────────────────────────────────── */}
        <div className="mb-12 pb-10 border-b border-gray-200">
          <h1 className="text-3xl font-bold text-gray-900 leading-tight mb-4">
            {copy.pageTitle}
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed max-w-2xl">
            {copy.intro}
          </p>
        </div>

        {/* ── Body (single column; shortcuts moved to the sidebar 2026-10-09) ── */}
        <div className="max-w-3xl">

          {/* Main prose */}
          <div className="min-w-0">

            {/* ── Data sources ─────────────────────────────────────── */}
            <H2 id="sources">Data and methods</H2>

            <P>{copy.dataSources.p1}</P>
            <P>
              For full methodology, data definitions, and source documentation, refer to the{' '}
              <a
                href={copy.dataSources.sourceLink.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand hover:text-brand/80 underline underline-offset-2"
              >
                {copy.dataSources.sourceLink.text}
              </a>
              .
            </P>

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

            <H3>Small numbers and suppressed values</H3>
            <P>{copy.understandingData.smallNumbers}</P>

            {/* ── Comparing neighborhoods ──────────────────────────── */}
            <H2 id="comparing">Comparing neighborhoods</H2>

            <P>{copy.comparing.p1}</P>
            <P>{copy.comparing.p2}</P>
            <P>{copy.comparing.p3}</P>

            <Tip>
              The comparison is saved in the page URL, so you can share a direct link
              to a specific two-neighborhood comparison.
            </Tip>

            {/* ── Saving and sharing ───────────────────────────────── */}
            <H2 id="sharing">Saving and sharing</H2>

            <P>{copy.sharing.intro}</P>

            <H3>Download the data</H3>
            <P>{copy.sharing.data}</P>

            <H3>Download or embed a chart</H3>
            <P>{copy.sharing.export}</P>

            <H3>Share a link</H3>
            <P>{copy.sharing.links}</P>

            <H3>Print a full profile</H3>
            <P>{copy.sharing.print}</P>

            <H3>Other languages</H3>
            <P>{copy.sharing.language}</P>

            {/* ── Navigating the site ──────────────────────────────── */}
            <H2 id="navigating">Navigating the site</H2>

            <H3>Choosing a neighborhood</H3>
            <P>{copy.navigating.choosingNeighborhood}</P>
            <Tip>
              Press <Key>/</Key> anywhere on the page (outside a text field) to jump straight
              to the neighborhood search, or <Key>m</Key> to open the full map picker.
            </Tip>

            <H3>Topic navigation</H3>
            <P>{copy.navigating.topicNavigation}</P>

            <H3>Finding a specific indicator</H3>
            <P>{copy.navigating.findingIndicator}</P>
            <Tip>
              Press <Key>f</Key> to jump straight to indicator search.
            </Tip>

            {/* ── Non-obvious interactions ─────────────────────────── */}
            <H2 id="tips">Things that aren&rsquo;t obvious</H2>

            <P>{copy.nonObvious.intro}</P>

            <Tip>
              On a larger screen, the <strong>map icon</strong> at the left of the thin bar
              below the topic navigation reopens the neighborhood map picker, so you can switch
              districts without scrolling back to the top. On a phone, the neighborhood name at
              the top of the page does the same.
            </Tip>

            <Tip>
              A chart&rsquo;s short description is clickable — it opens the same{' '}
              <strong>Details</strong> panel as the button. Underlined terms show a
              plain-language definition when you hover over, focus, or tap them.
            </Tip>

            <Tip>
              While hovering over or focused on a chart, press <Key>i</Key> to open its details
              or <Key>e</Key> to expand it. Press <Key>?</Key> for the full list of keyboard
              shortcuts — you can also turn the shortcuts off there.
            </Tip>

            {/* ── Indicator detail panel ───────────────────────────── */}
            <H2 id="detail-panel">The indicator detail panel</H2>

            <P>{copy.detailPanel.intro}</P>

            <H3>Choropleth map</H3>
            <P>{copy.detailPanel.choropleth}</P>

            <H3>Bar chart</H3>
            <P>{copy.detailPanel.barChart}</P>

            <H3>Source and notes</H3>
            <P>{copy.detailPanel.sourceDescription}</P>

            {/* ── Footer nav ───────────────────────────────────────── */}
            <div className="mt-12 pt-6 border-t border-gray-100 md:hidden">
              <BackToProfileLink />
            </div>

          </div>

          {/* Right — keyboard shortcuts reference */}

        </div>
      </article>
      <HydrationSignal />
    </PageLayout>
  );
}
