/**
 * FILE: chartExport.js
 *
 * Shared chart image-export helpers (2026-09-29). Pulled out of
 * ExpandedChartModal.jsx so the Details flyout's export tray
 * (core/flyoutShell/FlyoutExportTray.jsx) produces exactly the same PNG as
 * the expanded modal's Copy / PNG buttons — one compositing code path, not a
 * lookalike.
 *
 *   composeExportCanvas()   title → subtitle → legend column → chart image
 *   renderSpecToImage()     render a Vega-Lite spec offscreen and return its
 *                           PNG as an <img> (for callers with no live view,
 *                           e.g. the flyout, which only shows the compact chart)
 *   downloadCanvas()        save a canvas as a .png
 *   copyCanvas()            put a canvas on the clipboard as image/png
 */

const FONT = `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;

export function loadImage(url) {
  const img = new Image();
  img.src = url;
  return new Promise((resolve, reject) => {
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('chartExport: image failed to load'));
  });
}

/**
 * Greedy word-wrap for canvas text. Returns the lines that fit in maxWidth
 * using the context's current font. A single word wider than maxWidth gets a
 * line to itself rather than being split mid-word.
 */
function wrapText(ctx, text, maxWidth) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(test).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Composite a header (title + subtitle) and optional legend above a chart
 * image or canvas. `scale` must match the pixel ratio the chart was drawn at.
 *
 * Title and subtitle wrap to the canvas width (2026-09-29 — they used to be
 * drawn as one line each, so long subtitles ran off the right edge and were
 * cropped). `chartInset: true` adds side/bottom padding around the chart
 * itself — for DOM-rasterized charts, which have no built-in padding the way
 * a Vega view does.
 */
export function composeExportCanvas({ chart, title, subtitle, legendItems = [], scale = 2, chartInset = false }) {
  const PADDING     = 28 * scale;
  const TITLE_SIZE  = 15 * scale;
  const TITLE_LINE  = 20 * scale;   // line height for wrapped title rows
  const SUB_SIZE    = 12 * scale;
  const SUB_LINE    = 17 * scale;   // line height for wrapped subtitle rows
  const LINE_GAP    = 6  * scale;
  const BLOCK_GAP   = 16 * scale;
  const LEG_SIZE    = 11 * scale;   // legend text size
  const LEG_ROW     = 20 * scale;   // row height per legend item
  const DOT_R       = 5  * scale;   // circle radius

  const inset   = chartInset ? PADDING : 0;
  const canvas  = document.createElement('canvas');
  canvas.width  = chart.width + inset * 2;
  const ctx     = canvas.getContext('2d');
  const textW   = canvas.width - PADDING * 2;

  // Measure wrapped lines before sizing the canvas height
  ctx.font = `bold ${TITLE_SIZE}px ${FONT}`;
  const titleLines = title ? wrapText(ctx, title, textW) : [];
  ctx.font = `${SUB_SIZE}px ${FONT}`;
  const subLines = title && subtitle ? wrapText(ctx, subtitle, textW) : [];

  const headerH = titleLines.length
    ? PADDING + TITLE_SIZE + (titleLines.length - 1) * TITLE_LINE
      + (subLines.length ? LINE_GAP + SUB_SIZE + (subLines.length - 1) * SUB_LINE : 0)
      + BLOCK_GAP
    : 0;
  const legendH = legendItems.length ? legendItems.length * LEG_ROW + BLOCK_GAP : 0;
  const chartY  = headerH + legendH || inset;

  canvas.height = chartY + chart.height + inset;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // ── Title + subtitle (wrapped) ─────────────────────────────────────────
  if (headerH > 0) {
    let y = PADDING + TITLE_SIZE;
    ctx.fillStyle = '#111827';
    ctx.font      = `bold ${TITLE_SIZE}px ${FONT}`;
    titleLines.forEach((line, i) => {
      if (i) y += TITLE_LINE;
      ctx.fillText(line, PADDING, y);
    });
    if (subLines.length) {
      y += LINE_GAP + SUB_SIZE;
      ctx.fillStyle = '#6B7280';
      ctx.font      = `${SUB_SIZE}px ${FONT}`;
      subLines.forEach((line, i) => {
        if (i) y += SUB_LINE;
        ctx.fillText(line, PADDING, y);
      });
    }
  }

  // ── Legend — column of colored circles ────────────────────────────────
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

  ctx.drawImage(chart, inset, chartY);
  return canvas;
}

/**
 * Render a Vega-Lite spec in an offscreen container of a fixed width (specs
 * use width:'container') and return the chart as an <img>. `signals` are
 * applied before capture (e.g. { comparisonGeoId }). The view and container
 * are torn down afterwards.
 */
export async function renderSpecToImage(spec, { width = 840, scale = 2, signals = {} } = {}) {
  const { default: embed } = await import('vega-embed');
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText = `position:fixed;left:-10000px;top:0;width:${width}px;pointer-events:none;`;
  document.body.appendChild(host);
  let view;
  try {
    ({ view } = await embed(host, spec, { actions: false, renderer: 'svg', tooltip: false }));
    for (const [name, value] of Object.entries(signals)) {
      try { view.signal(name, value); } catch { /* signal not in this spec */ }
    }
    await view.runAsync();
    const url = await view.toImageURL('png', scale);
    return await loadImage(url);
  } finally {
    view?.finalize();
    host.remove();
  }
}

export function downloadCanvas(canvas, filename) {
  const a    = document.createElement('a');
  a.href     = canvas.toDataURL('image/png');
  a.download = filename.endsWith('.png') ? filename : `${filename}.png`;
  a.click();
}

export function copyCanvas(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(async blob => {
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        resolve();
      } catch (err) {
        reject(err);
      }
    }, 'image/png');
  });
}
