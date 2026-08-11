'use client';

/**
 * FILE: KeyboardShortcutsButton.jsx
 *
 * PURPOSE:
 * Renders a `?` button that opens a popover listing all available keyboard
 * shortcuts. Previously lived in the sidebar footer; now rendered in
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
 * BEHAVIOR:
 * - Click `?` or press `?` anywhere (outside inputs) to toggle.
 * - Press Escape or click outside to close.
 * - Not a modal — no focus trap.
 *
 * NOTES:
 * - Client component (useState, useEffect)
 * - Neutral gray styling for white backgrounds
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

// Exported so other entry points (e.g. HeaderHelpMenu) can list the same
// shortcuts without duplicating this array.
export const SHORTCUTS = [
  { keys: ['/'],   description: 'Search neighborhoods'                         },
  { keys: ['f'],   description: 'Search indicators'                            },
  { keys: ['m'],   description: 'Open neighborhood picker'                     },
  { keys: ['j'],   description: 'Next section'                                 },
  { keys: ['k'],   description: 'Previous section'                             },
  { keys: ['e'],   description: 'Expand chart (while hovering or focusing it)' },
  { keys: ['i'],   description: 'Open indicator details (hover or focus card)' },
  { keys: ['Esc'], description: 'Close panel / clear search'                   },
  { keys: ['?'],   description: 'Show this shortcuts menu'                     },
];

export default function KeyboardShortcutsButton() {
  const [isOpen,  setIsOpen]  = useState(false);
  const [visible, setVisible] = useState(false);
  const [coords,  setCoords]  = useState(null); // { top, right } in viewport px, for the portaled popover
  const containerRef          = useRef(null);
  const btnRef                = useRef(null);
  const popoverRef            = useRef(null);

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
    <div ref={containerRef} className="relative hidden sm:block">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setIsOpen(v => !v)}
        aria-label="Keyboard shortcuts"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        title="Keyboard shortcuts (?)"
        className={[
          'w-6 h-6 rounded-full border text-xs font-medium flex items-center justify-center shrink-0',
          'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
          isOpen
            ? 'border-blue-300 bg-blue-50 text-blue-600'
            : 'border-gray-300 bg-white text-gray-600 hover:border-brand hover:bg-brand hover:text-white',
        ].join(' ')}
      >
        ?
      </button>

      {/* Popover — portaled to document.body so its stacking isn't capped by
          the sidebar aside's position:sticky context (see POSITIONING above).
          Opens downward and to the left, anchored to the button's right edge,
          so it can't run off-screen when the button sits near the viewport edge. */}
      {isOpen && coords && createPortal(
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="Keyboard shortcuts"
          className="fixed w-56 bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden z-[10000]"
          style={{
            top:        coords.top,
            right:      coords.right,
            opacity:    visible ? 1 : 0,
            transform:  visible ? 'translateY(0) scale(1)' : 'translateY(6px) scale(0.97)',
            transition: 'opacity 150ms ease-out, transform 150ms ease-out',
          }}
        >
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-widest px-3 py-2.5 border-b border-gray-100">
            Keyboard shortcuts
          </p>

          <ul className="py-1">
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
        </div>,
        document.body
      )}
    </div>
  );
}
