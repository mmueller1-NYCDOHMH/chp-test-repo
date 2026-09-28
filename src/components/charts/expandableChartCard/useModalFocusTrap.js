import { useEffect, useLayoutEffect } from 'react';
import { inertOthers } from '@/lib/utils/inertOthers';

/**
 * FILE: useModalFocusTrap.js
 *
 * Shared focus-trap + Escape-to-close behavior for ExpandableChartCard's
 * three dialogs (NotesModal, ExpandedChartModal, EmbedModal) — previously
 * three nearly-identical inline effects (part of the 2026-09-04 split of
 * ExpandableChartCard.jsx).
 *
 * On open: moves focus to the element matching `autofocusSelector` inside
 * the dialog, or (if omitted) the first focusable element. Escape calls
 * `onClose` — callers that need to restore focus to a trigger button on
 * close should do that inside their own `onClose`. Tab/Shift+Tab wrap focus
 * within the dialog.
 *
 * A11Y (2026-09-28) — also, while open:
 * - Makes the rest of the page inert (inertOthers) so screen reader
 *   virtual-cursor/swipe navigation can't wander behind the dialog.
 *   (aria-modal alone isn't reliably honored; axe was still reporting the
 *   page's issues from behind every one of these modals.)
 * - Remembers what had focus when it opened, and on close puts focus back
 *   there if it would otherwise be lost to <body>. NotesModal had no focus
 *   return at all, and the others' synchronous restoreFocusRef.focus()
 *   calls run while the page is still inert — this is the safety net.
 * Used by: NotesModal, ExpandedChartModal, CustomExpandedChartModal,
 * EmbedModal, and the expanded map in NeighborhoodMap.
 */
export function useModalFocusTrap({ isOpen, dialogRef, onClose, autofocusSelector }) {
  // Layout effect so the inert/release happens in the same commit as the
  // dialog mounting/unmounting (before any rAF focus calls).
  useLayoutEffect(() => {
    if (!isOpen || !dialogRef.current) return;
    const trigger = document.activeElement;
    const release = inertOthers(dialogRef.current);
    return () => {
      release();
      requestAnimationFrame(() => {
        const a = document.activeElement;
        const lost = !a || a === document.body || !document.contains(a);
        if (lost && trigger && trigger !== document.body && document.contains(trigger)) {
          trigger.focus({ preventScroll: true });
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const raf = requestAnimationFrame(() => {
      const target = autofocusSelector
        ? dialogRef.current?.querySelector(autofocusSelector)
        : dialogRef.current?.querySelector('button, [href], input, [tabindex]:not([tabindex="-1"])');
      target?.focus();
    });
    function onKey(e) {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = Array.from(
          dialogRef.current.querySelectorAll('button, [href], input, [tabindex]:not([tabindex="-1"])')
        ).filter(el => !el.disabled);
        if (!focusable.length) { e.preventDefault(); return; }
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener('keydown', onKey);
    return () => { cancelAnimationFrame(raf); document.removeEventListener('keydown', onKey); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);
}
