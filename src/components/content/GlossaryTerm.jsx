'use client';

/**
 * FILE: GlossaryTerm.jsx
 *
 * PURPOSE:
 * Inline tooltip for a single glossary term. Renders the term with a dotted
 * underline; hovering or focusing shows a plain-language definition in a
 * small floating tooltip.
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
import { useState, useId } from 'react';

export default function GlossaryTerm({ term, definition }) {
  const [visible, setVisible] = useState(false);
  const id = useId();

  return (
    <span className="relative inline-block">
      <button
        type="button"
        aria-describedby={id}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        className="cursor-help border-b border-dotted border-gray-400 text-inherit focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-400 rounded-sm"
      >
        {term}
      </button>

      {/* Tooltip */}
      <span
        id={id}
        role="tooltip"
        className="pointer-events-none absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-56 rounded-lg bg-gray-900 px-3 py-2 text-xs text-white leading-snug shadow-lg transition-opacity duration-150"
        style={{ opacity: visible ? 1 : 0 }}
        aria-hidden={!visible}
      >
        {definition}
        {/* Arrow */}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
      </span>
    </span>
  );
}
