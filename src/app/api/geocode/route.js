/**
 * FILE: /app/api/geocode/route.js
 *
 * PURPOSE:
 * Server-side proxy to the NYC Geoclient v2 API.
 * Keeps the API key out of the browser bundle.
 *
 * REQUEST:
 *   GET /api/geocode?address=350+5th+ave+manhattan
 *
 * RESPONSE (success):
 *   { geoId: 105, borough: 'Manhattan', cdNumber: 5, displayAddress: '350 5 AVENUE, MANHATTAN' }
 *
 * RESPONSE (error):
 *   { error: 'not_found' | 'outside_nyc' | 'missing_input' | 'api_error', message: string }
 *
 * GEOCLIENT NOTES:
 * - Uses /v2/search for single-field free-form input
 * - communityDistrict in response is a 3-char string: borough code + zero-padded CD number
 *   e.g. "105" = Manhattan CD 5, "312" = Brooklyn CD 12
 * - This matches the geoId used across the CHP app (parseInt("105") === 105)
 */

import { toTitleCase } from '@/lib/utils/strings';

const GEOCLIENT_BASE = 'https://api.nyc.gov/geoclient/v2';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address')?.trim();

  if (!address) {
    return Response.json(
      { error: 'missing_input', message: 'No address provided.' },
      { status: 400 }
    );
  }

  // Prefer the server-only key; fall back to the public one for existing setups.
  const apiKey = process.env.NYC_GEOCLIENT_KEY ?? process.env.NEXT_PUBLIC_NYC_GEOCLIENT_KEY;
  if (!apiKey) {
    console.error('[geocode] Neither NYC_GEOCLIENT_KEY nor NEXT_PUBLIC_NYC_GEOCLIENT_KEY is set');
    return Response.json(
      { error: 'api_error', message: 'Geocoding service is not configured.' },
      { status: 503 }
    );
  }

  let geoclientRes;
  try {
    const url = new URL(`${GEOCLIENT_BASE}/search`);
    url.searchParams.set('input', address);

    geoclientRes = await fetch(url.toString(), {
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Accept': 'application/json',
      },
      // Don't cache geocode requests — they depend on live user input
      cache: 'no-store',
    });
  } catch (err) {
    console.error('[geocode] Geoclient fetch failed:', err.message);
    return Response.json(
      { error: 'api_error', message: 'Geocoding service is unavailable.' },
      { status: 502 }
    );
  }

  if (!geoclientRes.ok) {
    console.error('[geocode] Geoclient returned', geoclientRes.status);
    return Response.json(
      { error: 'api_error', message: `Geocoding service returned ${geoclientRes.status}.` },
      { status: 502 }
    );
  }

  let body;
  try {
    body = await geoclientRes.json();
  } catch {
    return Response.json(
      { error: 'api_error', message: 'Could not parse geocoder response.' },
      { status: 502 }
    );
  }

  // Geoclient /search returns a `results` array.
  // Find the first result that has a communityDistrict — that's a successfully geocoded NYC address.
  // Prefer results with an explicit success return code, but fall back to any result with the field.
  const results = body?.results ?? [];

  if (process.env.NODE_ENV === 'development') {
    console.log('[geocode] Geoclient results count:', results.length);
    if (results[0]) console.log('[geocode] First result response keys:', Object.keys(results[0]?.response ?? {}));
  }

  const hit = results.find(r => r?.response?.communityDistrict) ?? null;
  const response = hit?.response;

  if (!response) {
    return Response.json(
      { error: 'not_found', message: 'No results found for that address.' },
      { status: 404 }
    );
  }

  // communityDistrict is a 3-char string matching numeric geoId (e.g. "105" = Manhattan CD 5)
  const cdString = response.communityDistrict;
  if (!cdString) {
    return Response.json(
      { error: 'outside_nyc', message: 'That address does not appear to be within NYC.' },
      { status: 422 }
    );
  }

  const geoId    = parseInt(cdString, 10);
  const borough  = toTitleCase(response.firstBoroughName ?? '');
  const cdNumber = geoId % 100;

  // Build a readable normalized address string from Geoclient's normalized fields
  const houseNum = response.houseNumber ?? '';
  const street   = response.firstStreetNameNormalized ?? '';
  const displayAddress = [houseNum, street, borough].filter(Boolean).join(' ');

  return Response.json({ geoId, borough, cdNumber, displayAddress });
}
