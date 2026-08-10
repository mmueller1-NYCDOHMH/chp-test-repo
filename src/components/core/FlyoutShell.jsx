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
 * - On mobile, support drag-to-dismiss / drag-to-expand on the handle,
 *   and close on the browser back button / native back-swipe gesture
 *
 * USAGE:
 *   // Section flyout (existing):
 *   open({ title: 'Community & Safety', content: '...' });
 *
 *   // Indicator flyout (new):
 *   open({ kind: 'indicator', title: 'Incarcerations', subtitle: '...', source: '...' });
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
 *   plain close (existing slide-right) on desktop
 *
 * NOTES:
 * - Client component — uses useState + context
 * - IndicatorFlyoutContent is lazy-imported so the Leaflet bundle
 *   is never loaded until an indicator flyout is actually opened
 * - Transform / opacity are inline styles so animation works regardless
 *   of Tailwind purge
 * - Children remain server-renderable; only the shell is client
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, lazy, Suspense, Fragment } from 'react';
import { useParams } from 'next/navigation';
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

// Tuning constants for the mobile drag-to-dismiss / drag-to-expand gesture
const CLOSE_VELOCITY_PX_MS = 0.55;  // a downward release faster than this (px/ms) closes, regardless of distance
const EXPAND_DISTANCE_PX   = 24;    // dragging up past this many px (beyond fully-open) expands the panel
const QUICK_CLOSE_MS       = 220;   // duration of the "fly down and disappear" animation
const SNAP_BACK_MS         = 300;   // duration when a drag doesn't cross a threshold

export default function FlyoutShell({ children }) {
  const params = useParams();
  const [flyout, setFlyout] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const panelRef    = useRef(null);
  const triggerRef  = useRef(null);   // remembers the element that opened the flyout

  // Track mobile breakpoint so animation direction can change
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
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

  // ── Copy link ─────────────────────────────────────────────────────────────
  const [linkCopied, setLinkCopied] = useState(false);

  const handleCopyLink = useCallback(() => {
    const key = flyout?.indicatorKey;
    if (!key) return;
    const url = new URL(window.location.href);
    url.searchParams.set('flyout', key);
    navigator.clipboard.writeText(url.toString()).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }).catch(() => {});
  }, [flyout]);

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
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || document.activeElement?.isContentEditable) return;
      window.__chp_hovered_card_open?.();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // ── Mobile drag-to-dismiss / drag-to-expand ─────────────────────────────
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

  // ── Back button / native back-gesture closes the panel ──────────────────
  //
  // We push one history entry when the panel opens so the browser back
  // button (and the iOS/Android edge-swipe-back gesture, which rides on top
  // of history navigation) pops that entry instead of navigating the user
  // away from the page. Closing any other way (X button, backdrop, drag,
  // Escape) silently consumes that same entry with history.back() so the
  // back button never ends up needing an extra press afterward.
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

  // ── Render ───────────────────────────────────────────────────────────────
  //
  // Tailwind utility classes drive almost everything below. The one
  // exception is `--drag-y`: a bare CSS custom property holding the live
  // drag offset in px. Tailwind generates CSS from literal class strings at
  // build time, so it can't produce a rule for every possible pixel value a
  // drag might land on — the standard way around that is a single static
  // arbitrary-value class (`translate-y-[var(--drag-y)]`) that points at a
  // CSS variable, and only the variable's value changes at runtime.
  const panelTransitionClass = !isMobile
    ? isOpen
      ? 'transition-transform duration-300 ease-out delay-[50ms]'
      : 'transition-transform duration-[250ms] ease-in'
    : isDragging
      ? 'transition-none'
      : !isOpen
        ? 'transition-transform duration-[250ms] ease-in'
        : isClosing
          ? '[transition:transform_220ms_cubic-bezier(0.32,0,0.67,0),top_300ms_ease-out,max-height_300ms_ease-out]'
          : '[transition:transform_300ms_cubic-bezier(0.22,1,0.36,1),top_300ms_ease-out,max-height_300ms_ease-out]';
  const panelTransformClass = !isMobile
    ? isOpen ? 'translate-x-0' : 'translate-x-full'
    : isOpen ? 'translate-y-[var(--drag-y)]' : 'translate-y-full';
  const panelPositionClass = isMobile
    ? isExpanded ? 'top-[calc(env(safe-area-inset-top,0px)+60px)]' : 'top-auto'
    : '';
  const panelMaxHeightClass = isMobile
    ? isExpanded ? 'max-h-none' : 'max-h-[85vh]'
    : '';

  return (
    <FlyoutContext.Provider value={value}>
      {/* inert + aria-hidden while the flyout is open: same reasoning as
          IntroModal — aria-modal on the <aside> below isn't reliably honored
          by every screen reader on its own, so the rest of the page (which
          sits underneath, not inside, the panel) needs to be explicitly
          hidden from assistive tech while it's open. */}
      {/* display:contents keeps this a layout no-op — inert/aria-hidden work
          on the DOM tree regardless, so hiding still works correctly. */}
      <div className="contents" inert={isOpen || undefined} aria-hidden={isOpen || undefined}>
        {children}
      </div>

      {/* Backdrop — fades in immediately, panel follows 50ms later */}
      <div
        onClick={close}
        aria-hidden="true"
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
        style={isMobile ? { '--drag-y': `${dragY}px` } : undefined}
        className={
          isMobile
            ? `fixed bottom-0 left-0 right-0 w-full rounded-t-2xl bg-white shadow-xl z-50 flex flex-col overflow-hidden ${panelPositionClass} ${panelMaxHeightClass} ${panelTransformClass} ${panelTransitionClass}`
            : `fixed top-0 right-0 h-full w-[420px] bg-white shadow-xl z-50 flex flex-col overflow-hidden ${panelTransformClass} ${panelTransitionClass}`
        }
      >

        {/* ── Drag handle (mobile only) ────────────────────────── */}
        {isMobile && (
          <div
            className="flex justify-center pt-3 pb-1 shrink-0 cursor-grab active:cursor-grabbing select-none touch-none"
            role="button"
            tabIndex={0}
            aria-label={
              isExpanded
                ? 'Panel expanded. Swipe down or press arrow down to collapse or close.'
                : 'Drag up to expand, drag down or tap to close.'
            }
            onPointerDown={handleHandlePointerDown}
            onPointerMove={handleHandlePointerMove}
            onPointerUp={handleHandlePointerUp}
            onPointerCancel={handleHandlePointerUp}
            onKeyDown={handleHandleKeyDown}
          >
            <div className="w-8 h-1 rounded-full bg-gray-300" />
          </div>
        )}

        {/* ── Panel header ─────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-2 shrink-0 gap-3">
          <h2 className="text-sm font-semibold text-gray-900 leading-snug truncate min-w-0">
            {isIndicator ? flyout?.title : `About ${flyout?.title}`}
          </h2>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* View full page — indicator flyouts only */}
            {isIndicator && flyout?.indicatorKey && (
              <a
                href={`/indicator/${flyout.indicatorKey}${params?.id ? `?geo=${params.id}` : ''}`}
                aria-label={`View full page for ${flyout.title}`}
                title="View full page"
                className="inline-flex items-center gap-1 h-7 px-2 rounded border border-gray-200 text-xs font-medium text-gray-500 hover:text-brand hover:border-brand hover:bg-brand-tint transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 whitespace-nowrap"
              >
                Full page
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}

            {/* Copy link — indicator flyouts only */}
            {isIndicator && flyout?.indicatorKey && (
              <button
                type="button"
                onClick={handleCopyLink}
                aria-label="Copy link to this indicator"
                title="Copy link"
                className="inline-flex items-center gap-1 h-7 px-2 rounded border border-gray-200 text-xs font-medium text-gray-500 hover:text-brand hover:border-brand hover:bg-brand-tint transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 whitespace-nowrap"
              >
                {linkCopied ? (
                  <><span className="text-green-600 text-xs">✓</span> Copied</>
                ) : (
                  <>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    Copy link
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={close}
              aria-label="Close panel"
              className="text-gray-400 border border-transparent hover:text-brand hover:border-brand hover:bg-brand-tint transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-full p-1 shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
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
