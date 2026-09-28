import { useState, useRef, useEffect } from 'react';
import { siteNav } from '@/config/nav/siteNav';

/**
 * FILE: useMobileTabTracking.js
 *
 * Mobile-viewport detection plus the mobile topic-tab row's two
 * scroll-tracking behaviours: keeping the active category tab scrolled
 * into view as scroll-spy advances, and tracking which edge ('left' |
 * 'right') the active tab is currently pinned to via sticky positioning
 * (so it can render a tighter "you are here" tag instead of its normal
 * in-row look). Part of the 2026-09-04 split of TopicNav.jsx.
 */
export function useMobileTabTracking(activeCategoryId) {
  const [isMobile, setIsMobile]   = useState(false);
  // Which edge ('left' | 'right') the active mobile tab is currently pinned
  // to, or null while it's sitting normally in the row (not stuck to
  // either edge). Lets the pinned state use a lighter treatment than the
  // tab's normal in-place active look, and square off whichever side is
  // actually flush against the bar's edge.
  const [stuckSide, setStuckSide] = useState(null);

  const mobileTabRowRef       = useRef(null);
  const mobileCategoryBtnRefs = useRef([]);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    setIsMobile(mq.matches);
    const handler = (e) => { setIsMobile(e.matches); };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // ── Mobile: keep the active category tab in view as scroll-spy advances ──
  // The tab row scrolls horizontally, so as the user scrolls the page down
  // through categories, the highlighted tab can drift out of the visible
  // area. Scroll it back into view (centered) whenever the active category
  // changes — this only fires on actual category changes, not every scroll
  // tick, since activeCategoryId is derived from the (already-debounced-by-
  // section-boundary) scroll-spy id.
  useEffect(() => {
    if (!isMobile || !activeCategoryId) return;
    const idx = siteNav.findIndex(c => c.id === activeCategoryId);
    const btn = mobileCategoryBtnRefs.current[idx];
    btn?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [isMobile, activeCategoryId]);

  // ── Mobile: track whether the active tab is actually pinned ──────────────
  // btn.offsetLeft/offsetWidth reflect the tab's normal (un-stuck) box —
  // sticky positioning doesn't affect offset measurements, only paint
  // position — so comparing them against the row's current scroll window
  // tells us whether the tab would be off-screen without sticky (i.e. it's
  // actively pinned right now) vs. just sitting normally in view.
  useEffect(() => {
    if (!isMobile || !activeCategoryId) { setStuckSide(null); return; }
    const row = mobileTabRowRef.current;
    const idx = siteNav.findIndex(c => c.id === activeCategoryId);
    const btn = mobileCategoryBtnRefs.current[idx];
    if (!row || !btn) return;

    // The row scroll-snaps to each tab (snap-x/snap-start), so when the
    // active tab lands exactly at the leading edge after a swipe,
    // row.scrollLeft and btn.offsetLeft can land EXACTLY equal rather than
    // strictly past one another. A strict >/< missed that flush-exact case
    // (still touching the edge, should still square off) — use >=/<= with
    // a sub-pixel tolerance so it's treated as stuck.
    function checkStuck() {
      const EPSILON = 1; // px
      let side = null;
      if (row.scrollLeft >= btn.offsetLeft - EPSILON) side = 'left';
      else if (row.scrollLeft + row.clientWidth <= btn.offsetLeft + btn.offsetWidth + EPSILON) side = 'right';
      setStuckSide(prev => (prev === side ? prev : side));
    }
    checkStuck();
    row.addEventListener('scroll', checkStuck, { passive: true });
    return () => row.removeEventListener('scroll', checkStuck);
  }, [isMobile, activeCategoryId]);

  return { isMobile, stuckSide, mobileTabRowRef, mobileCategoryBtnRefs };
}
