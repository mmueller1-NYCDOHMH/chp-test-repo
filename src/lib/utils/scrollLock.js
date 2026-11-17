/**
 * FILE: scrollLock.js
 *
 * PURPOSE (2026-11-17): stop the page behind an open modal from scrolling.
 *
 * lockScroll() returns a release() function. Locks are ref-counted, so
 * nested modals (Embed opened from the Expanded chart) only unlock the page
 * when the LAST one closes. release() is idempotent.
 *
 * A11Y choices — why it's done this way:
 * - overflow:hidden on <html>, NOT wheel/touchmove preventDefault. Blocking
 *   events would also block scrolling inside the dialog, keyboard scrolling
 *   (arrows / PgUp / PgDn / Space) of the dialog's own content, and can
 *   interfere with pinch-zoom (WCAG 1.4.4). overflow:hidden leaves all of
 *   that working and only stops the document itself from scrolling.
 * - Scroll position is untouched (no position:fixed/top trick on desktop),
 *   so on close the user is exactly where they were — no jump, which keeps
 *   focus-return to the trigger button visually stable (WCAG 2.4.3 / 2.4.7).
 * - Scrollbar-width compensation: when the scrollbar disappears we pad
 *   <body> by its width so content doesn't shift sideways under the
 *   backdrop (avoids layout shift for low-vision / magnifier users). On
 *   overlay-scrollbar systems (macOS default, mobile) the width is 0 and
 *   nothing changes. The width is also exposed as --chp-scrollbar-comp
 *   for any position:fixed element that needs to match.
 * - Dialogs must stay scrollable themselves (WCAG 1.4.10 Reflow — at 400%
 *   zoom a dialog can be taller than the viewport, and with the page locked
 *   the dialog/overlay is the only thing that can scroll). Each modal's
 *   backdrop or body has overflow-y-auto + overscroll-contain for this.
 *
 * Used by: useModalFocusTrap (Notes, Expanded, CustomExpanded, Embed, map),
 * StatTileDetailModal, useIntroModalLifecycle, useMobileSheet.
 * NOT used by the indicator flyout (desktop is a non-modal side panel by
 * design; mobile has its own iOS-safe lock in useFlyoutA11yEffects) or the
 * guided tour (it scrolls the page to each step's target).
 */
let lockCount = 0;
let saved = null;

export function lockScroll() {
  if (typeof document === 'undefined') return () => {};

  if (lockCount === 0) {
    const html = document.documentElement;
    const body = document.body;
    const scrollbarWidth = Math.max(0, window.innerWidth - html.clientWidth);
    saved = {
      htmlOverflow: html.style.overflow,
      bodyPaddingRight: body.style.paddingRight,
    };
    if (scrollbarWidth > 0) {
      const current = parseFloat(window.getComputedStyle(body).paddingRight) || 0;
      body.style.paddingRight = `${current + scrollbarWidth}px`;
    }
    html.style.setProperty('--chp-scrollbar-comp', `${scrollbarWidth}px`);
    html.style.overflow = 'hidden';
  }
  lockCount += 1;

  let released = false;
  return function release() {
    if (released) return;
    released = true;
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0 && saved) {
      const html = document.documentElement;
      html.style.overflow = saved.htmlOverflow;
      html.style.removeProperty('--chp-scrollbar-comp');
      document.body.style.paddingRight = saved.bodyPaddingRight;
      saved = null;
    }
  };
}
