/**
 * FILE: tablistKeyDown.js
 *
 * PURPOSE (A11Y, 2026-09-26 — WCAG 2.1.1 / 4.1.2):
 * Shared keyboard handler for role="tablist" strips, per the WAI-ARIA
 * Tabs pattern (automatic activation):
 *   ← / →      previous / next tab (wraps)
 *   Home / End first / last tab
 * Selecting a tab also moves focus to it. Pair with a roving tabindex on
 * the tab buttons (tabIndex={selected ? 0 : -1}) so the whole strip is a
 * single Tab stop.
 *
 * Tabs are found inside e.currentTarget (the tablist), not by id — the
 * Sidebar renders its tab strip twice (desktop + mobile sheet), so id
 * lookups could hit the hidden copy.
 *
 * USAGE:
 *   <div role="tablist" onKeyDown={(e) => handleTablistKeyDown(e, ids, activeId, setActive)}>
 */
export function handleTablistKeyDown(e, ids, activeId, onSelect) {
  const n = ids.length;
  if (!n) return;
  const i = Math.max(0, ids.indexOf(activeId));
  let next;
  switch (e.key) {
    case 'ArrowRight': next = (i + 1) % n; break;
    case 'ArrowLeft':  next = (i - 1 + n) % n; break;
    case 'Home':       next = 0; break;
    case 'End':        next = n - 1; break;
    default: return;
  }
  e.preventDefault();
  onSelect(ids[next]);
  const tabs = e.currentTarget.querySelectorAll('[role="tab"]');
  tabs[next]?.focus();
}
