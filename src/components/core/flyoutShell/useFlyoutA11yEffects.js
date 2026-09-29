import { useEffect } from 'react';
import { areShortcutsEnabled } from '@/lib/utils/shortcutsPreference';

/**
 * FILE: useFlyoutA11yEffects.js
 *
 * Three independent side-effect concerns for FlyoutShell, grouped here since
 * none of them touch render output directly:
 *   1. Focus trap + Escape-to-close while the panel is open.
 *   2. Body scroll lock while the panel is open — mobile only (see the
 *      comment below for why desktop is left unlocked).
 *   3. The global 'i' keyboard shortcut that opens the flyout for whichever
 *      indicator card is currently hovered.
 * Part of the 2026-09-04 split of FlyoutShell.jsx.
 */
export function useFlyoutA11yEffects({ isOpen, isMobile, close, panelRef }) {
  // Close on Escape + focus trap
  useEffect(() => {
    if (!isOpen) return;

    // Move focus into the panel on open
    const firstFocusable = panelRef.current?.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    firstFocusable?.focus();

    function onKey(e) {
      // A dialog opened from inside the flyout but portaled outside it (e.g.
      // the export tray's EmbedModal) owns Escape/Tab while focus is in it —
      // otherwise Escape would close that dialog AND the flyout (2026-09-29).
      if (panelRef.current && !panelRef.current.contains(document.activeElement) &&
          document.activeElement !== document.body) return;
      if (e.key === 'Escape') { close(); return; }

      if (e.key === 'Tab' && panelRef.current) {
        const focusable = Array.from(
          panelRef.current.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
        ).filter(el => !el.disabled);
        if (!focusable.length) { e.preventDefault(); return; }
        const first = focusable[0];
        const last  = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, close]);

  // Lock body scroll while flyout is open — mobile only.
  //
  // On mobile the flyout covers the full screen, so freezing background scroll
  // is necessary. We use the iOS-safe position:fixed approach instead of
  // overflow:hidden because overflow:hidden on body kills scroll inside fixed
  // panels on iOS Safari (known bug).
  //
  // On desktop the flyout is a narrow side panel (420px from the right) and
  // the sidebar remains visible and interactive beside it. Locking body scroll
  // on desktop collapses the sidebar's flex-1 content area because removing the
  // scrollbar changes the layout width and triggers a reflow that zeroes out the
  // flex-1 min-h-0 height calculation. Desktop scroll is intentionally left
  // unlocked so the sidebar stays fully usable while the flyout is open.
  useEffect(() => {
    if (!isOpen || !isMobile) {
      // Restore body if we previously pinned it (mobile close path)
      const savedTop = document.body.dataset.scrollY;
      document.body.style.position = '';
      document.body.style.top      = '';
      document.body.style.width    = '';
      if (savedTop !== undefined) {
        window.scrollTo(0, parseInt(savedTop, 10));
        delete document.body.dataset.scrollY;
      }
      return;
    }

    // iOS-safe scroll lock: pin body at current scroll position
    const scrollY = window.scrollY;
    document.body.dataset.scrollY = String(scrollY);
    document.body.style.position  = 'fixed';
    document.body.style.top       = `-${scrollY}px`;
    document.body.style.width     = '100%';

    return () => {
      const savedTop = document.body.dataset.scrollY;
      document.body.style.position = '';
      document.body.style.top      = '';
      document.body.style.width    = '';
      if (savedTop !== undefined) {
        window.scrollTo(0, parseInt(savedTop, 10));
        delete document.body.dataset.scrollY;
      }
    };
  }, [isOpen, isMobile]);

  // Global 'i' shortcut — opens flyout for the currently-hovered indicator card
  useEffect(() => {
    function onKey(e) {
      if (e.key !== 'i') return;
      if (!areShortcutsEnabled()) return; // WCAG 2.1.4 — user can turn these off
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || document.activeElement?.isContentEditable) return;
      window.__chp_hovered_card_open?.();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
}
