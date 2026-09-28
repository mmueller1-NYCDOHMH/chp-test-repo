'use client';

/**
 * FILE: AnimatedValue.jsx
 *
 * PURPOSE:
 * Client wrapper that fades a stat value in from slightly below on mount.
 * Used in StatTile (NeighborhoodOverviewHero) so values animate in when
 * a neighborhood page first renders, giving a sense of "live" data arrival.
 *
 * PROPS:
 * - value     {string}  — the display value to render (e.g. "36%", "78.4 yrs")
 * - className {string}  — forwarded to the span (for typography classes)
 * - delay     {number}  — stagger delay in ms (default 0)
 *
 * NOTES:
 * - Client component (uses useEffect / useState for mount transition)
 * - Falls back to the plain value instantly if JS is unavailable
 * - The parent server component (NeighborhoodOverviewHero) can import this
 *   directly — Next.js handles the server/client boundary automatically
 */
import { useEffect, useState } from 'react';

export default function AnimatedValue({ value, className = '', delay = 0 }) {
  const [visible, setVisible] = useState(false);
  const reducedMotion = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (reducedMotion) { setVisible(true); return; }
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay, reducedMotion]);

  return (
    <span
      className={className}
      style={{
        display:    'inline-block',
        opacity:    visible ? 1 : 0,
        transform:  visible ? 'translateY(0)' : 'translateY(6px)',
        transition: reducedMotion ? 'none' : `opacity 0.75s ease ${delay}ms, transform 0.75s ease ${delay}ms`,
      }}
    >
      {value ?? '—'}
    </span>
  );
}
