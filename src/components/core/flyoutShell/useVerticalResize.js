import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * FILE: useVerticalResize.js
 *
 * Drag-to-resize HEIGHT for blocks inside the Details flyout — the map and
 * the mini bar chart (2026-11-19). Pair with <VerticalResizeGrip>.
 *
 * - Height is clamped to [min, max] so users can tweak for preference
 *   without making the block tiny or huge.
 * - Keyboard: ArrowUp/Down step 20px (Shift = 60px), Home = min, End = max.
 * - Double-click resets to `initial`.
 * - Remembered per browser under `storageKey` (try/catch: storage can throw).
 * - `onResize(h)` fires on every change (live, during drag) — used to push
 *   the height into the live Vega view / nudge Leaflet.
 */
const STEP = 20;
const STEP_LARGE = 60;

export function useVerticalResize({ initial, min, max, storageKey, onResize }) {
  const clamp = useCallback((h) => Math.min(max, Math.max(min, Math.round(h))), [min, max]);
  const [height, setHeight] = useState(initial);
  const [isResizing, setIsResizing] = useState(false);
  const startRef = useRef(null);
  const onResizeRef = useRef(onResize);
  onResizeRef.current = onResize;

  // Restore saved height
  useEffect(() => {
    try {
      const saved = Number(window.localStorage.getItem(storageKey));
      if (saved) setHeight(clamp(saved));
    } catch { /* storage unavailable */ }
  }, [storageKey, clamp]);

  // Re-clamp if bounds change (e.g. a different chart with a different base)
  useEffect(() => { setHeight(h => clamp(h)); }, [clamp]);

  useEffect(() => { onResizeRef.current?.(height); }, [height]);

  const persist = useCallback((h) => {
    try { window.localStorage.setItem(storageKey, String(h)); } catch { /* ignore */ }
  }, [storageKey]);

  const commit = useCallback((h) => {
    const next = clamp(h);
    setHeight(next);
    persist(next);
  }, [clamp, persist]);

  const onPointerDown = useCallback((e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    startRef.current = { y: e.clientY, height };
    setIsResizing(true);
  }, [height]);

  const onPointerMove = useCallback((e) => {
    if (!startRef.current) return;
    setHeight(clamp(startRef.current.height + (e.clientY - startRef.current.y)));
  }, [clamp]);

  const onPointerUp = useCallback((e) => {
    if (!startRef.current) return;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    startRef.current = null;
    setIsResizing(false);
    setHeight(h => { persist(h); return h; });
  }, [persist]);

  const onKeyDown = useCallback((e) => {
    const step = e.shiftKey ? STEP_LARGE : STEP;
    let next = null;
    if (e.key === 'ArrowDown') next = height + step;
    else if (e.key === 'ArrowUp') next = height - step;
    else if (e.key === 'Home') next = min;
    else if (e.key === 'End') next = max;
    if (next === null) return;
    e.preventDefault();
    e.stopPropagation();
    commit(next);
  }, [height, min, max, commit]);

  const onDoubleClick = useCallback(() => commit(initial), [commit, initial]);

  // Keep the row-resize cursor + no text selection page-wide mid-drag
  useEffect(() => {
    if (!isResizing) return;
    const { style } = document.body;
    const prev = [style.userSelect, style.cursor];
    style.userSelect = 'none';
    style.cursor = 'row-resize';
    return () => { [style.userSelect, style.cursor] = prev; };
  }, [isResizing]);

  return {
    height,
    isResizing,
    gripProps: {
      isResizing,
      valueNow: height,
      valueMin: min,
      valueMax: max,
      handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp, onKeyDown, onDoubleClick },
    },
  };
}
