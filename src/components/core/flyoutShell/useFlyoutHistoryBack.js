import { useRef, useEffect } from 'react';

/**
 * FILE: useFlyoutHistoryBack.js
 *
 * Back button / native back-gesture closes the flyout panel.
 *
 * Pushes one history entry when the panel opens so the browser back button
 * (and the iOS/Android edge-swipe-back gesture, which rides on top of
 * history navigation) pops that entry instead of navigating the user away
 * from the page. Closing any other way (X button, backdrop, drag, Escape)
 * silently consumes that same entry with history.back() so the back button
 * never ends up needing an extra press afterward. Part of the 2026-09-04
 * split of FlyoutShell.jsx.
 */
export function useFlyoutHistoryBack({ isOpen, triggerQuickClose }) {
  const historyPushedRef = useRef(false);
  const closingFromPopStateRef = useRef(false);

  useEffect(() => {
    if (isOpen && !historyPushedRef.current) {
      window.history.pushState({ chpFlyoutOpen: true }, '');
      historyPushedRef.current = true;
    } else if (!isOpen && historyPushedRef.current) {
      historyPushedRef.current = false;
      if (!closingFromPopStateRef.current) {
        window.history.back();
      }
      closingFromPopStateRef.current = false;
    }
  }, [isOpen]);

  useEffect(() => {
    function handlePopState() {
      if (historyPushedRef.current) {
        historyPushedRef.current = false;
        closingFromPopStateRef.current = true;
        triggerQuickClose();
      }
    }
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [triggerQuickClose]);
}
