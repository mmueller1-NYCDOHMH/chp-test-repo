import { useState, useEffect, useCallback, useRef } from 'react';
import { resolveCategoryLabel } from './resolveCategoryLabel';

/**
 * FILE: useSidebarTabs.js
 *
 * Sidebar's "Neighborhood" / "Find indicator" tab state, URL sync, tab-switch
 * focus management, global keyboard shortcuts (/, f, m), and the
 * chp:section-activated listener that syncs tab + category filter from
 * TopicNav clicks. Part of the 2026-09-04 split of Sidebar.jsx.
 */

const VALID_TABS    = ['neighborhood', 'search'];
const DEFAULT_TAB   = 'neighborhood';
const TAB_URL_PARAM = 'tab';

export function useSidebarTabs() {
  const [activeTab, _setActiveTab]          = useState(DEFAULT_TAB);
  const [categoryFilter, setCategoryFilter] = useState(null);

  // Live ref mirror of activeTab — lets handleSectionActivated (registered
  // once, deps []) read the current tab without a stale closure, and without
  // resorting to the setState functional-updater form for side effects
  // (history.replaceState/setState calls inside a useState updater run
  // during React's render phase and trigger "Cannot update a component
  // while rendering a different component").
  const activeTabRef = useRef(activeTab);
  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);

  // ── Tab-switch focus management ──────────────────────────────────────────
  // Keyed by `${instance}-${tabId}` since the tab strip renders twice (desktop
  // aside + mobile sheet, see renderTabs() in Sidebar.jsx) with separate DOM
  // panels. focusPanelOnNextChange is only set from an explicit tab-button
  // click (see renderTabs), never from the URL-hydration or TopicNav-sync
  // paths that also call setActiveTab — so focus only jumps when the user
  // actually used the tab strip, not on page load or a programmatic sync.
  const panelRefs = useRef({});
  const focusPanelOnNextChange = useRef(null);
  useEffect(() => {
    const instance = focusPanelOnNextChange.current;
    if (!instance) return;
    focusPanelOnNextChange.current = null;
    panelRefs.current[`${instance}-${activeTab}`]?.focus();
  }, [activeTab]);

  // Global keyboard shortcuts (outside any text field):
  //   /  — jump to neighborhood search
  //   m  — open the intro / neighborhood picker modal
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || document.activeElement?.isContentEditable) return;

      if (e.key === '/') {
        e.preventDefault();
        setActiveTab('neighborhood');
        // Wait one tick for the tab switch to re-render, then ask UnifiedSearch
        // to enter edit mode and focus itself — a plain querySelector can't
        // find the input when the control is currently collapsed to its
        // populated/pill state (no <input> in the DOM at that point).
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('chp:focus-neighborhood-search'));
        }, 50);
      }

      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        setActiveTab('search');
        setTimeout(() => {
          document.querySelector('input[aria-label="Search indicators"]')?.focus();
        }, 50);
      }

      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('chp:open-intro-modal'));
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Hydrate tab from URL on mount
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get(TAB_URL_PARAM);
    if (param && VALID_TABS.includes(param)) _setActiveTab(param);
  }, []);

  // Tab setter that also syncs the URL without navigation.
  // Clears the category filter when returning to the neighborhood tab —
  // the filter is set by TopicNav clicks and should reset on explicit tab change.
  const setActiveTab = useCallback((tab) => {
    _setActiveTab(tab);
    if (tab === DEFAULT_TAB) setCategoryFilter(null);
    const url = new URL(window.location.href);
    if (tab === DEFAULT_TAB) {
      url.searchParams.delete(TAB_URL_PARAM);
    } else {
      url.searchParams.set(TAB_URL_PARAM, tab);
    }
    history.replaceState(null, '', url.toString());
  }, []);

  // ── TopicNav → sidebar tab sync ──────────────────────────────────────────
  // chp:section-activated fires on every intentional TopicNav click (never
  // on scroll-spy). Two behaviours depending on what was clicked:
  //
  //   Top-level category (id = 'cat-{categoryId}')
  //     → Switch to "Find indicator" tab, pre-filtered to that category.
  //
  //   Subcategory (plain section id, e.g. 'chronic-conditions')
  //     → If currently on "Find indicator", return to "Neighborhood" so the
  //       map/context is visible alongside the content. No-op otherwise.
  //
  // Both branches use the functional-update form of _setActiveTab so they
  // always read the real current state — the [] effect avoids a stale closure.
  useEffect(() => {
    function handleSectionActivated(e) {
      const id = e.detail?.id ?? '';

      if (id.startsWith('cat-')) {
        // Top-level category click → open filtered indicator search
        const label = resolveCategoryLabel(id);
        if (!label) return;
        setCategoryFilter(label);
        _setActiveTab('search');
        const url = new URL(window.location.href);
        url.searchParams.set(TAB_URL_PARAM, 'search');
        history.replaceState(null, '', url.toString());
      } else if (activeTabRef.current === 'search') {
        // Subcategory click → revert to neighborhood if on search tab.
        // Read the live tab via ref (not a functional setState updater) so
        // the side effects below run as normal event-handler logic instead
        // of during React's render phase.
        setCategoryFilter(null);
        _setActiveTab(DEFAULT_TAB);
        const url = new URL(window.location.href);
        url.searchParams.delete(TAB_URL_PARAM);
        history.replaceState(null, '', url.toString());
      }
    }
    window.addEventListener('chp:section-activated', handleSectionActivated);
    return () => window.removeEventListener('chp:section-activated', handleSectionActivated);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { activeTab, setActiveTab, categoryFilter, setCategoryFilter, panelRefs, focusPanelOnNextChange };
}
