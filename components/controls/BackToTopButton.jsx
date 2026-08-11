'use client';

/**
 * FILE: BackToTopButton.jsx
 *
 * PURPOSE:
 * Floating action button that returns the user to the top of the page.
 *
 * DESCRIPTION:
 * Appears after the user scrolls past a threshold (400px). Animates in/out
 * with a fade + slide transition.
 * - `BackToTopButton` (default export): desktop ghost pill with label.
 *   Rendered by PageLayout outside <main>, in its original position.
 * - `BackToTopButtonMobile` (named export): mobile-only icon circle,
 *   no label. Rendered by PageLayout INSIDE <main>, purely for DOM
 *   placement/z-index stacking — it tracks window/document scroll, same as
 *   the desktop button. (Previously this walked up from <main> looking for
 *   a scrollable ancestor, on the assumption that <main> itself scrolled on
 *   mobile. Nothing in the current layout makes <main> or any ancestor
 *   scrollable — window is the real scroll container at every width — so
 *   that walk always fell through to document.body and effectively did
 *   nothing useful. Simplified to track window directly.)
 *
 * ACCESSIBILITY:
 * - aria-label on the button; icon is aria-hidden
 * - tabIndex toggled so hidden button is not reachable by keyboard
 * - Enter and Space both trigger scroll
 */
import { useState, useEffect, useCallback } from 'react';

const SCROLL_THRESHOLD = 400;

const upArrowPath = (
  <path
    fillRule="evenodd"
    d="M10 17a.75.75 0 0 1-.75-.75V5.612L5.29 9.77a.75.75 0 0 1-1.08-1.04l5.25-5.5a.75.75 0 0 1 1.08 0l5.25 5.5a.75.75 0 1 1-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0 1 10 17Z"
    clipRule="evenodd"
  />
);

/**
 * Shared visibility + scroll-to-top logic. Tracks window/document scroll —
 * the real scroll container at every width in the current layout (nothing
 * makes <main> or any of its ancestors independently scrollable).
 */
function useBackToTop() {
  const [isVisible, setIsVisible] = useState(false);

  const handleScroll = useCallback(() => {
    setIsVisible(document.documentElement.scrollTop > SCROLL_THRESHOLD);
  }, []);

  useEffect(() => {
    // Check once on mount too — covers loads that land already-scrolled
    // (e.g. the browser restoring scroll position on refresh/back-forward
    // nav), which don't reliably fire a 'scroll' event in every browser.
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      scrollToTop();
    }
  };

  return { isVisible, scrollToTop, handleKeyDown };
}

/* ── Desktop: ghost pill with label ─────────────────────────────────────── */
export default function BackToTopButton() {
  const { isVisible, scrollToTop, handleKeyDown } = useBackToTop();

  return (
    <button
      onClick={scrollToTop}
      onKeyDown={handleKeyDown}
      aria-label="Back to top"
      tabIndex={isVisible ? 0 : -1}
      className={[
        'hidden md:flex',   /* mobile has native scroll-to-top; don't block the sidebar FAB */
        'fixed bottom-6 right-4 z-50',
        'h-9 px-3',
        'items-center justify-center gap-1.5',
        'rounded-full',
        'bg-white text-gray-700 border border-gray-200',
        'hover:text-brand hover:border-brand hover:bg-brand-tint',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
        'shadow-sm',
        'transition-all duration-300 ease-in-out',
        isVisible
          ? 'translate-y-0 opacity-100 pointer-events-auto'
          : 'translate-y-4 opacity-0 pointer-events-none',
      ].join(' ')}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
        className="h-4 w-4 shrink-0"
      >
        {upArrowPath}
      </svg>
      <span className="text-sm font-medium leading-none">Back to top</span>
    </button>
  );
}

/* ── Mobile: icon-only circle, tracks window scroll (same as desktop) ────── */
export function BackToTopButtonMobile() {
  const { isVisible, scrollToTop, handleKeyDown } = useBackToTop();

  return (
    <button
      onClick={scrollToTop}
      onKeyDown={handleKeyDown}
      aria-label="Back to top"
      tabIndex={isVisible ? 0 : -1}
      className={[
        'md:hidden flex',
        'fixed bottom-6 right-4 z-50',
        'h-14 w-14',
        'items-center justify-center',
        'rounded-full',
        'bg-blue-600 text-gray-200 border border-gray-500',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
        'shadow-sm',
        'transition-all duration-300 ease-in-out',
        isVisible
          ? 'translate-y-0 opacity-100 pointer-events-auto'
          : 'translate-y-4 opacity-0 pointer-events-none',
      ].join(' ')}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
        className="h-7 w-7 shrink-0 stroke-3"
      >
        {upArrowPath}
      </svg>
    </button>
  );
}
