import { useState, useEffect } from 'react';

/**
 * FILE: useModalVisibility.js
 *
 * Delays `visible` becoming true by one animation frame after `isOpen`
 * flips true, so the dialog's mount and its CSS opacity/scale transition-in
 * don't land in the same frame (which would make it appear instantly
 * instead of animating). Used by NotesModal and ExpandedChartModal — not
 * EmbedModal, which never had a fade-in (part of the 2026-09-04 split of
 * ExpandableChartCard.jsx).
 */
export function useModalVisibility(isOpen) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (isOpen) {
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    }
    setVisible(false);
  }, [isOpen]);
  return visible;
}
