'use client';

/**
 * FILE: KeyboardShortcutsButton.jsx
 *
 * PURPOSE:
 * Renders a `?` button in the sidebar footer that opens a popover listing
 * all available keyboard shortcuts.
 *
 * SHORTCUTS LISTED:
 *   /    — Focus neighborhood search
 *   f    — Focus indicator search
 *   i    — Open indicator detail flyout (while hovering or focusing a card)
 *   Esc  — Close panel / clear search
 *   ?    — Toggle this menu
 *
 * POSITIONING:
 * The popover uses position:absolute anchored to a relative wrapper.
 * This works cleanly because the footer lives outside the sidebar's
 * overflow-y-auto scroll container — see Sidebar.jsx for context.
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

const SHORTCUTS = [
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
  const containerRef          = useRef(null);
  const btnRef                = useRef(null);

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

  // Click outside closes
  useEffect(() => {
    if (!isOpen) return;
    function onMouseDown(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) close();
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
            : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400 hover:bg-gray-100 hover:text-gray-700',
        ].join(' ')}
      >
        ?
      </button>

      {/* Popover — opens upward, anchored to the right edge of the button */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Keyboard shortcuts"
          className="absolute bottom-full right-0 mb-2 w-56 bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden z-50"
          style={{
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
        </div>
      )}
    </div>
  );
}
