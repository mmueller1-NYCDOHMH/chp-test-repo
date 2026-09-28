/**
 * FILE: PrintReportFooter.jsx
 *
 * PURPOSE:
 * Footer for the printable Community Health Profile — link back to the
 * full interactive report, and a data-vintage disclosure (see
 * PrintReportHeader.jsx's DATE NOTE for why there's no single "data as of"
 * year on this report).
 *
 * PROPS:
 *   neighborhoodId — route param, used to build the "full report" link
 *
 * NOTES:
 * - Server component, no client JS.
 */

export default function PrintReportFooter({ neighborhoodId }) {
  return (
    <footer className="break-inside-avoid border-t border-gray-300 mt-3 pt-2 text-[8px] text-gray-500 leading-snug">
      <p>
        Full interactive report: nyc.gov/health/communityhealthprofiles ·
        This page: /neighborhood/{neighborhoodId}
      </p>
      <p>
        Data vintages vary by indicator — see each indicator&rsquo;s entry in the full online
        report for its specific time period and source. Data sources: NYC Community Health
        Survey, Vital Statistics, and American Community Survey.
      </p>
      <p>NYC Department of Health and Mental Hygiene</p>
    </footer>
  );
}
