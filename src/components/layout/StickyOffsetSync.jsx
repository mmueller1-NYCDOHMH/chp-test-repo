'use client';

/**
 * FILE: StickyOffsetSync.jsx
 *
 * PURPOSE (A11Y, 2026-09-26 — WCAG 2.4.11 Focus Not Obscured):
 * Measures the combined height of the two sticky bars at the top of the
 * page — TopicNav (#topic-nav) and StickyContextBar
 * ([data-sticky-context-bar]) — and publishes it as the CSS variable
 * --chp-sticky-offset on <html>. globals.css uses it for
 * `scroll-padding-top`, so keyboard focus and #hash targets always land
 * below the bars instead of hidden underneath them.
 *
 * NOTES:
 * - Renders nothing. Mounted once in PageLayout.
 * - ResizeObserver keeps the value right when the bars change height
 *   (mobile two-row TopicNav vs desktop, text wrapping, zoom).
 * - Removes the variable on unmount so pages without the bars (e.g.
 *   /indicator/[key]) fall back to 0.
 */
import { useEffect } from 'react';

export default function StickyOffsetSync() {
  useEffect(() => {
    const root = document.documentElement;

    function measure() {
      const nav = document.getElementById('topic-nav');
      const bar = document.querySelector('[data-sticky-context-bar]');
      const h = (nav?.getBoundingClientRect().height ?? 0)
              + (bar?.getBoundingClientRect().height ?? 0);
      root.style.setProperty('--chp-sticky-offset', `${Math.round(h)}px`);
    }

    measure();

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    const observeBars = () => {
      if (!ro) return;
      ro.disconnect();
      const nav = document.getElementById('topic-nav');
      const bar = document.querySelector('[data-sticky-context-bar]');
      if (nav) ro.observe(nav);
      if (bar) ro.observe(bar);
    };
    observeBars();

    // The context bar renders only once sections exist; re-check shortly
    // after mount in case it wasn't in the DOM yet.
    const t = setTimeout(() => { observeBars(); measure(); }, 500);
    window.addEventListener('resize', measure);

    return () => {
      clearTimeout(t);
      ro?.disconnect();
      window.removeEventListener('resize', measure);
      root.style.removeProperty('--chp-sticky-offset');
    };
  }, []);

  return null;
}
