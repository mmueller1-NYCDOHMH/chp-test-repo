/**
 * FILE: /lib/geoclient/geocode.js
 *
 * PURPOSE:
 * Client-side geocoding via the internal /api/geocode proxy.
 *
 * All Geoclient calls are routed through /api/geocode (a Next.js route handler)
 * which holds the NYC_GEOCLIENT_KEY server-side. This keeps the subscription
 * key out of the browser bundle entirely.
 *
 * searchAddresses(query, neighborhoods)
 *   Calls GET /api/geocode?address=<query> and maps the result to a
 *   { label, neighborhood } object for the address search dropdown.
 *   Returns an array (0 or 1 entries) — never throws.
 */

/**
 * Searches for an NYC address via the internal geocode proxy.
 * Returns a single-entry array on success, empty array on no match or error.
 *
 * @param {string} query          — partial or full address typed by the user
 * @param {Array}  neighborhoods  — full neighborhoods array from getNeighborhoods()
 * @returns {Array<{ label: string, neighborhood: object }>}
 */
export async function searchAddresses(query, neighborhoods) {
  if (!query?.trim() || query.trim().length < 3) return [];

  try {
    const url = new URL('/api/geocode', window.location.origin);
    url.searchParams.set('address', query.trim());

    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) return [];

    const body = await res.json();

    // API proxy returns { error } on failure or { geoId, displayAddress } on success
    if (body.error || !body.geoId) return [];

    const nbhd = neighborhoods.find(n => n.geoId === body.geoId);
    if (!nbhd) return [];

    return [{ label: body.displayAddress, neighborhood: nbhd }];

  } catch {
    return [];
  }
}
