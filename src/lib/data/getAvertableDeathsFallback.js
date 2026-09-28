/**
 * FILE: getAvertableDeathsFallback.js
 *
 * PURPOSE:
 * Decides whether a highlighted (selected or comparison) neighborhood's dot
 * on the Avertable Deaths distribution chart should be suppressed in favor
 * of an explanatory overlay, and picks which of the two copy variants to
 * show. Pure logic, no data fetching — safe to import from both the server
 * (AvertableDeathsSection.jsx) and the client (AvertableDeathsChart.jsx).
 *
 * BACKGROUND (data/metadata/avertable-death-meta.json's MethodsNote):
 * "Avertable deaths" measures the % more deaths a CD would have if it
 * matched the average death rate of the 5 highest-income CDs (the
 * "baseline" group) — 0% = same as baseline, positive = worse than
 * baseline (this many deaths would be averted), negative = already better
 * than the baseline. The baseline CDs themselves have no score (comparing
 * a group's average to itself is meaningless), and the same MethodsNote
 * says negative-value CDs were deliberately NOT presented in the original
 * profiles — this file gives the frontend a place to reproduce both rules
 * for whichever CD is currently highlighted (selected or comparison),
 * rather than relying on upstream suppression.
 *
 * BASELINE GEOIDS — read directly from the MethodsNote text (not guessed):
 * "Financial District (MN 01), Greenwich Village/Soho (MN 02), Stuyvesant
 * Town/Turtle Bay (MN 06), Upper West Side (MN 07), and Upper East Side
 * (MN 08)".
 *
 * ⚠ DATA CAVEAT (found 2026-09-16, flag to Dan/Joyce): the live
 * avertable-death.json doesn't cleanly match this MethodsNote today —
 * 4 of these 5 baseline CDs carry ValueStatus "na" (101, 102, 106, 107),
 * but Upper East Side (108) carries ValueStatus "supressed" [sic] instead.
 * And the three CDs the MethodsNote names as having a negative value
 * (Midtown MN05/GeoID 105, Woodside-Sunnyside QN02/GeoID 402,
 * Elmhurst-Corona QN04/GeoID 404) are inconsistent in the current file:
 * 105 and 402 are "supressed" (no negative Value ever reaches the
 * frontend), while 404 currently ships a plain positive 15%. So the <0%
 * branch below is written for when the data team ships a real negative
 * Value (matching what the mockup shows), not something you can trigger
 * against today's file — the baseline-membership branch is what's
 * actually reachable right now, via the 5 hardcoded GeoIDs, since the
 * upstream ValueStatus doesn't reliably mark that case either.
 */

// Sourced from the MethodsNote above, not inferred from ValueStatus — see
// the data caveat: ValueStatus alone doesn't reliably distinguish the 5
// baseline CDs (108 breaks the "na" pattern the other 4 follow).
export const AVERTABLE_DEATHS_BASELINE_GEO_IDS = [101, 102, 106, 107, 108];

/**
 * @param {{ GeoID: number, Value: number|null }|null|undefined} row — the
 *   highlighted CD's data row (selected or comparison)
 * @param {string} neighborhoodName — display name for the copy templates
 * @returns {{ suppressed: boolean,
 *             reason: 'baseline-neighborhood'|'below-baseline'|'no-value'|null,
 *             message: string|null,       — full sentence (chart overlay, narrative)
 *             shortMessage: string|null   — short line under a legend entry
 *           }}
 *
 * 2026-09-25 (card restyle to Morgan's mockup): added `shortMessage` for the
 * legend's "(Not calculated)" sub-line, and a 'no-value' branch so a
 * non-baseline CD whose Value is null (upstream "supressed"/"na" — e.g. 104,
 * 105, 306, 402) gets the same "Not calculated" treatment instead of just
 * silently missing a dot. Its copy stays neutral on purpose: the data
 * doesn't say WHY those rows are empty, so it doesn't claim "lower death rate".
 */
export function getAvertableDeathsFallback(row, neighborhoodName) {
  const none = { suppressed: false, reason: null, message: null, shortMessage: null };
  if (!row) return none;

  // Baseline membership checked before the <0% check — it's the more
  // specific/accurate reason even for a baseline CD whose own value
  // happens to be present and read near 0%.
  if (AVERTABLE_DEATHS_BASELINE_GEO_IDS.includes(row.GeoID)) {
    return {
      suppressed: true,
      reason: 'baseline-neighborhood',
      message: `${neighborhoodName} is one of the 5 wealthiest neighborhoods.`,
      shortMessage: 'One of the 5 wealthiest neighborhoods.',
    };
  }

  if (typeof row.Value === 'number' && row.Value < 0) {
    return {
      suppressed: true,
      reason: 'below-baseline',
      message: `The death rate in ${neighborhoodName} is lower than that of the 5 wealthiest neighborhoods.`,
      shortMessage: 'Death rate was lower than the 5 wealthiest neighborhoods.',
    };
  }

  if (row.Value == null) {
    return {
      suppressed: true,
      reason: 'no-value',
      message: `Avertable deaths were not calculated for ${neighborhoodName}.`,
      shortMessage: 'Not calculated for this neighborhood.',
    };
  }

  return none;
}
