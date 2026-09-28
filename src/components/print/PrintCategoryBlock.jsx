/**
 * FILE: PrintCategoryBlock.jsx
 *
 * PURPOSE:
 * One top-level category on the printable Community Health Profile (e.g.
 * "Social", "Health Care") — the black title bar from the mockup, plus its
 * subsection tables.
 *
 * LAYOUT NOTE: the mockup's two-column, two-page layout is NOT reproduced
 * by manually assigning categories to a page/column here — that would be
 * fragile (breaks the moment a category's row count changes). Instead the
 * page (src/app/print/neighborhood/[id]/page.js) renders every category in
 * document order inside a CSS multi-column container (`columns: 2` in
 * print.css), and the browser's print engine flows + paginates
 * automatically, same as the mockup's effect.
 *
 * ORPHANED-HEADER FIX (2026-09-09): this originally put
 * `break-inside-avoid-page` on the whole category `<section>`, meant to
 * keep a category's header from being separated from its content. In
 * practice `break-inside`/`break-after` are hints the browser is free to
 * ignore once the protected block is too tall to fit in the column space
 * remaining — and a full category section (header + every subsection
 * table) is exactly that for a category the size of "Social" in a real
 * report. Real output showed the "SOCIAL" header alone at the bottom of one
 * column while its tables flowed to the top of the next. Fixed by dropping
 * `break-inside-avoid-page` from the section and putting `break-after-avoid`
 * on just the <h2> instead — a much smaller unit the browser can actually
 * honor, which keeps the header glued to whatever comes immediately after
 * it (its first subsection table) even when the rest of the category still
 * has to break across columns/pages.
 *
 * PROPS:
 *   category — { id, title, subsections: [...] } from loadPrintManifest()
 *   geoId    — numeric GeoID of the selected neighborhood
 *
 * NOTES:
 * - Server component, no client JS.
 */

import PrintSubsectionTable from './PrintSubsectionTable';

export default function PrintCategoryBlock({ category, geoId }) {
  return (
    <section aria-labelledby={`cat-${category.id}-heading`} className="mb-4">
      <h2
        id={`cat-${category.id}-heading`}
        className="break-after-avoid bg-black text-white text-[11px] font-semibold uppercase tracking-wide py-1 px-2 mb-2"
      >
        {category.title}
      </h2>
      {category.subsections.map(subsection => (
        <div key={subsection.id} className="mb-2">
          <h3 className="sr-only">{subsection.title}</h3>
          <PrintSubsectionTable subsection={subsection} geoId={geoId} />
        </div>
      ))}
    </section>
  );
}
