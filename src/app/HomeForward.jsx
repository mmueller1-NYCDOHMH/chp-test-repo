'use client';

/**
 * FILE: /app/HomeForward.jsx
 *
 * PURPOSE:
 * Companion to app/page.js's meta refresh. A meta refresh only fires on a
 * full page load; in-app <Link href="/"> navigations (breadcrumbs, 404 and
 * error pages) render the home page client-side, where it wouldn't fire.
 * This replaces the history entry with the target so "/" never shows its
 * fallback link and the Back button skips it.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomeForward({ target }) {
  const router = useRouter();
  useEffect(() => { router.replace(target); }, [router, target]);
  return null;
}
