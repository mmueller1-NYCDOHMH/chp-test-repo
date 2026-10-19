'use client';

/**
 * FILE: neighborhoodSwitch.js
 *
 * PURPOSE:
 * "Keep my place" when the reader switches neighborhoods (2026-10-14).
 *
 * WHY:
 * Picking a new neighborhood used to router.push() to the new page, and
 * Next.js scrolls to the top on push. Readers who switch mid-page are
 * usually comparing ("what's asthma like in Bay Ridge vs. Mott Haven?"), so
 * the jump back to At a Glance made them scroll down again and find their
 * spot from memory.
 *
 * HOW:
 * - pushNeighborhood() records WHERE the reader is: the topmost visible
 *   indicator card and its position in the viewport, plus the section from
 *   the scroll-spy hash. It pushes /neighborhood/<id>#<section> with
 *   { scroll: false } — a NEW history entry, so Back returns to the old one.
 * - NeighborhoodSwitchKeeper.jsx (mounted in PageLayout) picks the record up
 *   once the new page's content is in the DOM and puts that same card back
 *   at the same height on screen. Anchoring to a card — not a raw scrollY —
 *   matters because card/section heights differ between neighborhoods
 *   (suppressed values, different copy lengths).
 * - Back/Forward: the Keeper also remembers the last spot on each
 *   neighborhood page as the reader scrolls (spots map), and notePopState()
 *   turns a history traversal into the same kind of restore.
 * - Near the top of the page (< TOP_BAND_PX) nothing is recorded and the
 *   switch behaves exactly as before (lands at the top).
 *
 * REVERT:
 * Swap pushNeighborhood(router, id) calls back to
 *   setPendingNeighborhood(id); router.push(`/neighborhood/${id}`);
 * (Sidebar.jsx, useUnifiedSearch.js, AddressSearch.jsx) and remove
 * <NeighborhoodSwitchKeeper> from PageLayout + the isKeepingPlace() check in
 * RouteAnnouncer.jsx.
 */

import { setPendingNeighborhood } from './pendingNeighborhood';
import { scrollToSection } from './scrollToSection';

const HANDOFF_MS      = 5000; // a recorded switch expires if the page never lands
const ANNOUNCE_GRACE  = 3000; // RouteAnnouncer checks a little after the swap
const TOP_BAND_PX     = 120;  // above this, a switch just starts at the top
const CARD_SELECTOR   = '[id^="indicator-"]';
const PATH_RE         = /^\/neighborhood\/([^/]+)\/?$/;

let pending  = null;          // { id, path, spot, at }
let lastKept = null;          // { path, at } — the most recent restore
const spots  = new Map();     // pathname → last spot on that page

function idFromPath(pathname) {
  const m = PATH_RE.exec(pathname);
  return m ? decodeURIComponent(m[1]) : null;
}

function stickyOffset() {
  const v = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue('--chp-sticky-offset')
  );
  return Number.isFinite(v) ? v : 92;
}

/**
 * Where is the reader right now? null when near the top of the page (or not
 * on a neighborhood page) — those switches keep the old land-at-top behavior.
 */
export function captureSpot() {
  if (typeof window === 'undefined' || !idFromPath(window.location.pathname)) return null;
  if (window.scrollY < TOP_BAND_PX) return null;

  const line    = stickyOffset();
  const section = window.location.hash.replace(/^#/, '') || null;
  let card = null;
  for (const el of document.querySelectorAll(CARD_SELECTOR)) {
    if (el.offsetParent === null) continue;            // hidden (other mobile page)
    const r = el.getBoundingClientRect();
    if (r.bottom <= line + 24) continue;               // scrolled away under the sticky bars
    if (r.top < window.innerHeight) card = { id: el.id, top: r.top };
    break;                                             // DOM order = topmost on screen
  }
  return { cardId: card?.id ?? null, cardTop: card?.top ?? null, section, scrollY: window.scrollY };
}

/** Put the reader back on their spot. Returns the element anchored to. */
export function restoreSpot(spot) {
  if (spot.top) { window.scrollTo({ top: 0, behavior: 'instant' }); return null; }
  const card = spot.cardId && document.getElementById(spot.cardId);
  if (card && card.offsetParent !== null) {
    return scrollToSection(spot.cardId, { instant: true, viewportTop: spot.cardTop });
  }
  if (spot.section && document.getElementById(spot.section)) {
    return scrollToSection(spot.section, { instant: true });
  }
  if (spot.scrollY != null) window.scrollTo({ top: spot.scrollY, behavior: 'instant' });
  return null;
}

// FIX (2026-10-14, "page bounces"): restoring from a React effect ran a few
// hundred ms after the new content was already painted, so the reader saw
// the card jump, a scroll-anchoring nudge, then the correction. Now a
// MutationObserver restores in the same task the new content is inserted —
// observer callbacks run before the browser paints — so the first frame of
// the new neighborhood is already in the right place.
let stopWatching = null;
const KEEP_PLACE_CLASS = 'chp-keep-place'; // suppresses the section reveal slide

let keepPlaceTimer = null;
export function endKeepPlace() {
  clearTimeout(keepPlaceTimer);
  document.documentElement.classList.remove(KEEP_PLACE_CLASS);
}

function watchForNewContent(p) {
  stopWatching?.();
  clearTimeout(keepPlaceTimer);
  document.documentElement.classList.add(KEEP_PLACE_CLASS);
  keepPlaceTimer = setTimeout(endKeepPlace, HANDOFF_MS + 2000); // safety net
  if (p.spot.top) return; // nothing to anchor; the Keeper scrolls to top

  // React REUSES the DOM nodes across neighborhoods (same tree shape), so
  // "is this the new page?" can't be "is this a different node". CHPBuilder
  // stamps its root with data-chp-geo; the new page is in once that changes.
  const geoOf  = () => document.querySelector('[data-chp-geo]')?.getAttribute('data-chp-geo') ?? null;
  const oldGeo = geoOf();

  // Until then, hold the card where it is: the route change can commit in
  // steps (layout/params first, page after), and any step that shifts
  // heights would otherwise paint a jump. MutationObserver + rAF callbacks
  // both run before paint.
  const hold = () => {
    if (p.userMoved || p.spot.cardTop == null) return;
    const card = document.getElementById(p.spot.cardId);
    if (!card || card.offsetParent === null) return;
    const off = card.getBoundingClientRect().top - p.spot.cardTop;
    if (Math.abs(off) > 1) window.scrollBy({ top: off, behavior: 'instant' });
  };
  let raf = null;
  const loop = () => { hold(); raf = requestAnimationFrame(loop); };

  const check = () => {
    const geo = geoOf();
    if (!geo || geo === oldGeo) { hold(); return; } // old page, or the loading skeleton
    stop();
    if (p.userMoved) return;            // they scrolled meanwhile — leave them be
    p.anchorEl = restoreSpot(p.spot);   // takes over holding from here
    p.restored = true;
  };
  const onUserScroll = () => { p.userMoved = true; };
  const USER_SCROLL = ['wheel', 'touchmove'];
  USER_SCROLL.forEach(evt => window.addEventListener(evt, onUserScroll, { passive: true }));
  const mo = new MutationObserver(check);
  mo.observe(document.body, {
    childList: true, subtree: true, attributes: true, attributeFilter: ['data-chp-geo'],
  });
  raf = requestAnimationFrame(loop);
  const timer = setTimeout(() => stop(), HANDOFF_MS);
  function stop() {
    mo.disconnect();
    cancelAnimationFrame(raf);
    USER_SCROLL.forEach(evt => window.removeEventListener(evt, onUserScroll));
    clearTimeout(timer);
    if (stopWatching === stop) stopWatching = null;
  }
  stopWatching = stop;
}

/** Switch neighborhoods, keeping the reader's place when they're mid-page. */
export function pushNeighborhood(router, id) {
  const target = `/neighborhood/${id}`;
  // Re-picking the neighborhood you're already on: nothing to load, so
  // don't navigate (it used to scroll the page back to the top).
  if (target === window.location.pathname) return;
  setPendingNeighborhood(id);
  const spot   = captureSpot();

  if (!spot) {
    pending = null;
    router.push(target);
    return;
  }
  spots.set(window.location.pathname, spot);     // so Back returns here
  // Where focus was (and its ancestors): the control that had it — e.g. the
  // search input — often unmounts on select, so the Keeper puts focus back
  // on the nearest surviving control in the same place (the neighborhood pill).
  const focusTrail = [];
  for (let n = document.activeElement; n && n !== document.body; n = n.parentElement) focusTrail.push(n);
  pending = { id: String(id), path: target, spot, at: Date.now(), focusTrail };
  watchForNewContent(pending);
  router.push(spot.section ? `${target}#${spot.section}` : target, { scroll: false });
}

/** Back/Forward onto a neighborhood page → restore its last spot. */
export function notePopState() {
  const path = window.location.pathname;
  const id   = idFromPath(path);
  if (!id) { pending = null; return; }
  const hash = window.location.hash.replace(/^#/, '');
  const spot = spots.get(path) ?? (hash ? { section: hash } : { top: true });
  pending = { id, path, spot, at: Date.now() };
  watchForNewContent(pending);
}

/** Called by the Keeper as it scrolls — remembers the spot for Back/Forward. */
export function recordSpot(contentId) {
  const path = window.location.pathname;
  if (!contentId || idFromPath(path) !== String(contentId)) return; // mid-swap
  spots.set(path, captureSpot() ?? { top: true });
}

/** Is there a switch waiting for this page? (Doesn't claim it — StrictMode
 *  runs effects twice in dev, so the Keeper claims only when it lands.) */
export function peekPending(id) {
  const p = pending;
  if (!p || p.id !== String(id) || Date.now() - p.at > HANDOFF_MS) return null;
  return p;
}

/** The Keeper claims the pending switch for the page that just rendered. */
export function takePending(id) {
  const p = pending;
  if (!p || p.id !== String(id) || Date.now() - p.at > HANDOFF_MS) return null;
  pending  = null;
  lastKept = { path: p.path, at: Date.now() };
  return p;
}

/** RouteAnnouncer: is this route change a keep-my-place switch? */
export function isKeepingPlace(pathname) {
  const now = Date.now();
  if (pending && pending.path === pathname && now - pending.at < HANDOFF_MS) return true;
  return !!(lastKept && lastKept.path === pathname && now - lastKept.at < ANNOUNCE_GRACE);
}
