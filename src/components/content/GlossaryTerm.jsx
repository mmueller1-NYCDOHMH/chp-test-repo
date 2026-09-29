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
 * PORTAL (2026-09-29):
 * - The tooltip renders into document.body via a portal with fixed
 *   positioning, measured from the term on open (and on scroll/resize).
 *   Before, it was an absolute child of the term, so any ancestor with
 *   overflow:hidden clipped it — e.g. CardReadMore's 2-line clamp, which
 *   hid every on-card subtitle tooltip. Flips below the term when there's
 *   no room above, and is clamped to the viewport horizontally.
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
 *   near the viewport edge would clip it (now JS-measured; see PORTAL)
 * - Accessible: uses role="tooltip", aria-describedby, and responds to focus
 */
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const TIP_W = 224;   // w-56
const GAP = 6;       // mb-1.5
const EDGE = 8;      // min distance from viewport edge

export default function GlossaryTerm({ term, definition }) {
  const id = useId();
  const wrapRef   = useRef(null);
  const tipRef    = useRef(null);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState(null); // { top, left, below }
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
      const inWrap = wrapRef.current && wrapRef.current.contains(e.target);
      const inTip  = tipRef.current && tipRef.current.contains(e.target);
      if (!inWrap && !inTip) {
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
  useEffect(() => { setMounted(true); }, []);

  // Measure the term and place the fixed-position tooltip above it (or
  // below, if there isn't room), clamped inside the viewport.
  const place = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const tipH = tipRef.current ? tipRef.current.offsetHeight : 60;
    const below = r.top - GAP - tipH < EDGE;
    const half = TIP_W / 2;
    const vw = window.innerWidth;
    const center = Math.min(Math.max(r.left + r.width / 2, EDGE + half), vw - EDGE - half);
    setPos({
      top: below ? r.bottom + GAP : r.top - GAP,
      left: center,
      below,
      arrowLeft: r.left + r.width / 2 - (center - half), // px from tooltip's left edge
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open, place]);

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

      {/* Tooltip — portaled to <body> so overflow:hidden ancestors (e.g. the
          card's 2-line clamp) can't clip it. Hoverable, no auto-hide. Always
          mounted (once on the client) so aria-describedby resolves. */}
      {mounted && createPortal(
        <span
          ref={tipRef}
          id={id}
          role="tooltip"
          onMouseEnter={onPointerEnter}
          onMouseLeave={onPointerLeave}
          className="fixed z-[3000] w-56 rounded-lg bg-gray-900 px-3 py-2 text-xs text-white leading-snug shadow-lg transition-opacity duration-150 motion-reduce:transition-none"
          style={{
            top:           pos ? pos.top : -9999,
            left:          pos ? pos.left : -9999,
            transform:     `translate(-50%, ${pos && pos.below ? '0' : '-100%'})`,
            opacity:       open && pos ? 1 : 0,
            visibility:    open && pos ? 'visible' : 'hidden',
            pointerEvents: open ? 'auto' : 'none',
          }}
        >
          {definition}
          {/* Arrow — points at the term even when the tooltip is edge-clamped */}
          <span
            aria-hidden="true"
            className={`absolute -translate-x-1/2 border-4 border-transparent ${pos && pos.below ? 'bottom-full border-b-gray-900' : 'top-full border-t-gray-900'}`}
            style={{ left: pos ? pos.arrowLeft : '50%' }}
          />
        </span>,
        document.body
      )}
    </span>
  );
}
