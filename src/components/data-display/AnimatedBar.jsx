'use client';

/**
 * FILE: AnimatedBar.jsx
 *
 * PURPOSE:
 * Client wrapper that animates a bar from scaleX(0) → scaleX(1) on mount.
 * Used inside ComparisonPyramidChart to make bars feel alive on load.
 *
 * PROPS:
 * - widthPct   {number}  — target width as a percentage (0–100)
 * - className  {string}  — forwarded directly (rounding, etc.)
 * - color      {string}  — optional hex/CSS color for background. Passed as
 *                          inline style rather than a Tailwind class because
 *                          callers (e.g. ComparisonPyramidChart) source their
 *                          colors from chartColors.js constants, which
 *                          Tailwind's static scanner can't pick up as
 *                          dynamic arbitrary-value classes.
 * - title      {string}  — native tooltip
 * - delay      {number}  — stagger delay in ms (default 0)
 * - origin     {string}  — transform-origin; 'right center' for left-growing
 *                          bars, 'left center' for right-growing bars
 *
 * NOTES:
 * - One requestAnimationFrame is enough to trigger the CSS transition;
 *   no setTimeout needed.
 * - The parent (ComparisonPyramidChart) is a server component — this file
 *   exists solely to hold the 'use client' boundary for the animation state.
 */

import { useState, useEffect } from 'react';

export default function AnimatedBar({
  widthPct,
  className = '',
  color,
  title,
  delay = 0,
  origin = 'left center',
}) {
  const [mounted, setMounted] = useState(false);
  const reducedMotion = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (reducedMotion) { setMounted(true); return; }
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, [reducedMotion]);

  return (
    <div
      className={className}
      title={title}
      style={{
        width:           `${widthPct}%`,
        transformOrigin: origin,
        transform:       mounted ? 'scaleX(1)' : 'scaleX(0)',
        transition:      reducedMotion ? 'none' : `transform 0.75s cubic-bezier(0.4, 0, 0.2, 1) ${delay}ms`,
        ...(color ? { backgroundColor: color } : {}),
      }}
    />
  );
}
