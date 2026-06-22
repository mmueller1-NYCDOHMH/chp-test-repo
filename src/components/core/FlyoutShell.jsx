'use client';

/**
 * FILE: FlyoutShell.jsx
 *
 * PURPOSE:
 * Page-level shell that exposes an "open flyout" context and renders a
 * right-side flyout panel.
 *
 * DESCRIPTION:
 * Any client component beneath this shell can call `useFlyout().open({...})`
 * to display a panel. Two payload kinds are supported:
 *
 *   kind: 'section'    (default / legacy)
 *     { title, content }
 *     — Renders "About [title]" header + MarkdownRenderer for content
 *
 *   kind: 'indicator'
 *     { title, subtitle, source, sourceUrl, description }
 *     — Renders a Leaflet map (zoomed to active neighborhood) + indicator
 *       metadata (title, subtitle, about text, source with optional link)
 *
 * RESPONSIBILITIES:
 * - Hold the currently-open flyout payload in state
 * - Expose open / close via React context (stable references)
 * - Render the correct panel body based on payload.kind
 * - Render backdrop + animate panel slide-in/out
 *
 * USAGE:
 *   // Section flyout (existing):
 *   open({ title: 'Community & Safety', content: '...' });
 *
 *   // Indicator flyout (new):
 *   open({ kind: 'indicator', title: 'Incarcerations', subtitle: '...', source: '...' });
 *
 * NOTES:
 * - Client component — uses useState + context
 * - IndicatorFlyoutContent is lazy-imported so the Leaflet bundle
 *   is never loaded until an indicator flyout is actually opened
 * - Transform / opacity are inline styles so animation works regardless
 *   of Tailwind purge
 * - Children remain server-renderable; only the shell is client
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react';
import MarkdownRenderer from '@/components/content/MarkdownRenderer';

// Lazy-load so Leaflet bundle only loads when an indicator flyout opens
const IndicatorFlyoutContent = lazy(() =>
  import('@/components/core/IndicatorFlyoutContent')
);

const FlyoutContext = createContext(null);

export function useFlyout() {
  const ctx = useContext(FlyoutContext);
  if (!ctx) {
    throw new Error('useFlyout must be used within <FlyoutShell>');
  }
  return ctx;
}

export default function FlyoutShell({ children }) {
  const [flyout, setFlyout] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const panelRef    = useRef(null);
  const triggerRef  = useRef(null);   // remembers the element that opened the flyout

  // Track mobile breakpoint so animation direction can change
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    setIsMobile(mq.matches);
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const open = useCallback((payload) => {
    triggerRef.current = document.activeElement;
    setFlyout(payload);
  }, []);

  const close = useCallback(() => {
    setFlyout(null);
    // Return focus to the element that triggered the flyout
    requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  const value = useMemo(
    () => ({ open, close, current: flyout }),
    [open, close, flyout]
  );

  const isOpen = Boolean(flyout);
  const isIndicator = flyout?.kind === 'indicator';

  // Close on Escape + focus trap
  useEffect(() => {
    if (!isOpen) return;

    // Move focus into the panel on open
    const firstFocusable = panelRef.current?.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    firstFocusable?.focus();

    function onKey(e) {
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

  // Lock body scroll while flyout is open.
  // On desktop: overflow:hidden is fine and prevents background scroll.
  // On iOS Safari: overflow:hidden on body ALSO kills scroll inside fixed panels
  // (a known iOS bug). On mobile we instead pin the body with position:fixed
  // and restore the scroll position on close — this freezes the background
  // without breaking overflow-y:auto containers inside the flyout.
  useEffect(() => {
    if (!isOpen) {
      // Restore body (handles both approaches)
      const savedTop = document.body.dataset.scrollY;
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top      = '';
      document.body.style.width    = '';
      if (savedTop !== undefined) {
        window.scrollTo(0, parseInt(savedTop, 10));
        delete document.body.dataset.scrollY;
      }
      return;
    }

    if (isMobile) {
      // iOS-safe scroll lock: pin body at current scroll position
      const scrollY = window.scrollY;
      document.body.dataset.scrollY = String(scrollY);
      document.body.style.position  = 'fixed';
      document.body.style.top       = `-${scrollY}px`;
      document.body.style.width     = '100%';
    } else {
      document.body.style.overflow = 'hidden';
    }

    return () => {
      const savedTop = document.body.dataset.scrollY;
      document.body.style.overflow = '';
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
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || document.activeElement?.isContentEditable) return;
      window.__chp_hovered_card_open?.();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <FlyoutContext.Provider value={value}>
      {children}

      {/* Backdrop — fades in immediately, panel follows 50ms later */}
      <div
        onClick={close}
        aria-hidden={!isOpen}
        style={{
          opacity:       isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition:    'opacity 200ms ease-out',
        }}
        className="fixed inset-0 bg-black/30 z-40"
      />

      {/* Panel — slides from right on desktop, up from bottom on mobile */}
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-hidden={!isOpen}
        style={{
          transform: isMobile
            ? isOpen ? 'translateY(0)'    : 'translateY(100%)'
            : isOpen ? 'translateX(0)'    : 'translateX(100%)',
          transition: isOpen
            ? 'transform 300ms ease-out 50ms'
            : 'transform 250ms ease-in',
        }}
        className={
          isMobile
            ? 'fixed bottom-0 left-0 right-0 w-full max-h-[85vh] rounded-t-2xl bg-white shadow-xl z-50 flex flex-col overflow-hidden'
            : 'fixed top-0 right-0 h-full w-[420px] bg-white shadow-xl z-50 flex flex-col overflow-hidden'
        }
      >

        {/* ── Drag handle (mobile only) ────────────────────────── */}
        {isMobile && (
          <div className="flex justify-center pt-3 pb-1 shrink-0" aria-hidden="true">
            <div className="w-8 h-1 rounded-full bg-gray-300" />
          </div>
        )}

        {/* ── Panel header ─────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-2 shrink-0 gap-3">
          <h2 className="text-sm font-semibold text-gray-900 leading-snug truncate">
            {isIndicator ? flyout?.title : `About ${flyout?.title}`}
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="Close panel"
            className="text-gray-400 hover:text-gray-700 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded p-1 shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Panel body — switches on kind ─────────────────────── */}
        {isIndicator ? (
          <Suspense fallback={<div className="flex-1 bg-gray-50 animate-pulse" />}>
            <IndicatorFlyoutContent
              title={flyout?.title}
              subtitle={flyout?.subtitle}
              source={flyout?.source}
              sourceUrl={flyout?.sourceUrl}
              description={flyout?.description}
              indicatorData={flyout?.indicatorData}
              geoId={flyout?.geoId}
              sectionLabel={flyout?.sectionLabel}
            />
          </Suspense>
        ) : (
          <div className="flex-1 p-6 overflow-y-auto text-sm">
            <MarkdownRenderer content={flyout?.content} />
          </div>
        )}

      </aside>
    </FlyoutContext.Provider>
  );
}
