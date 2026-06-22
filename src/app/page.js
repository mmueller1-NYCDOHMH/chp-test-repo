/**
 * FILE: /app/page.js
 *
 * PURPOSE:
 * Root route — redirects to a default neighborhood profile.
 *
 * DESCRIPTION:
 * The Community Health Profiles app is neighborhood-first; there is no
 * standalone landing page. Visiting `/` redirects to a sensible default
 * neighborhood so every entry point lands on a real profile.
 *
 * The IntroModal (shown to first-time users) lives on the neighborhood
 * page itself, so it still fires for new visitors regardless of which
 * entry point they used.
 *
 * ROUTING:
 * /  →  /neighborhood/long-island-city-and-astoria
 *
 * NOTES:
 * - Server component (no "use client")
 * - The default neighborhood ID below can be changed without touching
 *   any other part of the system.
 */

import { redirect } from 'next/navigation';
import { DEFAULT_NEIGHBORHOOD_ID } from '@/lib/utils/constants';

export default function HomePage() {
  redirect(`/neighborhood/${DEFAULT_NEIGHBORHOOD_ID}`);
}
