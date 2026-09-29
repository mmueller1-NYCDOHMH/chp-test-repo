'use client';

/**
 * FILE: CardReadMore.jsx
 *
 * The on-card "read more" text block shared by every indicator card —
 * standard (ExpandableChartCard) and custom (Avertable Deaths, Leading
 * Causes of Premature Death, cancer types). Extracted 2026-09-27 so the
 * custom cards match the standard card's design exactly instead of each
 * rolling its own inline "read more" toggle.
 *
 * Design (unchanged from ExpandableChartCard's original inline version):
 *   - Full-width text, clamped to 2 lines.
 *   - NO fade (decision 2026-09-29). When — and only when — the text
 *     actually overflows (measured), row 2 ends in "…" plus a small "read more"
 *     pill that opens the card's Details flyout (`onMore`), where the full
 *     text lives. The suffix sits on a solid white background at the end
 *     of row 2, covering the browser's own line-clamp ellipsis, so it reads
 *     as "…text truncated here…read more" with no gradient.
 *   - The link is pointer-only (tabIndex -1, aria-hidden): keyboard and
 *     screen-reader users reach the same flyout via the header Details
 *     button, so this doesn't double every card's Tab stops.
 *   - The text itself is inert: SubtitleWithGlossary can render nested
 *     glossary-term <button>s, so the paragraph is never a click target.
 *
 * PROPS:
 *   text    — the paragraph to show (falsy → renders nothing)
 *   onMore  — handler for the "read more" link (usually the card's handleDetails)
 *   padded  — default true: the standard card's px/pb inset. Pass false when
 *             the parent card already pads its content (pyramid chart card).
 */

import { useRef } from 'react';
import { useOverflowClamp } from './useOverflowClamp';
import SubtitleWithGlossary from './SubtitleWithGlossary';

export default function CardReadMore({ text, onMore, padded = true }) {
  const textRef = useRef(null);
  // Re-measured on resize: a card that fits on desktop can overflow once the
  // grid reflows to a narrower column.
  const clamped = useOverflowClamp(textRef, { deps: [text], watchResize: true });

  if (!text) return null;

  return (
    <div className={padded ? 'px-4 sm:px-5 pb-3' : ''}>
      <div className="relative">
        <p
          ref={textRef}
          className="text-xs leading-relaxed"
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          <SubtitleWithGlossary text={text} />
        </p>
        {clamped && (
          <span
            aria-hidden="true"
            className="absolute bottom-0 right-0 bg-white pl-0.5 text-xs leading-relaxed"
          >
            …{onMore ? (
              <button
                type="button"
                onClick={onMore}
                tabIndex={-1}
                className="ml-1 rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-medium leading-none text-gray-600 shadow-sm transition-colors hover:bg-gray-300 hover:text-gray-800 focus-visible:outline-none"
              >
                read more
              </button>
            ) : null}
          </span>
        )}
      </div>
    </div>
  );
}
