/**
 * FILE: CardRow.jsx
 *
 * PURPOSE:
 * Lays out a row of IndicatorCards in a 2-column grid (single column on
 * narrow viewports).
 *
 * DESCRIPTION:
 * Accepts a `cards` prop — an array of plain prop objects — and maps each
 * onto an IndicatorCard. Keeps the page config terse: a section drops a
 * single `cardRow` block instead of repeating individual cards.
 *
 * NOTES:
 * - Card definitions live in props for now; once cards become data-driven
 *   they can be moved behind a dataKey.
 * - Pure layout — no flyout/data logic here.
 */

import IndicatorCard from './IndicatorCard';

export default function CardRow({ cards = [] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {cards.map((card, i) => (
        <IndicatorCard key={card.id ?? i} {...card} />
      ))}
    </div>
  );
}
