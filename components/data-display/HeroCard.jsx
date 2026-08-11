/**
 * FILE: HeroCard.jsx
 *
 * PURPOSE:
 * Wide, full-width placeholder card used at the top of a section to
 * highlight a primary indicator or summary.
 *
 * DESCRIPTION:
 * Visual placeholder for the design layer that will follow. Keeps the
 * "hero" slot of a section visually distinct from the smaller, repeated
 * IndicatorCards beneath it.
 *
 * NOTES:
 * - No data wiring yet; props only
 * - All polish (color, typography, illustration) lives in the design phase
 */

export default function HeroCard({ title = 'Hero card', subtitle }) {
  return (
    <div className="w-full bg-gray-200 rounded-lg p-12 flex flex-col items-center justify-center min-h-[180px]">
      <p className="text-gray-700">{title}</p>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}
