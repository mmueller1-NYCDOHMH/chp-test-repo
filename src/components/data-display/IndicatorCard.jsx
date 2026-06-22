/**
 * FILE: IndicatorCard.jsx
 *
 * PURPOSE:
 * Small placeholder card representing a single indicator inside a section.
 *
 * DESCRIPTION:
 * Two of these typically sit side-by-side via CardRow. Functional only
 * for now — content and styling will be filled in by the design layer.
 */

export default function IndicatorCard({ title = 'Indicator specific card', subtitle }) {
  return (
    <div className="w-full bg-gray-200 rounded-lg p-8 flex flex-col items-start justify-start min-h-[160px]">
      <p className="text-gray-700">{title}</p>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}
