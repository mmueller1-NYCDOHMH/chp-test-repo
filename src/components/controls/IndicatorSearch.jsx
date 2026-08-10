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
 *
 * NOTE ON FOCUS RING COLOR:
 * The search input has autoFocus, so it's in its focused state the instant
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

// ── Example query suggestions for the empty state ──────────────────────────
const SUGGESTIONS = ['asthma', 'poverty', 'obesity', 'infant', 'safety'];

export default function IndicatorSearch({ onNavigate, categoryFilter = null, onClearFilter, activeNeighborhood = null }) {
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
    return base.filter(
      ind =>
        ind.title.toLowerCase().includes(q) ||
        ind.subtitle.toLowerCase().includes(q) ||
        ind.subcategoryLabel.toLowerCase().includes(q) ||
        ind.categoryLabel.toLowerCase().includes(q)
    );
  }, [query, categoryFilter]);

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
    // Off a neighborhood page (e.g. /about): navigate to the default neighborhood
    // at the section anchor — same pattern as TopicNav.
    if (!isNeighborhoodPage) {
      router.push(`/neighborhood/${DEFAULT_NEIGHBORHOOD_ID}${ind.anchor}`);
      onNavigate?.();
      return;
    }

    // On a neighborhood page: scroll to the section anchor so the section title
    // is visible, then flash the section to orient the user.
    scrollToSection(ind.anchor);
    onNavigate?.();

    const sectionId = ind.anchor?.replace(/^#/, '');
    if (sectionId) {
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (!el) return;
        el.classList.remove('section-flash');
        void el.offsetWidth;
        el.classList.add('section-flash');
        el.addEventListener('animationend', () => el.classList.remove('section-flash'), { once: true });
      }, 150);
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
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
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
          autoFocus
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
            className="text-gray-500 hover:text-brand transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 rounded"
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
              <p className="text-sm font-medium text-gray-600">No indicators found</p>
              <p className="text-xs text-gray-600 mt-1">Try a different search term</p>
            </div>
            <div className="flex flex-wrap gap-1.5 justify-center mt-1">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => { setQuery(s); inputRef.current?.focus(); }}
                  className="text-xs text-brand border border-brand bg-brand-tint rounded-full px-2.5 py-0.5 hover:bg-brand hover:text-white transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          (() => {
            let globalIdx = 0;
            return Object.entries(grouped).map(([subcat, inds]) => (
              <div key={subcat} role="group" aria-label={subcat}>
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-widest mb-1.5 px-1" aria-hidden="true">
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
      {results.length > 0 && (
        <p className="text-xs text-gray-600 text-center pt-1 border-t border-gray-100 shrink-0">
          ↑↓ navigate · Enter select · Esc clear
        </p>
      )}

    </div>
  );
}
