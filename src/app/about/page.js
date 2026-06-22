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
 * - Content is structured JSX (not markdown) because it needs kbd elements,
 *   callout boxes, and richer formatting than MarkdownRenderer supports.
 */

import Link from 'next/link';
import PageLayout from '@/components/layout/PageLayout';

const SITE_NAME   = 'Community Health Profiles · NYC';
const EMPTY_CONFIG = { sections: [] };

export const metadata = {
  title:       `About · ${SITE_NAME}`,
  description: 'How to navigate Community Health Profiles, understand the data, and get the most from the site.',
};

// ─── Small reusable prose components ─────────────────────────────────────────

function H2({ id, children }) {
  return (
    <h2
      id={id}
      className="text-lg font-semibold text-gray-900 mt-10 mb-3 pt-6 border-t border-gray-100 first:mt-0 first:pt-0 first:border-t-0"
    >
      {children}
    </h2>
  );
}

function H3({ children }) {
  return (
    <h3 className="text-sm font-semibold text-gray-800 mt-5 mb-1.5">{children}</h3>
  );
}

function P({ children }) {
  return <p className="text-sm text-gray-600 leading-relaxed mb-3">{children}</p>;
}

function Tip({ children }) {
  return (
    <div className="my-4 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 flex gap-3">
      <span className="text-blue-400 shrink-0 mt-0.5 text-base leading-none" aria-hidden="true">
        ↗
      </span>
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
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
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
    <PageLayout config={EMPTY_CONFIG} pageLabel="About">
      <article className="max-w-2xl">

        {/* ── Page title ─────────────────────────────────────────── */}
        <div className="mb-8">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-2">
            NYC Department of Health &amp; Mental Hygiene
          </p>
          <h1 className="text-2xl font-bold text-gray-900 leading-tight mb-3">
            About Community Health Profiles
          </h1>
          <p className="text-base text-gray-500 leading-relaxed">
            Community Health Profiles is a public data tool from the NYC Department of Health.
            It presents health indicators for all 59 of the city&rsquo;s community districts,
            with comparisons to borough and citywide averages, so communities, researchers,
            and policymakers can see how their neighborhood compares and where disparities exist.
          </p>
        </div>

        {/* ── Navigating the site ────────────────────────────────── */}
        <H2 id="navigating">Navigating the site</H2>

        <H3>Choosing a neighborhood</H3>
        <P>
          Every profile is scoped to a single community district. Use the search box in the
          left sidebar to find a neighborhood by name or borough — typing &ldquo;Bronx&rdquo;
          shows all Bronx districts, typing &ldquo;Harlem&rdquo; narrows to matching names.
          You can also click any district directly on the map.
        </P>
        <Tip>
          Press <Key>/</Key> anywhere on the page (outside a text field) to jump instantly
          to the neighborhood search.
        </Tip>

        <H3>Topic navigation</H3>
        <P>
          The horizontal bar near the top of the page lists the main health topic categories.
          Hovering a category opens a dropdown of subcategories — clicking one scrolls
          directly to that section. The active section is highlighted as you scroll.
        </P>

        <H3>Finding a specific indicator</H3>
        <P>
          Switch to the &ldquo;Find indicator&rdquo; tab in the left sidebar to search across
          all available indicators by name. Clicking a result scrolls the page to the
          relevant section and briefly highlights it so you can orient quickly.
        </P>

        {/* ── Comparing neighborhoods ────────────────────────────── */}
        <H2 id="comparing">Comparing neighborhoods</H2>

        <P>
          Every profile shows one neighborhood at a time, but you can add a second
          district to compare it against. Scroll down in the left sidebar&rsquo;s
          Neighborhood tab to find the &ldquo;Compare to&rdquo; field. Search for
          any other community district and select it.
        </P>

        <P>
          Once a comparison district is selected, it appears highlighted in amber
          across every bar chart on the page — your primary neighborhood stays
          highlighted in blue. The sidebar map also shows both districts, using
          the same colors, so you can see where they sit geographically relative
          to each other.
        </P>

        <P>
          A pill showing the comparison district&rsquo;s name appears in the
          sidebar. Click it to change the comparison, or click the&nbsp;×&nbsp;to
          clear it and return to single-neighborhood view. Switching your primary
          neighborhood automatically clears the comparison.
        </P>

        <Tip>
          The comparison is saved in the page URL as{' '}
          <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">
            ?compareTo=neighborhood-name
          </code>
          , so you can share a direct link to a specific two-neighborhood comparison.
        </Tip>

        {/* ── Non-obvious interactions ───────────────────────────── */}
        <H2 id="tips">Things that aren&rsquo;t obvious</H2>

        <P>
          A few interactions exist that don&rsquo;t have visible labels — they&rsquo;re
          worth knowing about.
        </P>

        <Tip>
          Once you&rsquo;ve scrolled past the page header, your neighborhood name appears
          in the thin bar below the topic navigation. <strong>Clicking it reopens the
          neighborhood picker</strong>, so you can switch districts without scrolling
          back to the top.
        </Tip>

        <Tip>
          Every indicator chart card has a <strong>&ldquo;More about this
          indicator&rdquo;</strong> link at the bottom. Hovering the card also reveals
          a <Key>i</Key> badge — pressing <Key>i</Key> while hovering opens the same
          detail panel without using the mouse.
        </Tip>

        <Tip>
          Press <Key>?</Key> anywhere on the page to open a full list of keyboard shortcuts.
        </Tip>

        <div className="my-4 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
            All keyboard shortcuts
          </p>
          <ShortcutRow keys={['/']}   description="Focus the neighborhood search" />
          <ShortcutRow keys={['i']}   description="Open indicator details (while hovering a card)" />
          <ShortcutRow keys={['Esc']} description="Close any open panel or clear search" />
          <ShortcutRow keys={['?']}   description="Show this shortcuts reference" />
        </div>

        {/* ── Understanding the data ─────────────────────────────── */}
        <H2 id="data">Understanding the data</H2>

        <H3>Community districts</H3>
        <P>
          New York City is divided into 59 community districts — administrative units
          roughly corresponding to neighborhoods. Each district has a community board
          and typically covers 50,000–200,000 residents. Profiles are scoped to these
          districts because they reflect meaningful social and geographic boundaries,
          and because most city health data is collected and reported at this level.
        </P>

        <H3>Indicators</H3>
        <P>
          Each metric shown is called an indicator — a single, well-defined measure of
          a health-related condition in a population. Examples include the share of
          adults with diagnosed diabetes, the rate of incarcerations per 100,000
          residents, or life expectancy at birth. Indicators are chosen because they
          are reliably measurable, comparable across geographies, and meaningful for
          understanding population health.
        </P>

        <H3>Comparisons</H3>
        <P>
          Most indicators show a comparison to the NYC citywide average. A value
          shown as higher or lower than citywide tells you how this community district
          compares to the city as a whole — not whether the outcome is good or bad in
          absolute terms. Some indicators (like obesity or poverty) are better when
          lower; others (like life expectancy) are better when higher. The direction
          is labeled where it applies.
        </P>

        <H3>Reading the charts</H3>
        <P>
          Bar charts show one value per community district across all 59 CDs. The
          selected neighborhood&rsquo;s bar is highlighted in blue; if a comparison
          district is active, its bar is highlighted in amber. All other districts
          appear in gray. Hovering any bar shows the district name and value. The
          citywide average is shown as a reference line.
        </P>

        {/* ── Indicator detail panel ─────────────────────────────── */}
        <H2 id="detail-panel">The indicator detail panel</H2>

        <P>
          Clicking &ldquo;More about this indicator&rdquo; on any chart card opens a
          side panel with three things:
        </P>

        <H3>Choropleth map</H3>
        <P>
          A map of all 59 community districts colored by their value for this indicator,
          from low (light blue) to high (dark blue). Hovering a district on the map
          highlights its bar in the distribution strip below.
        </P>

        <H3>Distribution strip</H3>
        <P>
          A dot-on-a-line view showing where the selected district sits among all 59 CDs.
          The selected neighborhood appears as a larger filled dot; the citywide average
          as a dashed tick. Hovering any dot shows that district&rsquo;s name and value.
          Hovering the map and hovering the strip are synced — they highlight each other.
        </P>

        <H3>Source and description</H3>
        <P>
          Each panel includes a plain-language description of what the indicator measures,
          the data source with year, and a link to the source dataset where available.
        </P>

        {/* ── Data sources ───────────────────────────────────────── */}
        <H2 id="sources">Data and methods</H2>

        <P>
          Indicators draw on multiple sources including the American Community Survey,
          NYC vital statistics, hospital discharge records, and surveys administered
          by the NYC Department of Health. Data years vary by indicator and are noted
          in each indicator&rsquo;s detail panel.
        </P>
        <P>
          For full methodology, data definitions, and source documentation, refer to
          the{' '}
          <a
            href="https://www.nyc.gov/site/doh/data/data-publications/profiles.page"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline underline-offset-2"
          >
            NYC Community Health Profiles documentation
          </a>
          .
        </P>

        {/* ── Footer nav ─────────────────────────────────────────── */}
        <div className="mt-12 pt-6 border-t border-gray-100">
          <Link
            href="/"
            className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            ← Back to neighborhood profiles
          </Link>
        </div>

      </article>
    </PageLayout>
  );
}
