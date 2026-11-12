/**
 * FILE: onboardingEvents.js
 *
 * Window-event names + helpers for the onboarding UI (added 2026-10-19).
 * Same window-event pattern as chp:open-intro-modal elsewhere in the app, so
 * any component (intro modal, ? help menu) can open the explainer or start
 * the tour without importing those components.
 *
 *   chp:open-how-to-read  → HowToReadModal opens
 *   chp:start-tour        → GuidedTour starts at step 1
 *
 * REVERT: see "Claude outputs/revert_onboarding_2026-10-19/REVERT.md".
 */

export const OPEN_HOW_TO_READ = 'chp:open-how-to-read';
export const START_TOUR       = 'chp:start-tour';

export function openHowToRead() {
  window.dispatchEvent(new CustomEvent(OPEN_HOW_TO_READ));
}

export function startTour() {
  window.dispatchEvent(new CustomEvent(START_TOUR));
}

export function isMobileViewport() {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
}

export function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** First element matching `selector` that is actually rendered (not display:none). */
export function firstVisible(selector) {
  const els = document.querySelectorAll(selector);
  for (const el of els) {
    if (el.getClientRects().length > 0) return el;
  }
  return null;
}
