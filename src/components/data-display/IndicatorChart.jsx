/**
 * FILE: IndicatorChart.jsx
 *
 * PURPOSE:
 * Config-driven block component that renders a Vega-Lite indicator chart
 * for a single health indicator.
 *
 * DESCRIPTION:
 * This is a server component that:
 * 1. Loads indicator data via loadIndicatorData (centralized data layer)
 * 2. Receives the currently selected neighborhood's geoId via the `context` prop
 * 3. Builds the Vega-Lite spec using buildBarChartSpec
 * 4. Passes the spec to VegaLiteChart (client component) for rendering
 *
 * INPUTS (props):
 * @prop {string}      indicatorKey  - Matches filename in /data/indicators/ (e.g. "poverty")
 * @prop {string}      title         - Chart title shown above the visualization
 * @prop {string}      [subtitle]    - Unit description (e.g. "% below federal poverty level")
 * @prop {string}      [source]      - Source attribution shown below chart
 * @prop {Object}      [context]     - Page-level context object; context.geoId used to highlight bar
 *
 * ARCHITECTURE ROLE:
 * Sits between the config system (blockRegistry) and the client rendering
 * boundary (VegaLiteChart). Keeps all data loading and spec construction
 * on the server; only the DOM rendering crosses to the client.
 *
 * NOTES:
 * - Data loading is delegated to loadIndicatorData — do not use fs directly here.
 * - geoId is null when no neighborhood is selected,
 *   which renders all bars in the same gray color with no highlight.
 */

import { loadIndicatorData } from '@/lib/data/loadIndicatorData';
import { buildBarChartSpec }  from '@/lib/charts/buildBarChartSpec';
import VegaLiteChart          from '@/components/charts/VegaLiteChart';

export default function IndicatorChart({
  indicatorKey,
  title,
  subtitle,
  source,
  context,
}) {
  const data  = loadIndicatorData(indicatorKey);
  const geoId = context?.geoId ?? null;

  if (!data || data.length === 0) {
    return (
      <div
        className="w-full flex items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-200"
        style={{ minHeight: '175px' }}
        aria-label="No data available"
      >
        <p className="text-sm text-gray-400">No data available</p>
      </div>
    );
  }

  const spec = buildBarChartSpec({
    data,
    geoId,
    title: title || indicatorKey,
    subtitle,
    source,
  });

  return (
    <div className="w-full">
      <VegaLiteChart spec={spec} />
    </div>
  );
}
