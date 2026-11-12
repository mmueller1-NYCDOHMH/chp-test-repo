'use client';

/**
 * FILE: GuidedTour.jsx
 *
 * PURPOSE:
 * Optional guided tour of a neighborhood profile (added 2026-10-19). Never
 * auto-starts: it runs only when someone chooses it from the intro modal's
 * tour callout or the ? help menu.
 *
 * DESKTOP (≥768px): spotlight + popover. Each step highlights a real element
 * on the page (found by selector, see TARGETS below), scrolls it into view
 * and places a popover beside it. Steps whose element isn't on the page are
 * skipped, so the tour never points at nothing. Steps are grouped
 * ("Getting around" / "Reading a card"), shown above a thin progress bar.
 *
 * MOBILE (<768px): no spotlighting. A short bottom sheet of cards with an
 * icon per step, per the mobile scope decisions (no map browsing on mobile).
 *
 * OPENED BY: window event chp:start-tour (see onboardingEvents.js).
 * COPY: content/site/onboarding.json → tour. No code changes needed.
 *
 * KEYBOARD: ← / → move between steps, Esc ends the tour, Tab is trapped in
 * the popover. Focus moves to each step's heading.
 *
 * A11Y: popover/sheet is role=dialog + aria-modal; the app shell is inert
 * while the tour runs. Respects prefers-reduced-motion (no smooth scroll,
 * no spotlight slide, no popover fade).
 *
 * STYLE PASS (2026-10-19): popover fades between steps instead of sliding;
 * progress bar + step groups replace dots; 45% black dim (lighter than the
 * intro modal so the page stays readable); spotlight copies the target's
 * corner radius; Back uses the outlined brand button; toast matches
 * ShortcutsToast; mobile steps get icons. Pre-pass version:
 * "Claude outputs/revert_onboarding_2026-10-19/GuidedTour.v1-before-style-pass.jsx".
 *
 * REVERT: see "Claude outputs/revert_onboarding_2026-10-19/REVERT.md".
 */

import { useState, useEffect, useLayoutEffect, useRef, useCallback, useId } from 'react';
import { createPortal } from 'react-dom';
import {
  START_TOUR, isMobileViewport, prefersReducedMotion, firstVisible,
} from './onboardingEvents';
import copy from '../../../../content/site/onboarding.json';

const t = copy.tour;
const APP_SHELL_ID = 'chp-app-shell';
const PAD = 8;          // spotlight padding around the target
const GAP = 14;         // space between spotlight and popover
const POP_W = 360;
const EDGE = 16;        // min distance from viewport edge
const DIM = 'rgba(0, 0, 0, 0.45)';
const MIN_SPOT = 56;    // min spotlight width/height (px) for small targets

const CARD_SEL    = '#main-content div[role="group"].rounded-xl';
const DETAILS_SEL = 'button[aria-label^="Details about"]';
const NOTES_SEL   = 'button[aria-label^="About these data"]';
const EXPAND_SEL  = 'button[aria-label^="Expand chart"]';

const isShown = (el) => !!el && el.getClientRects().length > 0;

// The card the card-level steps point at: the first visible indicator card
// that has all three controls (Details, About these data, Expand), so the
// steps stay on one card. Falls back to the first visible card.
function tourCard() {
  const cards = Array.from(document.querySelectorAll(CARD_SEL)).filter(isShown);
  return cards.find(c => [DETAILS_SEL, NOTES_SEL, EXPAND_SEL].every(sel => isShown(c.querySelector(sel))))
    ?? cards[0] ?? null;
}
function inCard(sel) {
  const el = tourCard()?.querySelector(sel);
  return isShown(el) ? el : null;
}

// Step id → how to find its element. Selectors only (no changes to the
// components themselves), so removing this file removes the tour entirely.
const TARGETS = {
  find:    () => firstVisible('label[for="sidebar-find-neighborhood"]')?.parentElement ?? null,
  compare: () => firstVisible('label[for="sidebar-compare-to"]')?.parentElement ?? null,
  glance:  () => firstVisible('#neighborhood-overview'),
  topics:  () => firstVisible('#topic-nav'),
  card:    () => tourCard(),
  details: () => inCard(DETAILS_SEL),   // opens the Details flyout
  notes:   () => inCard(NOTES_SEL),     // opens the About these data modal
  expand:  () => inCard(EXPAND_SEL),    // opens the expanded chart modal
};

// Mobile step icons (inline stroke SVG paths, 24×24)
const MOBILE_ICONS = {
  find:    <><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></>,
  topics:  <><path d="M4 6h16M4 12h16M4 18h10" /></>,
  card:    <><path d="M4 19V5M4 19h16" /><path d="M8 15v-4M12 15V8M16 15v-6" /></>,
  details: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5v.7" /><path d="M12 17h.01" /></>,
};

function fill(str, vars) {
  return str.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));
}

/** Popover position next to `r` (spotlight rect), kept inside the viewport. */
function placePopover(r, popH) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const clampX = (x) => Math.max(EDGE, Math.min(x, vw - POP_W - EDGE));
  const clampY = (y) => Math.max(EDGE, Math.min(y, vh - popH - EDGE));
  if (r.bottom + GAP + popH <= vh - EDGE) return { left: clampX(r.left), top: r.bottom + GAP };      // below
  if (r.right + GAP + POP_W <= vw - EDGE) return { left: r.right + GAP, top: clampY(r.top) };        // right
  if (r.top - GAP - popH >= EDGE)         return { left: clampX(r.left), top: r.top - GAP - popH };  // above
  if (r.left - GAP - POP_W >= EDGE)       return { left: r.left - GAP - POP_W, top: clampY(r.top) }; // left
  return { left: vw - POP_W - EDGE, top: vh - popH - EDGE };                                          // corner
}

function Kbd({ children }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-5 h-5 px-1 text-xs font-mono bg-gray-100 border border-gray-300 rounded text-gray-700 leading-none">
      {children}
    </kbd>
  );
}

export default function GuidedTour() {
  const [mode,    setMode]    = useState(null);   // null | 'desktop' | 'mobile'
  const [steps,   setSteps]   = useState([]);
  const [index,   setIndex]   = useState(0);
  const [rect,    setRect]    = useState(null);   // spotlight rect (viewport px) + radius
  const [popPos,  setPopPos]  = useState(null);   // null while hidden between steps
  const [toast,   setToast]   = useState(false);
  const [mounted, setMounted] = useState(false);  // portal only after hydration
  const [usedKeys, setUsedKeys] = useState(false); // show ← → hint only to keyboard users
  const popRef     = useRef(null);
  const headingRef = useRef(null);
  const toastTimer = useRef(null);
  const baseId     = useId();
  const reduced    = typeof window !== 'undefined' && prefersReducedMotion();

  // ── Start ────────────────────────────────────────────────────────────────
  useEffect(() => {
    function onStart() {
      clearTimeout(toastTimer.current);
      setToast(false);
      setPopPos(null);
      if (isMobileViewport()) {
        setSteps(t.mobileSteps);
        setMode('mobile');
      } else {
        const available = t.desktopSteps.filter(s => TARGETS[s.id]?.());
        if (!available.length) return;
        setSteps(available);
        setMode('desktop');
      }
      setIndex(0);
    }
    window.addEventListener(START_TOUR, onStart);
    return () => window.removeEventListener(START_TOUR, onStart);
  }, []);

  const end = useCallback(() => {
    setMode(null);
    setRect(null);
    setPopPos(null);
    try { localStorage.setItem('chp_tour_seen', '1'); } catch { /* ignore */ }
    setToast(true);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(false), 8000);
  }, []);

  // Moving between steps hides the popover (popPos → null); it fades back
  // in once it has been placed beside the new target.
  const goTo = useCallback((i) => {
    setPopPos(null);
    setIndex(i);
  }, []);

  const next = useCallback(() => {
    if (index >= steps.length - 1) end();
    else goTo(index + 1);
  }, [index, steps.length, end, goTo]);

  const back = useCallback(() => {
    if (index > 0) goTo(index - 1);
  }, [index, goTo]);

  // ── Desktop: scroll target into view, then track its rect ───────────────
  const measure = useCallback(() => {
    const step = steps[index];
    const el = step && TARGETS[step.id]?.();
    if (!el) return;
    const b = el.getBoundingClientRect();
    const vh = window.innerHeight;
    // Clamp very tall targets (e.g. At a Glance) to the visible area
    const top    = Math.max(b.top - PAD, EDGE / 2);
    const bottom = Math.min(b.bottom + PAD, vh - EDGE / 2);
    // Copy the target's own corner radius so the spotlight hugs it
    const own = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
    const radius = Math.min((own || 6) + PAD, 24);
    // Small targets (icon buttons) get a minimum spotlight so they're easy to spot
    let left = b.left - PAD, width = b.width + PAD * 2, height = Math.max(bottom - top, 40), y = top;
    if (width < MIN_SPOT)  { left -= (MIN_SPOT - width) / 2;  width = MIN_SPOT; }
    if (height < MIN_SPOT) { y -= (MIN_SPOT - height) / 2; height = MIN_SPOT; }
    const r = { left, top: y, width, height, radius: width === MIN_SPOT && height === MIN_SPOT ? MIN_SPOT / 2 : radius };
    r.right = r.left + r.width;
    r.bottom = r.top + r.height;
    setRect(r);
  }, [steps, index]);

  useEffect(() => {
    if (mode !== 'desktop') return;
    const step = steps[index];
    const el = step && TARGETS[step.id]?.();
    if (!el) {                      // element vanished (e.g. layout change) — skip it
      const id = setTimeout(next, 0);
      return () => clearTimeout(id);
    }
    const b = el.getBoundingClientRect();
    const tall = b.height > window.innerHeight * 0.6;
    el.scrollIntoView({ block: tall ? 'start' : 'center', behavior: reduced ? 'auto' : 'smooth' });

    let raf = null;
    const onMove = () => { if (raf == null) raf = requestAnimationFrame(() => { raf = null; measure(); }); };
    const first = requestAnimationFrame(measure);
    // Re-measure after smooth scroll settles
    const settle = setTimeout(measure, reduced ? 0 : 450);
    window.addEventListener('scroll', onMove, { capture: true, passive: true });
    window.addEventListener('resize', onMove);
    return () => {
      clearTimeout(settle);
      cancelAnimationFrame(first);
      if (raf != null) cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onMove, { capture: true });
      window.removeEventListener('resize', onMove);
    };
  }, [mode, index, steps]); // eslint-disable-line react-hooks/exhaustive-deps

  // Place popover once we know its height
  useLayoutEffect(() => {
    if (mode !== 'desktop' || !rect) return;
    const raf = requestAnimationFrame(() => {
      const h = popRef.current?.offsetHeight || 220;
      setPopPos(placePopover(rect, h));
    });
    return () => cancelAnimationFrame(raf);
  }, [mode, rect, index]);

  // Focus each step's heading — on desktop only once the popover is placed
  // (it's visibility:hidden, so unfocusable, until then)
  const placed = mode === 'mobile' || !!popPos;
  useEffect(() => {
    if (!mode || !placed) return;
    const id = setTimeout(() => headingRef.current?.focus({ preventScroll: true }), 30);
    return () => clearTimeout(id);
  }, [mode, index, placed]);

  // Keyboard: Esc ends, ← / → move, Tab trapped in the dialog
  useEffect(() => {
    if (!mode) return;
    function onKey(e) {
      if (['ArrowRight', 'ArrowLeft', 'Tab', 'Enter', ' '].includes(e.key)) setUsedKeys(true);
      if (e.key === 'Escape') { e.preventDefault(); end(); return; }
      if (e.key === 'ArrowRight') { e.preventDefault(); next(); return; }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); back(); return; }
      if (e.key === 'Tab' && popRef.current) {
        const f = Array.from(popRef.current.querySelectorAll('button')).filter(b => !b.disabled);
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        const active = document.activeElement;
        if (e.shiftKey && (active === first || active === headingRef.current)) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
        else if (!popRef.current.contains(active)) { e.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mode, end, next, back]);

  // App shell inert while the tour runs
  useEffect(() => {
    const shell = document.getElementById(APP_SHELL_ID);
    if (!shell || !mode) return;
    shell.setAttribute('inert', '');
    shell.setAttribute('aria-hidden', 'true');
    return () => { shell.removeAttribute('inert'); shell.removeAttribute('aria-hidden'); };
  }, [mode]);

  useEffect(() => {
    // Hydration guard: portal renders client-side only
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    return () => clearTimeout(toastTimer.current);
  }, []);

  if (!mounted) return null;

  const step   = steps[index];
  const isLast = index === steps.length - 1;
  const stepLabel = fill(t.stepLabel, { n: index + 1, total: steps.length });
  const groupLabel = step?.group ? t.groups?.[step.group] : null;
  const pct = steps.length ? ((index + 1) / steps.length) * 100 : 0;

  const progress = (
    <div className="flex flex-col gap-2">
      <p className="text-xs">
        {groupLabel && <span className="font-semibold text-brand">{groupLabel}</span>}
        {groupLabel && <span className="text-gray-500 mx-1.5" aria-hidden="true">·</span>}
        <span className="text-gray-600">{stepLabel}</span>
      </p>
      <div className="h-1 rounded-full bg-gray-200 overflow-hidden" aria-hidden="true">
        <div
          className="h-full bg-brand rounded-full"
          style={{ width: `${pct}%`, transition: reduced ? 'none' : 'width 250ms ease' }}
        />
      </div>
    </div>
  );

  const closeButton = (
    <button
      type="button"
      onClick={end}
      aria-label={t.close}
      className="absolute top-2.5 right-2.5 w-8 h-8 flex items-center justify-center rounded-full text-gray-600 border border-transparent hover:text-brand hover:border-brand hover:bg-brand-tint transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  );

  const navButtons = (finishLabel, size = 'h-10') => (
    <div className="ml-auto flex items-center gap-2 shrink-0">
      {index > 0 && (
        <button
          type="button"
          onClick={back}
          className={`${size} px-3.5 rounded-lg border border-brand text-brand text-sm font-medium hover:text-white hover:bg-brand transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500`}
        >
          {t.back}
        </button>
      )}
      <button
        type="button"
        onClick={next}
        className={`${size} px-4 rounded-lg border border-brand bg-brand text-white text-sm font-semibold hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2`}
      >
        {isLast ? finishLabel : t.next}
      </button>
    </div>
  );

  return createPortal(
    <>
      {/* ── Desktop spotlight ─────────────────────────────────────────── */}
      {mode === 'desktop' && step && (
        <div className="fixed inset-0 z-[9998]">
          {/* Click-blocker: the page stays visible but isn't clickable mid-tour */}
          <div className="absolute inset-0" aria-hidden="true" style={rect ? undefined : { backgroundColor: DIM }} />
          {rect && (
            <div
              aria-hidden="true"
              className="fixed pointer-events-none"
              style={{
                left: rect.left, top: rect.top, width: rect.width, height: rect.height,
                borderRadius: rect.radius,
                boxShadow: `0 0 0 3px #ffffff, 0 0 0 9999px ${DIM}`,
                transition: reduced
                  ? 'none'
                  : 'left 300ms ease, top 300ms ease, width 300ms ease, height 300ms ease, border-radius 300ms ease',
              }}
            />
          )}
          <div
            ref={popRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${baseId}-title`}
            aria-describedby={`${baseId}-body`}
            className="fixed bg-white rounded-xl shadow-2xl pt-4 px-5 pb-4 flex flex-col"
            style={{
              width: POP_W,
              // Hidden (but still laid out, so it can be measured) until placed
              left: popPos?.left ?? 0,
              top: popPos?.top ?? 0,
              opacity: popPos ? 1 : 0,
              visibility: popPos ? 'visible' : 'hidden',
              transition: reduced || !popPos ? 'none' : 'opacity 180ms ease-out',
            }}
          >
            {closeButton}
            <div className="pr-8">{progress}</div>
            <h2 id={`${baseId}-title`} ref={headingRef} tabIndex={-1} className="mt-3 text-lg font-bold text-gray-900 leading-snug focus:outline-none">
              {step.title}
            </h2>
            <p id={`${baseId}-body`} className="mt-1 text-sm leading-relaxed text-gray-700">{step.body}</p>
            {isLast && (
              <p className="mt-3 text-sm leading-snug text-gray-700 bg-[var(--background)] rounded-md px-3 py-2.5">{t.replayHint}</p>
            )}
            <div className="mt-4 pt-3 border-t border-gray-200 flex items-center gap-3">
              {usedKeys && (
                <p className="text-xs text-gray-600 flex items-center gap-1">
                  <Kbd>←</Kbd><Kbd>→</Kbd>
                  <span className="ml-0.5">{t.keyHint}</span>
                </p>
              )}
              {navButtons(t.finish)}
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile bottom sheet ───────────────────────────────────────── */}
      {mode === 'mobile' && step && (
        <div className="fixed inset-0 z-[9998] flex items-end" style={{ backgroundColor: DIM }}>
          <div
            ref={popRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${baseId}-title`}
            aria-describedby={`${baseId}-body`}
            className="relative w-full bg-white rounded-t-2xl shadow-2xl px-5 pt-3 pb-7 flex flex-col"
          >
            <span className="w-10 h-1 rounded-full bg-gray-400 self-center" aria-hidden="true" />
            <div className="mt-3 flex items-center gap-3">
              <div className="flex-1">{progress}</div>
              <button
                type="button"
                onClick={end}
                className="h-11 px-1 text-sm font-medium text-gray-600 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
              >
                {t.skip}
              </button>
            </div>
            <div className="mt-3 flex items-start gap-3">
              {MOBILE_ICONS[step.id] && (
                <span className="w-10 h-10 rounded-lg bg-brand-tint text-brand flex items-center justify-center shrink-0" aria-hidden="true">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    {MOBILE_ICONS[step.id]}
                  </svg>
                </span>
              )}
              <div className="min-w-0">
                <h2 id={`${baseId}-title`} ref={headingRef} tabIndex={-1} className="text-xl font-bold text-gray-900 leading-snug focus:outline-none">
                  {step.title}
                </h2>
                <p id={`${baseId}-body`} className="mt-1 text-[15px] leading-relaxed text-gray-700">{step.body}</p>
              </div>
            </div>
            <div className="mt-5 flex items-center">
              {navButtons(t.mobileFinish, 'h-12')}
            </div>
          </div>
        </div>
      )}

      {/* ── End-of-tour toast (matches ShortcutsToast) ─────────────────── */}
      {toast && !mode && (
        <div
          role="status"
          className="fixed left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-max md:max-w-md bottom-4 z-[9998] bg-gray-900 text-white rounded-lg px-3.5 py-2.5 shadow-lg flex items-center gap-3"
        >
          <p className="flex-1 min-w-0 text-xs font-medium leading-snug">{t.endedToast}</p>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent(START_TOUR))}
            className="shrink-0 text-xs font-semibold text-white border border-white/40 rounded px-2.5 py-1.5 hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          >
            {t.replay}
          </button>
          <button
            type="button"
            onClick={() => setToast(false)}
            aria-label="Dismiss"
            className="shrink-0 text-white/50 border border-transparent hover:text-white hover:bg-white/10 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded p-0.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </>,
    document.body
  );
}
