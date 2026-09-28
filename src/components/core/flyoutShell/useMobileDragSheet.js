import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * FILE: useMobileDragSheet.js
 *
 * MOBILE GESTURES (drag handle only):
 * - Tap                  -> dismiss immediately (quick fly-down)
 * - Slow drag down       -> panel tracks the finger 1:1, no easing, and
 *                           simply pauses wherever the finger lifts off
 *                           (it does not auto-close or snap back)
 * - Fast flick down      -> panel finishes a quick fly-down and dismisses,
 *                           even if released before reaching the bottom
 * - Swipe up             -> dragging up past the fully-open position expands
 *                           the panel to near-full height on release, staying
 *                           clear of the notch / status bar (env(safe-area-inset-top))
 * - Back button / native back-swipe -> quick fly-down + dismiss (mobile);
 *   handled by useFlyoutHistoryBack, which calls triggerQuickClose from here.
 *
 * Also drives the desktop close path: on desktop, triggerQuickClose just
 * calls close() directly (no drag animation). Part of the 2026-09-04 split
 * of FlyoutShell.jsx.
 */

// Tuning constants for the mobile drag-to-dismiss / drag-to-expand gesture
const CLOSE_VELOCITY_PX_MS = 0.55;  // a downward release faster than this (px/ms) closes, regardless of distance
const EXPAND_DISTANCE_PX   = 24;    // dragging up past this many px (beyond fully-open) expands the panel
const QUICK_CLOSE_MS       = 220;   // duration of the "fly down and disappear" animation

export function useMobileDragSheet({ isMobile, isOpen, close }) {
  const [dragY, setDragY] = useState(0);          // live translateY offset (px) while open
  const [isDragging, setIsDragging] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const dragState = useRef({ startY: 0, lastY: 0, lastTime: 0, velocity: 0, moved: false, baseOffset: 0, offsetRaw: 0 });
  const closeTimeoutRef = useRef(null);

  // Mirrors dragY so drag handlers always read the latest value without a
  // stale closure — a slow drag that's released mid-way pauses in place,
  // and the next gesture needs to continue from that paused position rather
  // than jumping back to 0.
  const dragYRef = useRef(0);
  const setDragYSynced = useCallback((value) => {
    dragYRef.current = value;
    setDragY(value);
  }, []);

  useEffect(() => () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
  }, []);

  // Plays the quick "fly down and disappear" animation on mobile, or just
  // closes normally (existing slide-right) on desktop.
  const triggerQuickClose = useCallback(() => {
    if (!isMobile) {
      close();
      return;
    }
    setIsDragging(false);
    setIsClosing(true);
    setDragYSynced(typeof window !== 'undefined' ? window.innerHeight : 1000);
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = setTimeout(() => {
      close();
      setDragYSynced(0);
      setIsClosing(false);
      setIsExpanded(false);
    }, QUICK_CLOSE_MS);
  }, [close, isMobile, setDragYSynced]);

  const handleHandlePointerDown = useCallback((e) => {
    if (!isMobile) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const now = performance.now();
    dragState.current = {
      startY: e.clientY,
      lastY: e.clientY,
      lastTime: now,
      velocity: 0,
      moved: false,
      baseOffset: dragYRef.current, // continue from wherever a previous drag was paused
      offsetRaw: dragYRef.current,
    };
    setIsDragging(true);
  }, [isMobile]);

  const handleHandlePointerMove = useCallback((e) => {
    if (!isDragging) return;
    const now = performance.now();
    const state = dragState.current;
    const totalDelta = e.clientY - state.startY;
    if (Math.abs(totalDelta) > 4) state.moved = true;

    const dt = now - state.lastTime;
    if (dt > 0) state.velocity = (e.clientY - state.lastY) / dt; // px/ms, +down / -up
    state.lastY = e.clientY;
    state.lastTime = now;

    // Live 1:1 tracking relative to wherever the panel currently sits — this
    // is what makes a slow drag look slow and a fast drag look fast, and lets
    // a paused position be dragged further down or brought back up smoothly.
    const offsetRaw = state.baseOffset + totalDelta;
    state.offsetRaw = offsetRaw;

    if (offsetRaw >= 0) {
      setDragYSynced(offsetRaw);
    } else {
      // Small rubber-band only once dragged up past the fully-open position;
      // crossing further past this is what arms the expand gesture on release.
      setDragYSynced(Math.max(offsetRaw * 0.3, -40));
    }
  }, [isDragging, setDragYSynced]);

  const handleHandlePointerUp = useCallback((e) => {
    if (!isDragging) return;
    setIsDragging(false);
    const state = dragState.current;
    const totalDelta = e.clientY - state.startY;

    if (!state.moved) {
      // Plain tap on the handle -> dismiss
      triggerQuickClose();
      return;
    }

    if (totalDelta > 0 && state.velocity > CLOSE_VELOCITY_PX_MS) {
      // Fast downward flick -> finish the motion quickly and dismiss,
      // regardless of how far it had travelled when released.
      triggerQuickClose();
    } else if (state.offsetRaw <= -EXPAND_DISTANCE_PX) {
      // Dragged up past the fully-open position -> expand to near-full height
      setIsExpanded(true);
      setDragYSynced(0);
    }
    // Otherwise (a slow drag, in either direction) the panel simply stays
    // wherever the finger left it — already reflected in dragY from the
    // move handler, so there's nothing further to do here.
  }, [isDragging, triggerQuickClose, setDragYSynced]);

  // Keyboard equivalent for the handle (Enter/Space closes, arrows expand/collapse)
  const handleHandleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      triggerQuickClose();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIsExpanded(true);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (isExpanded) setIsExpanded(false);
      else triggerQuickClose();
    }
  }, [isExpanded, triggerQuickClose]);

  // Reset drag/expand state whenever the panel fully closes, however it closed
  useEffect(() => {
    if (!isOpen) {
      setDragYSynced(0);
      setIsExpanded(false);
      setIsClosing(false);
      setIsDragging(false);
    }
  }, [isOpen, setDragYSynced]);

  return {
    dragY,
    isDragging,
    isExpanded,
    isClosing,
    triggerQuickClose,
    handleHandlePointerDown,
    handleHandlePointerMove,
    handleHandlePointerUp,
    handleHandleKeyDown,
  };
}
