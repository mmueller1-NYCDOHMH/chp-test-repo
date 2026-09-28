import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * FILE: useIntroModalLifecycle.js
 *
 * Owns IntroModal's open/close lifecycle: the first-visit localStorage
 * check, the external chp:open-intro-modal listener (with its optional
 * visitedIds payload from the explorer badge), the mount/unmount timing
 * that lets the close animation finish before unmounting, the dismiss
 * handler, the modal's own focus trap + Escape-to-close, and hiding the
 * rest of the app from assistive tech (inert/aria-hidden on the app shell)
 * while open. Part of the 2026-09-04 split of IntroModal.jsx.
 */

// Everything outside the modal — id set on the app shell root in PageLayout.jsx
const APP_SHELL_ID = 'chp-app-shell';

export const STORAGE_KEY = 'chp_intro_seen';

// How long the CSS close transition runs (keep in sync with transition durations
// in IntroModal.jsx's render).
const CLOSE_DURATION = 250;

export function useIntroModalLifecycle({ inputRef }) {
  const [isOpen,        setIsOpen]        = useState(false);
  const [isMounted,     setIsMounted]     = useState(false); // trails isOpen by CLOSE_DURATION ms
  const [dialogVisible, setDialogVisible] = useState(false);
  // visitedIds: Set of neighborhood ids — when set, list shows only unvisited ones
  const [visitedIds,    setVisitedIds]    = useState(null);

  const dialogRef  = useRef(null);
  const triggerRef = useRef(null); // element that opened the modal — focus returns here on close

  // Only open if the user hasn't visited before (auto-open has no trigger element)
  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setIsOpen(true);
    } catch { /* localStorage may be unavailable; fail silently */ }
  }, []);

  // Listen for external open trigger. Payload may include visitedIds for the
  // explorer badge — when present, the list pre-filters to unvisited CDs only.
  useEffect(() => {
    function handleExternalOpen(e) {
      triggerRef.current = document.activeElement; // remember what opened us
      setIsOpen(true);
      if (e.detail?.visitedIds?.length) {
        setVisitedIds(new Set(e.detail.visitedIds));
      } else {
        setVisitedIds(null);
      }
    }
    window.addEventListener('chp:open-intro-modal', handleExternalOpen);
    return () => window.removeEventListener('chp:open-intro-modal', handleExternalOpen);
  }, []);

  // Mount immediately on open; unmount only after the close animation finishes.
  // dialogVisible drives the CSS transition — isMounted controls whether we render at all.
  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      const raf = requestAnimationFrame(() => setDialogVisible(true));
      return () => cancelAnimationFrame(raf);
    } else {
      setDialogVisible(false);
      const timer = setTimeout(() => setIsMounted(false), CLOSE_DURATION);
      return () => clearTimeout(timer);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const dismiss = useCallback(() => {
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* ignore */ }
    setIsOpen(false);
    setVisitedIds(null);
    // Return focus to the element that triggered the modal (e.g. explorer badge).
    // RAF lets the modal unmount first so focus isn't clobbered by blur events.
    requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  // Move focus to search input when the modal opens + focus trap
  useEffect(() => {
    if (!isOpen) return;
    const id = setTimeout(() => inputRef.current?.focus(), 60);

    function onKey(e) {
      if (e.key === 'Escape') { dismiss(); return; }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = Array.from(
          dialogRef.current.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
        ).filter(el => !el.disabled);
        if (!focusable.length) { e.preventDefault(); return; }
        const first = focusable[0];
        const last  = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener('keydown', onKey);
    return () => { clearTimeout(id); document.removeEventListener('keydown', onKey); };
  }, [isOpen, dismiss]);

  // Hide the rest of the app from assistive tech while the modal is open.
  // The modal is portaled to document.body (see the render in IntroModal.jsx),
  // so it sits outside this subtree and is unaffected by inert/aria-hidden
  // here. Both attributes are set together: inert is what actually stops
  // focus and AT exposure in modern browsers, aria-hidden is a fallback for
  // anything that doesn't support inert yet. Without this, aria-modal="true"
  // alone isn't reliably honored by every screen reader — the background
  // stayed reachable via the virtual cursor.
  useEffect(() => {
    const appShell = document.getElementById(APP_SHELL_ID);
    if (!appShell) return;
    if (isOpen) {
      appShell.setAttribute('inert', '');
      appShell.setAttribute('aria-hidden', 'true');
    } else {
      appShell.removeAttribute('inert');
      appShell.removeAttribute('aria-hidden');
    }
    return () => {
      appShell.removeAttribute('inert');
      appShell.removeAttribute('aria-hidden');
    };
  }, [isOpen]);

  return {
    isOpen,
    setIsOpen,
    isMounted,
    dialogVisible,
    visitedIds,
    setVisitedIds,
    dialogRef,
    triggerRef,
    dismiss,
  };
}
