'use client';

/**
 * FILE: SectionNav.jsx
 *
 * PURPOSE:
 * In-page section navigation with scroll-spy, grouped by nav category.
 *
 * DESCRIPTION:
 * Renders anchor links for each page section, visually grouped under
 * their parent category label (e.g. "Social & Economic Conditions").
 * Groups are derived by cross-referencing the sections prop against
 * siteNav — no changes to section config files are needed.
 *
 * As the user scrolls, an IntersectionObserver watches each section
 * element and highlights the corresponding link when in view.
 *
 * SCROLL-SPY LOGIC:
 * - Observes each section element using IntersectionObserver
 * - rootMargin '-56px 0px 0px 0px': a section is "active" when any
 *   pixel of it is below the TopicNav (matches TopicNav's own spy)
 * - Tracks all currently-intersecting sections in a Set; picks the
 *   first one by config order (topmost on screen) as active
 * - Clicking a link scrolls smoothly to the target section
 *
 * PROPS:
 *   sections — array of section config objects (category:true entries
 *              already filtered out by PageLayout before passing here)
 *
 * NOTES:
 * - Client component — uses useEffect, useState, useRef
 * - IDs must match the `id` props on rendered <section> elements
 */
import { useEffect, useRef, useState } from 'react';
import { siteNav } from '@/config/nav/siteNav';
import { scrollToSection } from '@/lib/utils/scrollToSection';

/**
 * Build grouped sections from the flat sections array + siteNav hierarchy.
 * Only groups with at least one matching section are returned.
 * Order follows siteNav category order, sections within a group follow
 * their siteNav subcategory order.
 */
function buildGroups(sections) {
  const sectionMap = new Map(sections.map(s => [s.id, s]));

  return siteNav
    .map(category => ({
      id:    category.id,
      label: category.label,
      // Each item pairs the section config with the label from siteNav,
      // so siteNav.js is the single source of truth for nav labels.
      items: category.subcategories
        .filter(sub => !sub.dummy && sectionMap.has(sub.id))
        .map(sub => ({ section: sectionMap.get(sub.id), label: sub.label })),
    }))
    .filter(group => group.items.length > 0);
}

export default function SectionNav({ sections = [] }) {
  const [activeId, setActiveId]   = useState(null);
  const intersectingRef           = useRef(new Set());
  const sectionIds                = sections.map(s => s.id);

  // When TopicNav fires a programmatic scroll, lock the observer out
  // for 900ms so transient positions can't override the destination.
  const manualScrollRef  = useRef(false);
  const manualTimerRef   = useRef(null);

  // Listen for explicit section activations from TopicNav clicks
  useEffect(() => {
    function handleActivation(e) {
      setActiveId(e.detail.id);
      manualScrollRef.current = true;
      if (manualTimerRef.current) clearTimeout(manualTimerRef.current);
      manualTimerRef.current = setTimeout(() => {
        manualScrollRef.current = false;
      }, 900);
    }
    window.addEventListener('chp:section-activated', handleActivation);
    return () => window.removeEventListener('chp:section-activated', handleActivation);
  }, []);

  useEffect(() => {
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            intersectingRef.current.add(entry.target.id);
          } else {
            intersectingRef.current.delete(entry.target.id);
          }
        });

        if (manualScrollRef.current) return;

        const active = sectionIds.find(id => intersectingRef.current.has(id));
        if (active) setActiveId(active);
      },
      { rootMargin: '-56px 0px 0px 0px', threshold: 0 },
    );

    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sections]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── J / K shortcuts — jump to previous / next section ──────────────────
  // activeIdRef keeps the listener stable — no re-registration on every scroll.
  const activeIdRef = useRef(activeId);
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);

  useEffect(() => {
    if (!sections.length) return;
    const orderedIds = buildGroups(sections).flatMap(g => g.items.map(i => i.section.id));
    if (!orderedIds.length) return;

    function onKey(e) {
      if (e.key !== 'j' && e.key !== 'k') return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || document.activeElement?.isContentEditable) return;

      e.preventDefault();
      const current = activeIdRef.current;
      const cur     = orderedIds.indexOf(current);
      const next    = e.key === 'j'
        ? (cur === -1 ? 0 : Math.min(cur + 1, orderedIds.length - 1))
        : (cur === -1 ? 0 : Math.max(cur - 1, 0));
      const nextId  = orderedIds[next];
      if (!nextId || nextId === current) return;

      scrollToSection(`#${nextId}`);
      setActiveId(nextId);
      activeIdRef.current = nextId; // update ref immediately so rapid presses work
      window.dispatchEvent(new CustomEvent('chp:section-activated', { detail: { id: nextId } }));
    }

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [sections]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!sections.length) return null;

  const groups = buildGroups(sections);

  return (
    <nav aria-label="Page sections">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
        On this page
      </p>

      <div className="flex flex-col gap-4">
        {groups.map(group => (
          <div key={group.id}>

            {/* Category label */}
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 mb-1 leading-tight">
              {group.label}
            </p>

            {/* Subcategory links */}
            <ul className="space-y-0.5">
              {group.items.map(({ section, label }) => {
                const isActive = activeId === section.id;

                return (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        scrollToSection(`#${section.id}`);
                        setActiveId(section.id);
                        window.dispatchEvent(new CustomEvent('chp:section-activated', { detail: { id: section.id } }));
                      }}
                      className={[
                        'flex items-center gap-2 text-sm py-1.5 px-2 rounded-md transition-colors',
                        isActive
                          ? 'text-blue-700 bg-blue-50 font-medium'
                          : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50',
                      ].join(' ')}
                      aria-current={isActive ? 'location' : undefined}
                    >
                      <span
                        className="shrink-0 w-1 h-4 rounded-full bg-blue-600"
                        style={{
                          transform: isActive ? 'scaleY(1)' : 'scaleY(0)',
                          opacity:   isActive ? 1 : 0,
                          transition: 'transform 250ms cubic-bezier(0.4, 0, 0.2, 1), opacity 200ms ease',
                          transformOrigin: 'top center',
                        }}
                        aria-hidden="true"
                      />
                      {label}
                    </a>
                  </li>
                );
              })}
            </ul>

          </div>
        ))}
      </div>
    </nav>
  );
}
