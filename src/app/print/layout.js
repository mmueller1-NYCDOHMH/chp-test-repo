/**
 * FILE: /app/print/layout.js
 *
 * PURPOSE:
 * Minimal layout for every /print/* route. Deliberately does NOT import
 * PageLayout (src/components/layout/PageLayout.jsx) — this whole point of
 * a separate top-level route tree (src/app/print/... instead of nesting
 * under src/app/neighborhood/[id]/) is to skip the Sidebar, TopicNav,
 * StickyContextBar, FlyoutShell, ComparisonProvider, Leaflet, and
 * Vega-Embed that PageLayout pulls in for the on-screen profile — none of
 * which the print report needs, and all of which would bloat its JS
 * bundle and clutter the printed/PDF output with interactive chrome.
 *
 * WHY A SEPARATE TOP-LEVEL ROUTE, NOT A NESTED ONE:
 * Next.js App Router layouts are always inherited by every nested segment
 * — there is no way for e.g. /neighborhood/[id]/print to render under
 * neighborhood/[id]/page.js's route WITHOUT also inheriting
 * neighborhood/[id]/layout.js (which is what pulls in PageLayout). A route
 * group (parens folder) only organizes files without changing the URL or
 * layout inheritance — it does not let a child opt out of an ancestor's
 * layout.js. The only way to get a genuinely different layout is a
 * separate route subtree, hence /print/neighborhood/[id] living here
 * instead of nested under /neighborhood/[id]/print as originally sketched
 * in printable-report-technical-spec.md — that spec's URL was corrected
 * during implementation once this constraint became concrete.
 *
 * This still inherits the actual root layout (src/app/layout.js) — fonts,
 * globals.css, the skip-to-content link, RouteAnnouncer, Google Translate
 * script. All harmless for a print page; none of them pull in the heavy
 * on-screen chrome.
 */

import './print.css';

export const metadata = {
  title: 'Printable Community Health Profile · NYC Health',
};

export default function PrintLayout({ children }) {
  return (
    <div className="bg-white text-black">
      {children}
    </div>
  );
}
