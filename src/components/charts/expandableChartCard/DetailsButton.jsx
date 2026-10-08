'use client';

/**
 * FILE: DetailsButton.jsx
 *
 * The "Details →" header button that opens a card's flyout. Shared by the
 * standard ExpandableChartCard and the custom chart cards (2026-09-27) so
 * every card's primary action looks and behaves the same.
 */
import IconHint from './IconHint';

export default function DetailsButton({ title, onClick }) {
  // Hint on hover + keyboard focus (replaces the native title tooltip,
  // which keyboard users never saw) — see IconHint.jsx.
  return (
    <IconHint label="Open details">
    <button
      type="button"
      onClick={onClick}
      aria-label={`Details about ${title}`}
      className="inline-flex items-center gap-1 h-8 sm:h-9 px-2.5 rounded-md border border-brand text-xs font-medium text-brand hover:text-white hover:bg-brand transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 whitespace-nowrap shrink-0"
    >
      Details
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
      </svg>
    </button>
    </IconHint>
  );
}
