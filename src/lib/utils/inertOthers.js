/**
 * FILE: inertOthers.js
 *
 * PURPOSE (A11Y, 2026-09-28 — WCAG 1.3.1 / 2.4.3, "modal dialogs"):
 * While a modal is open, everything else on the page should be unreachable
 * — not just by Tab (the focus traps already handle that) but also by a
 * screen reader's virtual cursor / swipe navigation. aria-modal="true" on
 * its own isn't reliably honored, so the page behind stayed readable.
 *
 * inertOthers(el) walks from `el` up to <body> and sets `inert` on every
 * sibling along the way — i.e. the whole page EXCEPT the modal and its
 * ancestors. This works whether the modal is portaled to <body>
 * (ExpandedChartModal, EmbedModal…) or rendered inline inside the card
 * (NotesModal) or inside the sidebar (mobile neighborhood sheet), which is
 * why it doesn't just inert #chp-app-shell like IntroModal does.
 *
 * Returns a release() function that removes ONLY the inert attributes this
 * call added — so nested modals (Embed opened from the Expanded chart) and
 * elements that were already inert (the closed flyout panel) are left
 * alone. release() is idempotent.
 *
 * Live regions (role=status / aria-live — RouteAnnouncer, search status)
 * are skipped so announcements still work while a modal is open.
 */
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEMPLATE', 'LINK', 'META', 'NOSCRIPT']);

export function inertOthers(el) {
  if (typeof document === 'undefined' || !el) return () => {};
  const changed = [];
  let node = el;
  while (node && node.parentElement && node !== document.body) {
    const parent = node.parentElement;
    for (const sib of Array.from(parent.children)) {
      if (sib === node || SKIP_TAGS.has(sib.tagName)) continue;
      if (sib.hasAttribute('inert')) continue;
      if (sib.matches('[aria-live], [role="status"], [role="alert"]')) continue;
      sib.setAttribute('inert', '');
      changed.push(sib);
    }
    node = parent;
  }
  let released = false;
  return function release() {
    if (released) return;
    released = true;
    changed.forEach((s) => s.removeAttribute('inert'));
  };
}
