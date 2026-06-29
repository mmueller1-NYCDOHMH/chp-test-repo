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
 * - Borough shown as a labeled reference marker above its sorted position (amber)
 * - Selected neighborhood bar is highlighted in blue; others are gray
 * - Tooltip shows neighborhood name, value, and time period
 * - When Citywide and Borough ticks fall within OVERLAP_THRESHOLD rank
 *   positions of each other, their labels are merged into a single combined
 *   label to prevent visual collision.
 * - In expanded mode (expanded:true), a CD tick is added above the selected
 *   neighborhood's bar showing its name and value.
 *
 * Spec structure:
 *   layer:
 *     [0] text mark  ← Citywide / Borough labels (combined when close)
 *     [1] rule mark  ← Citywide tick line (red)
 *     [2] rule mark  ← Borough tick line (amber)
 *     [3] rule mark  ← CD tick line (blue, expanded only)
 *     [4] text mark  ← CD label above bar (blue, expanded only)
 *     [5] bar mark   ← all bars with highlight + hover
 *
 * INPUTS:
 * @param {Object}      options
 * @param {Array}       options.data        - Array of { GeoID, GeoType, Geography, Value, DisplayValue, TimePeriod }
 * @param {number|null} options.geoId       - GeoID of selected neighborhood (null = no highlight)
 * @param {string}      options.title       - Chart title
 * @param {string}      [options.subtitle]  - Unit or description shown below title
 * @param {boolean}     [options.expanded]  - When true, adds a CD tick mark above the selected bar
 *
 * OUTPUT:
 * A Vega-Lite v5 spec object (plain JSON-serializable).
 *
 * NOTES:
 * - Pure function: no side effects, no imports, no DOM access.
 * - The highlight test is a Vega expression string constructed at call time
 *   from geoId. Safe: geoId is always an integer or null.
 */

import {
  SELECTED,
  COMPARISON,
  CITYWIDE,
  BOROUGH,
  HOVER_MAP,
  HOVER_CHART,
  BAR_DEFAULT,
  BAR_INVALID,
  CHOROPLETH_STOPS,
} from './chartColors';

// Number of sorted rank positions within which Citywide and Borough labels
// are considered overlapping and will be combined into one mark.
const OVERLAP_THRESHOLD = 5;

// NYC community district GeoIDs follow a borough-prefix pattern:
//   1xx = Manhattan · 2xx = Bronx · 3xx = Brooklyn · 4xx = Queens · 5xx = Staten Island
// Synthetic borough GeoIDs (100, 200, …) are safe because real CDs start at x01.
const BOROUGH_NAMES  = { 1: 'Manhattan', 2: 'Bronx', 3: 'Brooklyn', 4: 'Queens', 5: 'Staten Island' };

/**
 * When no explicit Borough row exists in the data, derive one by computing
 * the median of all CD rows that share the same borough prefix as `geoId`.
 * Returns null when derivation is not possible (no geoId, unknown prefix,
 * or no matching CD rows with values).
 */
export function deriveBoroughRow(data, geoId) {
  if (geoId == null) return null;
  const prefix = Math.floor(geoId / 100);
  const name   = BOROUGH_NAMES[prefix];
  if (!name) return null;

  const boroughCDs = data.filter(
    r => r.GeoType === 'CD' && Math.floor(r.GeoID / 100) === prefix && r.Value != null
  );
  if (!boroughCDs.length) return null;

  const values = boroughCDs.map(r => r.Value).sort((a, b) => a - b);
  const mid    = Math.floor(values.length / 2);
  const median = values.length % 2 === 0
    ? (values[mid - 1] + values[mid]) / 2
    : values[mid];

  const displayValue = median % 1 === 0
    ? String(Math.round(median))
    : median.toFixed(1);

  return {
    GeoID:        prefix * 100,   // e.g. 100 / 200 / 300 — never collides with real IDs
    GeoType:      'Borough',
    Geography:    name,
    Value:        median,
    DisplayValue: displayValue,
    TimePeriod:   boroughCDs[0]?.TimePeriod ?? '',
  };
}

export function buildBarChartSpec({ data, geoId, title, subtitle, width = 'container', height = 160, expanded = false }) {
  const highlightTest =
    geoId != null ? `datum.GeoID === ${geoId}` : 'false';

  const subtitleText = subtitle || '';

  // ── Borough row injection ──────────────────────────────────────────────────
  // Indicator data files currently contain only CD + Citywide rows.
  // If no Borough row exists, derive one from the selected CD's borough peers.
  const hasBoroughRow = data.some(r => r.GeoType === 'Borough');
  const dataWithBorough = hasBoroughRow
    ? data
    : (() => {
        const derived = deriveBoroughRow(data, geoId);
        return derived ? [...data, derived] : data;
      })();

  // ── dy offset computation ──────────────────────────────────────────────────
  // All reference ticks share the same rule-mark yOffset (-18px above bar top),
  // so their LABEL positions must be staggered vertically when multiple ticks
  // fall within OVERLAP_THRESHOLD rank positions of each other.
  //
  // Strategy:
  //   1. Sort all known reference ticks by ascending rank (left → right).
  //   2. Walk the sorted list; when consecutive ticks are within the threshold,
  //      increment a level counter. Each level adds DY_STEP upward.
  //   3. Comparison CD is unknown at build time (runtime signal), so it is
  //      always placed one step above the selected CD label.
  //
  // Default levels (no overlap):
  //   NYC / Borough  → BASE_DY     (-30)   base reference level
  //   Selected CD    → BASE_DY - 1 (-50)   one level above reference
  //   Comparison CD  → BASE_DY - 2 (-70)   one level above selected CD
  //
  // When NYC and Borough overlap, Borough shifts up by one level, pushing
  // everything above it up by one step as well.

  const BASE_DY  = -30;
  const DY_STEP  = 20;   // pixels per level (positive = moves text upward)

  const sorted     = [...dataWithBorough].sort((a, b) => (a.Value ?? 0) - (b.Value ?? 0));
  const nycIdx     = sorted.findIndex(r => r.GeoType === 'Citywide');
  const boroughIdx = sorted.findIndex(r => r.GeoType === 'Borough');

  // ── Edge-aware label alignment (compact chart text labels only) ────────────
  // Labels centered on bars at the far left/right overflow the chart canvas.
  const edgeValues  = sorted.filter(r => r.Value != null).map(r => r.Value);
  const EDGE        = 5;
  const leftCutoff  = edgeValues.length > EDGE ? edgeValues[EDGE - 1]                : (edgeValues[0] ?? 0);
  const rightCutoff = edgeValues.length > EDGE ? edgeValues[edgeValues.length - EDGE] : (edgeValues[edgeValues.length - 1] ?? 0);
  const alignExpr   = `datum.Value != null && datum.Value <= ${leftCutoff} ? 'left' : datum.Value != null && datum.Value >= ${rightCutoff} ? 'right' : 'center'`;

  // ── dy stacking for NYC / Borough labels (compact chart only) ─────────────
  // In expanded mode labels are rendered in an HTML legend; no stacking needed.
  const knownTicks = [
    ...(nycIdx     >= 0 ? [{ rank: nycIdx,     role: 'nyc',     defaultLevel: 0 }] : []),
    ...(boroughIdx >= 0 ? [{ rank: boroughIdx, role: 'borough', defaultLevel: 0 }] : []),
  ].sort((a, b) => a.rank - b.rank);

  const levelByRole = {};
  for (let i = 0; i < knownTicks.length; i++) {
    const tick = knownTicks[i];
    if (i === 0) {
      levelByRole[tick.role] = tick.defaultLevel;
    } else {
      const prev      = knownTicks[i - 1];
      const prevLevel = levelByRole[prev.role];
      const close     = tick.rank - prev.rank <= OVERLAP_THRESHOLD;
      levelByRole[tick.role] = close
        ? Math.max(tick.defaultLevel, prevLevel + 1)
        : tick.defaultLevel;
    }
  }

  const nycDy = BASE_DY - (levelByRole.nyc     ?? 0) * DY_STEP;
  const borDy = BASE_DY - (levelByRole.borough  ?? 0) * DY_STEP;

  // ── Label transforms (compact chart only — expanded uses HTML legend) ──────
  const nycLabelCalc = "datum.GeoType === 'Citywide' ? 'Citywide · ' + datum.DisplayValue : ''";
  const borLabelCalc = "datum.GeoType === 'Borough'  ? datum.Geography + ' · ' + datum.DisplayValue : ''";

  // Vega expression test for the comparison CD
  const compTest = 'comparisonGeoId !== null && datum.GeoID === comparisonGeoId';

  // In expanded mode ticks are replaced by bar coloring — no rule mark layers needed.
  const expandedLayers = [];

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
      values: dataWithBorough,
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
      scale: { invalid: { color: { value: BAR_INVALID } } },
    },

    transform: [
      { calculate: 'datum.DisplayValue', as: 'valueLabel' },
      // NYC and Borough label fields used by the compact chart text layers.
      { calculate: nycLabelCalc, as: 'nycLabel' },
      { calculate: borLabelCalc, as: 'borLabel' },
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
              // ── NYC / Borough text labels — compact chart only ────────────
              // In expanded mode all labels live in the HTML legend above the
              // chart, so these layers are omitted to avoid crowding.
              ...(!expanded ? [
                {
                  mark: { type: 'text', dy: nycDy, fontSize: 11, fontWeight: 'bold' },
                  encoding: {
                    text: {
                      condition: { test: "datum.GeoType === 'Citywide'", field: 'nycLabel' },
                      value: '',
                    },
                    color: {
                      condition: { test: "datum.GeoType === 'Citywide'", value: CITYWIDE },
                      value: 'transparent',
                    },
                    align: { expr: alignExpr },
                  },
                },
                {
                  mark: { type: 'text', dy: borDy, fontSize: 11, fontWeight: 'bold' },
                  encoding: {
                    text: {
                      condition: { test: "datum.GeoType === 'Borough'", field: 'borLabel' },
                      value: '',
                    },
                    color: {
                      condition: { test: "datum.GeoType === 'Borough'", value: BOROUGH },
                      value: 'transparent',
                    },
                    align: { expr: alignExpr },
                  },
                },
              ] : []),

              // ── NYC / Borough tick rules — compact chart only ─────────────
              // In expanded mode the reference rows are colored bars instead.
              ...(!expanded ? [
                {
                  mark: { type: 'rule', yOffset: -18, strokeWidth: 2 },
                  encoding: {
                    color: {
                      condition: { test: "datum.GeoType === 'Citywide'", value: CITYWIDE },
                      value: 'transparent',
                    },
                  },
                },
                {
                  mark: { type: 'rule', yOffset: -18, strokeWidth: 2 },
                  encoding: {
                    color: {
                      condition: { test: "datum.GeoType === 'Borough'", value: BOROUGH },
                      value: 'transparent',
                    },
                  },
                },
              ] : []),

              // Sub-layers 4–5: CD tick + label (expanded mode only)
              // Injected here as plain objects; empty array when not expanded.
              ...expandedLayers,

              // Sub-layer 5 (or 3 in compact): the bars themselves
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
                        value: SELECTED,      // primary selected neighborhood
                      },
                      {
                        // Comparison neighborhood — evaluated after primary so
                        // primary always wins when the two districts are the same.
                        test:  'comparisonGeoId !== null && datum.GeoID === comparisonGeoId',
                        value: COMPARISON,
                      },
                      // Expanded mode: color reference rows to match the legend key.
                      // Compact mode uses tick marks above bars instead.
                      ...(expanded ? [
                        { test: "datum.GeoType === 'Citywide'", value: CITYWIDE },
                        { test: "datum.GeoType === 'Borough'",  value: BOROUGH  },
                      ] : []),
                      {
                        test:  'hoverGeoId !== null && datum.GeoID === hoverGeoId',
                        value: HOVER_MAP,     // bar hovered via sidebar map
                      },
                      {
                        // Direct chart hover
                        param: 'hover',
                        empty: false,
                        value: HOVER_CHART,
                      },
                    ],
                    value: BAR_DEFAULT,       // all other bars
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
