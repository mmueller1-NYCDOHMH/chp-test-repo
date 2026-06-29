'use client';

/**
 * FILE: NeighborhoodGroups.jsx
 *
 * PURPOSE:
 * Renders borough-grouped neighborhood items as <li> elements.
 * Designed to be embedded directly inside a <ul role="listbox">.
 *
 * DESCRIPTION:
 * Encapsulates the repeating pattern of:
 *   - A borough-label header
 *   - An ARIA group of neighborhood options
 *   - Per-item focus highlight, active badge, hover sync, and text highlight
 *
 * Used by UnifiedSearch and ComparisonNeighborhoodSelector.
 * IntroModal uses a structurally different layout (<button>/<div> with sticky
 * headers) and manages its own rendering.
 *
 * PROPS:
 * @prop {Array}    grouped       - [[borough, neighborhoods[]], ...] pairs
 * @prop {string}   query         - Current search query (for text highlighting)
 * @prop {number}   focusedIndex  - Currently keyboard-focused item index (global)
 * @prop {object}   itemRefs      - Ref array; itemRefs.current[idx] = el
 * @prop {number}   [startIndex]  - Index offset for shared keyboard-nav spaces.
 *                                  UnifiedSearch passes flatNeighborhoods.length
 *                                  so its address items continue the sequence.
 *                                  Default: 0.
 * @prop {Function} onSelect      - (neighborhood) => void
 * @prop {Function} onSetFocused  - (idx) => void
 * @prop {Function} [onHover]     - (id | null) => void, for map/list hover sync
 * @prop {string}   [activeId]    - Neighborhood id matching the current page;
 *                                  shows a "current" badge on that item.
 * @prop {string}   [colorScheme]   - 'blue' (default) | 'amber'
 * @prop {string}   [size]          - 'sm' (default) | 'xs'
 * @prop {string}   [optionIdPrefix] - When provided, each option gets
 *                                    id="{optionIdPrefix}-{globalIdx}".
 *                                    Used by parent comboboxes for
 *                                    aria-activedescendant.
 */

import { highlight } from '@/lib/utils/highlight';

const SCHEMES = {
  blue: {
    focused:   'bg-blue-50 text-blue-700',
    default:   'text-gray-800 hover:bg-gray-50',
    mark:      'bg-blue-100 text-blue-800',
    badgeText: 'text-blue-500',
  },
  amber: {
    focused:   'bg-amber-50 text-amber-800',
    default:   'text-gray-700 hover:bg-amber-50 hover:text-amber-800',
    mark:      'bg-amber-100 text-amber-900',
    badgeText: 'text-amber-600',
  },
};

export default function NeighborhoodGroups({
  grouped,
  query,
  focusedIndex,
  itemRefs,
  startIndex      = 0,
  onSelect,
  onSetFocused,
  onHover,
  activeId,
  colorScheme     = 'blue',
  size            = 'sm',
  optionIdPrefix,
}) {
  const scheme   = SCHEMES[colorScheme] ?? SCHEMES.blue;
  const textSize = size === 'xs' ? 'text-xs' : 'text-sm';
  const ptHeader = size === 'xs' ? 'pt-2'   : 'pt-2.5';

  let localIdx = 0;

  return grouped.map(([borough, ns]) => (
    <li key={borough} role="none">
      <p className={`text-xs font-semibold text-gray-500 uppercase tracking-widest px-3 ${ptHeader} pb-1 select-none`}>
        {borough}
      </p>
      <ul role="group" aria-label={borough}>
        {ns.map(n => {
          const idx       = startIndex + localIdx++;
          const isActive  = activeId != null && activeId === String(n.id);
          const isFocused = idx === focusedIndex;

          return (
            <li
              key={n.id}
              id={optionIdPrefix ? `${optionIdPrefix}-${idx}` : undefined}
              ref={el => { itemRefs.current[idx] = el; }}
              role="option"
              aria-selected={isFocused || isActive}
              onClick={() => onSelect(n)}
              onMouseEnter={() => { onSetFocused(idx); onHover?.(n.id); }}
              onMouseLeave={() => onHover?.(null)}
              className={[
                `flex items-center justify-between px-3 py-1.5 ${textSize} cursor-pointer transition-colors`,
                isFocused || isActive ? scheme.focused : scheme.default,
              ].join(' ')}
            >
              <span className="font-medium">
                {highlight(n.name, query.trim(), scheme.mark)}
              </span>
              {isActive && (
                <span className={`text-xs ${scheme.badgeText} font-semibold uppercase tracking-wide ml-2 shrink-0`}>
                  current
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </li>
  ));
}
