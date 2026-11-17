import { useLayoutEffect, useState } from 'react';

/**
 * FILE: useContentAreaInsets.js
 *
 * (2026-11-17) Lets a full-viewport modal backdrop center its dialog over
 * the page's scrollable content column (the area right of the desktop
 * sidebar) instead of the whole window. Returns { left, right } px insets
 * of that column from the viewport edges — the backdrop adds them to its
 * horizontal padding, so it still dims the full screen (sidebar included)
 * but the dialog sits centered over the content.
 *
 * The column is #main-content's parent (PageLayout.jsx). On mobile, or on
 * any page without it, both insets are 0 and the dialog centers normally.
 * Re-measures on resize while open.
 */
export function useContentAreaInsets(isOpen) {
  const [insets, setInsets] = useState({ left: 0, right: 0 });

  useLayoutEffect(() => {
    if (!isOpen) return;
    function measure() {
      const col = document.getElementById('main-content')?.parentElement;
      if (!col) { setInsets({ left: 0, right: 0 }); return; }
      const r = col.getBoundingClientRect();
      const vw = document.documentElement.clientWidth;
      setInsets({
        left:  Math.max(0, Math.round(r.left)),
        right: Math.max(0, Math.round(vw - r.right)),
      });
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [isOpen]);

  return insets;
}
