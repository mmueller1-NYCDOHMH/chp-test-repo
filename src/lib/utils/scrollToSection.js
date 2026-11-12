/**
 * FILE: scrollToSection.js
 *
 * Shared utility for smooth-scrolling to a section anchor.
 * Accounts for the sticky TopicNav height so the section heading
 * isn't hidden underneath it.
 *
 * Usage:
 *   import { scrollToSection } from '@/lib/utils/scrollToSection';
 *   scrollToSection('#community-conditions');
 *   scrollToSection('#community-conditions', { focus: true }); // user-initiated jumps
 *
 * A11Y (2026-09-26):
 * - { focus: true } moves keyboard focus to the section's first heading
 *   after scrolling (WCAG 2.4.3 Focus Order). Without it, the next Tab
 *   continued from the nav link instead of from the section the user
 *   jumped to. Only pass it for explicit user actions (nav clicks, search
 *   results) — not for passive hash restores on page load.
 * - Honors prefers-reduced-motion (instant jump instead of smooth scroll).
 */

const SETTLE_MS         = 140;   // scroll is "quiet" after this long without a scroll event
const MAX_CORRECTION_MS = 3000;  // stop watching for layout shifts after this
const TOLERANCE_PX      = 12;    // ignore sub-header-height drift (incl. the 10px reveal slide)
const HOLD_MS           = 1500;  // instant jumps: re-aim every frame this long
// Any of these means the user is steering — never fight them.
const USER_INPUT_EVENTS = ['wheel', 'touchstart', 'keydown', 'mousedown'];

// Active settle-watcher for the most recent jump; a new jump cancels it.
let cancelPendingCorrection = null;

// Where the page must be scrolled for `el` to sit just under the sticky bars.
// `viewportTop` (optional): put el's top at this many px from the top of the
// viewport instead of just under the sticky bars — used by the
// neighborhood-switch "keep my place" restore (neighborhoodSwitch.js).
function targetTopFor(el, viewportTop = null) {
  // Measure both sticky layers so neither obscures the target element.
  // TopicNav (#topic-nav) and StickyContextBar ([data-sticky-context-bar]) each
  // contribute height. Fall back to known defaults if elements aren't in DOM.
  const navEl         = document.getElementById('topic-nav');
  const contextBarEl  = document.querySelector('[data-sticky-context-bar]');
  const navHeight     = navEl        ? navEl.getBoundingClientRect().height        : 56;
  const contextHeight = contextBarEl ? contextBarEl.getBoundingClientRect().height : 36;
  const stickyTotal   = navHeight + contextHeight;

  const maxTop = document.documentElement.scrollHeight - window.innerHeight;
  const offset = viewportTop ?? (stickyTotal + 16);
  const top    = el.getBoundingClientRect().top + window.scrollY - offset;
  return Math.max(0, Math.min(top, maxTop));
}

// Options:
//   focus       — move keyboard focus to the section's heading (see A11Y above)
//   instant     — jump without smooth scrolling (keep-my-place restores)
//   viewportTop — see targetTopFor()
// Returns the target element (or undefined if it isn't on the page).
export function scrollToSection(anchor, { focus = false, instant = false, viewportTop = null } = {}) {
  const id  = String(anchor).replace(/^#/, '');
  const el  = document.getElementById(id);
  if (!el) return;

  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  // 'instant', not 'auto': globals.css sets html { scroll-behavior: smooth },
  // and 'auto' defers to it — so "auto" jumps were really smooth scrolls.
  const behavior = instant ? 'instant' : reducedMotion ? 'auto' : 'smooth';
  const aim = () => targetTopFor(el, viewportTop);
  window.scrollTo({ top: aim(), behavior });

  // FIX (2026-10-02): re-aim after the page settles. Charts render lazily as
  // they near the viewport (VegaLiteChart) and grow past their placeholder
  // height, so on a long jump the sections scrolled past get taller and push
  // the target down — the header ended up at the bottom of the viewport
  // instead of the top. The destination was computed once, up front; now it
  // is re-measured each time scrolling goes quiet and corrected if it moved,
  // until it holds still or the user takes over.
  cancelPendingCorrection?.();
  const startedAt = Date.now();
  let timer = null;

  // Instant jumps (keep-my-place restores) also hold the target still while
  // content around it changes size: ResizeObserver callbacks run before
  // paint, so a chart growing above the target never shows as a jump.
  let ro = null;
  if (instant && typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(() => {
      if (!el.isConnected) return;
      if (Math.abs(aim() - window.scrollY) > 2) window.scrollTo({ top: aim(), behavior: 'instant' });
    });
    ro.observe(document.getElementById('main-content') ?? document.body);
  }
  // …and per frame for the first moments, for swaps that change heights
  // without changing <main>'s total size (rAF runs before paint too).
  let holdRaf = null;
  if (instant) {
    const holdUntil = Date.now() + HOLD_MS;
    const hold = () => {
      if (!el.isConnected || Date.now() > holdUntil) { holdRaf = null; return; }
      if (Math.abs(aim() - window.scrollY) > 2) window.scrollTo({ top: aim(), behavior: 'instant' });
      holdRaf = requestAnimationFrame(hold);
    };
    holdRaf = requestAnimationFrame(hold);
  }

  const stop = () => {
    ro?.disconnect();
    if (holdRaf) cancelAnimationFrame(holdRaf);
    clearTimeout(timer);
    window.removeEventListener('scroll', onScroll);
    USER_INPUT_EVENTS.forEach(evt => window.removeEventListener(evt, stop));
    if (cancelPendingCorrection === stop) cancelPendingCorrection = null;
  };
  const check = () => {
    if (!el.isConnected) return stop();
    const expired = Date.now() - startedAt > MAX_CORRECTION_MS;
    const offBy   = aim() - window.scrollY;
    if (Math.abs(offBy) > TOLERANCE_PX) {
      // Late corrections jump instantly so they can't themselves be outrun.
      window.scrollTo({ top: aim(), behavior: instant ? 'instant' : expired ? 'auto' : behavior });
    }
    if (expired) return stop();
    timer = setTimeout(check, SETTLE_MS * 2); // also catches growth after scrolling stops
  };
  const onScroll = () => { clearTimeout(timer); timer = setTimeout(check, SETTLE_MS); };

  window.addEventListener('scroll', onScroll, { passive: true });
  USER_INPUT_EVENTS.forEach(evt => window.addEventListener(evt, stop, { passive: true, once: true }));
  cancelPendingCorrection = stop;
  timer = setTimeout(check, SETTLE_MS);

  if (focus) {
    // Focus the section's first heading (so screen readers announce where
    // the user landed), falling back to the section itself. tabIndex=-1
    // makes it programmatically focusable without adding a Tab stop.
    // preventScroll: the smooth scroll above already positions it.
    const target = el.querySelector('h1, h2, h3, h4') ?? el;
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }
  return el;
}
