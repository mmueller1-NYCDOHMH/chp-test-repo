'use client';

/**
 * FILE: SectionWrapper.jsx
 *
 * PURPOSE:
 * Provides layout structure, styling, and scroll-reveal animation for page sections.
 *
 * DESCRIPTION:
 * Applies layout presets (stacked, grid, hero, etc.) and resolves them into
 * Tailwind classes. Each section fades and slides up into view the first time
 * it enters the viewport via IntersectionObserver.
 *
 * ANIMATION:
 * Sections start invisible (data-revealed="false"). On first intersection they
 * transition to visible (data-revealed="true"). The observer disconnects after
 * the first trigger so the animation only plays once per page load. useLayoutEffect
 * sets the initial hidden state before the browser paints to avoid a flash.
 *
 * NOTES:
 * - Client component (uses useLayoutEffect + IntersectionObserver)
 * - Pure layout component — no data logic
 */
import { useEffect, useLayoutEffect, useRef } from 'react';
import { layoutPresets } from '@/config/presets/layoutPresets';
import { resolveLayoutClasses } from '@/config/layout/resolveLayoutClasses';

// Reveal animation CSS lives in globals.css — no inline <style> injection needed.

export default function SectionWrapper({ children, layout, id, categoryId }) {
  const sectionRef = useRef(null);
  const resolved   = layoutPresets[layout] || layoutPresets.stacked;
  const classes    = resolveLayoutClasses(resolved);

  // EXPERIMENTAL (mobile pseudo-pages) — data-chp-category lets
  // MobileCategoryPager.jsx show/hide sections by category on mobile.
  // Harmless no-op on desktop / if categoryId is undefined. See
  // MobileCategoryContext.jsx for the revert path.
  const categoryAttr = categoryId ? { 'data-chp-category': categoryId } : {};

  // Set hidden state before browser paints to prevent SSR flash
  useLayoutEffect(() => {
    if (sectionRef.current) {
      sectionRef.current.dataset.sectionReveal = 'false';
    }
  }, []);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.dataset.sectionReveal = 'true';
          observer.disconnect();
        }
      },
      { threshold: 0.04, rootMargin: '0px 0px -32px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (resolved.noCard) {
    return (
      <section ref={sectionRef} id={id} className={classes.outer} {...categoryAttr}>
        <div className={classes.inner}>
          {children}
        </div>
      </section>
    );
  }

  return (
    <section ref={sectionRef} id={id} className={classes.outer} {...categoryAttr}>
      <div className={classes.card}>
        <div className={classes.inner}>
          {children}
        </div>
      </div>
    </section>
  );
}
