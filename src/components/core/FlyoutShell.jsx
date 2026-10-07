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
 *     { title, subtitle, metadataLine, source, sourceUrl, description, dataSource, isPercent, higherIsBetter, compactSpec }
 *     — Renders a Leaflet map (zoomed to active neighborhood) + indicator
 *       metadata (title, subtitle, about text, source with optional link).
 *       dataSource/isPercent pick the small-sample-size caveat wording for
 *       a flagged CD row — see getFlaggedEstimateFootnote() in
 *       compareIndicator.js. higherIsBetter lets the insight badge color by
 *       good/bad instead of raw up/down direction. compactSpec is the same
 *       Vega-Lite spec the originating card renders — reused as-is so the
 *       flyout's mini bar visually matches the card (2026-09-09).
 *     Custom (non-bar) cards — Avertable Deaths, Leading Causes of Premature
 *     Death, cancer types — pass `chart` (a React element) instead of
 *     compactSpec: their own chart, rendered in the same slot (2026-09-27).
 *     Distribution charts (no single Value per CD) also omit the map/insight;
 *     IndicatorFlyoutContent hides those when there are no numeric CD rows.
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
 * MOBILE GESTURES (drag handle only) — see ./flyoutShell/useMobileDragSheet.js
 * for the full breakdown (tap/slow-drag/fast-flick/swipe-up/back-gesture).
 *
 * NOTES:
 * - Client component — uses useState + context
 * - IndicatorFlyoutContent is lazy-imported so the Leaflet bundle
 *   is never loaded until an indicator flyout is actually opened
 * - Transform / opacity are inline styles so animation works regardless
 *   of Tailwind purge
 * - Children remain server-renderable; only the shell is client
 * - As of 2026-09-04, the mobile breakpoint tracking, the drag-to-dismiss/
 *   drag-to-expand gesture state, the back-button/history handling, and the
 *   focus-trap/scroll-lock/'i'-shortcut effects live in dedicated hooks
 *   under ./flyoutShell/ — this file owns the context, open/close/copy-link
 *   state, and the JSX tree.
 * - Export tray (2026-09-29): an "Export" toggle next to "Copy link" opens a
 *   row under the header with the expanded chart modal's Copy / PNG / CSV /
 *   Embed actions — see ./flyoutShell/FlyoutExportTray.jsx. Standard cards
 *   pass `expandedSpecOptions` (so the PNG matches the expanded modal's);
 *   custom cards may pass `csvRows` for the CSV button.
 */
import { createContext, useCallback, useContext, useMemo, useRef, useState, lazy, Suspense } from 'react';
import { useParams } from 'next/navigation';
import MarkdownRenderer from '@/components/content/MarkdownRenderer';
import { useIsMobileViewport } from './flyoutShell/useIsMobileViewport';
import { useMobileDragSheet } from './flyoutShell/useMobileDragSheet';
import { useFlyoutHistoryBack } from './flyoutShell/useFlyoutHistoryBack';
import { useFlyoutA11yEffects } from './flyoutShell/useFlyoutA11yEffects';
import FlyoutExportTray, { flyoutHasExports } from './flyoutShell/FlyoutExportTray';

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

// Non-throwing variant (2026-09-27) for shared components that also render
// outside a FlyoutShell (e.g. ComparisonPyramidChartClient in the At a Glance
// hero vs. the cancer-types card). Returns null when there's no shell.
export function useOptionalFlyout() {
  return useContext(FlyoutContext);
}

export default function FlyoutShell({ children }) {
  const params = useParams();
  const [flyout, setFlyout] = useState(null);
  const panelRef    = useRef(null);
  const triggerRef  = useRef(null);   // remembers the element that opened the flyout

  // Track mobile breakpoint so animation direction can change
  const isMobile = useIsMobileViewport();

  // Export tray (2026-09-29) — collapsed again whenever the flyout opens or
  // closes, so it never carries over from one indicator to the next.
  const [trayOpen, setTrayOpen] = useState(false);

  const open = useCallback((payload) => {
    triggerRef.current = document.activeElement;
    setTrayOpen(false);
    setFlyout(payload);
  }, []);

  const close = useCallback(() => {
    setTrayOpen(false);
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

  // Focus trap + Escape, body scroll lock (mobile), and the global 'i' shortcut
  useFlyoutA11yEffects({ isOpen, isMobile, close, panelRef });

  // Mobile drag-to-dismiss / drag-to-expand
  const {
    dragY,
    isDragging,
    isExpanded,
    isClosing,
    triggerQuickClose,
    handleHandlePointerDown,
    handleHandlePointerMove,
    handleHandlePointerUp,
    handleHandleKeyDown,
  } = useMobileDragSheet({ isMobile, isOpen, close });

  // Back button / native back-gesture closes the panel
  useFlyoutHistoryBack({ isOpen, triggerQuickClose });

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

      {/* Clip box (2026-10-05) — the closed panel is parked off-screen
          (translated right on desktop, down on mobile; and during hydration
          on a phone it briefly sits in the desktop spot, 420px off the right
          edge, before isMobile resolves). A position:fixed element parked
          off-screen still counts toward the page's scrollable width, and
          overflow-x on <html> does NOT clip fixed elements. Mobile browsers
          respond by widening the layout viewport and don't shrink it back —
          which is what made the page look off-center/cut off, put fixed
          buttons off-screen, and let the sticky TopicNav scroll away.
          This fixed, overflow-hidden box clips the panel instead, so it can
          never widen the page. pointer-events-none lets clicks through to
          the page/backdrop; the panel itself re-enables them. The panel is
          `absolute` (not `fixed`) so this box is its containing block. */}
      <div className="fixed inset-0 z-50 overflow-hidden pointer-events-none">
      {/* Panel — slides from right on desktop, up from bottom on mobile */}
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        // A11Y (2026-09-26): the dialog had no accessible name (the header
        // <h2> it could point at via aria-labelledby was removed), so
        // screen readers announced just "dialog". Named from the flyout title.
        aria-label={flyout?.title ? (isIndicator ? flyout.title : `About ${flyout.title}`) : 'Details'}
        aria-hidden={!isOpen}
        // A11Y (2026-09-27, axe aria-hidden-focus): aria-hidden alone left the
        // closed panel's buttons/links in the Tab order — keyboard users could
        // land on invisible, screen-reader-hidden controls. inert removes the
        // whole closed panel from focus + the accessibility tree.
        inert={!isOpen || undefined}
        style={isMobile ? { '--drag-y': `${dragY}px` } : undefined}
        className={
          isMobile
            ? `absolute pointer-events-auto bottom-0 left-0 right-0 w-full rounded-t-2xl bg-white shadow-xl flex flex-col overflow-hidden ${panelPositionClass} ${panelMaxHeightClass} ${panelTransformClass} ${panelTransitionClass}`
            : `absolute pointer-events-auto top-0 right-0 h-full w-[420px] max-w-full bg-white shadow-xl flex flex-col overflow-hidden ${panelTransformClass} ${panelTransitionClass}`
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
        <div className="flex items-center justify-end px-5 py-2 shrink-0 gap-3">


          <div className="flex items-center gap-1.5 shrink-0">

            {/* View full page — indicator flyouts only */}
            {/* {isIndicator && flyout?.indicatorKey && (
              <a
                href={`/indicator/${flyout.indicatorKey}${params?.id ? `?geo=${params.id}` : ''}`}
                aria-label={`View full page for ${flyout.title}`}
                title="View full page"
                className="inline-flex items-center gap-1 h-7 px-2 rounded border border-gray-200 text-xs font-medium text-gray-600 hover:text-brand hover:border-brand hover:bg-brand-tint transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 whitespace-nowrap"
              >
                Full page
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )} */}
      

            {/* Copy link — indicator flyouts only */}
            {isIndicator && flyout?.indicatorKey && (
              <button
                type="button"
                onClick={handleCopyLink}
                aria-label="Copy link to this indicator"
                title="Copy link"
                className="inline-flex items-center gap-1 h-7 px-2 rounded border border-gray-200 text-xs font-medium text-gray-600 hover:text-brand hover:border-brand hover:bg-brand-tint transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 whitespace-nowrap"
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

            {/* Export — toggles the tray below the header, which holds the same
                Copy / PNG / CSV / Embed actions as the expanded chart modal.
                See ./flyoutShell/FlyoutExportTray.jsx (2026-09-29). */}
            {/* Desktop only (2026-10-07) — not needed on mobile, per Morgan. */}
        {!isMobile && isIndicator && flyoutHasExports(flyout) && (
              <button
                type="button"
                onClick={() => setTrayOpen(o => !o)}
                aria-expanded={trayOpen}
                aria-controls="flyout-export-tray"
                title="Download or embed"
                className={`inline-flex items-center gap-1 h-7 px-2 rounded border text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 whitespace-nowrap ${
                  trayOpen
                    ? 'text-brand border-brand bg-brand-tint'
                    : 'text-gray-600 border-gray-200 hover:text-brand hover:border-brand hover:bg-brand-tint'
                }`}
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export
                <svg className={`w-3 h-3 transition-transform duration-200 ${trayOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            )}

            <button
              type="button"
              onClick={close}
              aria-label="Close panel"
              className="text-gray-600 border border-transparent hover:text-brand hover:border-brand hover:bg-brand-tint transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-full p-1 shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Export tray (indicator flyouts) ──────────────────── */}
        {/* Desktop only (2026-10-07) — not needed on mobile, per Morgan. */}
        {!isMobile && isIndicator && flyoutHasExports(flyout) && (
          <FlyoutExportTray
            id="flyout-export-tray"
            open={trayOpen}
            flyout={flyout}
            panelRef={panelRef}
          />
        )}

        {/* ── Panel body — switches on kind ─────────────────────── */}
        {isIndicator ? (
          <Suspense fallback={<div className="flex-1 bg-gray-50 animate-pulse" />}>
            <IndicatorFlyoutContent
              title={flyout?.title}
              subtitle={flyout?.subtitle}
              metadataLine={flyout?.metadataLine}
              source={flyout?.source}
              sourceUrl={flyout?.sourceUrl}
              description={flyout?.description}
              indicatorData={flyout?.indicatorData}
              geoId={flyout?.geoId}
              sectionLabel={flyout?.sectionLabel}
              dataSource={flyout?.dataSource}
              isPercent={flyout?.isPercent}
              higherIsBetter={flyout?.higherIsBetter}
              contextText={flyout?.flyoutContext}
              comparisonParts={flyout?.flyoutComparison}
              compactSpec={flyout?.compactSpec}
              chart={flyout?.chart}
              hideSuppressionNote={flyout?.hideSuppressionNote}
              suppressionNote={flyout?.suppressionNote}
            />
          </Suspense>
        ) : (
          <div className="flex-1 p-6 overflow-y-auto text-sm">
            <MarkdownRenderer content={flyout?.content} />
          </div>
        )}

      </aside>
      </div>
    </FlyoutContext.Provider>
  );
}
