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
 * 3. Builds two Vega-Lite specs per chart: compact (card) + expanded (modal)
 * 4. Passes both specs to ExpandableChartCard for rendering
 *
 * This keeps all data loading and spec construction server-side; only
 * the interactive card shell (expand toggle) crosses to the client.
 *
 * INPUTS (props):
 * @prop {Array}  charts  - Array of chart config objects:
 *                          { indicatorKey, title, subtitle, source }
 * @prop {Object} context - Page context; context.geoId used to highlight
 *                          the selected neighborhood's bar
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
 */

import { loadIndicatorData } from '@/lib/data/loadIndicatorData';
import { buildBarChartSpec } from '@/lib/charts/buildBarChartSpec';
import ExpandableChartCard from '@/components/charts/ExpandableChartCard';

const COMPACT_WIDTH  = 'container'; // responsive — fits the card width
const COMPACT_HEIGHT = 175;
const EXPANDED_WIDTH  = 700;
const EXPANDED_HEIGHT = 360;

/**
 * Build an accessible text description for a geographic bar chart.
 * Used as the aria-describedby content in ExpandableChartCard.
 */
function buildAriaDescription({ data, title, subtitle, geoId }) {
  if (!data.length) return '';

  const cdRows      = data.filter(r => r.GeoType === 'CD');
  const nycRow      = data.find(r => r.GeoID === 0);
  const selectedRow = geoId ? data.find(r => r.GeoID === geoId) : null;

  const values = cdRows.map(r => r.Value);
  const min    = Math.min(...values);
  const max    = Math.max(...values);

  let desc = title;
  if (subtitle) desc += `. ${subtitle}`;
  desc += `. Bar chart comparing ${cdRows.length} NYC community districts.`;
  desc += ` Values range from ${min} to ${max}.`;
  if (nycRow)      desc += ` NYC citywide average: ${nycRow.DisplayValue}.`;
  if (selectedRow) desc += ` Selected neighborhood (${selectedRow.Geography}): ${selectedRow.DisplayValue}.`;

  return desc;
}

export default function IndicatorChartGrid({ charts = [], context, sectionLabel }) {
  const geoId = context?.geoId ?? null;

  const built = charts.map((chart) => {
    const data = loadIndicatorData(chart.indicatorKey);
    const base = {
      data,
      geoId,
      title:    chart.title    || chart.indicatorKey,
      subtitle: chart.subtitle,
      source:   chart.source,
    };

    return {
      key:             chart.indicatorKey,
      title:           base.title,
      subtitle:        base.subtitle,
      source:          chart.source       ?? null,
      sourceUrl:       chart.sourceUrl    ?? null,
      description:     chart.description  ?? null,
      indicatorData:   data,
      geoId,
      ariaDescription: buildAriaDescription({ ...base }),
      compactSpec:     buildBarChartSpec({ data, geoId, title: base.title, subtitle: base.subtitle, width: COMPACT_WIDTH,  height: COMPACT_HEIGHT }),
      expandedSpec:    buildBarChartSpec({ data, geoId, title: base.title, subtitle: base.subtitle, width: EXPANDED_WIDTH, height: EXPANDED_HEIGHT }),
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
          compactSpec={chart.compactSpec}
          expandedSpec={chart.expandedSpec}
          title={chart.title}
          subtitle={chart.subtitle}
          source={chart.source}
          sourceUrl={chart.sourceUrl}
          description={chart.description}
          relatedIndicators={relatedIndicators}
          indicatorData={chart.indicatorData}
          geoId={chart.geoId}
          ariaDescription={chart.ariaDescription}
          sectionLabel={sectionLabel}
        />
        );
      })}
    </div>
  );
}
