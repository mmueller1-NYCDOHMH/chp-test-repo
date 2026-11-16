import { useLayoutEffect, useRef } from 'react';

/**
 * FILE: useCardDetailsShortcut.js
 *
 * Registers a card's Details handler as the target of the global `i`
 * shortcut while the card is hovered or has keyboard focus — the same
 * `window.__chp_hovered_card_open` mechanism ExpandableChartCard uses, for
 * the custom chart cards (2026-09-27). Spread the returned handlers onto the
 * card's root element.
 */
export function useCardDetailsShortcut(handleDetails) {
  const latest = useRef(handleDetails);
  // Synced after render, not during it (React Compiler: no ref writes in render).
  useLayoutEffect(() => { latest.current = handleDetails; });
  const open = () => latest.current?.();

  return {
    onMouseEnter: () => { window.__chp_hovered_card_open = open; },
    onMouseLeave: () => { window.__chp_hovered_card_open = null; },
    onFocus:      () => { window.__chp_hovered_card_open = open; },
    onBlur: (e) => {
      if (!e.currentTarget.contains(e.relatedTarget)) window.__chp_hovered_card_open = null;
    },
  };
}
