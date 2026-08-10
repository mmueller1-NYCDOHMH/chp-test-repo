'use client';

/**
 * FILE: ShortcutsToast.jsx
 *
 * PURPOSE:
 * First-visit hint surfacing the keyboard shortcuts that are otherwise only
 * discoverable by finding the ? button in the site header (HeaderHelpMenu).
 *
 * BEHAVIOR:
 * - Renders once per user (gated on 'chp_shortcuts_hint_seen' in localStorage)
 * - Auto-dismisses after 4 seconds
 * - Close button dismisses immediately
 * - Does not render on mobile (shortcuts are desktop-only)
 * - Positioned at the bottom of the sidebar, just above the sticky
 *   "neighborhoods explored" badge (bottom-[44px] matches that badge's height)
 */

import { useState, useEffect, useRef } from 'react';

const STORAGE_KEY  = 'chp_shortcuts_hint_seen';
const AUTO_DISMISS = 4000; // ms

export default function ShortcutsToast() {
  const [visible, setVisible]   = useState(false);
  const [mounted, setMounted]   = useState(false);
  const [opacity, setOpacity]   = useState(0);
  const timerRef                = useRef(null);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
    } catch { return; }

    // Short delay so the page settles before the toast appears
    const showTimer = setTimeout(() => {
      setMounted(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setOpacity(1));
      });
      timerRef.current = setTimeout(dismiss, AUTO_DISMISS);
    }, 1800);

    return () => clearTimeout(showTimer);
  }, []);

  function dismiss() {
    clearTimeout(timerRef.current);
    setOpacity(0);
    setTimeout(() => setMounted(false), 250);
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* ignore */ }
  }

  if (!mounted) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Keyboard shortcuts tip"
      className="hidden md:block absolute bottom-[44px] left-0 right-0 px-4 pointer-events-none z-20"
      style={{
        opacity,
        transition: 'opacity 250ms ease-out',
      }}
    >
      <div className="pointer-events-auto bg-gray-900 text-white rounded-lg px-3.5 py-2.5 shadow-lg flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium leading-snug">
            <kbd className="inline-flex items-center justify-center w-4 h-4 bg-white/20 rounded text-[10px] font-mono mr-1">/</kbd>
            search neighborhoods
            <span className="text-white/40 mx-1.5">·</span>
            <kbd className="inline-flex items-center justify-center w-4 h-4 bg-white/20 rounded text-[10px] font-mono mr-1">?</kbd>
            all shortcuts
          </p>
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss tip"
          className="shrink-0 text-white/50 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded mt-px"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
