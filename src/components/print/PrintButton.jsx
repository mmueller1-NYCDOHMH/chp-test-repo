'use client';

/**
 * FILE: PrintButton.jsx
 *
 * PURPOSE:
 * "Print / Save as PDF" button for the printable Community Health Profile.
 * Calls the browser's native window.print() — no new dependency, and the
 * browser's own print-to-PDF handles pagination against print.css's @page
 * rules. Hidden itself under @media print (see print.css) so it never
 * shows up in the printed/PDF output.
 *
 * NOTES:
 * - Client component (needs an onClick handler) — the only client JS on
 *   the entire print page.
 */

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      data-no-print
      className="fixed top-3 right-3 z-10 bg-brand text-white text-xs font-medium px-3 py-1.5 rounded-md shadow-md hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
    >
      Print / Save as PDF
    </button>
  );
}
