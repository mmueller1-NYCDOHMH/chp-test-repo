'use client';

/**
 * FILE: KeyboardShortcutsButton.jsx
 *
 * PURPOSE:
 * Renders a `?` button that opens the site's help menu: a link to the About
 * page plus the keyboard shortcuts list.
 *
 * HELP MENU (2026-10-09):
 * The `?` is now the single home for help. "About this tool" moved in here
 * (it previously sat as a text link in StickyContextBar, then briefly in
 * PageHeader). The button shows at every width; on mobile the popover shows
 * only the About link, since keyboard shortcuts don't apply there. Revert
 * copies live in "Claude outputs/revert_utility_links_2026-10-09/".
 * Previously lived in the sidebar footer; now rendered in
 * StickyContextBar's right-hand utility group, alongside About this tool and
 * the language selector.
 *
 * SHORTCUTS LISTED:
 *   /    — Focus neighborhood search
 *   f    — Focus indicator search
 *   i    — Open indicator detail flyout (while hovering or focusing a card)
 *   Esc  — Close panel / clear search
 *   ?    — Toggle this menu
 *
 * POSITIONING:
 * The popover is rendered through a React portal into document.body and
 * positioned with position:fixed from the button's getBoundingClientRect().
 * This is required (not just a style choice) because this button's parent —
 * originally the sidebar <aside>, now StickyContextBar — is position:sticky.
 * Sticky (like fixed) always creates a new stacking context, so any z-index
 * on a descendant is capped inside it. No z-index value on the popover could
 * ever out-rank sibling content (e.g. indicator cards in the main column)
 * while it lived inside that ancestor's DOM subtree. Portaling to <body>
 * escapes that stacking context entirely — keep this even if the button
 * moves again.
 *
 * Anchored by its right edge (`right: viewport width - button's right edge`),
 * not its left edge — this button is the rightmost control in
 * StickyContextBar's utility group, so a left-anchored popover growing
 * rightward would run past the viewport edge. Right-anchoring makes it open
 * downward and to the left instead, which always stays on-screen regardless
 * of how close to the edge the button sits.
 *
 * ON/OFF SWITCH (2026-09-29, WCAG 2.1.4 Character Key Shortcuts):
 * The popover has a "Keyboard shortcuts On/Off" switch at the top. When off,
 * every single-character shortcut (/ f m e i and ? itself) is ignored; the
 * `?` button still opens this popover so the user can turn them back on.
 * The preference lives in lib/utils/shortcutsPreference.js — any new
 * character-key shortcut must check areShortcutsEnabled() before acting.
 *
 * BEHAVIOR:
 * - Click `?` or press `?` anywhere (outside inputs) to toggle.
 * - Tab from the panel moves to the switch; Tab again (or Shift+Tab) closes
 *   the panel and returns focus to the `?` button.
 * - Press Escape or click outside to close.
 * - Not a modal — no focus trap.
 *
 * NOTES:
 * - Client component (useState, useEffect)
 * - Neutral gray styling for white backgrounds
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import {
  areShortcutsEnabled,
  setShortcutsEnabled,
  useShortcutsEnabled,
} from '@/lib/utils/shortcutsPreference';

// Exported so other entry points (e.g. HeaderHelpMenu) can list the same
// shortcuts without duplicating this array.
export const SHORTCUTS = [
  { keys: ['/'],   description: 'Search neighborhoods'                         },
  { keys: ['f'],   description: 'Search indicators'                            },
  { keys: ['m'],   description: 'Open neighborhood picker'                     },
  { keys: ['e'],   description: 'Expand chart (while hovering or focusing it)' },
  { keys: ['i'],   description: 'Open indicator details (hover or focus card)' },
  { keys: ['Esc'], description: 'Close panel / clear search'                   },
  { keys: ['?'],   description: 'Show this help menu'                          },
];

export default function KeyboardShortcutsButton() {
  const [isOpen,  setIsOpen]  = useState(false);
  const [visible, setVisible] = useState(false);
  const [coords,  setCoords]  = useState(null); // { top, right } in viewport px, for the portaled popover
  const containerRef          = useRef(null);
  const btnRef                = useRef(null);
  const popoverRef            = useRef(null);
  const switchRef             = useRef(null);
  const aboutRef              = useRef(null);
  const shortcutsOn           = useShortcutsEnabled();

  // Animate open/close
  useEffect(() => {
    if (isOpen) {
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    } else {
      setVisible(false);
    }
  }, [isOpen]);

  const close = useCallback(() => setIsOpen(false), []);

  // Track the button's viewport position while open so the portaled popover
  // can be anchored to it with position:fixed. Recomputes on resize/scroll
  // (capture:true so scrolling inside the sidebar's own scroll container —
  // or any ancestor — is caught, not just window-level scroll).
  useEffect(() => {
    if (!isOpen) return;
    let rafId = null;
    function updateCoords() {
      rafId = null;
      const rect = btnRef.current?.getBoundingClientRect();
      if (rect) setCoords({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    }
    function onScroll() {
      if (rafId == null) rafId = requestAnimationFrame(updateCoords);
    }
    updateCoords();
    window.addEventListener('resize', updateCoords);
    // capture:true so scrolling inside any ancestor scroll container is
    // caught, not just window-level scroll (see comment above). passive:true
    // alongside it — this listener never calls preventDefault, so marking it
    // passive lets the browser skip waiting on the handler before starting
    // the scroll, avoiding jank. rAF-throttled for the same reason as
    // StickyContextBar's scroll-progress tracker: getBoundingClientRect()
    // forces a layout read, so doing it on every raw scroll event (rather
    // than once per paint) is unnecessary main-thread work while this
    // popover happens to be open.
    window.addEventListener('scroll', onScroll, { capture: true, passive: true });
    return () => {
      window.removeEventListener('resize', updateCoords);
      window.removeEventListener('scroll', onScroll, { capture: true });
      if (rafId != null) cancelAnimationFrame(rafId);
    };
  }, [isOpen]);

  // `?` key globally toggles (skip when focus is in an input)
  useEffect(() => {
    function onKey(e) {
      if (e.key !== '?') return;
      if (!areShortcutsEnabled()) return; // WCAG 2.1.4 — user turned shortcuts off
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || document.activeElement?.isContentEditable) return;
      e.preventDefault();
      setIsOpen(v => !v);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Escape closes
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e) {
      if (e.key === 'Escape') { close(); btnRef.current?.focus(); }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, close]);

  // A11Y (2026-09-28): move focus into the panel when it opens, so keyboard
  // and screen reader users land on it (it's portaled to the end of <body>,
  // so without this the next Tab never reached it). Tab / Shift+Tab from
  // inside closes it and returns focus to the "?" button, so focus never
  // gets stranded at the end of the document.
  // Keyed on coords too: the portaled popover only mounts once its position
  // has been measured, so focusing on isOpen alone ran before it existed.
  useEffect(() => {
    if (!isOpen || !coords) return;
    const raf = requestAnimationFrame(() => popoverRef.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(raf);
  }, [isOpen, coords]);

  // Tab cycles forward through the menu's controls (About link, then the
  // shortcuts switch when visible); Tab past the last one, or Shift+Tab from
  // anywhere, closes the menu and returns focus to the "?" button.
  function handlePopoverKeyDown(e) {
    if (e.key !== 'Tab') return;
    e.preventDefault();
    const focusables = [aboutRef.current, switchRef.current]
      .filter(el => el && el.offsetParent !== null); // skip hidden (mobile) switch
    if (!e.shiftKey) {
      const idx  = focusables.indexOf(e.target);
      const next = focusables[idx + 1];
      if (next) { next.focus(); return; }
    }
    close();
    btnRef.current?.focus();
  }

  // Click outside closes. The popover is portaled to document.body, so it's
  // no longer a DOM descendant of containerRef — check both.
  useEffect(() => {
    if (!isOpen) return;
    function onMouseDown(e) {
      if (containerRef.current?.contains(e.target)) return;
      if (popoverRef.current?.contains(e.target)) return;
      close();
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [isOpen, close]);

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setIsOpen(v => !v)}
        aria-label="Help: about this tool and keyboard shortcuts"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className={[
          'peer w-6 h-6 rounded-full border text-xs font-medium flex items-center justify-center shrink-0',
          'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
          isOpen
            ? 'border-blue-300 bg-blue-50 text-blue-600'
            : 'border-gray-300 bg-white text-gray-600 hover:border-brand hover:bg-brand hover:text-white',
        ].join(' ')}
      >
        ?
      </button>

      {/* Hover/focus hint (2026-10-09). Custom tooltip instead of title= so
          it appears instantly and matches site styling. Right-aligned under
          the button so it never runs past the viewport edge; hidden while
          the menu is open. aria-hidden — the button's aria-label already
          covers this for screen readers. */}
      {!isOpen && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-0 top-full mt-1.5 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs font-medium text-white shadow opacity-0 translate-y-0.5 transition-all duration-150 peer-hover:opacity-100 peer-hover:translate-y-0 peer-focus-visible:opacity-100 peer-focus-visible:translate-y-0 z-50"
        >
          About this tool
        </span>
      )}

      {/* Popover — portaled to document.body so its stacking isn't capped by
          the sidebar aside's position:sticky context (see POSITIONING above).
          Opens downward and to the left, anchored to the button's right edge,
          so it can't run off-screen when the button sits near the viewport edge. */}
      {isOpen && coords && createPortal(
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="Help"
          tabIndex={-1}
          onKeyDown={handlePopoverKeyDown}
          className="fixed w-64 bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden z-[10000]"
          style={{
            top:        coords.top,
            right:      coords.right,
            opacity:    visible ? 1 : 0,
            transform:  visible ? 'translateY(0) scale(1)' : 'translateY(6px) scale(0.97)',
            transition: 'opacity 150ms ease-out, transform 150ms ease-out',
          }}
        >
          {/* About this tool — shown at every width */}
          <Link
            ref={aboutRef}
            href="/about"
            onClick={close}
            className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:text-brand transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
          >
            About this tool
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </Link>

          {/* Keyboard shortcuts — desktop/tablet only (no keyboard on mobile) */}
          <div className="hidden sm:block border-t border-gray-100">
          <div className="flex items-center justify-between gap-3 px-3 py-2.5 border-b border-gray-100">
            <span id="chp-shortcuts-switch-label" className="text-sm font-semibold text-gray-600">
              Keyboard shortcuts
            </span>
            {/* WCAG 2.1.4 — lets users turn off single-character shortcuts */}
            <button
              ref={switchRef}
              type="button"
              role="switch"
              aria-checked={shortcutsOn}
              aria-labelledby="chp-shortcuts-switch-label"
              onClick={() => setShortcutsEnabled(!shortcutsOn)}
              className="flex items-center gap-1.5 shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
            >
              <span className="text-xs text-gray-600 w-6 text-right" aria-hidden="true">
                {shortcutsOn ? 'On' : 'Off'}
              </span>
              <span
                aria-hidden="true"
                className={[
                  'relative inline-flex w-8 h-[18px] rounded-full border transition-colors duration-150',
                  shortcutsOn ? 'bg-brand border-brand' : 'bg-gray-200 border-gray-400',
                ].join(' ')}
              >
                <span
                  className="absolute top-[2px] left-[2px] w-3 h-3 rounded-full bg-white shadow transition-transform duration-150"
                  style={{ transform: shortcutsOn ? 'translateX(14px)' : 'translateX(0)' }}
                />
              </span>
            </button>
          </div>

          {!shortcutsOn && (
            <p className="text-xs text-gray-600 px-3 pt-2.5 leading-snug">
              Shortcuts are off. Esc still closes panels.
            </p>
          )}

          <ul className={['py-1 transition-opacity', shortcutsOn ? '' : 'opacity-50'].join(' ')}>
            {SHORTCUTS.map(({ keys, description }) => (
              <li
                key={keys.join('+')}
                className="flex items-center justify-between px-3 py-2"
              >
                <span className="text-xs text-gray-700">{description}</span>
                <div className="flex items-center gap-1 shrink-0 ml-3">
                  {keys.map(k => (
                    <kbd
                      key={k}
                      className="text-xs font-mono bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5 text-gray-600 leading-none"
                    >
                      {k}
                    </kbd>
                  ))}
                </div>
              </li>
            ))}
          </ul>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
