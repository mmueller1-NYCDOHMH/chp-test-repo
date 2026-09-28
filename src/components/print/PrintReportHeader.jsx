/**
 * FILE: PrintReportHeader.jsx
 *
 * PURPOSE:
 * Masthead for the printable Community Health Profile — NYC Health
 * wordmark, report title (H1), neighborhood name, and a printed-on date.
 *
 * DATE NOTE: the mockup shows a single "Data as of 2024 · Printed July
 * 2025" line. That doesn't generalize correctly here — each indicator in
 * this app has its own TimePeriod (see getIndicatorMeta.js), from
 * "2015-2019" to "2023-2024" to a single year, so one blanket "data as of"
 * year would misrepresent indicators that vintage differently. This header
 * only states when the page was generated; PrintReportFooter.jsx carries
 * the "data vintages vary by indicator" note instead of a fabricated
 * single year.
 *
 * PROPS:
 *   neighborhoodName — e.g. "Sunset Park"
 *   borough          — e.g. "Brooklyn"
 *   cdNumber         — e.g. 7
 *
 * NOTES:
 * - Server component, no client JS.
 */

const PRINTED_ON = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

export default function PrintReportHeader({ neighborhoodName, borough, cdNumber }) {
  const districtLabel = borough && cdNumber != null
    ? `${borough} CD ${cdNumber} — ${neighborhoodName}`
    : neighborhoodName;

  return (
    <header className="break-inside-avoid flex items-start justify-between border-b-2 border-black pb-2 mb-3">
      <div>
        {/* Same source PageHeader.jsx uses (src/components/layout/PageHeader.jsx,
            natural size 1797x827 — see its 2026-09-03 aspect-ratio fix note).
            Plain <img>, not next/image: this is a static print-only masthead
            with no responsive/optimization needs.
            NOTE (fixed 2026-09-10): this originally had an onError fallback
            handler, which broke the build — "Event handlers cannot be passed
            to Client Component props" (Next 16/Turbopack). This file is a
            Server Component (see file header), and a plain host element
            inside a Server Component can't carry a function prop/event
            handler at all — that requires the element's owning component to
            be a Client Component ('use client'), which would have meant
            promoting either this whole header or a tiny wrapper just for the
            <img> to client-side JS. Not worth it for a cosmetic fallback on a
            print masthead: if nyc.gov's asset is ever unreachable at print
            time, the browser's own broken-image box is an acceptable
            degradation for a page whose whole point is staying near-zero
            client JS (see PrintButton.jsx — the only client component this
            feature has). Dropped onError instead of adding a client
            component. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://www.nyc.gov/assets/doh/respiratory-illness-data/assets/NYC_Health_color_main.png"
          alt="NYC Health"
          className="h-6 mb-1"
        />
        <h1 className="text-base font-bold text-black leading-tight">Community Health Profile</h1>
        <p className="text-[11px] text-gray-700">{districtLabel}</p>
      </div>
      <div className="text-right text-[9px] text-gray-500 shrink-0 pl-3">
        <p>Printed {PRINTED_ON}</p>
        {/* No "Page X of Y" here, and no page number at all — how many pages
            this prints to depends on the viewer's paper size/font
            rendering and can't be known at render time. CORRECTION
            2026-09-10: this used to claim print.css supplies a running
            page-number counter via @page margin boxes; that was wrong —
            mainstream browsers (Chrome/Firefox/Safari) don't implement
            @page margin-box content at all, only dedicated print engines
            like WeasyPrint/Prince do. See print.css's own @page comment
            for the full correction. There is currently no reliable way to
            show a real page number in this report's printed/PDF output. */}
      </div>
    </header>
  );
}
