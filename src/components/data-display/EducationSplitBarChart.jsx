'use client';

/**
 * FILE: EducationSplitBarChart.jsx
 *
 * PURPOSE:
 * "Highest level of education achieved" card (2026-09-29, per Morgan's
 * mockup). A small-multiples split bar chart: one COLUMN per education level,
 * one ROW per geography (selected neighborhood, comparison neighborhood when
 * one is active, Citywide). Each cell is a horizontal bar with its value
 * printed inside it.
 *
 * All bars share one scale (the largest value in the chart), so bar lengths
 * are comparable across columns as well as down them.
 *
 * Card chrome (header + Details, read-more, source footer, notes "?" and
 * expand buttons, expanded modal) mirrors AvertableDeathsChart.jsx so every
 * custom card looks and behaves like the standard indicator card.
 *
 * PROPS:
 *   title, subtitle, narrative, source, sourceUrl, description
 *   levels        — [{ key, label }] one per column, in display order
 *   rawData       — joined rows: { GeoID, Geography, Distribution: [{ key, value, displayValue }] }
 *   geoId         — selected neighborhood GeoID
 *   neighborhoodName
 *   indicatorKey  — card id / flyout key
 *   indicatorData — plain rows (one indicator) for the Details flyout's map
 *   anchorId
 *
 * Server data prep lives in EducationLevelSection.jsx.
 */

import { useRef, useState } from 'react';
import { useComparison } from '@/lib/context/ComparisonContext';
import { SELECTED, COMPARISON, CITYWIDE } from '@/lib/charts/chartColors';
import NotesModal from '@/components/charts/expandableChartCard/NotesModal';
import { getChartNote } from '@/config/chartNotes';
import { isSuppressedRow, getDistributionSuppressionNote } from '@/lib/utils/suppression';
import CustomExpandedChartModal from '@/components/charts/expandableChartCard/CustomExpandedChartModal';
import EmbedModal from '@/components/charts/expandableChartCard/EmbedModal';
import CardReadMore from '@/components/charts/expandableChartCard/CardReadMore';
import DetailsButton from '@/components/charts/expandableChartCard/DetailsButton';
import { useCardDetailsShortcut } from '@/components/charts/expandableChartCard/useCardDetailsShortcut';
import { useFlyout } from '@/components/core/FlyoutShell';

const CITYWIDE_GEOID = 0;

// Below this share of the column the value can't fit inside the bar, so it
// sits just to the right of it in dark text instead.
const INSIDE_LABEL_MIN_PCT = 22;

const fmtPct = (v) => `${Math.round(v * 100)}%`;

function cellsFor(row, levels) {
  const byKey = Object.fromEntries((row?.Distribution ?? []).map(s => [s.key, s]));
  return levels.map(({ key }) => {
    const s = byKey[key];
    const value = typeof s?.value === 'number' ? s.value : null;
    return {
      key,
      value,
      text: value != null ? (s.displayValue ?? fmtPct(value)) : (isSuppressedRow(s) ? '^' : '—'),
    };
  });
}

export default function EducationSplitBarChart({
  title,
  subtitle,
  narrative,
  flyoutContext = null,    // Details flyout: context sentence (above the map)
  flyoutComparison = null, // Details flyout: comparison sentence as parts (below the map, badge-styled)
  source,
  sourceUrl,
  description,
  levels = [],
  rawData = [],
  geoId,
  neighborhoodName,
  indicatorKey,
  indicatorData = [],
  anchorId,
}) {
  const { comparisonNeighborhood } = useComparison();
  const { open: openFlyout } = useFlyout();
  const [notesOpen, setNotesOpen] = useState(false);
  const [expandedOpen, setExpandedOpen] = useState(false);
  const [embedOpen, setEmbedOpen] = useState(false);
  const expandBtnRef = useRef(null);
  const embedBtnRef = useRef(null);

  const findRow = (id) => rawData.find(r => r.GeoID === id) ?? null;
  const selectedRow = findRow(geoId);
  const comparisonRow = comparisonNeighborhood ? findRow(comparisonNeighborhood.geoId) : null;
  const cityRow = findRow(CITYWIDE_GEOID);

  const series = [
    selectedRow   && { id: 'selected',   label: neighborhoodName, color: SELECTED,   emphasis: true, cells: cellsFor(selectedRow, levels) },
    comparisonRow && { id: 'comparison', label: comparisonNeighborhood.name, color: COMPARISON, emphasis: true, cells: cellsFor(comparisonRow, levels) },
    cityRow       && { id: 'citywide',   label: 'Citywide', color: CITYWIDE, emphasis: false, cells: cellsFor(cityRow, levels) },
  ].filter(Boolean);

  const sourceClean = source ? String(source).replace(/^source:\s*/i, '') : '';
  const chartNote = getChartNote(indicatorKey);
  // Suppression note (2026-10-01) — any suppressed value among the rows +
  // levels drawn on this chart → (?) dialog, expanded view and flyout.
  const suppressionNote = getDistributionSuppressionNote(
    rawData,
    series.length ? [selectedRow?.GeoID, comparisonRow?.GeoID, cityRow?.GeoID] : [],
    levels.map(l => l.key),
  );
  const hasNotes = !!(description || sourceUrl || chartNote || suppressionNote);
  const hasData = series.length > 0 && levels.length > 0;

  // Flat rows for the expanded view's CSV download.
  const csvRows = rawData.map(r => ({
    GeoID: r.GeoID,
    Geography: r.Geography,
    ...Object.fromEntries(levels.map(({ key, label }) => {
      const s = r.Distribution?.find(d => d.key === key);
      return [label, s?.displayValue ?? ''];
    })),
  }));

  function handleDetails() {
    openFlyout({
      kind: 'indicator',
      indicatorKey,
      title,
      subtitle: narrative || subtitle,
      // 2026-09-30: flyout header shows both — subtitle line under the
      // title (metadataLine) and the narrative context sentence below it.
      metadataLine: subtitle,
      flyoutContext: flyoutContext ?? narrative ?? null,
      flyoutComparison,
      source,
      sourceUrl,
      description,
      indicatorData,
      suppressionNote, // this chart's own (all levels), not just indicatorData's
      geoId,
      isPercent: true,
      higherIsBetter: true,
      chart: <SplitBars levels={levels} series={series} title={title} />,
    });
  }
  const shortcutProps = useCardDetailsShortcut(handleDetails);

  return (
    <>
      <div
        id={anchorId}
        className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col min-w-0"
        {...shortcutProps}
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-2 sm:gap-3 px-4 sm:px-5 pt-4 sm:pt-5 pb-3">
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold text-gray-900 leading-snug">{title}</h4>
            {subtitle && <p className="text-xs text-gray-600">{subtitle}</p>}
          </div>
          <DetailsButton title={title} onClick={handleDetails} />
        </div>

        {/* ── Narrative ──────────────────────────────────────────────── */}
        <CardReadMore text={narrative} onMore={handleDetails} />

        {/* ── Chart ──────────────────────────────────────────────────── */}
        <div className="px-4 sm:px-5 pt-2 pb-5 min-w-0">
          {hasData ? (
            <SplitBars levels={levels} series={series} title={title} />
          ) : (
            <div
              className="w-full flex items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-200"
              style={{ minHeight: '96px' }}
            >
              <p className="text-sm text-gray-600">No data available.</p>
            </div>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────── */}
        <div className="border-t border-gray-100 mx-4 sm:mx-5 py-4 flex items-start justify-between gap-3 mt-auto">
          {sourceClean ? (
            <p className="text-xs text-gray-600 leading-snug min-w-0">
              <span className="font-semibold text-gray-800">Source:</span> {sourceClean}
            </p>
          ) : (
            <span aria-hidden="true" />
          )}

          <div className="flex items-center gap-1.5 shrink-0">
            {hasNotes && (
              <button
                type="button"
                onClick={() => setNotesOpen(true)}
                aria-label={`Source notes for ${title}`}
                className="flex w-9 h-9 items-center justify-center rounded-md border border-brand text-brand hover:text-white hover:bg-brand transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 text-xs font-semibold"
              >
                ?
              </button>
            )}
            {hasData && (
              <button
                ref={expandBtnRef}
                type="button"
                onClick={() => setExpandedOpen(true)}
                aria-label={`Expand chart: ${title}`}
                aria-haspopup="dialog"
                className="hidden sm:flex w-9 h-9 items-center justify-center rounded-md border border-brand text-brand hover:text-white hover:bg-brand transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      <NotesModal
        open={notesOpen}
        title={title}
        sourceClean={sourceClean}
        sourceUrl={sourceUrl}
        description={description}
        note={[chartNote, suppressionNote]}
        onClose={() => setNotesOpen(false)}
      />

      <CustomExpandedChartModal
        open={expandedOpen}
        indicatorKey={indicatorKey}
        title={title}
        subtitle={subtitle}
        sourceClean={sourceClean}
        onClose={() => setExpandedOpen(false)}
        restoreFocusRef={expandBtnRef}
        embedBtnRef={embedBtnRef}
        onOpenEmbed={() => setEmbedOpen(true)}
        csvRows={csvRows}
        suppressionNote={suppressionNote}
      >
        <SplitBars levels={levels} series={series} title={title} large />
      </CustomExpandedChartModal>

      <EmbedModal
        open={embedOpen}
        indicatorKey={indicatorKey}
        title={title}
        onClose={() => setEmbedOpen(false)}
        restoreFocusRef={embedBtnRef}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * The chart itself: a label column + one column per level. Rows are
 * separated by a hairline; bars share one scale across the whole chart.
 */
function SplitBars({ levels, series, title, large = false }) {
  const max = Math.max(
    ...series.flatMap(s => s.cells.map(c => c.value ?? 0)),
    0.01,
  );
  const barH = large ? 'h-8' : 'h-6';
  const gridStyle = {
    gridTemplateColumns: `minmax(5.5rem, 0.9fr) repeat(${levels.length}, minmax(0, 1fr))`,
  };

  return (
    <div className="min-w-0">
      <div aria-hidden="true">
        {/* Column headers */}
        <div className="grid gap-x-3 sm:gap-x-4 items-end pb-2" style={gridStyle}>
          <span />
          {levels.map(l => (
            <span key={l.key} className="text-xs text-gray-700 leading-tight">{l.label}</span>
          ))}
        </div>

        {/* One row per geography */}
        {series.map(s => (
          <div
            key={s.id}
            className={`grid gap-x-3 sm:gap-x-4 items-center border-t border-gray-200 ${large ? 'py-5' : 'py-4'}`}
            style={gridStyle}
          >
            <span
              className={`text-xs leading-tight break-words ${s.emphasis ? 'font-semibold' : 'text-gray-700'}`}
              style={s.emphasis ? { color: s.color } : undefined}
            >
              {s.label}
            </span>

            {s.cells.map(c => {
              const pct = c.value != null ? (c.value / max) * 100 : 0;
              const inside = c.value != null && pct >= INSIDE_LABEL_MIN_PCT;
              return (
                <div key={c.key} className={`relative flex items-center ${barH}`}>
                  {c.value != null && (
                    <div
                      className="h-full rounded-sm flex items-center"
                      style={{ width: `${pct}%`, background: s.color }}
                    >
                      {inside && (
                        <span className="pl-1.5 text-xs font-semibold text-white tabular-nums leading-none">
                          {c.text}
                        </span>
                      )}
                    </div>
                  )}
                  {!inside && (
                    <span className="pl-1.5 text-xs font-semibold text-gray-800 tabular-nums leading-none">
                      {c.text}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Screen-reader table */}
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">Geography</th>
            {levels.map(l => <th key={l.key} scope="col">{l.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {series.map(s => (
            <tr key={s.id}>
              <th scope="row">{s.label}</th>
              {s.cells.map(c => <td key={c.key}>{c.text === '^' ? 'Suppressed' : c.text}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
