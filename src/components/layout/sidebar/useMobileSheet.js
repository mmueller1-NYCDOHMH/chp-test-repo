import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { inertOthers } from '@/lib/utils/inertOthers';

/**
 * FILE: useMobileSheet.js
 *
 * Mobile bottom-sheet state, geometry and drag-gesture handling extracted
 * from Sidebar.jsx. Supports:
 *   - Slow downward drag  → sheet follows the finger and stays wherever it
 *                           was released.
 *   - Fast downward swipe → sheet flies down and disappears.
 *   - Tap                 → sheet disappears.
 *   - Upward drag/swipe   → sheet eases up to near-full height, stopping
 *                           SAFE_AREA_GAP below the device's safe area
 *                           (notch / status bar).
 *   - Back button / native back-gesture → sheet flies down quickly and
 *                           disappears (a history entry is pushed on open
 *                           so back-navigation closes the sheet instead of
 *                           leaving the page).
 * Also listens for chp:open-mobile-sheet (dispatched by the mobile map-pin
 * button in TopicNav) to open itself. Part of the 2026-09-04 split of
 * Sidebar.jsx.
 */

// ── Mobile sheet gesture tuning ───────────────────────────────────────────
const SHEET_OPEN_HEIGHT_RATIO = 0.85; // matches the previous fixed 85vh
const SAFE_AREA_GAP           = 60;   // px gap to preserve below the notch when expanded
const FAST_SWIPE_VELOCITY     = 0.5;  // px/ms — above this counts as a "quick" swipe
const TAP_MOVEMENT_THRESHOLD  = 8;    // px — below this, a touch counts as a tap

export function useMobileSheet() {
  // isSheetOpen = user intent; isSheetMounted keeps DOM alive during exit anim.
  // sheetTop tracks the sheet's top edge in px from the viewport top — driving
  // both drag-follow and the snap/close/expand animations via a single value.
  const [isSheetOpen,    setIsSheetOpen]    = useState(false);
  const [isSheetMounted, setIsSheetMounted] = useState(false);
  const [sheetTop,       setSheetTop]       = useState(null);
  const [isDragging,     setIsDragging]     = useState(false);
  const [transitionMs,   setTransitionMs]   = useState(300);
  const [safeAreaTop,    setSafeAreaTop]    = useState(0);
  const safeAreaProbeRef     = useRef(null);
  const unmountTimerRef      = useRef(null);
  const hasPushedHistoryRef  = useRef(false);
  const isProgrammaticPopRef = useRef(false);
  // A11Y (2026-09-26): focus management for the sheet (WCAG 2.4.3 / 2.1.2).
  // sheetRef → the role="dialog" element; triggerRef → whatever had focus
  // when the sheet opened, so focus can return there on close.
  const sheetRef   = useRef(null);
  const triggerRef = useRef(null);
  // A11Y (2026-09-28): release() for the inert page-behind (inertOthers).
  const releaseInertRef = useRef(null);
  const dragRef = useRef({
    startY: 0, startTop: 0, lastY: 0, lastTime: 0, velocity: 0, dragging: false, moved: false,
  });

  // Measure the safe-area inset (notch / status bar) once so the expanded
  // sheet position can respect SAFE_AREA_GAP below it.
  useEffect(() => {
    if (safeAreaProbeRef.current) {
      setSafeAreaTop(safeAreaProbeRef.current.getBoundingClientRect().height);
    }
  }, []);

  function getWindowHeight() { return typeof window !== 'undefined' ? window.innerHeight : 800; }
  function getOpenTop()      { return getWindowHeight() * (1 - SHEET_OPEN_HEIGHT_RATIO); }
  function getMinTop()       { return safeAreaTop + SAFE_AREA_GAP; }
  function getMaxTop()       { return getWindowHeight(); }
  function currentTop()      { return sheetTop != null ? sheetTop : getOpenTop(); }

  function openSheet() {
    // Remember the opener (the TopicNav pill / map button) for focus return.
    if (!isSheetOpen) triggerRef.current = document.activeElement;
    setIsSheetOpen(true);
    setIsSheetMounted(true);
    if (!hasPushedHistoryRef.current) {
      window.history.pushState({ chpMobileSheet: true }, '');
      hasPushedHistoryRef.current = true;
    }
    clearTimeout(unmountTimerRef.current);
    setTransitionMs(300);
    requestAnimationFrame(() => setSheetTop(getOpenTop()));
  }

  // Listen for the mobile map-pin tap in TopicNav → open the bottom sheet
  useEffect(() => {
    function onOpenMobileSheet() { openSheet(); }
    window.addEventListener('chp:open-mobile-sheet', onOpenMobileSheet);
    return () => window.removeEventListener('chp:open-mobile-sheet', onOpenMobileSheet);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Keep the history sentinel on top across route changes (2026-10-07) ────
  // openSheet() pushes a sentinel entry so Back closes the sheet. Picking a
  // neighborhood while the sheet is open router.push()es a NEW entry on top of
  // that sentinel: [old, old(sentinel), new]. closeSheet() then called
  // history.back(), which no longer popped the sentinel — it popped the new
  // neighborhood and landed back on the old one (the "resets to the previous
  // neighborhood when I close the picker" bug). Re-push the sentinel on top of
  // the new route so closing / Back unwinds to the neighborhood just picked.
  const pathname    = usePathname();
  const prevPathRef = useRef(pathname);
  useEffect(() => {
    if (prevPathRef.current === pathname) return;
    prevPathRef.current = pathname;
    // Only while the sheet is open with a live sentinel. (A Back/Forward
    // navigation clears hasPushedHistoryRef in onPopState before this runs.)
    if (!hasPushedHistoryRef.current) return;
    window.history.pushState({ chpMobileSheet: true }, '');
  }, [pathname]);

  // Animates the sheet down and off-screen, then unmounts it. Doesn't touch
  // browser history — used for real back-navigation, where the history entry
  // has already been consumed by the time this runs.
  function animateClose(fast) {
    // Page behind must be un-inerted before focus can go back to the opener.
    releaseInertRef.current?.();
    setIsSheetOpen(false);
    // A11Y: return focus to the control that opened the sheet.
    const trigger = triggerRef.current;
    triggerRef.current = null;
    if (trigger && typeof trigger.focus === 'function' && document.contains(trigger)) {
      requestAnimationFrame(() => trigger.focus({ preventScroll: true }));
    }
    setTransitionMs(fast ? 200 : 300);
    setSheetTop(getMaxTop());
    clearTimeout(unmountTimerRef.current);
    unmountTimerRef.current = setTimeout(() => setIsSheetMounted(false), (fast ? 200 : 300) + 20);
  }

  // User-initiated close (X button, backdrop tap, drag-to-close, tap-to-close).
  // Also unwinds the history entry pushed by openSheet, so the back button
  // doesn't need an extra press once the sheet is already closed.
  function closeSheet(opts) {
    const fast = !!(opts && opts.fast);
    animateClose(fast);
    if (hasPushedHistoryRef.current) {
      hasPushedHistoryRef.current = false;
      isProgrammaticPopRef.current = true;
      window.history.back();
    }
  }

  // Back button / native back-gesture closes the sheet instead of navigating
  // away, since openSheet() pushed a history entry to catch exactly this.
  useEffect(() => {
    function onPopState() {
      if (isProgrammaticPopRef.current) {
        isProgrammaticPopRef.current = false;
        return;
      }
      if (isSheetOpen) {
        hasPushedHistoryRef.current = false;
        animateClose(true);
      }
    }
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [isSheetOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close sheet on Escape
  // Escape closes; Tab / Shift+Tab cycle inside the sheet (focus trap);
  // on open, focus moves into the sheet (the [data-sheet-autofocus]
  // element — the Close button — else the first focusable).
  useEffect(() => {
    if (!isSheetOpen) return;

    const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';
    const focusables = () => Array.from(sheetRef.current?.querySelectorAll(FOCUSABLE) ?? [])
      // skip anything not rendered (display:none tab panels, etc.)
      .filter((el) => el.offsetParent !== null || el === document.activeElement);

    const raf = requestAnimationFrame(() => {
      // A11Y (2026-09-28): make the rest of the page inert while the sheet
      // is open, so screen reader virtual-cursor/swipe can't reach it.
      releaseInertRef.current = inertOthers(sheetRef.current);
      const target = sheetRef.current?.querySelector('[data-sheet-autofocus]') ?? focusables()[0];
      target?.focus({ preventScroll: true });
    });

    function onKey(e) {
      if (e.key === 'Escape') { closeSheet(); return; }
      if (e.key !== 'Tab' || !sheetRef.current) return;
      const els = focusables();
      if (!els.length) { e.preventDefault(); return; }
      const first = els[0];
      const last  = els[els.length - 1];
      const inside = sheetRef.current.contains(document.activeElement);
      if (e.shiftKey && (document.activeElement === first || !inside)) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !inside)) {
        e.preventDefault(); first.focus();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKey);
      releaseInertRef.current?.();
    };
  }, [isSheetOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Drag handle gesture handlers ──────────────────────────────────────────
  function handleHandlePointerDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragRef.current = {
      startY: e.clientY,
      startTop: currentTop(),
      lastY: e.clientY,
      lastTime: Date.now(),
      velocity: 0,
      dragging: true,
      moved: false,
    };
    setIsDragging(true);
    setTransitionMs(0); // follow the finger with no CSS lag
  }

  function handleHandlePointerMove(e) {
    const d = dragRef.current;
    if (!d.dragging) return;
    const deltaFromStart = e.clientY - d.startY;
    if (Math.abs(deltaFromStart) > TAP_MOVEMENT_THRESHOLD) d.moved = true;
    const now = Date.now();
    const dt  = now - d.lastTime;
    if (dt > 0) d.velocity = (e.clientY - d.lastY) / dt; // px/ms, positive = downward
    d.lastY = e.clientY;
    d.lastTime = now;
    const clamped = Math.min(getMaxTop(), Math.max(getMinTop(), d.startTop + deltaFromStart));
    setSheetTop(clamped);
  }

  function handleHandlePointerEnd(e) {
    const d = dragRef.current;
    if (!d.dragging) return;
    d.dragging = false;
    setIsDragging(false);

    if (!d.moved) {
      // A tap on the handle — dismiss.
      closeSheet({ fast: true });
      return;
    }

    const netDelta = e.clientY - d.startY; // + is net downward movement

    if (netDelta < 0) {
      // Net upward swipe — ease up to near-full-height, clearing the notch.
      setTransitionMs(300);
      setSheetTop(getMinTop());
      return;
    }

    if (d.velocity > FAST_SWIPE_VELOCITY) {
      // Fast downward swipe — dismiss quickly.
      closeSheet({ fast: true });
      return;
    }

    // Slow downward drag — leave the sheet exactly where the finger lifted.
    const releaseTop = Math.min(getMaxTop(), Math.max(getMinTop(), d.startTop + netDelta));
    if (releaseTop >= getMaxTop() - 1) {
      closeSheet({ fast: false });
    } else {
      setTransitionMs(0);
      setSheetTop(releaseTop);
    }
  }

  return {
    sheetRef,
    isSheetOpen,
    isSheetMounted,
    isDragging,
    transitionMs,
    currentTop,
    getOpenTop,
    getMaxTop,
    safeAreaProbeRef,
    closeSheet,
    handleHandlePointerDown,
    handleHandlePointerMove,
    handleHandlePointerEnd,
  };
}
