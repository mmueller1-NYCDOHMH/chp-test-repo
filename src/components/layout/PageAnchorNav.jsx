'use client';

/**
 * FILE: PageAnchorNav.jsx
 *
 * PURPOSE:
 * "On this page" list for static pages (e.g. /about), shown in Sidebar's
 * static-page mode. Added 2026-10-09 per Morgan.
 *
 * DESCRIPTION:
 * - Thin vertical rail on the left; the current section gets a brand-blue
 *   bar on the rail plus brand text (aria-current="location").
 * - Scroll-spy: an IntersectionObserver watches each target heading; the
 *   last heading that has crossed the upper band of the viewport is active.
 *   At the very bottom of the page the last item wins (short final sections
 *   never reach the band otherwise).
 *
 * PROPS:
 *   items — [{ href: '#id', label }]
 */

import { useEffect, useState } from 'react';

export default function PageAnchorNav({ items = [] }) {
  const [activeHref, setActiveHref] = useState(items[0]?.href ?? null);

  useEffect(() => {
    const targets = items
      .map(({ href }) => document.getElementById(href.replace(/^#/, '')))
      .filter(Boolean);
    if (!targets.length) return;

    function update() {
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      if (atBottom) { setActiveHref(`#${targets[targets.length - 1].id}`); return; }
      const line = window.innerHeight * 0.3;
      let current = targets[0];
      for (const t of targets) {
        if (t.getBoundingClientRect().top <= line) current = t;
      }
      setActiveHref(`#${current.id}`);
    }

    const io = new IntersectionObserver(update, { rootMargin: '0px 0px -70% 0px', threshold: [0, 1] });
    targets.forEach(t => io.observe(t));
    window.addEventListener('scroll', update, { passive: true });
    update();
    return () => { io.disconnect(); window.removeEventListener('scroll', update); };
  }, [items]);

  if (!items.length) return null;

  return (
    <nav aria-label="On this page">
      <p className="text-sm font-semibold text-gray-600 mb-3">On this page</p>
      <ul className="border-l-2 border-gray-200">
        {items.map(({ href, label }) => {
          const active = href === activeHref;
          return (
            <li key={href}>
              <a
                href={href}
                aria-current={active ? 'location' : undefined}
                className={[
                  '-ml-0.5 block border-l-2 pl-4 py-1.5 text-sm transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-r',
                  active
                    ? 'border-brand text-brand font-medium'
                    : 'border-transparent text-gray-600 hover:text-brand hover:border-gray-400',
                ].join(' ')}
              >
                {label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
