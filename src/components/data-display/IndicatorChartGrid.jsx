/**
 * FILE: IndicatorChartGrid.jsx
 *
 * PURPOSE:
 * Config-driven block that renders a row of indicator charts, each in its
 * own expandable card, arranged in a responsive 2-column grid.
 *
 * DESCRIPTION:
 * Server component that:
 * 1. Iterates over the `charts` config array
 * 2. Reads each indicator's JSON data file from /data/indicators/
 * 3. Collects the options for the card's two Vega-Lite specs — compact (card)
 *    + expanded (modal). The specs themselves are built client-side in
 *    ExpandableChartCard from indicatorData (PERF 2026-09-29, see below)
 * 4. Resolves narrative "measure copy" (the copy deck — content/copy/indicatorCopy.json) into
 *    the card's on-card subtitle, when a `status: "ready"` template exists
 *    for that indicator — falling back to the existing static subtitle
 *    otherwise
 * 5. Passes the data, spec options and the resolved subtitle to
 *    ExpandableChartCard
 *
 * Data loading and copy resolution stay server-side; the card shell and its
 * (cheap, pure) chart-spec construction run on the client.
 *
 * INPUTS (props):
 * @prop {Array}  charts  - Array of chart config objects:
 *                          { indicatorKey, title, subtitle, source }
 * @prop {Object} context - Page context; context.geoId used to highlight
 *                          the selected neighborhood's bar, context.neighborhood
 *                          (display name) used to resolve narrative copy's <Name> token
 *
 * CONFIG EXAMPLE:
 * {
 *   type: 'indicatorChartGrid',
 *   props: {
 *     charts: [
 *       { indicatorKey: 'obesity',      title: 'Adult Obesity',  subtitle: '% adults BMI ≥ 30', source: 'Source: ...' },
 *       { indicatorKey: 'child-asthma', title: 'Child Asthma ED Visits', subtitle: 'Rate per 10k', source: 'Source: ...' },
 *     ]
 *   }
 * }
 *
 * NOTES:
 * - Adding more charts to a section = add an entry to the `charts` array in config
 * - Columns stay at 2; add layout options here if 3-col ever needed
 * - Compact spec: height 160, width 340 — sized for a half-width card
 * - Expanded spec: height 360, width 700 — sized for the modal panel
 * - Indicator notes/descriptions ("?" button) come from the indicator's
 *   MethodsNote in data/metadata/{key}-meta.json (data team). No other
 *   source; indicators without one simply hide the "?" button.
 * - Citywide/Borough reference rows: compact cards drop Borough for every
 *   indicator, and also drop Citywide for raw-count indicators (a citywide
 *   total isn't a meaningful rank reference the way a rate/percent is).
 *   Expanded charts drop both — see isCountDatatype() below for how "count"
 *   is determined, and buildBarChartSpec.js's isCount param for where the
 *   distinction is actually applied to the chart.
 * - Narrative copy (2026-09-03): the visible on-card subtitle prefers a
 *   resolved narrative sentence — the deck's Context only since 2026-09-30;
 *   Comparison is flyout-only (the copy deck — content/copy/indicatorCopy.json, via
 *   getReadyNarrativeTemplates().context + resolveNarrative()) over the plain
 *   `chart.subtitle` passed in from config/metadata. Only status:"ready"
 *   rows are used — everything else (needs-copy/needs-review/blocked-on-data)
 *   falls back to the existing subtitle untouched, so unreviewed copy never
 *   ships silently. The SHORT `chart.subtitle` is still used, unchanged, as
 *   the tooltip field label inside buildBarChartSpec — a full narrative
 *   sentence there would make a broken-looking tooltip, so the two are kept
 *   deliberately separate (see displaySubtitle vs base.subtitle below).
 */

import { loadIndicatorData } from '@/lib/data/loadIndicatorData';
import { getIndicatorMeta } from '@/lib/data/getIndicatorMeta';
import { getReadyNarrativeTemplates } from '@/lib/copy/getNarrativeCopy';
import { resolveNarrative, resolveNarrativeParts, narrativePartsToString } from '@/lib/copy/resolveNarrative';
import ExpandableChartCard from '@/components/charts/ExpandableChartCard';

const COMPACT_WIDTH  = 'container'; // responsive — fits the card width
const COMPACT_HEIGHT = 175;
const EXPANDED_WIDTH  = 700;
const EXPANDED_HEIGHT = 360;

/**
 * Determine whether an indicator is a raw count (as opposed to a rate,
 * percent, or other unit-bearing measure) for the purpose of deciding
 * whether the compact card's Citywide reference marker is meaningful.
 *
 * Primary signal: the indicator's metadata `unit` (from
 * data/metadata/{key}-meta.json via getIndicatorMeta.js) — a non-blank unit
 * ("%", "Rate per 100,000 people", "Years", ...) means this is not a count.
 *
 * Fallback for blank units: some indicators (e.g. avertable-death,
 * edu-hsgrad-some-college) ship a blank `unit` in metadata even though
 * they're actually percentages — a data gap, not a count. Rather than
 * guess per indicator key, fall back to the data itself: a genuine count
 * never formats its DisplayValue with a percent sign, so if any row's
 * DisplayValue contains "%", treat the indicator as non-count regardless
 * of the blank unit.
 */
// Exported (2026-09-09) so app/indicator/[key]/page.js can apply the exact
// same count/rate classification when building its own chart spec.
export function isCountDatatype(unit, data) {
  if (unit) return false;
  return !data.some(r => typeof r.DisplayValue === 'string' && r.DisplayValue.includes('%'));
}

/**
 * Resolve the on-card subtitle for one indicator: the copy deck's Context
 * sentence (resolved for this neighborhood) when one exists, otherwise the
 * plain subtitle passed in via chart config. Never throws — a template that
 * fails to resolve (missing rows, missing geoId, unsupported token) falls
 * back to the plain subtitle too, same as having no template at all.
 *
 * 2026-09-30: Context ONLY. The Comparison sentence is flyout-only (shown
 * below the map with value badges — see resolveFlyoutCopy) and is no longer
 * appended to the card subtitle.
 */
function resolveDisplaySubtitle({ indicatorKey, fallbackSubtitle, data, geoId, neighborhoodName, title }) {
  const template = getReadyNarrativeTemplates(indicatorKey)?.context;
  if (!template) return fallbackSubtitle;

  const resolved = resolveNarrative(template, { rows: data, geoId, neighborhoodName, title });
  return resolved ?? fallbackSubtitle;
}

/**
 * Flyout copy (2026-09-28): the copy deck's Context and Comparison resolved
 * SEPARATELY, so the Details flyout can put context above the map and the
 * comparison (with its values as structured segments, for badge styling)
 * below it. Each half falls back to null independently — e.g. a context
 * sentence with an unsupported token doesn't take the comparison down too.
 */
function resolveFlyoutCopy({ indicatorKey, data, geoId, neighborhoodName, title }) {
  const t = getReadyNarrativeTemplates(indicatorKey);
  if (!t) return { flyoutContext: null, flyoutComparison: null };
  const opts = { rows: data, geoId, neighborhoodName, title };
  return {
    flyoutContext:    t.context    ? narrativePartsToString(resolveNarrativeParts(t.context, opts)) : null,
    flyoutComparison: t.comparison ? resolveNarrativeParts(t.comparison, opts) : null,
  };
}

/**
 * Build an accessible text description for a geographic bar chart.
 * Used as the aria-describedby content in ExpandableChartCard.
 */
function buildAriaDescription({ data, title, subtitle, geoId }) {
  if (!data.length) return '';

  const cdRows      = data.filter(r => r.GeoType === 'CD');
  const nycRow      = data.find(r => r.GeoID === 0);
  const selectedRow = geoId ? data.find(r => r.GeoID === geoId) : null;

  // Suppressed/missing rows carry a null Value (see the suppression note in
  // the sitewide audit / data-team open items) and a zero-CD-rows indicator
  // is plausible mid-migration — both used to reach Math.min/max with an
  // empty or null-filled array, producing "Values range from Infinity to
  // -Infinity" in the accessible description. Filter to real numbers and
  // skip the range sentence entirely when none remain.
  //
  // A11Y (2026-09-26): the range now reads from the min/max ROWS'
  // DisplayValue (e.g. "8%") instead of the raw Value. Raw values are 0–1
  // fractions for percent indicators, so screen readers used to hear
  // "Values range from 0.08 to 0.41" next to "citywide average: 23%".
  // Naming the lowest/highest district also gives a concrete finding.
  const valued = cdRows.filter(r => typeof r.Value === 'number' && !Number.isNaN(r.Value));
  const cleanName = (g) => String(g ?? '').replace(/\s*\(CD\d+\)/i, '').trim();

  let desc = title;
  if (subtitle) desc += `. ${subtitle}`;
  desc += `. Bar chart comparing ${cdRows.length} NYC community districts.`;
  if (valued.length) {
    const lo = valued.reduce((a, b) => (b.Value < a.Value ? b : a));
    const hi = valued.reduce((a, b) => (b.Value > a.Value ? b : a));
    desc += ` Values range from ${lo.DisplayValue ?? lo.Value} (${cleanName(lo.Geography)}) to ${hi.DisplayValue ?? hi.Value} (${cleanName(hi.Geography)}).`;
  }
  if (nycRow)      desc += ` NYC citywide average: ${nycRow.DisplayValue}.`;
  if (selectedRow) desc += ` Selected neighborhood (${selectedRow.Geography}): ${selectedRow.DisplayValue}.`;

  return desc;
}

export default function IndicatorChartGrid({ charts = [], context, sectionLabel, children }) {
  const geoId            = context?.geoId ?? null;
  const neighborhoodName = context?.neighborhood ?? null;

  const built = charts.map((chart) => {
    const data = loadIndicatorData(chart.indicatorKey);
    const isCount = isCountDatatype(chart.unit, data);
    const base = {
      data,
      geoId,
      title:    chart.title    || chart.indicatorKey,
      subtitle: chart.subtitle,
      source:   chart.source,
    };

    // MethodsNote + display rules for this card. getIndicatorMeta() is
    // request-cached, so this is the same object loadSectionIndicators built.
    const meta = getIndicatorMeta(chart.indicatorKey);

    // Narrative "measure copy" — see file header. Only replaces what's shown
    // on the card and in its aria description; the chart spec below keeps
    // using base.subtitle (the short line) for its tooltip label.
    // Options shared by the card's compact + expanded chart specs (built
    // client-side in ExpandableChartCard — see PERF note below). Note the
    // SHORT base.subtitle, not the narrative displaySubtitle: it's the
    // tooltip field label inside the spec.
    const specOptions = {
      title:          base.title,
      subtitle:       base.subtitle ?? null,
      metadataType:   meta?.type   ?? null,
      metadataOf:     meta?.of     ?? null,
      metadataDetail: meta?.detail ?? null,
      metadataUnits:  meta?.units  ?? null,
      isCount,
    };

    const displaySubtitle = resolveDisplaySubtitle({
      indicatorKey:     chart.indicatorKey,
      fallbackSubtitle: base.subtitle,
      data,
      geoId,
      neighborhoodName,
      title: base.title,
    });

    const { flyoutContext, flyoutComparison } = resolveFlyoutCopy({
      indicatorKey: chart.indicatorKey,
      data,
      geoId,
      neighborhoodName,
      title: base.title,
    });

    return {
      key:             chart.indicatorKey,
      flyoutContext,
      flyoutComparison,
      title:           base.title,
      subtitle:        displaySubtitle,
      metadataOf:      meta?.of ?? null,
      metadataDetail:  meta?.detail ?? null,
      metadataUnits:   meta?.units ?? null,
      indicatorDetail: meta?.indicatorDetail ?? null,
      source:          chart.source    ?? null,
      sourceUrl:       chart.sourceUrl ?? null,
      description:     meta?.methodsNote ?? null,
      // For the small-sample-size footnote on a flagged CD row — see
      // getFlaggedEstimateFootnote() in compareIndicator.js and
      // CONTENT-GUIDE.md section 11. `chart.unit` (not the copy deck's
      // `unitOverride` sub-label) is the raw data-team unit already used
      // above for isCountDatatype — '%' there means "percent" here too.
      dataSource:      meta?.dataSource ?? null,
      isPercent:       chart.unit === '%',
      // For the insight badge's good/bad color — see getInsightBadgeClass-
      // style logic in IndicatorFlyoutContent.jsx. Raw up/down direction
      // alone isn't enough to color the badge; it depends on whether higher
      // is actually better for this indicator.
      higherIsBetter:  meta?.higherIsBetter ?? null,
      indicatorData:   data,
      geoId,
      ariaDescription: buildAriaDescription({ ...base, subtitle: displaySubtitle }),
      // PERF (2026-09-29): Vega specs are no longer built here. They're derived
      // entirely from `indicatorData` (already sent to the client for the
      // flyout + CSV download) plus these few options, so shipping them too
      // sent every card's data three times — ~2/3 of each neighborhood
      // page's payload. ExpandableChartCard now builds the compact spec on
      // the client (same function, same arguments, ~0.1 ms each) and the
      // expanded spec only when its modal is opened.
      compactSpecOptions:  { ...specOptions, width: COMPACT_WIDTH,  height: COMPACT_HEIGHT },
      expandedSpecOptions: { ...specOptions, width: EXPANDED_WIDTH, height: EXPANDED_HEIGHT },
    };
  });

  return (
    <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(400px, 100%), 1fr))' }}>
      {built.map((chart) => {
        // Related = other charts in the same grid (excluding self)
        const relatedIndicators = built
          .filter(c => c.key !== chart.key)
          .map(c => ({ indicatorKey: c.key, title: c.title }));

        return (
        <ExpandableChartCard
          key={chart.key}
          indicatorKey={chart.key}
          compactSpecOptions={chart.compactSpecOptions}
          expandedSpecOptions={chart.expandedSpecOptions}
          title={chart.title}
          subtitle={chart.subtitle}
          metadataOf={chart.metadataOf}
          metadataDetail={chart.metadataDetail}
          metadataUnits={chart.metadataUnits}
          indicatorDetail={chart.indicatorDetail}
          source={chart.source}
          sourceUrl={chart.sourceUrl}
          description={chart.description}
          dataSource={chart.dataSource}
          isPercent={chart.isPercent}
          higherIsBetter={chart.higherIsBetter}
          flyoutContext={chart.flyoutContext}
          flyoutComparison={chart.flyoutComparison}
          relatedIndicators={relatedIndicators}
          indicatorData={chart.indicatorData}
          geoId={chart.geoId}
          ariaDescription={chart.ariaDescription}
          sectionLabel={sectionLabel}
        />
        );
      })}
      {/* Bespoke cards folded into this grid (see Block.jsx extraBlocks) */}
      {children}
    </div>
  );
}
