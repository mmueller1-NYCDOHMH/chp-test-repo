/**
 * FILE: highlight.js
 *
 * Renders a text string with a substring highlighted using a <mark> element.
 * Used across all search dropdowns in the app.
 *
 * @param {string} text           - Full string to search within
 * @param {string} query          - Substring to highlight (case-insensitive)
 * @param {string} [markClassName] - Tailwind classes for the <mark> element.
 *                                   Defaults to the blue style used in most dropdowns.
 *                                   Pass amber classes for ComparisonNeighborhoodSelector.
 * @returns {string | JSX.Element}
 */
export function highlight(text, query, markClassName = 'bg-blue-100 text-blue-800') {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className={`rounded-sm px-0.5 ${markClassName}`}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}
