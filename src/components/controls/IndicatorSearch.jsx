'use client';

/**
 * FILE: IndicatorSearch.jsx
 *
 * PURPOSE:
 * Live-filter search over all registered indicators.
 * Shown in the sidebar when the user switches to "Find indicator" mode.
 *
 * DESCRIPTION:
 * Filters the searchIndex by title and subtitle as the user types.
 * Results are grouped by subcategory. Clicking a result smooth-scrolls
 * to that specific indicator card (falling back to the section anchor),
 * and fires the optional onNavigate callback (used by the sidebar to
 * switch back to Neighborhood mode).
 *
 * KEYBOARD NAVIGATION:
 *   ↓ / ↑  — move through results
 *   Enter   — select focused result
 *   Escape  — clear query / return focus to input
 *
 * PROPS:
 *   onNavigate  — called after the user selects a result (optional)
 *   autoFocus   — whether the input grabs focus the instant this tab mounts.
 *                 Default true (desktop aside behavior). The mobile bottom
 *                 sheet instance (Sidebar.jsx) passes false: autoFocus there
 *                 opens the on-screen keyboard immediately on tab-open, which
 *                 makes mobile browsers zoom/scroll to the input before the
 *                 user has seen the rest of the tab (the indicator list,
 *                 "Viewing <neighborhood>", etc). On mobile the user should
 *                 see the full tab first and opt into the keyboard by tapping
 *                 the input themselves.
 *
 * NOTE ON FOCUS RING COLOR:
 * When autoFocus is on, the search input is in its focused state the instant
 * this tab opens — same situation as IntroModal's neighborhood search. Its
 * focus ring is ring-brand rather than the site-wide ring-blue-500 for the
 * same reason: since users see it focused far more than resting, the focus
 * color is what actually reads as "the input's border."
 */

import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { searchIndex }            from '@/config/searchIndex';
import { scrollToSection }        from '@/lib/utils/scrollToSection';
import { DEFAULT_NEIGHBORHOOD_ID } from '@/lib/utils/constants';
import { highlight }              from '@/lib/utils/highlight';
import { getSearchSuggestions, matchesQuery } from '@/lib/utils/searchSuggestions';

// Matches the Tailwind `md` breakpoint used everywhere else in the app for
// the mobile/desktop split (Sidebar's aside vs. bottom sheet), and the same
// max-width MobileCategoryContext.jsx itself checks.
const MOBILE_MAX_WIDTH = 767;

export default function IndicatorSearch({ onNavigate, categoryFilter = null, onClearFilter, activeNeighborhood = null, autoFocus = true }) {
  const [query, setQuery]           = useState('');
  const [focusedIndex, setFocused]  = useState(-1);
  const inputRef                    = useRef(null);
  const listRef                     = useRef(null);
  const itemRefs                    = useRef([]);
  const pathname                    = usePathname();
  const router                      = useRouter();
  const isNeighborhoodPage          = pathname?.startsWith('/neighborhood/');

  // ── Flat filtered results ─────────────────────────────────────────────────
  const results = useMemo(() => {
    // Apply category filter first (from TopicNav activation), then query
    const base = categoryFilter
      ? searchIndex.filter(ind => ind.categoryLabel === categoryFilter)
      : searchIndex;

    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter(ind => matchesQuery(ind, q));
  }, [query, categoryFilter]);

  // ── Empty-state help (only computed when there are no results) ───────────
  // Suggestions come from the indicators currently in scope (respecting the
  // category filter), so every chip is guaranteed to return results.
  // outsideFilterCount: matches that exist but are hidden by the category
  // filter — offered as a one-click "search all categories".
  const emptyHelp = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || results.length > 0) return null;
    const base = categoryFilter
      ? searchIndex.filter(ind => ind.categoryLabel === categoryFilter)
      : searchIndex;
    return {
      ...getSearchSuggestions(q, base),
      outsideFilterCount: categoryFilter
        ? searchIndex.filter(ind => matchesQuery(ind, q)).length
        : 0,
    };
  }, [query, categoryFilter, results.length]);

  // ── Grouped results for rendering ────────────────────────────────────────
  const grouped = useMemo(() => {
    const map = {};
    results.forEach(ind => {
      if (!map[ind.subcategoryLabel]) map[ind.subcategoryLabel] = [];
      map[ind.subcategoryLabel].push(ind);
    });
    return map;
  }, [results]);

  // Flat ordered list of results for keyboard nav indexing
  const flatResults = useMemo(
    () => Object.values(grouped).flat(),
    [grouped]
  );

  // Reset focus index when results change
  useEffect(() => { setFocused(-1); }, [query]);

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex >= 0 && itemRefs.current[focusedIndex]) {
      itemRefs.current[focusedIndex].scrollIntoView({ block: 'nearest' });
    }
  }, [focusedIndex]);

  // ── Select a result ───────────────────────────────────────────────────────
  const handleSelect = useCallback((ind) => {
    // Scroll target: the indicator's own card (id="indicator-{key}", set by
    // ExpandableChartCard and the bespoke At a glance / Health outcomes /
    // Avertable deaths cards), falling back to its section when a card isn't
    // on the page. 2026-09-27 per Morgan — was always the section.
    const sectionId = ind.anchor?.replace(/^#/, '');
    const cardId    = ind.indicatorAnchor?.replace(/^#/, '');

    // Off a neighborhood page (e.g. /about): navigate to the default
    // neighborhood; the browser's own #hash jump lands on the card.
    if (!isNeighborhoodPage) {
      router.push(`/neighborhood/${DEFAULT_NEIGHBORHOOD_ID}${ind.indicatorAnchor ?? ind.anchor}`);
      onNavigate?.();
      return;
    }

    // On a neighborhood page: scroll to the card, then flash it to orient
    // the user.
    const runScroll = () => {
      const targetId = cardId && document.getElementById(cardId) ? cardId : sectionId;
      if (!targetId) return;
      scrollToSection(`#${targetId}`);
      onNavigate?.();
      setTimeout(() => {
        const el = document.getElementById(targetId);
        if (!el) return;
        el.classList.remove('section-flash');
        void el.offsetWidth;
        el.classList.add('section-flash');
        el.addEventListener('animationend', () => el.classList.remove('section-flash'), { once: true });
      }, 150);
    };

    if (typeof window !== 'undefined' && window.innerWidth <= MOBILE_MAX_WIDTH) {
      // 1. A result from a category other than the one currently paged in
      //    lives in a section MobileCategoryPager has set `hidden` on. Switch
      //    into that category first so the section is actually rendered
      //    (display: revert, not display: none) before we try to measure it —
      //    scrollToSection()'s getBoundingClientRect() reads 0×0 on a hidden
      //    element, so without this the "scroll" silently goes nowhere.
      //    IndicatorSearch/Sidebar sits OUTSIDE <MobileCategoryProvider> in
      //    PageLayout.jsx (siblings, not ancestor/descendant), so we can't
      //    reach setPagedCategoryId via useMobileCategory() here — same
      //    window-event pattern as chp:open-intro-modal elsewhere in the app.
      //    MobileCategoryContext.jsx listens for this on chp:set-paged-category.
      const sectionEl      = sectionId ? document.getElementById(sectionId) : null;
      const targetCategory = sectionEl?.getAttribute('data-chp-category');
      if (targetCategory && targetCategory !== 'always') {
        window.dispatchEvent(new CustomEvent('chp:set-paged-category', { detail: { categoryId: targetCategory } }));
      }

      // 2. Selecting a result also dismisses the on-screen keyboard (the
      //    search input was focused) and closes the bottom sheet — both
      //    resize the viewport a beat after this handler runs. Measuring
      //    before either of those settle (the category swap above included)
      //    computes an offset that's stale the instant they do, so the
      //    scroll lands in the wrong place or looks like it did nothing.
      //    Blur explicitly and wait for everything to settle before measuring.
      inputRef.current?.blur();
      setTimeout(runScroll, 300);
    } else {
      runScroll();
    }
  }, [isNeighborhoodPage, onNavigate, router]);

  // ── Keyboard handler on the input ─────────────────────────────────────────
  function handleKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocused(i => Math.min(i + 1, flatResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocused(i => (i <= 0 ? -1 : i - 1));
    } else if (e.key === 'Enter') {
      if (focusedIndex >= 0 && flatResults[focusedIndex]) {
        handleSelect(flatResults[focusedIndex]);
      }
    } else if (e.key === 'Escape') {
      if (query) {
        setQuery('');
      } else {
        onNavigate?.();
      }
    }
  }

  const baseCount     = categoryFilter
    ? searchIndex.filter(ind => ind.categoryLabel === categoryFilter).length
    : searchIndex.length;
  const totalCount    = searchIndex.length;
  const filteredCount = results.length;
  const isFiltered    = query.trim().length > 0;

  return (
    <div className="flex flex-col gap-3 px-6 pt-4 pb-3">

      {/* ── Search input ────────────────────────────────────────── */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search indicators…"
          autoFocus={autoFocus}
          aria-label="Search indicators"
          aria-controls="indicator-search-results"
          aria-activedescendant={focusedIndex >= 0 ? `search-result-${focusedIndex}` : undefined}
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); inputRef.current?.focus(); }}
            aria-label="Clear search"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-gray-600 hover:text-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* ── Category filter chip ────────────────────────────────── */}
      {categoryFilter && (
        <div className="flex items-center gap-1.5 bg-brand-tint border border-brand rounded-lg px-2.5 py-1.5">
          <svg className="w-3 h-3 text-brand shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M7 8h10M11 12h2" />
          </svg>
          <span className="text-xs font-medium text-brand flex-1 leading-none">{categoryFilter}</span>
          <button
            onClick={onClearFilter}
            aria-label={`Remove ${categoryFilter} filter`}
            className="text-gray-600 hover:text-brand transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 rounded"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* ── Active neighborhood context ─────────────────────────── */}
      {activeNeighborhood && !categoryFilter && (
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <span className="w-1.5 h-1.5 rounded-full bg-brand shrink-0" aria-hidden="true" />
          <span>
            Viewing <span className="font-medium text-gray-800">{activeNeighborhood.name}</span>
          </span>
        </div>
      )}

      {/* ── Result count ────────────────────────────────────────── */}
      <p
        className="text-xs text-gray-600"
        role="status"
        aria-live="polite"
      >
        {isFiltered
          ? filteredCount === 0
            ? 'No results'
            : `${filteredCount} of ${baseCount} indicators`
          : categoryFilter
          ? `${baseCount} indicators`
          : `${totalCount} indicators`
        }
      </p>

      {/* ── Results ─────────────────────────────────────────────── */}
      <div
        id="indicator-search-results"
        ref={listRef}
        role="listbox"
        aria-label="Indicator search results"
        className="overflow-y-auto flex flex-col gap-4 max-h-[calc(100vh-260px)]"
      >
        {results.length === 0 ? (
          /* ── Empty state ──────────────────────────────────────── */
          <div className="py-8 flex flex-col items-center gap-3 text-center">
            <svg className="w-8 h-8 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-gray-600">
                {query.trim()
                  ? <>No indicators match “{query.trim()}”</>
                  : 'No indicators found'}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {emptyHelp?.kind === 'close' ? 'Did you mean:' : 'Try searching for:'}
              </p>
            </div>
            {emptyHelp?.terms.length > 0 && (
              <div className="flex flex-wrap gap-1.5 justify-center mt-1">
                {emptyHelp.terms.map(s => (
                  <button
                    key={s}
                    onClick={() => { setQuery(s); inputRef.current?.focus(); }}
                    aria-label={`Search for ${s}`}
                    className="text-xs text-brand border border-brand bg-brand-tint rounded-full px-2.5 py-0.5 hover:bg-brand hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {emptyHelp?.outsideFilterCount > 0 && (
              <button
                onClick={() => { onClearFilter?.(); inputRef.current?.focus(); }}
                className="text-xs text-brand underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
              >
                {emptyHelp.outsideFilterCount} {emptyHelp.outsideFilterCount === 1 ? 'match' : 'matches'} outside {categoryFilter} — search all categories
              </button>
            )}
          </div>
        ) : (
          (() => {
            let globalIdx = 0;
            return Object.entries(grouped).map(([subcat, inds]) => (
              <div key={subcat} role="group" aria-label={subcat}>
                <p className="text-sm font-semibold text-gray-600 mb-1.5 px-1" aria-hidden="true">
                  {subcat}
                </p>
                <div className="flex flex-col gap-0.5">
                  {inds.map(ind => {
                    const idx = globalIdx++;
                    const isFocused = idx === focusedIndex;
                    return (
                      <button
                        key={ind.key}
                        id={`search-result-${idx}`}
                        ref={el => { itemRefs.current[idx] = el; }}
                        role="option"
                        aria-selected={isFocused}
                        onClick={() => handleSelect(ind)}
                        className={[
                          'text-left px-3 py-2.5 rounded-lg transition-colors group',
                          isFocused ? 'bg-brand-tint ring-1 ring-brand' : 'hover:bg-brand-tint',
                        ].join(' ')}
                      >
                        <p className={[
                          'text-sm font-medium leading-snug',
                          isFocused ? 'text-brand' : 'text-gray-900 group-hover:text-brand',
                        ].join(' ')}>
                          {highlight(ind.title, query.trim())}
                        </p>
                        {ind.subtitle && (
                          <p className="text-xs text-gray-600 leading-snug mt-0.5 line-clamp-1">
                            {ind.subtitle}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ));
          })()
        )}
      </div>

      {/* ── Keyboard hint ───────────────────────────────────────── */}
      {/* Raw arrow glyphs are hidden from assistive tech (screen readers read
          them inconsistently, if at all) in favor of a visually-hidden
          equivalent that spells the keys out. */}
      {results.length > 0 && (
        <p className="text-xs text-gray-600 text-center pt-1 border-t border-gray-100 shrink-0">
          <span aria-hidden="true">↑↓ navigate · Enter select · Esc clear</span>
          <span className="sr-only">Use up and down arrow keys to navigate results, Enter to select, Escape to clear</span>
        </p>
      )}

    </div>
  );
}
