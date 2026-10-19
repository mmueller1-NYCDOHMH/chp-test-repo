import { useState, useRef, useEffect } from 'react';
import { siteNav } from '@/config/nav/siteNav';
import { scrollToSection as scrollUtil } from '@/lib/utils/scrollToSection';
import { watchSections } from '@/lib/utils/watchSections';
import { resolveLegacyAnchor } from '@/config/nav/legacyAnchors';

/**
 * FILE: useScrollSpy.js
 *
 * TopicNav's scroll-spy: watches all real (non-dummy) section elements
 * (via watchSections.js) and derives `activeId` as the topmost visible
 * section — or null above the first one (At a Glance) — with a suppression window so a tap-triggered
 * smooth scroll doesn't get stomped back by sections still animating
 * past mid-scroll. Also owns the URL hash sync and the on-load smart
 * hash restore. Part of the 2026-09-04 split of TopicNav.jsx.
 */

const NAV_HEIGHT = 56;

export function useScrollSpy() {
  const [activeId, setActiveId] = useState(null);

  // Suppresses scroll-spy's setActiveId while a tap-triggered smooth scroll
  // is still animating. Without this, the IntersectionObserver keeps firing
  // for the sections still passing by mid-animation and stomps the tap's
  // intended target back to whatever was previously on screen — the
  // "bounces back to the previously active tab" bug.
  const suppressSpyRef    = useRef(false);
  const spySettleTimerRef = useRef(null);
  const spyRef            = useRef(null); // watchSections cleanup (has .recheck)

  // End of a suppression window: report the position we actually landed on
  // (anything the spy saw while suppressed was dropped).
  function endSuppression() {
    suppressSpyRef.current = false;
    spyRef.current?.recheck?.();
  }

  // Category headers (`cat-${id}`) are watched too, in page order, so while
  // a category's own header is what's on screen its tab is active — not the
  // previous category's last subsection (QA rows 35/119, 2026-10-12).
  // TopicNav already maps `cat-${id}` back to its category.
  const realSectionIds = siteNav.flatMap(cat => [
    `cat-${cat.id}`,
    ...cat.subcategories.filter(sub => !sub.dummy).map(sub => sub.id),
  ]);

  // ── Tap/programmatic navigation → activeId, with scroll-spy suppressed ───
  // Sets activeId immediately (so the tapped tab highlights right away) and
  // blocks the IntersectionObserver from overwriting it until the resulting
  // smooth-scroll has finished settling. The suppression window is extended
  // on every scroll event (see the effect below) so it covers scrolls of any
  // distance/duration, with a short fallback in case the tap didn't cause
  // any scrolling at all (target already in view).
  function navigateToSection(id) {
    suppressSpyRef.current = true;
    setActiveId(id);
    clearTimeout(spySettleTimerRef.current);
    spySettleTimerRef.current = setTimeout(endSuppression, 200);
  }

  // Re-arms the suppression window on each scroll tick while it's active,
  // so it lasts exactly as long as the animated scroll is still moving.
  useEffect(() => {
    function handleScrollSettle() {
      if (!suppressSpyRef.current) return;
      clearTimeout(spySettleTimerRef.current);
      spySettleTimerRef.current = setTimeout(endSuppression, 150);
    }
    window.addEventListener('scroll', handleScrollSettle, { passive: true });
    return () => window.removeEventListener('scroll', handleScrollSettle);
  }, []);

  // ── Scroll-spy ───────────────────────────────────────────────────────────
  // Engine lives in watchSections.js (shared with StickyContextBar). It
  // re-attaches when a neighborhood change swaps the page content, and
  // reports null when the reader is above the first section (At a Glance),
  // so no tab stays highlighted there.
  useEffect(() => {
    const stop = watchSections(realSectionIds, {
      topOffset: NAV_HEIGHT,
      onActive: (id) => {
        if (suppressSpyRef.current) return;
        setActiveId(id);
      },
    });
    spyRef.current = stop;
    return () => { spyRef.current = null; stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Hash sync ────────────────────────────────────────────────────────────
  // Also drops a leftover hash when activeId goes back to null (returned to
  // At a Glance, or changed neighborhood). Only on a real non-null → null
  // change, so the initial null on load can't wipe a deep-link hash before
  // the restore effect below has read it.
  const prevActiveIdRef = useRef(null);
  useEffect(() => {
    const prev = prevActiveIdRef.current;
    prevActiveIdRef.current = activeId;
    if (activeId) history.replaceState(null, '', `#${activeId}`);
    else if (prev) history.replaceState(history.state, '', window.location.pathname + window.location.search);
  }, [activeId]);

  // ── Smart hash restore on page load ─────────────────────────────────────
  // Scrolls to the hash anchor when the neighbourhood page loads with one.
  // Fires for:
  //   1. External entries — direct URL, new tab, external link.
  //   2. Same-origin entries from non-neighbourhood pages — e.g. the user
  //      clicked an indicator while on /about, which called router.push with
  //      a hash. The hash is intentional and should be honoured.
  //
  // Does NOT fire when navigating from one neighbourhood page to another —
  // in that case the hash is leftover scroll-spy state, not an intentional
  // jump target.
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;

    const referrer            = document.referrer;
    const isExternal          = !referrer || !referrer.startsWith(window.location.origin);
    const isFromNeighbourhood = referrer.includes('/neighborhood/');

    // Only suppress when coming from another neighbourhood page
    if (!isExternal && isFromNeighbourhood) return;

    // Defer until after first paint so sections are in the DOM.
    const raf = requestAnimationFrame(() => {
      // Old shared links (pre-2026-10-12 anchor names) → current section id
      const id = resolveLegacyAnchor(hash);
      scrollUtil(`#${id}`);
      navigateToSection(id);
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { activeId, navigateToSection };
}
