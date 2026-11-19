import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * FILE: useDesktopResize.js
 *
 * Drag-to-resize for the desktop Details flyout (2026-11-19). The panel is
 * anchored to the right edge, so dragging the handle on its LEFT edge
 * leftward widens it.
 *
 * - Width is clamped between MIN_WIDTH (the original 420px default) and
 *   half the viewport (MAX_VW_RATIO), re-clamped on window resize.
 * - Keyboard: the handle is a focusable role="separator" — ArrowLeft/Right
 *   step 40px (Shift = 120px), Home = default, End = max.
 * - Double-clicking the handle resets to the default width.
 * - The chosen width is remembered per browser in localStorage (wrapped in
 *   try/catch — storage can throw in private mode / some embeds).
 * - After a drag ends, a window 'resize' event is dispatched so Leaflet and
 *   Vega (both listen to window resize) re-measure their containers.
 *
 * Not used on mobile — the bottom sheet has its own drag-to-expand
 * (useMobileDragSheet.js).
 */
export const MIN_WIDTH = 420;
const MAX_VW_RATIO = 0.5;
const KEY_STEP = 40;
const KEY_STEP_LARGE = 120;
const STORAGE_KEY = 'chp:flyoutWidth';

function maxWidth() {
  if (typeof window === 'undefined') return MIN_WIDTH;
  return Math.max(MIN_WIDTH, Math.round(window.innerWidth * MAX_VW_RATIO));
}

function clamp(w) {
  return Math.min(maxWidth(), Math.max(MIN_WIDTH, Math.round(w)));
}

function nudgeLayout() {
  requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
}

export function useDesktopResize({ enabled }) {
  const [width, setWidth] = useState(MIN_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const startRef = useRef(null); // { x, width }

  // Restore saved width once on mount
  useEffect(() => {
    try {
      const saved = Number(window.localStorage.getItem(STORAGE_KEY));
      if (saved) setWidth(clamp(saved));
    } catch { /* storage unavailable — keep default */ }
  }, []);

  // Keep within bounds when the window shrinks
  useEffect(() => {
    const onResize = () => setWidth(w => clamp(w));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const persist = useCallback((w) => {
    try { window.localStorage.setItem(STORAGE_KEY, String(w)); } catch { /* ignore */ }
  }, []);

  const commit = useCallback((w) => {
    const next = clamp(w);
    setWidth(next);
    persist(next);
    nudgeLayout();
  }, [persist]);

  const onPointerDown = useCallback((e) => {
    if (!enabled || e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    startRef.current = { x: e.clientX, width };
    setIsResizing(true);
  }, [enabled, width]);

  const onPointerMove = useCallback((e) => {
    if (!startRef.current) return;
    // Panel is right-anchored: moving left (smaller clientX) = wider
    const delta = startRef.current.x - e.clientX;
    setWidth(clamp(startRef.current.width + delta));
  }, []);

  const onPointerUp = useCallback((e) => {
    if (!startRef.current) return;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    startRef.current = null;
    setIsResizing(false);
    setWidth(w => { persist(w); return w; });
    nudgeLayout();
  }, [persist]);

  const onKeyDown = useCallback((e) => {
    const step = e.shiftKey ? KEY_STEP_LARGE : KEY_STEP;
    let next = null;
    if (e.key === 'ArrowLeft') next = width + step;
    else if (e.key === 'ArrowRight') next = width - step;
    else if (e.key === 'Home') next = MIN_WIDTH;
    else if (e.key === 'End') next = maxWidth();
    if (next === null) return;
    e.preventDefault();
    e.stopPropagation();
    commit(next);
  }, [width, commit]);

  const onDoubleClick = useCallback(() => commit(MIN_WIDTH), [commit]);

  // Block text selection + force the resize cursor page-wide mid-drag, so
  // the cursor doesn't flicker when the pointer outruns the handle.
  useEffect(() => {
    if (!isResizing) return;
    const { style } = document.body;
    const prevSelect = style.userSelect;
    const prevCursor = style.cursor;
    style.userSelect = 'none';
    style.cursor = 'col-resize';
    return () => { style.userSelect = prevSelect; style.cursor = prevCursor; };
  }, [isResizing]);

  return {
    width,
    isResizing,
    minWidth: MIN_WIDTH,
    getMaxWidth: maxWidth,
    handleProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
      onKeyDown,
      onDoubleClick,
    },
  };
}
