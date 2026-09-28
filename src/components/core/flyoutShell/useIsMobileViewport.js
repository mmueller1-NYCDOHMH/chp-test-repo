import { useState, useEffect } from 'react';

/**
 * FILE: useIsMobileViewport.js
 *
 * Tracks the (max-width: 767px) breakpoint so FlyoutShell can switch its
 * animation direction (slide-from-right on desktop vs. slide-up-from-bottom
 * on mobile) and enable the mobile-only drag gestures. Part of the
 * 2026-09-04 split of FlyoutShell.jsx.
 */
export function useIsMobileViewport() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    setIsMobile(mq.matches);
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return isMobile;
}
