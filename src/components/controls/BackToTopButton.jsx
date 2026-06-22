'use client';

/**
 * FILE: BackToTopButton.jsx
 *
 * PURPOSE:
 * Floating action button that returns the user to the top of the page.
 *
 * DESCRIPTION:
 * Appears after the user scrolls past a threshold (400px). Animates in/out
 * with a fade + slide transition. Ghost pill style — neutral border, no fill.
 *
 * ACCESSIBILITY:
 * - aria-label on the button; icon is aria-hidden
 * - tabIndex toggled so hidden button is not reachable by keyboard
 * - Enter and Space both trigger scroll
 */
import { useState, useEffect, useCallback } from 'react';

const SCROLL_THRESHOLD = 400;

export default function BackToTopButton() {
  const [isVisible, setIsVisible] = useState(false);

  const handleScroll = useCallback(() => {
    setIsVisible(document.documentElement.scrollTop > SCROLL_THRESHOLD);
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const scrollToTop = () => {
    document.documentElement.scrollTop = 0;
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      scrollToTop();
    }
  };

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
        'hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50',
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
        <path
          fillRule="evenodd"
          d="M10 17a.75.75 0 0 1-.75-.75V5.612L5.29 9.77a.75.75 0 0 1-1.08-1.04l5.25-5.5a.75.75 0 0 1 1.08 0l5.25 5.5a.75.75 0 1 1-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0 1 10 17Z"
          clipRule="evenodd"
        />
      </svg>
      <span className="text-sm font-medium leading-none">Back to top</span>
    </button>
  );
}
