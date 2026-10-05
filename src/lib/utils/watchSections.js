/**
 * FILE: watchSections.js
 *
 * Shared scroll-spy engine for TopicNav (useScrollSpy.js) and
 * StickyContextBar.jsx — "which section is the reader in right now?"
 *
 * WHY THIS EXISTS (2026-10-05):
 * Both components used to set up their own IntersectionObserver once, on
 * mount, against whatever section elements were in the DOM at that moment.
 * Since PageLayout stopped remounting on neighborhood changes (2026-10-02),
 * two things went wrong after picking a new neighborhood:
 *   1. The observers kept watching the PREVIOUS neighborhood's section
 *      elements, which had been removed from the page — so they never fired
 *      again and the highlighted tab / breadcrumb froze.
 *   2. Neither ever cleared its active section — they only ever replaced it
 *      with another one. So back at the top of the page (At a Glance) the
 *      tab and breadcrumb kept showing the last section, e.g.
 *      "Social > Economic".
 *
 * WHAT IT DOES:
 * - Observes each id's CURRENT element, and re-attaches whenever the page
 *   content is swapped (MutationObserver on <main>).
 * - Calls onActive(id) with the topmost visible section (in `ids` order).
 * - Calls onActive(null) when the reader is ABOVE the first section (the
 *   At a Glance hero), or no sections are on the page (loading skeleton).
 *   Scrolled past the last section (footer), it reports that last section,
 *   so something stays highlighted at the bottom of the page.
 *
 * Returns a cleanup function.
 */
export function watchSections(ids, { topOffset = 0, onActive }) {
  if (typeof window === 'undefined' || !ids.length) return () => {};

  const observed     = new Map();  // id → element currently being observed
  const intersecting = new Set();  // ids with any pixel visible below the sticky bars

  function report() {
    const active = ids.find(id => intersecting.has(id));
    if (active) { onActive(active); return; }
    // Nothing visible: decide from where the rendered sections sit.
    // (offsetParent === null → hidden, e.g. another mobile category page.)
    const rendered = ids
      .map(id => observed.get(id))
      .filter(el => el && el.isConnected && el.offsetParent !== null);
    const passed = rendered.filter(el => el.getBoundingClientRect().top <= topOffset);
    // Above the first section (or none on the page) → nothing is active.
    // Past the last one (footer) → keep the last section we scrolled past.
    onActive(passed.length ? passed[passed.length - 1].id : null);
  }

  // rootMargin only clips the top (sticky bar height) — a section counts as
  // visible any time any pixel of it shows below the bars.
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const id = entry.target.id;
      if (observed.get(id) !== entry.target) return; // stale element
      if (entry.isIntersecting) intersecting.add(id);
      else intersecting.delete(id);
    });
    report();
  }, { rootMargin: `-${Math.round(topOffset)}px 0px 0px 0px`, threshold: 0 });

  // Point the observer at whichever element currently owns each id.
  function sync() {
    let changed = false;
    ids.forEach(id => {
      const el   = document.getElementById(id);
      const prev = observed.get(id);
      if (el === prev) return;
      if (prev) io.unobserve(prev);
      intersecting.delete(id);
      if (el) { observed.set(id, el); io.observe(el); }
      else observed.delete(id);
      changed = true;
    });
    if (changed) report();
  }
  sync();

  // Re-sync when page content is swapped in (neighborhood change, skeleton →
  // real content). Debounced: lazily-rendered charts mutate <main> a lot.
  let timer = null;
  const mo = new MutationObserver(() => {
    if (timer != null) return;
    timer = setTimeout(() => { timer = null; sync(); }, 60);
  });
  mo.observe(document.getElementById('main-content') ?? document.body, { childList: true, subtree: true });

  return () => {
    clearTimeout(timer);
    mo.disconnect();
    io.disconnect();
  };
}
