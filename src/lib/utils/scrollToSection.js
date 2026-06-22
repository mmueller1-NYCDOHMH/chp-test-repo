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
 */

export function scrollToSection(anchor) {
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

  window.scrollTo({ top, behavior: 'smooth' });
}
