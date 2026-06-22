/**
 * FILE: CategoryHeader.jsx
 *
 * PURPOSE:
 * Overarching category heading rendered once at the top of each nav
 * category group, above all subcategory sections within that category.
 *
 * DESCRIPTION:
 * Visually distinct from SectionHeader — this is a "chapter heading"
 * that labels the whole group (e.g. "Social & Economic Conditions"),
 * not an individual subcategory. Renders a large title and 1–3 sentences
 * of introductory context.
 *
 * PROPS:
 *   title   {string}  Category display name
 *   intro   {string}  One to three sentences of framing text
 *
 * NOTES:
 * - Block type: 'categoryHeader' (registered in blockRegistry.js)
 * - Parent sections marked `category: true` are filtered out of the
 *   sidebar SectionNav — category headers appear on the page but not
 *   in the in-page nav list.
 */

export default function CategoryHeader({ title, intro }) {
  return (
    <div className="pb-2">
      <h2 className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-2">
        {title}
      </h2>
      {intro && (
        <p className="text-sm text-gray-600 leading-relaxed max-w-2xl">
          {intro}
        </p>
      )}
    </div>
  );
}
