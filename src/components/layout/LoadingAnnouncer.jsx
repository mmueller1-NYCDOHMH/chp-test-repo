'use client';

/**
 * FILE: LoadingAnnouncer.jsx
 *
 * PURPOSE (A11Y, 2026-09-26 — WCAG 4.1.3 Status Messages):
 * Announces "Loading … profile" to screen readers while a route's
 * loading.jsx skeleton is on screen. The skeletons are purely visual (and
 * now aria-hidden), so without this, assistive tech got silence during a
 * load. When the real page arrives, RouteAnnouncer.jsx announces
 * "Navigated to {title}", which closes the loop.
 *
 * WHY THE DELAY: a live region that is inserted already containing text
 * is not reliably announced — it has to exist empty first and then change.
 * So this mounts empty and fills in the message a tick later.
 *
 * PROPS:
 *   kind — 'neighborhood' | 'indicator' | 'about' (picks the wording)
 *
 * The neighborhood/indicator name is derived from the URL slug (the
 * loading state has no data yet), e.g. /neighborhood/mott-haven →
 * "Mott Haven". Numeric or missing ids fall back to a generic message.
 */
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

function prettifySlug(slug) {
  if (!slug || /^\d+$/.test(String(slug))) return null;
  return String(decodeURIComponent(slug))
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default function LoadingAnnouncer({ kind = 'neighborhood' }) {
  const params = useParams();
  const [message, setMessage] = useState('');

  useEffect(() => {
    const name = prettifySlug(params?.id ?? params?.key);
    const text =
      kind === 'about'     ? 'Loading About page…'
      : kind === 'indicator' ? `Loading ${name ?? 'indicator'} page…`
      : name ? `Loading ${name} profile…` : 'Loading neighborhood profile…';
    const t = setTimeout(() => setMessage(text), 100);
    return () => clearTimeout(t);
  }, [kind, params?.id, params?.key]);

  return (
    <p role="status" aria-live="polite" className="sr-only">
      {message}
    </p>
  );
}
