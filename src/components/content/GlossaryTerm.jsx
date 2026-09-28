'use client';

/**
 * FILE: GlossaryTerm.jsx
 *
 * PURPOSE:
 * Inline tooltip for a single glossary term. Renders the term with a dotted
 * underline; hovering, focusing, clicking or tapping shows a plain-language
 * definition in a small floating tooltip.
 *
 * A11Y REWRITE (2026-09-26 — WCAG 1.4.13 Content on Hover or Focus):
 * - Hoverable: the tooltip stays open while the pointer moves from the term
 *   onto the tooltip itself (it used to be pointer-events-none and closed
 *   on the term's mouseleave).
 * - Dismissible: Escape closes it without moving focus.
 * - Persistent: no auto-hide timer; it stays until hover/focus leaves or
 *   the user dismisses it.
 * - Touch: click/tap toggles it (iOS Safari doesn't focus buttons on tap,
 *   so the old focus-only path never opened it on iPhone). Tapping outside
 *   closes a tapped-open tooltip.
 * - The definition is always linked via aria-describedby, so screen
 *   readers hear it on focus whether or not it's visually open.
 * - Stronger focus ring (blue-600, 2px) and underline (gray-500) — both
 *   were ~2.5:1 before, below the 3:1 non-text contrast minimum.
 *
 * USAGE:
 * Typically rendered by parseGlossaryTerms() + a loop in the parent:
 *
 *   import { parseGlossaryTerms } from '@/lib/glossary';
 *   import GlossaryTerm from '@/components/content/GlossaryTerm';
 *
 *   {parseGlossaryTerms(subtitle).map((seg, i) =>
 *     typeof seg === 'string'
 *       ? <span key={i}>{seg}</span>
 *       : <GlossaryTerm key={i} term={seg.term} definition={seg.definition} />
 *   )}
 *
 * PROPS:
 * - term       {string} — the matched term (display text)
 * - definition {string} — plain-language explanation
 *
 * NOTES:
 * - Client component (uses useState for hover/focus)
 * - Tooltip is positioned above the term; flips automatically via CSS if
 *   near the viewport edge would clip it
 * - Accessible: uses role="tooltip", aria-describedby, and responds to focus
 */
import { useCallback, useEffect, useId, useRef, useState } from 'react';

export default function GlossaryTerm({ term, definition }) {
  const id = useId();
  const wrapRef   = useRef(null);
  const closeTimer = useRef(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pinned,  setPinned]  = useState(false); // opened by click/tap
  const [dismissed, setDismissed] = useState(false); // Escape pressed

  const open = !dismissed && (hovered || focused || pinned);

  const cancelClose = () => { if (closeTimer.current) clearTimeout(closeTimer.current); };

  // Small delay so the pointer can cross the 6px gap between the term and
  // the tooltip without it closing.
  const onPointerEnter = () => { cancelClose(); setDismissed(false); setHovered(true); };
  const onPointerLeave = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setHovered(false), 150);
  };

  const closeAll = useCallback(() => {
    cancelClose();
    setHovered(false);
    setPinned(false);
    setDismissed(true);
  }, []);

  // Escape (anywhere) dismisses; click/tap outside closes a pinned tooltip.
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === 'Escape') closeAll(); // no preventDefault / focus change
    }
    function onDocPointer(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setPinned(false);
        setHovered(false);
      }
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDocPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDocPointer);
    };
  }, [open, closeAll]);

  useEffect(() => () => cancelClose(), []);

  return (
    <span
      ref={wrapRef}
      className="relative inline-block"
      onMouseEnter={onPointerEnter}
      onMouseLeave={onPointerLeave}
    >
      <button
        type="button"
        aria-describedby={id}
        aria-expanded={open}
        onFocus={() => { setDismissed(false); setFocused(true); }}
        onBlur={() => { setFocused(false); setPinned(false); }}
        onClick={() => { setDismissed(false); setPinned((p) => !p); }}
        className="cursor-help border-b border-dotted border-gray-500 text-inherit rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1"
      >
        {term}
      </button>

      {/* Tooltip — hoverable (pointer events on while open), no auto-hide */}
      <span
        id={id}
        role="tooltip"
        className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-56 rounded-lg bg-gray-900 px-3 py-2 text-xs text-white leading-snug shadow-lg transition-opacity duration-150 motion-reduce:transition-none"
        style={{
          opacity:       open ? 1 : 0,
          visibility:    open ? 'visible' : 'hidden',
          pointerEvents: open ? 'auto' : 'none',
        }}
      >
        {definition}
        {/* Arrow */}
        <span aria-hidden="true" className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
      </span>
    </span>
  );
}
