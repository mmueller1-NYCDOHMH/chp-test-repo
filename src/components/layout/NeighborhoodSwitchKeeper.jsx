'use client';

/**
 * FILE: NeighborhoodSwitchKeeper.jsx
 *
 * PURPOSE:
 * The landing half of "keep my place" on neighborhood switches (2026-10-14).
 * See lib/utils/neighborhoodSwitch.js for the why and how to revert.
 *
 * WHAT IT DOES when a new neighborhood renders after a mid-page switch
 * (or a Back/Forward between neighborhoods):
 * 1. Waits for the new page's content (the loading skeleton has no
 *    indicator/section ids), then puts the same indicator card back at the
 *    same height on screen — falling back to the section, then to scrollY.
 * 2. Shows the data changed: a brief "Now showing <Name>" pill under the
 *    sticky bars + the existing .section-flash ring on the card. Since the
 *    page no longer moves, readers could otherwise miss that the numbers
 *    under them changed.
 * 3. A11Y: announces "Now showing data for <Name>" (polite live region) and
 *    leaves keyboard focus where it was (the selector). RouteAnnouncer skips
 *    its usual "Navigated to…" + focus-to-top for these switches. If focus
 *    was lost (the control that had it unmounted), it goes to the restored
 *    card's heading instead of <body>.
 * 4. Remembers the reader's spot on each neighborhood page as they scroll,
 *    so Back returns to where they were.
 *
 * Mounted once in PageLayout (stays mounted across neighborhood changes).
 */

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import LiveText from '@/components/content/LiveText';
import { endKeepPlace, notePopState, peekPending, recordSpot, restoreSpot, takePending } from '@/lib/utils/neighborhoodSwitch';

const WAIT_FOR_CONTENT_MS = 3000;
const TOAST_MS            = 2600;
const RECORD_DEBOUNCE_MS  = 200;

// Nearest still-mounted control to where focus was before the switch.
function surviving(focusTrail = []) {
  for (const n of focusTrail) {
    if (!n.isConnected) continue;
    if (n.matches('button, input, select, [tabindex="0"]') && n.offsetParent !== null) return n;
    const f = [...n.querySelectorAll('button, input, select, [tabindex="0"]')]
      .find(e => e.offsetParent !== null && !e.disabled);
    if (f) return f;
  }
  return null;
}

function contentReady(spot) {
  if (spot.top) return true;
  return !!(
    (spot.cardId && document.getElementById(spot.cardId)) ||
    (spot.section && document.getElementById(spot.section)) ||
    document.querySelector('#main-content [id^="indicator-"]')
  );
}

export default function NeighborhoodSwitchKeeper({ neighborhoods = [] }) {
  const params = useParams();
  const id     = params?.id ? String(params.id) : null;

  const [message, setMessage] = useState('');
  const [toast, setToast]     = useState(null); // { name, key }
  const restoringRef = useRef(false);
  const idRef        = useRef(id);
  idRef.current = id;

  // Back/Forward between neighborhoods → restore that page's last spot.
  useEffect(() => {
    const onPop = () => notePopState();
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Remember the reader's spot on this page (for Back/Forward).
  useEffect(() => {
    let t;
    const onScroll = () => {
      if (restoringRef.current) return;
      clearTimeout(t);
      t = setTimeout(() => recordSpot(idRef.current), RECORD_DEBOUNCE_MS);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { clearTimeout(t); window.removeEventListener('scroll', onScroll); };
  }, []);

  // A neighborhood just rendered — was it a keep-my-place switch?
  useEffect(() => {
    if (!id) return;
    const p = peekPending(id);
    if (!p) return;

    restoringRef.current = true;
    const name    = neighborhoods.find(n => String(n.id) === id)?.name ?? 'this neighborhood';
    const started = Date.now();
    let raf, doneTimer, cancelled = false;

    const land = () => {
      if (cancelled) return;
      if (!contentReady(p.spot) && Date.now() - started < WAIT_FOR_CONTENT_MS) {
        raf = requestAnimationFrame(land);
        return;
      }
      if (takePending(id) !== p) { restoringRef.current = false; return; } // superseded
      // Usually already restored before paint (neighborhoodSwitch.js
      // watchForNewContent); this is the fallback.
      const el = p.restored ? p.anchorEl : p.userMoved ? null : restoreSpot(p.spot);

      // Show that the data changed under the reader.
      setToast({ name, key: Date.now() });
      if (el) {
        el.classList.remove('section-flash');
        void el.offsetWidth; // restart the animation if it's mid-run
        el.classList.add('section-flash');
        setTimeout(() => el.classList.remove('section-flash'), 1000);
      }

      // Keep focus on the selector; only rescue it if it was lost.
      const active = document.activeElement;
      if (!active || active === document.body || !active.isConnected) {
        const control = surviving(p.focusTrail);
        if (control) {
          control.focus({ preventScroll: true });
        } else {
          const target = el?.querySelector('h2, h3, h4') ?? el ?? document.getElementById('main-content');
          if (target) {
            if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
            target.focus({ preventScroll: true });
          }
        }
      }

      // Re-set via '' so picking the same name twice still announces.
      setMessage('');
      requestAnimationFrame(() => setMessage(`Now showing data for ${name}`));

      doneTimer = setTimeout(() => {
        restoringRef.current = false;
        recordSpot(idRef.current);
        endKeepPlace();
      }, 1200);
    };
    raf = requestAnimationFrame(land);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      clearTimeout(doneTimer);
      restoringRef.current = false;
      // No endKeepPlace() here: this cleanup also runs when the NEXT switch
      // changes the id, and would strip the class that switch just set.
      // neighborhoodSwitch.js has its own safety timeout.
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <>
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        <LiveText>{message}</LiveText>
      </div>
      {/* Zero-height sticky rail just under TopicNav + StickyContextBar, so
          the pill rides at the top of the content column without shifting
          layout. Visual only — the live region above does the announcing. */}
      <div
        aria-hidden="true"
        className="sticky z-30 h-0 flex items-start justify-center pointer-events-none"
        style={{ top: 'calc(var(--chp-sticky-offset, 92px) + 8px)' }}
      >
        {toast && (
          <div
            key={toast.key}
            className="chp-switch-toast shrink-0 rounded-full bg-gray-900 text-white text-sm px-4 py-1.5 shadow-lg whitespace-nowrap"
          >
            Now showing <span className="font-semibold">{toast.name}</span>
          </div>
        )}
      </div>
    </>
  );
}
