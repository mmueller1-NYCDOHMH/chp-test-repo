import { useState, useRef, useEffect } from 'react';
import { siteNav } from '@/config/nav/siteNav';

/**
 * FILE: useDropdown.js
 *
 * TopicNav's desktop hover/keyboard-driven subcategory dropdown: which
 * category is open, its fixed-position coordinates (measured from the
 * trigger button on open), roving keyboard focus across its items, and
 * the close-on-scroll / close-on-Escape behaviour. Part of the
 * 2026-09-04 split of TopicNav.jsx.
 */
export function useDropdown(isMobile) {
  const [openCategoryId, setOpenCategoryId] = useState(null);
  const [dropdownPos, setDropdownPos]       = useState({ top: 0, left: 0 });
  const [focusedSubIdx, setFocusedSubIdx]   = useState(-1);

  const closeTimerRef    = useRef(null);
  const categoryBtnRefs  = useRef([]);
  const dropdownItemRefs = useRef([]);

  // ── Close dropdown on scroll ─────────────────────────────────────────────
  useEffect(() => {
    function handleScroll() { setOpenCategoryId(null); }
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // ── Close dropdown on Escape (global) ────────────────────────────────────
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && openCategoryId) {
        e.preventDefault();
        const idx = siteNav.findIndex(c => c.id === openCategoryId);
        setOpenCategoryId(null);
        setFocusedSubIdx(-1);
        categoryBtnRefs.current[idx]?.focus();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [openCategoryId]);

  // ── Focus dropdown item when focusedSubIdx changes ────────────────────────
  useEffect(() => {
    if (focusedSubIdx >= 0) {
      dropdownItemRefs.current[focusedSubIdx]?.focus();
    }
  }, [focusedSubIdx]);

  // ── Dropdown handlers ────────────────────────────────────────────────────
  function openDropdown(categoryId, buttonEl) {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    if (buttonEl) {
      const rect = buttonEl.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom, left: rect.left });
    }
    setOpenCategoryId(categoryId);
    setFocusedSubIdx(-1);
  }

  function handleMouseEnter(categoryId, buttonEl) {
    if (isMobile) return;
    openDropdown(categoryId, buttonEl);
  }

  function handleMouseLeave() {
    closeTimerRef.current = setTimeout(() => { setOpenCategoryId(null); setFocusedSubIdx(-1); }, 100);
  }

  function keepOpen() {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }

  // ── Category button keyboard handler ─────────────────────────────────────
  function handleCategoryKeyDown(e, category, btnEl) {
    if (isMobile) return;
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault();
      openDropdown(category.id, btnEl);
      // Focus first non-disabled item after render
      setTimeout(() => {
        const firstEnabled = (siteNav.find(c => c.id === category.id)?.subcategories ?? [])
          .findIndex(s => !s.dummy);
        setFocusedSubIdx(firstEnabled >= 0 ? firstEnabled : 0);
      }, 0);
    }
  }

  // ── Dropdown item keyboard handler ────────────────────────────────────────
  function handleDropdownKeyDown(e, subIdx) {
    const subs = (siteNav.find(c => c.id === openCategoryId))?.subcategories ?? [];
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedSubIdx(i => Math.min(i + 1, subs.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = subIdx - 1;
      if (prev < 0) {
        // Return focus to category button
        const idx = siteNav.findIndex(c => c.id === openCategoryId);
        setFocusedSubIdx(-1);
        setOpenCategoryId(null);
        categoryBtnRefs.current[idx]?.focus();
      } else {
        setFocusedSubIdx(prev);
      }
    } else if (e.key === 'Tab') {
      setOpenCategoryId(null);
      setFocusedSubIdx(-1);
    }
  }

  const openCategory = siteNav.find(c => c.id === openCategoryId) ?? null;

  return {
    openCategoryId,
    setOpenCategoryId,
    dropdownPos,
    focusedSubIdx,
    categoryBtnRefs,
    dropdownItemRefs,
    openCategory,
    handleMouseEnter,
    handleMouseLeave,
    keepOpen,
    handleCategoryKeyDown,
    handleDropdownKeyDown,
  };
}
