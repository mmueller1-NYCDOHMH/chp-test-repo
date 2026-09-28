'use client';

/**
 * FILE: IndicatorComparisonChart.jsx
 *
 * PURPOSE:
 * Client-side chart section for the standalone indicator page
 * (/indicator/[key] — see page.js). Renders the full ranked bar chart
 * across all 59 NYC community districts, built from the same
 * buildBarChartSpec() every other chart on the site uses (same "expanded"
 * mode as ExpandedChartModal), plus:
 *
 *   - the Citywide/Borough/Selected/Comparison legend (ExpandedChartLegend,
 *     reused as-is)
 *   - "Compare to another neighborhood" (ComparisonNeighborhoodSelector,
 *     reused as-is) — wired through the same ComparisonContext every other
 *     chart already listens to, so picking a second district here
 *     highlights it amber the same way it does everywhere else, no new
 *     wiring needed
 *   - "Download data (CSV)" and "Download chart (PNG)" — new for this page.
 *     No other surface currently offers a raw-data export. The PNG export
 *     follows the same title+legend+chart canvas-compositing technique as
 *     ExpandedChartModal's buildExportCanvas, kept local here rather than
 *     extracted, to avoid touching that already-shipped modal.
 *
 * Needs ComparisonContext — page.js wraps this component in a bare
 * <ComparisonProvider>, not the full <PageLayout>/<FlyoutShell> app shell,
 * since /indicator/[key] is a deliberately lightweight standalone page (see
 * page.js file header).
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import VegaLiteChart from '@/components/charts/VegaLiteChart';
import ExpandedChartLegend from '@/components/charts/expandableChartCard/ExpandedChartLegend';
import ComparisonNeighborhoodSelector from '@/components/controls/ComparisonNeighborhoodSelector';
import { buildBarChartSpec } from '@/lib/charts/buildBarChartSpec';
import { buildLegendItems } from '@/components/charts/expandableChartCard/chartCardUtils';
import { useComparison } from '@/lib/context/ComparisonContext';

const CHART_HEIGHT = 420;

export default function IndicatorComparisonChart({
  data = [],
  geoId,
  title,
  subtitle,
  indicatorKey,
  metadataType,
  metadataOf,
  metadataDetail,
  metadataUnits,
  isCount,
  neighborhoods = [],
}) {
  const { comparisonNeighborhood } = useComparison();
  const viewRef = useRef(null);
  const [csvState, setCsvState] = useState('idle'); // 'idle' | 'working' | 'done' | 'error'
  const [pngState, setPngState] = useState('idle');

  const expandedSpec = useMemo(
    () => buildBarChartSpec({
      data,
      geoId,
      title,
      subtitle,
      metadataType,
      metadataOf,
      metadataDetail,
      metadataUnits,
      width: 'container',
      height: CHART_HEIGHT,
      expanded: true,
      isCount,
    }),
    [data, geoId, title, subtitle, metadataType, metadataOf, metadataDetail, metadataUnits, isCount]
  );

  const handleViewReady = useCallback((view) => {
    viewRef.current = view;
  }, []);

  // ── CSV export ────────────────────────────────────────────────────────────
  // Every row in the indicator's data file (all 59 CDs plus Citywide/Borough
  // where present) — not just what's plotted (the chart itself drops
  // Borough always, and Citywide for raw-count indicators — see
  // buildBarChartSpec.js). The download is meant to be the complete dataset.
  function handleDownloadCsv() {
    if (!data?.length) return;
    setCsvState('working');
    try {
      const header = ['GeoID', 'GeoType', 'Geography', 'Value', 'DisplayValue'];
      const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const rows = data.map(r => [
        r.GeoID,
        r.GeoType,
        escape(r.Geography),
        r.Value ?? '',
        escape(r.DisplayValue),
      ].join(','));
      const csv = [header.join(','), ...rows].join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `${indicatorKey ?? 'indicator'}-by-community-district.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setCsvState('done');
    } catch (err) {
      console.error('[IndicatorComparisonChart] CSV export error:', err);
      setCsvState('error');
    } finally {
      setTimeout(() => setCsvState('idle'), 2000);
    }
  }

  // ── PNG export ────────────────────────────────────────────────────────────
  // Composites a title line + the same legend items shown above the chart
  // (as colored dots + labels, since the live legend is HTML, not part of
  // the Vega canvas) above the chart image, so the downloaded file reads
  // correctly on its own once shared outside the page.
  async function handleDownloadPng() {
    const view = viewRef.current;
    if (!view) return;
    setPngState('working');
    try {
      const scale    = 2;
      const chartUrl = await view.toImageURL('png', scale);
      const img = new Image();
      img.src = chartUrl;
      await new Promise(resolve => { img.onload = resolve; });

      const FONT       = `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
      const PADDING    = 28 * scale;
      const TITLE_SIZE = 16 * scale;
      const LEG_SIZE   = 12 * scale;
      const LEG_ROW    = 22 * scale;
      const DOT_R      = 5  * scale;
      const BLOCK_GAP  = 18 * scale;

      const legendItems = buildLegendItems(data, geoId, comparisonNeighborhood);
      const headerH = PADDING + TITLE_SIZE + BLOCK_GAP;
      const legendH = legendItems.length ? legendItems.length * LEG_ROW + BLOCK_GAP : 0;

      const canvas  = document.createElement('canvas');
      canvas.width  = img.width;
      canvas.height = img.height + headerH + legendH;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#111827';
      ctx.font      = `bold ${TITLE_SIZE}px ${FONT}`;
      ctx.fillText(title ?? '', PADDING, PADDING + TITLE_SIZE);

      if (legendItems.length) {
        ctx.font = `${LEG_SIZE}px ${FONT}`;
        legendItems.forEach((item, i) => {
          const cy = headerH + DOT_R + i * LEG_ROW + (LEG_ROW - DOT_R * 2) / 2;
          const tx = PADDING + DOT_R * 2 + 8 * scale;
          const ty = cy + LEG_SIZE * 0.36; // canvas text baseline offset

          ctx.beginPath();
          ctx.arc(PADDING + DOT_R, cy, DOT_R, 0, Math.PI * 2);
          ctx.fillStyle = item.color;
          ctx.fill();

          ctx.fillStyle = '#374151';
          ctx.fillText(item.label, tx, ty);

          if (item.value) {
            const labelW = ctx.measureText(item.label).width;
            ctx.fillStyle = '#4B5563';
            ctx.fillText(` · ${item.value}`, tx + labelW, ty);
          }
        });
      }

      ctx.drawImage(img, 0, headerH + legendH);

      const a = document.createElement('a');
      a.href     = canvas.toDataURL('image/png');
      a.download = `${indicatorKey ?? title ?? 'chart'}.png`;
      a.click();
      setPngState('done');
    } catch (err) {
      console.error('[IndicatorComparisonChart] PNG export error:', err);
      setPngState('error');
    } finally {
      setTimeout(() => setPngState('idle'), 2000);
    }
  }

  const csvLabel = csvState === 'done' ? 'Downloaded ✓' : csvState === 'error' ? 'Failed' : 'Download data (CSV)';
  const pngLabel = pngState === 'done' ? 'Downloaded ✓' : pngState === 'error' ? 'Failed' : 'Download chart (PNG)';

  return (
    <div className="flex flex-col gap-5">

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider">
            How every community district compares
          </h2>
          <p className="text-xs text-gray-600">
            All 59 NYC community districts, ranked low to high.
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleDownloadCsv}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-gray-200 text-xs font-medium text-gray-600 hover:text-brand hover:border-brand hover:bg-brand-tint transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 whitespace-nowrap"
          >
            {csvLabel}
          </button>
          <button
            type="button"
            onClick={handleDownloadPng}
            disabled={!data?.length}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-gray-200 text-xs font-medium text-gray-600 hover:text-brand hover:border-brand hover:bg-brand-tint transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 whitespace-nowrap disabled:opacity-50 disabled:pointer-events-none"
          >
            {pngLabel}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 max-w-xs">
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
          Compare to another neighborhood
        </p>
        <ComparisonNeighborhoodSelector neighborhoods={neighborhoods} />
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-5 flex flex-col gap-3">
        <ExpandedChartLegend
          indicatorData={data}
          geoId={geoId}
          comparisonNeighborhood={comparisonNeighborhood}
          className=""
        />
        {(!data || data.length === 0) ? (
          <div
            className="w-full flex items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-200"
            style={{ minHeight: `${CHART_HEIGHT}px` }}
          >
            <p className="text-sm text-gray-600">No data available for this indicator yet.</p>
          </div>
        ) : (
          <VegaLiteChart spec={expandedSpec} onViewReady={handleViewReady} />
        )}
      </div>
    </div>
  );
}
