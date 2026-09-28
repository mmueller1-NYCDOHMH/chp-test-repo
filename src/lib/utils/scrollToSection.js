/**
 * FILE: scrollToSection.js
 *
 * Shared utility for smooth-scrolling to a section anchor.
 * Accounts for the sticky TopicNav height so the section heading
 * isn't hidden underneath it.
 *
 * Usage:
 *   import { scrollToSection } from '@/lib/utils/scrollToSection';
 *   scrollToSection('#community-safety');
 *   scrollToSection('#community-safety', { focus: true }); // user-initiated jumps
 *
 * A11Y (2026-09-26):
 * - { focus: true } moves keyboard focus to the section's first heading
 *   after scrolling (WCAG 2.4.3 Focus Order). Without it, the next Tab
 *   continued from the nav link instead of from the section the user
 *   jumped to. Only pass it for explicit user actions (nav clicks, search
 *   results) — not for passive hash restores on page load.
 * - Honors prefers-reduced-motion (instant jump instead of smooth scroll).
 */

export function scrollToSection(anchor, { focus = false } = {}) {
  const id  = String(anchor).replace(/^#/, '');
  const el  = document.getElementById(id);
  if (!el) return;

  // Measure both sticky layers so neither obscures the target element.
  // TopicNav (#topic-nav) and StickyContextBar (.sticky-context-bar) each
  // contribute height. Fall back to known defaults if elements aren't in DOM.
  const navEl         = document.getElementById('topic-nav');
  const contextBarEl  = document.querySelector('[data-sticky-context-bar]');
  const navHeight     = navEl        ? navEl.getBoundingClientRect().height        : 56;
  const contextHeight = contextBarEl ? contextBarEl.getBoundingClientRect().height : 36;
  const stickyTotal   = navHeight + contextHeight;

  const top = el.getBoundingClientRect().top + window.scrollY - stickyTotal - 16;

  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top, behavior: reducedMotion ? 'auto' : 'smooth' });

  if (focus) {
    // Focus the section's first heading (so screen readers announce where
    // the user landed), falling back to the section itself. tabIndex=-1
    // makes it programmatically focusable without adding a Tab stop.
    // preventScroll: the smooth scroll above already positions it.
    const target = el.querySelector('h1, h2, h3, h4') ?? el;
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }
}
