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

// Greedy word-wrap for chart labels: joins words into lines of at most
// maxChars (a single over-long word stays on its own line). Returns a
// '\n'-joined string for the text mark's lineBreak.
function wrapLabel(name, maxChars = 18, maxLines = Infinity, tail = '') {
  if (!name && !tail) return '';
  const lines = [];
  let line = '';
  for (const word of String(name ?? '').split(/\s+/).filter(Boolean)) {
    if (line && (line + ' ' + word).length > maxChars) { lines.push(line); line = word; }
    else line = line ? line + ' ' + word : word;
  }
  // `tail` (e.g. "· 23.1") is one unbreakable token, and may overrun the
  // line by a few chars rather than sit alone on its own line.
  if (tail) {
    if (line && (line + ' ' + tail).length > maxChars + 6) { lines.push(line); line = tail; }
    else line = line ? line + ' ' + tail : tail;
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    // Fold overflow into the last allowed line rather than dropping text.
    const kept = lines.slice(0, maxLines - 1);
    kept.push(lines.slice(maxLines - 1).join(' '));
    return kept.join('\n');
  }
  return lines.join('\n');
}

// 0-based "nice" ticks (1/2/5 × 10^k step) up to and including ≤ max.
function niceTicks(max, count = 3) {
  const raw  = max / count;
  const mag  = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm <= 1.2 ? 1 : norm <= 2.5 ? 2 : norm <= 6 ? 5 : 10) * mag;
  const out  = [];
  for (let v = 0; v <= max + step * 1e-9; v += step) out.push(+v.toPrecision(12));
  return out;
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

  // ── Label band (compact only, 2026-09-28) ─────────────────────────────────
  // Labels (Selected, Comparison, Citywide) never sit on top of bars. Instead
  // a strip of BAND px is reserved above the tallest bar (by stretching the y
  // domain — the bars keep their original `height` of plot area), every label
  // sits in that strip, and a thin leader line runs from the label down to
  // its bar top (dashed for Citywide, solid for the neighborhoods).
  //
  // Horizontal placement / collision avoidance is resolved at runtime in
  // pixel space — see "Pixel layout" below.
  const LINE_H      = 13;
  const MAX_LINES   = 3;
  const BAND        = !expanded ? LINE_H * MAX_LINES + 10 : 0;
  const HUG_ROOM    = 30;         // headroom (px) above tallest bar when not comparing
  const TEXT_Y      = BAND - 6;   // pixel y of the label's bottom line
  const LEADER_TOP  = BAND - 3;   // pixel y where leader lines end

  const sorted = chartData.map(r => ({ ...r })).sort((a, b) => (a.Value ?? 0) - (b.Value ?? 0));

  sorted.forEach((r, i) => {
    // Fixed rank for the x sort. Needed because the Citywide row is filtered
    // in/out at runtime (comparison mode): with sort:null a re-inserted row
    // is appended to the END of the ordinal domain instead of its rank.
    r._rank = i;
    r._pos  = i / Math.max(sorted.length - 1, 1);
    // Full name + value label, pre-wrapped to ≤ MAX_LINES lines ('\n'-joined)
    r._nameLabel = wrapLabel(r.Geography, 20, MAX_LINES, `· ${r.DisplayValue ?? ''}`);
  });
  const maxValue = Math.max(0, ...sorted.map(r => r.Value ?? 0));

  // Vega expression tests
  const compTest = 'comparisonGeoId !== null && datum.GeoID === comparisonGeoId';
  const nycTest  = "datum.GeoType === 'Citywide'";

  // ── Pixel layout (runtime signals) ─────────────────────────────────────────
  // Label positions are resolved in pixel space by Vega signals so they
  // respond to the actual chart width and the runtime comparison choice.
  // At most two labels: Selected ("S") plus Other ("O") = Comparison when one
  // is chosen, else Citywide (when shown). Without a comparison the selected
  // label is value-only (the page already names the neighborhood); with one,
  // both carry names so the bars aren't distinguished by color alone.
  // Widths are estimated from the longest wrapped line (CHAR_W px/char at
  // 11px bold). Placement: the left-ranked label prefers to END at its bar,
  // the right-ranked one to START at its bar; both are clamped inside the
  // chart, then pushed apart (right one first, then left one) if they'd still
  // overlap. When a label can't sit directly over its bar, a short horizontal
  // elbow joins the vertical leader to it.
  const CHAR_W   = 6.6;
  const GAP      = 10;
  const estW     = (label) => Math.ceil(Math.max(...String(label ?? '').split('\n').map(l => l.length)) * CHAR_W);
  const q        = (v) => JSON.stringify(v);
  const idsJson  = q(sorted.map(r => r.GeoID));
  const nameLbls = q(sorted.map(r => r._nameLabel));
  const nameWs   = q(sorted.map(r => estW(r._nameLabel)));
  const selRow   = geoId != null ? sorted.find(r => r.GeoID === geoId) : null;
  const cityRow  = includeCitywide ? sorted.find(r => r.GeoType === 'Citywide') : null;
  const cityLbl  = cityRow ? `Citywide · ${cityRow.DisplayValue}` : '';
  const hasSel   = !expanded && !!selRow;

  const layoutParams = hasSel ? [
    { name: 'lbBw',   expr: "bandwidth('x') / 2" },
    { name: 'lbW',    expr: 'width - 4' }, // small right margin for halo/estimate slack
    { name: 'lbCmp',  expr: 'comparisonGeoId !== null' },
    { name: 'lbSX',   expr: `scale('x', ${geoId}) + lbBw` },
    { name: 'lbSW',   expr: `lbCmp ? ${estW(selRow._nameLabel)} : ${estW(selRow.DisplayValue)}` },
    { name: 'lbSTx',  expr: `lbCmp ? ${q(selRow._nameLabel)} : ${q(String(selRow.DisplayValue ?? ''))}` },
    { name: 'lbHasO', expr: `lbCmp || ${cityRow ? 'true' : 'false'}` },
    { name: 'lbOX',   expr: `lbCmp ? scale('x', comparisonGeoId) + lbBw : ${cityRow ? `scale('x', ${cityRow.GeoID}) + lbBw` : '-1'}` },
    { name: 'lbOW',   expr: `lbCmp ? ${nameWs}[indexof(${idsJson}, comparisonGeoId)] : ${estW(cityLbl)}` },
    { name: 'lbOTx',  expr: `lbCmp ? ${nameLbls}[indexof(${idsJson}, comparisonGeoId)] : ${q(cityLbl)}` },
    // A = left-ranked label, B = right-ranked label
    { name: 'lbSFirst', expr: 'lbSX <= lbOX' },
    { name: 'lbAX',  expr: 'lbSFirst ? lbSX : lbOX' },
    { name: 'lbAW',  expr: 'lbSFirst ? lbSW : lbOW' },
    { name: 'lbBX',  expr: 'lbSFirst ? lbOX : lbSX' },
    { name: 'lbBW',  expr: 'lbSFirst ? lbOW : lbSW' },
    // Preferred left edges, clamped inside the chart
    { name: 'lbAL0', expr: 'clamp(lbAX - lbAW, 0, max(0, lbW - lbAW))' },
    { name: 'lbBL0', expr: 'clamp(lbBX, 0, max(0, lbW - lbBW))' },
    // Push apart: right label first, then left label
    { name: 'lbBL',  expr: `lbAL0 + lbAW + ${GAP} > lbBL0 ? min(max(0, lbW - lbBW), lbAL0 + lbAW + ${GAP}) : lbBL0` },
    { name: 'lbAL',  expr: `lbAL0 + lbAW + ${GAP} > lbBL ? max(0, lbBL - ${GAP} - lbAW) : lbAL0` },
    // Final left edges (single label: centered on its bar, clamped)
    { name: 'lbSL',  expr: 'lbHasO ? (lbSFirst ? lbAL : lbBL) : clamp(lbSX - lbSW / 2, 0, max(0, lbW - lbSW))' },
    { name: 'lbOL',  expr: 'lbSFirst ? lbBL : lbAL' },
  ] : [];

  // Vertical leader: bar top → label strip (per-row data, conditional color)
  const leaderLayer = (test, color, dash) => ({
    mark: { type: 'rule', strokeWidth: 1, ...(dash ? { strokeDash: [3, 2] } : {}) },
    encoding: {
      y2:    { value: LEADER_TOP },
      color: { condition: { test, value: color }, value: 'transparent' },
    },
  });
  // One-datum layers carrying pixel-positioned text / elbows.
  const oneDatum = { values: [{}] };
  const textLayer = (xSig, txtSig, test, color, halo) => ({
    data: oneDatum,
    transform: [{ filter: test }, { calculate: txtSig, as: 't' }],
    mark: {
      type: 'text', fontSize: 11, fontWeight: 'bold', lineHeight: LINE_H,
      lineBreak: '\n', baseline: 'bottom', align: 'left',
      // clip keeps these out of autosize's bounds: with fit-x, any label
      // pixel past the plot edge (width estimates are approximate) would
      // shrink the plot, which re-clamps the label, which shrinks it again.
      clip: true,
      ...(halo ? { stroke: 'white', strokeWidth: 3, strokeJoin: 'round' } : {}),
    },
    encoding: {
      x:     { value: { expr: xSig } },
      y:     { value: TEXT_Y },
      text:  { field: 't' },
      color: { value: halo ? 'white' : color },
    },
  });
  // Horizontal elbow from the bar's x to the nearest point of its label span
  // (zero-length when the label already sits over its bar).
  const elbowLayer = (barSig, leftSig, wSig, test, color, dash) => ({
    data: oneDatum,
    transform: [{ filter: test }],
    mark: { type: 'rule', strokeWidth: 1, clip: true, ...(dash ? { strokeDash: [3, 2] } : {}) },
    encoding: {
      x:     { value: { expr: barSig } },
      x2:    { value: { expr: `clamp(${barSig}, ${leftSig} + 2, ${leftSig} + ${wSig} - 2)` } },
      y:     { value: LEADER_TOP },
      y2:    { value: LEADER_TOP },
      color: { value: color },
    },
  });

  // ── Comparison mode: labels in the top strip ───────────────────────────────
  const cmpOn = 'comparisonGeoId !== null';
  const labelDefs = hasSel ? [
    // [leftSig, textSig, test, color, dashed, barSig, widthSig]
    ['lbSL', 'lbSTx', 'lbCmp', SELECTED,   false, 'lbSX', 'lbSW'],
    ['lbOL', 'lbOTx', 'lbCmp', COMPARISON, false, 'lbOX', 'lbOW'],
  ] : [];
  const vDefs = !expanded ? [
    [`${cmpOn} && ${highlightTest}`, SELECTED,   false],
    [compTest,                       COMPARISON, false],
  ] : [];

  // ── No comparison: labels hug their own bar (original treatment) ──────────
  // Selected CD value sits just above its bar; Citywide gets its dashed tick
  // + "Citywide · X" label above its bar. Edge-aware align keeps labels near
  // the chart's sides from clipping. White halo copies keep them legible.
  const HUG_SEL_DY = -6;   // baseline:'bottom' → gap from bar top
  const HUG_NYC_DY = -22;
  const hugAlign   = "datum._pos <= 0.15 ? 'left' : datum._pos >= 0.85 ? 'right' : 'center'";
  const hugLayer = (dy, test, textExpr, color, halo) => ({
    transform: [{ calculate: `${test} ? ${textExpr} : ''`, as: 'hugText' }],
    mark: {
      type: 'text', dy, fontSize: 11, fontWeight: 'bold', baseline: 'bottom',
      align: { expr: hugAlign },
      ...(halo ? { stroke: 'white', strokeWidth: 3, strokeJoin: 'round' } : {}),
    },
    encoding: {
      text:  { field: 'hugText' },
      color: { value: halo ? 'white' : color },
    },
  });
  const hugDefs = !expanded ? [
    ...(cityRow ? [[HUG_NYC_DY, `!(${cmpOn}) && ${nycTest}`, "'Citywide · ' + datum.DisplayValue", CITYWIDE]] : []),
    [HUG_SEL_DY, `!(${cmpOn}) && ${highlightTest}`, 'datum.DisplayValue', SELECTED],
  ] : [];
  // Citywide dashed tick (no-comparison only; Citywide is filtered out of the
  // data entirely while a comparison is active).
  const cityTick = cityRow ? [{
    mark: { type: 'rule', yOffset: -16, strokeWidth: 2, strokeDash: [4, 2] },
    encoding: {
      color: { condition: { test: nycTest, value: CITYWIDE }, value: 'transparent' },
    },
  }] : [];

  const leaderLayers = [
    ...cityTick,
    ...vDefs.map(([t, c, dash]) => leaderLayer(t, c, dash)),
    ...labelDefs.map(([ls, , t, c, dash, bar, w]) => elbowLayer(bar, ls, w, t, c, dash)),
  ];
  const labelLayers = [
    ...hugDefs.map(([dy, t, tx, c]) => hugLayer(dy, t, tx, c, true)),
    ...hugDefs.map(([dy, t, tx, c]) => hugLayer(dy, t, tx, c, false)),
    ...labelDefs.map(([ls, tx, t, c]) => textLayer(ls, tx, t, c, true)),
    ...labelDefs.map(([ls, tx, t, c]) => textLayer(ls, tx, t, c, false)),
  ];

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
      ...layoutParams, // label layout signals (compact only — see "Pixel layout")
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
      // Comparison mode (2026-09-28): when a comparison neighborhood is
      // active, drop the Citywide reference row (bar + dashed tick + label)
      // from compact charts so only the two neighborhoods are highlighted.
      // Reactive on the comparisonGeoId signal — Citywide reappears when the
      // comparison is cleared. No-op when Citywide isn't in the data.
      ...(includeCitywide ? [
        { filter: "comparisonGeoId === null || datum.GeoType !== 'Citywide'" },
      ] : []),
      { calculate: 'datum.DisplayValue', as: 'valueLabel' },
      { calculate: valueWithUnitsCalc, as: 'valueWithUnits' },
      // NYC, Selected, and Comparison label fields used by the compact
      // chart text layers. (Borough has no label field here — it's never
      // plotted in this chart; see the file header for where it lives.)
    ],

    height: height + BAND, // BAND = reserved label strip (compact only)
    width: width,

    // Shared encoding: all sub-layers inherit this x/y sort order
    encoding: {
      x: {
        field: 'GeoID',
        type: 'ordinal',
        // Sort by the precomputed _rank (see `sorted`) rather than sort:null —
        // stays correct when Citywide is filtered back in after a comparison
        // is cleared. (A field sort on Value made layered charts warn about
        // conflicting sort properties; _rank is an explicit, stable key.)
        sort: { field: '_rank', op: 'min' },
        axis: null,
      },
      y: {
        field: 'Value',
        type: 'quantitative',
        title: null,
        // Stretch the domain so the tallest bar tops out BAND px below the
        // chart top, leaving the label strip clear (see "Label band").
        ...(BAND > 0 && maxValue > 0 ? {
          // Total height is constant (height + BAND) so toggling comparison
          // never shifts the page. Comparison mode: tallest bar tops out BAND
          // px down (labels live in the strip). Otherwise: just enough
          // headroom (HUG_ROOM px) for labels hugging the tallest bars.
          scale: {
            domainMax: { expr: `comparisonGeoId !== null ? ${maxValue * (height + BAND) / height} : ${maxValue * (height + BAND) / (height + BAND - HUG_ROOM)}` },
            nice: false, zero: true,
          },
        } : {}),
        axis: {
          labelAngle: 0,
          labelFontSize: 11,
          tickCount: 3,
          // With the stretched domain, cap ticks/gridlines at the data max so
          // no empty gridline floats in the label strip.
          ...(BAND > 0 && maxValue > 0 ? { values: niceTicks(maxValue, 3) } : {}),
          // Suppress zero tick label to reduce clutter
          labelExpr:
            "(isObject(datum) ? datum.value : datum) === 0 ? '' : (isObject(datum) ? datum.value : datum)",
        },
      },
    },

    // Layer order = paint order (2026-09-28): rule, then bars, then label
    // halos, then labels — so labels always sit ON TOP of neighboring bars
    // (previously text layers came first and taller bars painted over them).
    layer: [
              ...leaderLayers,

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
              ...labelLayers,
    ],
  };
}
