'use client';

/**
 * FILE: IconHint.jsx
 *
 * Visible hint for an icon-only button ("?" → "About this data", expand
 * icon → "Expand chart"). Replaces the native `title` attribute, which only
 * shows on mouse hover — keyboard users never saw it (a11y audit
 * 2026-10-08, WCAG 1.4.13 Content on Hover or Focus / 2.4.6 Labels).
 *
 * - Shows on hover AND on keyboard focus (:focus-visible only, so a mouse
 *   click doesn't flash it).
 * - Hoverable: the hint is inside the wrapper, with padding (not margin)
 *   bridging the gap, so moving the pointer onto it keeps it open.
 * - Dismissible: Escape hides it without moving focus.
 * - Persistent: no timer. Hidden again once the button is activated, so it
 *   never sits on top of the dialog the button opens.
 * - Only shows a hint — it never opens the dialog on focus (WCAG 3.2.1).
 * - aria-hidden: the button's aria-label already starts with this text, so
 *   screen readers would otherwise hear it twice.
 *
 * PROPS:
 *   label     — hint text
 *   className — wrapper display classes (default 'inline-flex'; pass
 *               'hidden sm:inline-flex' for desktop-only buttons)
 *   align     — 'right' (default; hint grows leftward from the button's
 *               right edge — right for footer buttons at a card's edge) or 'left'
 */

import { useEffect, useState } from 'react';

export default function IconHint({ label, className = 'inline-flex', align = 'right', children }) {
  const [hovered, setHovered]     = useState(false);
  const [focused, setFocused]     = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const open = (hovered || focused) && !dismissed;

  useEffect(() => {
    if (!open) return;
    function onKey(e) { if (e.key === 'Escape') setDismissed(true); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  function handleFocus(e) {
    let keyboard = true;
    try { keyboard = e.target.matches(':focus-visible'); } catch { /* old browser — show it */ }
    if (!keyboard) return;
    setDismissed(false);
    setFocused(true);
  }

  return (
    <span
      className={`relative shrink-0 ${className}`}
      onMouseEnter={() => { setDismissed(false); setHovered(true); }}
      onMouseLeave={() => setHovered(false)}
      onFocus={handleFocus}
      onBlur={() => setFocused(false)}
      onClick={() => setDismissed(true)}
    >
      {children}
      <span
        aria-hidden="true"
        className={`absolute bottom-full pb-1.5 z-30 ${align === 'left' ? 'left-0' : 'right-0'} ${open ? '' : 'invisible pointer-events-none'}`}
      >
        <span
          className={`block whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs font-medium leading-tight text-white shadow-lg transition-opacity duration-100 motion-reduce:transition-none ${open ? 'opacity-100' : 'opacity-0'}`}
        >
          {label}
        </span>
      </span>
    </span>
  );
}
