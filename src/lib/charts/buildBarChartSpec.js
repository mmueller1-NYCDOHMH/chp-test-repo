/**
 * FILE: buildBarChartSpec.js
 *
 * PURPOSE:
 * Constructs a Vega-Lite v5 spec for the ranked bar chart used across
 * all indicator displays.
 *
 * DESCRIPTION:
 * Takes data (array of geo rows), a geoId for the currently selected
 * neighborhood, and display metadata. Returns a complete spec object
 * ready to pass to vega-embed.
 *
 * Chart design:
 * - All 59 community districts shown as bars, sorted by value (low → high)
 * - Citywide shown as a labeled reference marker above its sorted position
 * - Selected neighborhood bar is highlighted in blue; others are gray
 * - Tooltip shows neighborhood name, value, and time period
 * - Source citation rendered below the chart via vconcat
 *
 * Spec structure:
 *   layer:
 *     [0] text mark  ← Citywide label above bar
 *     [1] rule mark  ← Citywide tick line (red)
 *     [2] rule mark  ← Borough tick line (amber)
 *     [3] bar mark   ← all bars with highlight + hover
 *
 * INPUTS:
 * @param {Object}      options
 * @param {Array}       options.data        - Array of { GeoID, GeoType, Geography, Value, DisplayValue, TimePeriod }
 * @param {number|null} options.geoId       - GeoID of selected neighborhood (null = no highlight)
 * @param {string}      options.title       - Chart title
 * @param {string}      [options.subtitle]  - Unit or description shown below title
 *
 * OUTPUT:
 * A Vega-Lite v5 spec object (plain JSON-serializable).
 *
 * NOTES:
 * - Pure function: no side effects, no imports, no DOM access.
 * - The highlight test is a Vega expression string constructed at call time
 *   from geoId. Safe: geoId is always an integer or null.
 */

export function buildBarChartSpec({ data, geoId, title, subtitle, width = 'container', height = 160 }) {
  const highlightTest =
    geoId != null ? `datum.GeoID === ${geoId}` : 'false';

  const subtitleText = subtitle || '';

  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    autosize: { type: 'fit-x', contains: 'padding' },

    // Named Vega signals driven externally by VegaLiteChart.jsx via
    //   view.signal('signalName', value).run()
    // hoverGeoId     — sidebar map hover, highlights a bar light blue
    // comparisonGeoId — selected comparison neighborhood, highlights amber
    params: [
      { name: 'hoverGeoId',      value: null },
      { name: 'comparisonGeoId', value: null },
    ],

    data: {
      values: data,
      format: { parse: { Value: 'number' } },
    },

    config: {
      concat: { spacing: 16 },
      view: { stroke: 'transparent' },
      axisY: {
        domain: false,
        ticks: false,
        labelFontSize: 11,
        labelAngle: 0,
      },
      legend: { disable: true },
      scale: { invalid: { color: { value: '#9CA3AF' } } },
    },

    transform: [
      { calculate: 'datum.DisplayValue', as: 'valueLabel' },
      // Label for the NYC / Borough reference marker: "NYC · 81.5 yrs"
      // Shown above the reference bar; empty string for regular CD rows.
      {
        calculate: "datum.GeoType !== 'CD' ? datum.Geography + ' · ' + datum.DisplayValue : ''",
        as: 'refLabel',
      },
    ],

    height: height,
    width: width,

    // Shared encoding: all sub-layers inherit this x/y sort order
    encoding: {
      x: {
        field: 'GeoID',
        type: 'ordinal',
        sort: { field: 'Value', order: 'ascending' },
        axis: null,
      },
      y: {
        field: 'Value',
        type: 'quantitative',
        title: null,
        axis: {
          labelAngle: 0,
          labelFontSize: 11,
          tickCount: 3,
          // Suppress zero tick label to reduce clutter
          labelExpr:
            "(isObject(datum) ? datum.value : datum) === 0 ? '' : (isObject(datum) ? datum.value : datum)",
        },
      },
    },

    layer: [
              // Sub-layer 1: text label above reference bars (NYC + Borough)
              // Shows "NYC · 81.5 yrs" or "Borough · 79.2 yrs" above its tick.
              {
                mark: {
                  type: 'text',
                  dy: -30,
                  align: 'center',
                  fontSize: 11,
                  fontWeight: 'bold',
                },
                encoding: {
                  text: {
                    condition: {
                      test: "datum.GeoType !== 'CD'",
                      field: 'refLabel',
                    },
                    value: '',
                  },
                  color: {
                    condition: [
                      { test: "datum.GeoType === 'Citywide'", value: '#E24B4A' },
                      { test: "datum.GeoType === 'Borough'",  value: '#BA7517' },
                    ],
                    value: 'transparent',
                  },
                },
              },

              // Sub-layer 2: NYC (Citywide) tick — red
              {
                mark: { type: 'rule', yOffset: -18, strokeWidth: 2 },
                encoding: {
                  color: {
                    condition: { test: "datum.GeoType === 'Citywide'", value: '#E24B4A' },
                    value: 'transparent',
                  },
                },
              },

              // Sub-layer 3: Borough tick — amber
              {
                mark: { type: 'rule', yOffset: -18, strokeWidth: 2 },
                encoding: {
                  color: {
                    condition: { test: "datum.GeoType === 'Borough'", value: '#BA7517' },
                    value: 'transparent',
                  },
                },
              },

              // Sub-layer 3: the bars themselves
              {
                mark: { type: 'bar', cursor: 'pointer' },

                params: [
                  {
                    name: 'hover',
                    select: {
                      type: 'point',
                      on: 'mouseover',
                      clear: 'mouseout',
                    },
                  },
                ],

                encoding: {
                  color: {
                    // Conditions are evaluated in order; first match wins.
                    // 1. Selected neighborhood (static, from URL)  → solid blue
                    // 2. Comparison neighborhood (Vega signal)     → amber
                    // 3. Sidebar-map hovered (Vega signal)         → medium blue
                    // 4. Directly hovered in this chart            → light blue (#c7d2fe,
                    //    same as sidebar map hoverStyle.fillColor)
                    // 5. All other CD bars                         → gray
                    condition: [
                      {
                        test:  highlightTest,
                        value: '#2563EB',  // primary selected: solid blue
                      },
                      {
                        // Comparison neighborhood: amber — evaluated after primary
                        // so primary always wins if the two districts are the same.
                        test:  'comparisonGeoId !== null && datum.GeoID === comparisonGeoId',
                        value: '#D97706',  // comparison: amber
                      },
                      {
                        test:  'hoverGeoId !== null && datum.GeoID === hoverGeoId',
                        value: '#93c5fd',  // map-hovered: medium blue
                      },
                      {
                        // Direct chart hover — matches the sidebar map's hover fill color
                        param: 'hover',
                        empty: false,
                        value: '#c7d2fe',  // chart bar hover: light blue
                      },
                    ],
                    value: '#D1D5DB',      // all others: gray
                  },
                  stroke:      { value: 'white' },
                  strokeWidth: { value: 0.5 },
                  tooltip: [
                    { field: 'Geography', title: 'Neighborhood' },
                    { field: 'valueLabel', title: subtitleText || 'Value' },
                    { field: 'TimePeriod', title: 'Time period' },
                  ],
                },
              },
    ],
  };
}
