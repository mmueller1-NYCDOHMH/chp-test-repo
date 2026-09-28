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
 * - Borough is NEVER drawn as a bar or reference tick in this chart — its
 *   value only ever appears in the expanded chart's HTML legend (see
 *   ExpandedChartLegend in ExpandableChartCard.jsx, which reads it straight
 *   from indicatorData / deriveBoroughRow, independent of this spec).
 * - Citywide's treatment depends on mode and datatype (see `isCount`):
 *     - Expanded charts: never a bar — citywide moves to the HTML legend
 *       alongside borough, so only neighborhoods are plotted.
 *     - Compact cards, raw-count indicators (isCount:true): omitted
 *       entirely. A citywide total isn't a meaningful reference point to
 *       rank against 59 CD counts the way a rate/percent is.
 *     - Compact cards, everything else (rate/percent/etc.): shown as a
 *       labeled reference marker above its sorted position — dashed rule
 *       mark (strokeDash [4,2]) so it reads as a reference line rather
 *       than a data bar.
 * - Selected neighborhood bar is highlighted (SELECTED); others are neutral gray
 * - Compact mode also prints the selected neighborhood's own value, and the
 *   comparison neighborhood's value (when one is chosen), directly above
 *   their bars (no hover required) — text label only. Unlike Citywide,
 *   these two have no dashed lead-line; their highlighted bar color
 *   already marks which bar they belong to.
 * - Tooltip shows neighborhood name and value (time period omitted for now —
 *   see the tooltip array below)
 * - Selected and Comparison CD labels always hug their own bar top at a
 *   small fixed offset — they do not defer to Citywide, so they stay close
 *   to their bar even when their rank happens to land near the reference
 *   line. The comparison CD's label sits one small step above the selected
 *   CD's label (comparison is a runtime signal, so its rank isn't known at
 *   build time — a fixed small offset above selected keeps the two
 *   distinguishable without either drifting far from its bar).
 * - In expanded mode (expanded:true), reference/selected/comparison values
 *   move to the HTML legend above the chart instead of inline text labels.
 *
 * Colors are imported from chartColors.js — see that file for the semantic
 * palette (SELECTED / COMPARISON / CITYWIDE / BOROUGH / BAR_DEFAULT). BOROUGH
 * is kept in the palette for the legend swatch in ExpandableChartCard.jsx
 * even though this file no longer renders a borough mark of its own.
 *
 * Spec structure (compact mode):
 *   layer:
 *     [0] text mark  ← Citywide label (omitted for count indicators — see isCount)
 *     [1] text mark  ← Selected CD value label
 *     [2] text mark  ← Comparison CD value label
 *     [3] rule mark  ← Citywide tick line (omitted for count indicators — see isCount)
 *     [4] bar mark   ← all bars with highlight + hover
 *
 * INPUTS:
 * @param {Object}      options
 * @param {Array}       options.data        - Array of { GeoID, GeoType, Geography, Value, DisplayValue, TimePeriod }
 * @param {number|null} options.geoId       - GeoID of selected neighborhood (null = no highlight)
 * @param {string}      options.title       - Chart title
 * @param {string}      [options.subtitle]  - Unit or description shown below title
 * @param {boolean}     [options.expanded]  - When true, renders neighborhoods only —
 *                                            citywide/borough move to the HTML legend
 * @param {string}      [options.metadataType] - Indicator type from its metadata file
 * @param {string}      [options.metadataOf]   - Indicator "of" value from metadata
 * @param {string}      [options.metadataDetail] - Indicator detail from metadata
 * @param {string}      [options.metadataUnits]  - Indicator units from metadata
 * @param {boolean}     [options.isCount]   - When true (raw count indicator, e.g. a
 *                                            death count or number of reports), the
 *                                            compact card also omits the citywide
 *                                            reference marker — a citywide total isn't
 *                                            a meaningful rank reference the way a
 *                                            rate/percent citywide value is. Ignored
 *                                            when expanded is true (citywide is always
 *                                            omitted from expanded chart bars).
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

export function buildBarChartSpec({ data, geoId, title, subtitle, metadataType, metadataOf, metadataDetail, metadataUnits, width = 'container', height = 160, expanded = false, isCount = false }) {
  const highlightTest =
    geoId != null ? `datum.GeoID === ${geoId}` : 'false';

  const subtitleText = subtitle || '';
  const metadataOfText = metadataOf
    ? `${metadataOf.charAt(0).toUpperCase()}${metadataOf.slice(1)}`
    : '';
  const valueWithUnitsCalc = metadataUnits
    ? `datum.DisplayValue + ' ' + ${JSON.stringify(metadataUnits)}`
    : 'datum.DisplayValue';


  // ── Reference-row inclusion ─────────────────────────────────────────────────
  // Borough is never plotted as a bar/tick in this chart, in any mode — its
  // value is legend-only (ExpandedChartLegend in ExpandableChartCard.jsx
  // reads it independently via deriveBoroughRow). Citywide is plotted as a
  // reference tick only in compact mode, and only for non-count indicators
  // (see isCount doc above) — expanded charts show neighborhoods only, with
  // citywide moved to the same legend as borough.
  const includeCitywide = !expanded && !isCount;

  // Expanded charts (non-count) plot Citywide + the selected CD's own borough
  // as colored reference bars, sorted in among the neighborhoods (restored
  // 2026-09-25). Count indicators skip them — a citywide/borough total would
  // dwarf every CD bar. Borough rows use GeoID 1–5; CDs use x01–x18, so the
  // CD's borough is Math.floor(geoId / 100).
  const includeRefBars = expanded && !isCount;
  const boroughId = geoId != null ? Math.floor(geoId / 100) : null;

  const chartData = data.filter(r => {
    if (r.GeoType === 'Citywide') return includeCitywide || includeRefBars;
    if (r.GeoType === 'Borough')  return includeRefBars && r.GeoID === boroughId;
    return true;
  });

  // ── dy offset computation ──────────────────────────────────────────────────
  // Citywide's reference tick uses a fixed rule-mark yOffset (-18px above bar
  // top); its LABEL sits on top of that at a fixed base height. Selected and
  // Comparison CD labels ALWAYS hug their own bar at a small fixed offset —
  // they never defer to Citywide. This keeps them readable against their own
  // bar even when their rank happens to land near the reference line (a
  // common case, since the selected neighborhood is frequently close to its
  // own citywide value). Comparison sits one small step above Selected so the
  // two stay distinguishable if their ranks coincide; Comparison's rank is a
  // runtime signal not known at build time, so this fixed relationship to
  // Selected is the only anchor available.
  //
  // Levels (near → far from the bar top):
  //   Selected CD   → NEAR_DY     (-16)  always hugs its own bar
  //   Comparison CD → NEAR_DY - 1 (-36)  always one step above Selected
  //   Citywide      → BASE_DY     (-30)  reference level

  const BASE_DY = -30;  // Citywide reference label height
  const NEAR_DY = -16;  // Selected/Comparison "hug the bar" height (always used)
  const DY_STEP = 20;   // pixels per level (positive = moves text upward)

  const sorted = [...chartData].sort((a, b) => (a.Value ?? 0) - (b.Value ?? 0));

  // ── Edge-aware label alignment (compact chart text labels only) ────────────
  // Labels centered on bars at the far left/right overflow the chart canvas.
  // `align` is a MARK property (via an expr), not an encoding channel —
  // as an encoding it was silently dropped with a console warning.
  const edgeValues  = sorted.filter(r => r.Value != null).map(r => r.Value);
  const EDGE        = 5;
  const leftCutoff  = edgeValues.length > EDGE ? edgeValues[EDGE - 1]                : (edgeValues[0] ?? 0);
  const rightCutoff = edgeValues.length > EDGE ? edgeValues[edgeValues.length - EDGE] : (edgeValues[edgeValues.length - 1] ?? 0);
  const alignExpr   = `datum.Value != null && datum.Value <= ${leftCutoff} ? 'left' : datum.Value != null && datum.Value >= ${rightCutoff} ? 'right' : 'center'`;

  const nycDy = BASE_DY;

  // Selected CD always hugs its own bar — no conditional jump away from it.
  const selDy = NEAR_DY;

  // Vega expression test for the comparison CD
  const compTest = 'comparisonGeoId !== null && datum.GeoID === comparisonGeoId';

  // Comparison CD always sits one small step above Selected, and therefore
  // stays close to its own bar too, regardless of proximity to Citywide.
  const compDy = selDy - DY_STEP;

  // ── Label transforms (compact chart only — expanded uses HTML legend) ──────
  const nycLabelCalc  = "datum.GeoType === 'Citywide' ? 'Citywide · ' + datum.DisplayValue : ''";
  // Selected CD's own value, shown above its bar so users don't have to hover to read it.
  const selLabelCalc  = `${highlightTest} ? datum.DisplayValue : ''`;
  // Comparison CD's own value — same treatment, driven by the comparisonGeoId signal.
  const compLabelCalc = `${compTest} ? datum.DisplayValue : ''`;

  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    autosize: { type: 'fit-x', contains: 'padding' },

    // A11Y (2026-09-26): short accessible name for the chart's <svg>. The
    // full text alternative (range, citywide, selected) lives in
    // ExpandableChartCard's sr-only description — see buildAriaDescription
    // in IndicatorChartGrid.jsx. config.aria:false below stops Vega from
    // exposing every bar/axis tick as its own screen-reader item (≈59+ per
    // chart), which drowned out that description.
    description: `${title ?? 'Chart'}${subtitleText ? `. ${subtitleText}` : ''}. Bar chart of NYC community districts.`,

    // Named Vega signals driven externally by VegaLiteChart.jsx via
    //   view.signal('signalName', value).run()
    // hoverGeoId     — sidebar map hover, highlights a bar light blue
    // comparisonGeoId — selected comparison neighborhood, highlights amber
    params: [
      { name: 'hoverGeoId',      value: null },
      { name: 'comparisonGeoId', value: null },
    ],

    // Pre-sorted low → high (see `sorted` above) and plotted in data order
    // (x.sort: null). A shared `sort: { field: 'Value' }` on a layered chart
    // made Vega-Lite warn "Domains that should be unioned has conflicting
    // sort properties" on every render.
    data: {
      values: sorted,
      format: { parse: { Value: 'number' } },
    },

    config: {
      aria: false, // A11Y: see `description` above
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
      { calculate: valueWithUnitsCalc, as: 'valueWithUnits' },
      // NYC, Selected, and Comparison label fields used by the compact
      // chart text layers. (Borough has no label field here — it's never
      // plotted in this chart; see the file header for where it lives.)
      { calculate: nycLabelCalc,  as: 'nycLabel' },
      { calculate: selLabelCalc,  as: 'selLabel' },
      { calculate: compLabelCalc, as: 'compLabel' },
    ],

    height: height,
    width: width,

    // Shared encoding: all sub-layers inherit this x/y sort order
    encoding: {
      x: {
        field: 'GeoID',
        type: 'ordinal',
        sort: null, // data arrives pre-sorted by Value (see data.values)
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
              // ── Citywide reference label — compact chart only, and only
              // when includeCitywide (non-count indicators; see isCount doc
              // above). Expanded charts and count-indicator compact charts
              // skip this layer entirely — Citywide isn't in the chart's
              // data in either case, so the layer would be inert anyway.
              ...(includeCitywide ? [
                {
                  mark: { type: 'text', dy: nycDy, fontSize: 11, fontWeight: 'bold', align: { expr: alignExpr } },
                  encoding: {
                    text: {
                      condition: { test: "datum.GeoType === 'Citywide'", field: 'nycLabel' },
                      value: '',
                    },
                    color: {
                      condition: { test: "datum.GeoType === 'Citywide'", value: CITYWIDE },
                      value: 'transparent',
                    },
                  },
                },
              ] : []),

              // ── Selected / Comparison text labels ─────────────────────────
              // Compact chart only — in expanded mode all labels live in the
              // HTML legend above the chart, so these layers are omitted to
              // avoid crowding.
              ...(!expanded ? [
                // Selected neighborhood's own value, shown directly above its
                // highlighted bar — text label only, no dashed lead-line.
                {
                  mark: { type: 'text', dy: selDy, fontSize: 11, fontWeight: 'bold', align: { expr: alignExpr } },
                  encoding: {
                    text: {
                      condition: { test: highlightTest, field: 'selLabel' },
                      value: '',
                    },
                    color: {
                      condition: { test: highlightTest, value: SELECTED },
                      value: 'transparent',
                    },
                  },
                },
                // Comparison neighborhood's own value — same treatment, driven
                // by the comparisonGeoId signal set interactively. Text label
                // only, no dashed lead-line.
                {
                  mark: { type: 'text', dy: compDy, fontSize: 11, fontWeight: 'bold', align: { expr: alignExpr } },
                  encoding: {
                    text: {
                      condition: { test: compTest, field: 'compLabel' },
                      value: '',
                    },
                    color: {
                      condition: { test: compTest, value: COMPARISON },
                      value: 'transparent',
                    },
                  },
                },
              ] : []),

              // ── Citywide tick rule — compact chart only, non-count indicators ──
              // Selected/Comparison intentionally have no rule mark here —
              // their highlighted bar color already marks their position.
              ...(includeCitywide ? [
                {
                  mark: { type: 'rule', yOffset: -18, strokeWidth: 2, strokeDash: [4, 2] },
                  encoding: {
                    color: {
                      condition: { test: "datum.GeoType === 'Citywide'", value: CITYWIDE },
                      value: 'transparent',
                    },
                  },
                },
              ] : []),

              // The bars themselves
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
                    //
                    // Citywide/Borough never reach this mark — both are
                    // filtered out of the chart's data before it gets here
                    // (expanded mode always; compact mode per includeCitywide/
                    // isCount above) — their values live in the HTML legend
                    // instead (ExpandedChartLegend in ExpandableChartCard.jsx).
                    condition: [
                      // Expanded-only reference bars (see includeRefBars above)
                      ...(includeRefBars ? [
                        { test: "datum.GeoType === 'Citywide'", value: CITYWIDE },
                        { test: "datum.GeoType === 'Borough'",  value: BOROUGH  },
                      ] : []),
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
                    { field: 'valueWithUnits', title: metadataOfText || 'Value' }

                    // TimePeriod removed (2026-09-04): new-format data/indicators/
                    // rows no longer carry a per-row TimePeriod field (it now lives
                    // once per indicator in data/metadata/{key}-meta.json, never
                    // merged onto these rows) — the field lookup resolved to
                    // undefined on every bar. Re-add once TimePeriod is threaded
                    // onto each row upstream.
                  ],
                },
              },
    ],
  };
}
