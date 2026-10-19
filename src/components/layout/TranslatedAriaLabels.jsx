'use client';

/**
 * FILE: TranslatedAriaLabels.jsx
 *
 * PURPOSE (a11y checklist #34, WCAG 3.1.2 Language of Parts — 2026-10-13):
 * Google Translate translates the page's TEXT, never attributes, so every
 * `aria-label` ("Details about …", "Expand chart: …", "Close panel", …)
 * stayed English on a translated page and was read by a Spanish/Chinese/…
 * screen-reader voice.
 *
 * HOW: only when a non-English language is active, this copies each
 * aria-label into a span inside one visually hidden, aria-hidden container
 * and points the element at it with aria-labelledby (which wins over
 * aria-label). aria-labelledby may reference aria-hidden content, so the
 * spans aren't read twice.
 *
 * TIMING — what we learned testing in Chrome (2026-10-13):
 *  - Google's Website Translator translates ONLY what is on the page during
 *    its first pass. Content added later (Details flyout, expanded chart,
 *    "?" notes dialog) is never picked up.
 *  - Re-firing its hidden language <select> with the same language does NOT
 *    re-translate; it leaves the banner stuck at "Translation in progress
 *    (0%)". Don't do that.
 *  So the spans are created on `chp:page-hydrated` — synchronously, BEFORE
 *  GoogleTranslateLoader injects the Translate script (it waits 200ms after
 *  the same event) — and get translated in Translate's first pass.
 *  Labels that appear later can't be translated; their spans are marked
 *  lang="en" so screen readers at least switch to an English voice
 *  (WCAG 3.1.2 is met by identifying the language).
 *
 * - English visitors: renders nothing, does nothing.
 * - Skips translate="no" / .notranslate / lang="en" containers (charts,
 *   the language menu) and elements with their own aria-labelledby.
 */

import { useEffect } from 'react';

const CONTAINER_ID = 'chp-aria-i18n';
const SKIP_SELECTOR = '[translate="no"], .notranslate, :not(html)[lang="en"]';

function hasActiveTranslation() {
  const m = document.cookie.match(/(?:^|;\s*)googtrans=\/en\/([^;]+)/);
  return !!m && m[1] !== 'en';
}

export default function TranslatedAriaLabels() {
  useEffect(() => {
    if (!hasActiveTranslation()) return;

    let cleanup = null;
    let fallback = null;
    const start = () => {
      if (cleanup) return;
      clearTimeout(fallback);
      cleanup = run();
    };
    // Same signal GoogleTranslateLoader waits for (HydrationSignal at the end
    // of each page). Fallback mirrors its 6s-after-load fallback, minus a bit
    // so the spans still exist before Translate starts.
    const onLoad = () => { fallback = setTimeout(start, 5500); };
    if (window.__chpPageHydrated) start();
    else {
      window.addEventListener('chp:page-hydrated', start, { once: true });
      if (document.readyState === 'complete') onLoad();
      else window.addEventListener('load', onLoad, { once: true });
    }

    return () => {
      window.removeEventListener('chp:page-hydrated', start);
      window.removeEventListener('load', onLoad);
      clearTimeout(fallback);
      if (cleanup) cleanup();
    };
  }, []);

  return null;
}

function run() {
  const container = document.createElement('div');
  container.id = CONTAINER_ID;
  container.setAttribute('aria-hidden', 'true');
  container.style.cssText =
    'position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;';
  document.body.appendChild(container);

  const entries = new Map(); // element → { source, span }
  let counter = 0;
  // Once Translate's script is on the page its first pass has started;
  // spans created after that won't be translated → mark them English.
  const translateStarted = () => !!document.querySelector('script[data-chp-gt]');

  function release(el) {
    const entry = entries.get(el);
    if (!entry) return;
    entry.span.remove();
    if (el.getAttribute('aria-labelledby') === entry.span.id) el.removeAttribute('aria-labelledby');
    entries.delete(el);
  }

  function process(el) {
    if (container.contains(el)) return;
    const label = el.getAttribute('aria-label');
    const entry = entries.get(el);
    if (!label || !label.trim() || el.closest(SKIP_SELECTOR)) {
      if (entry) release(el);
      return;
    }
    if (entry && entry.source === label) return;
    if (!entry && el.hasAttribute('aria-labelledby')) return; // author's own wins

    const span = document.createElement('span');
    span.id = `chp-al-${++counter}`;
    span.textContent = label;
    if (translateStarted()) span.lang = 'en';
    container.appendChild(span);
    if (entry) entry.span.remove();
    el.setAttribute('aria-labelledby', span.id);
    entries.set(el, { source: label, span });
  }

  function scan(root) {
    if (root.nodeType !== 1) return;
    if (root.hasAttribute('aria-label')) process(root);
    root.querySelectorAll('[aria-label]').forEach(process);
  }

  // Synchronous: must finish before Translate's first pass.
  scan(document.body);

  let pending = false;
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (container.contains(m.target)) continue;
      if (m.type === 'attributes') process(m.target);
      else m.addedNodes.forEach(scan);
    }
    if (!pending) {
      pending = true;
      requestAnimationFrame(() => {
        pending = false;
        for (const el of entries.keys()) if (!el.isConnected) release(el);
      });
    }
  });
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['aria-label'],
  });

  return () => {
    observer.disconnect();
    for (const el of [...entries.keys()]) release(el);
    container.remove();
  };
}
