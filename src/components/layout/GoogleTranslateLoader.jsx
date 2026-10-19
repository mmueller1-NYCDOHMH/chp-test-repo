'use client';

/**
 * FILE: GoogleTranslateLoader.jsx
 *
 * PURPOSE:
 * Loads the Google Translate script only when a translation is active.
 *
 * WHY (PERF, 2026-09-29):
 * LanguageToggle.jsx works by setting the `googtrans` cookie ("/en/es") and
 * reloading; Google Translate then translates the page on load. Choosing
 * English clears the cookie. So the script only does anything when that
 * cookie holds a non-English language — but it used to load on every page
 * for every visitor (several extra requests, scripts, styles and an iframe).
 * Now English-language visitors never download it.
 *
 * The init callback (googleTranslateElementInit) is defined on window below,
 * at module load — before this component renders the script tag, so it
 * always exists when element.js calls it. (It used to be an inline
 * <Script beforeInteractive> in app/layout.js, which React 19 / Next 16
 * flags in dev: "Encountered a script tag while rendering React component".)
 */

import { useEffect, useSyncExternalStore } from 'react';

if (typeof window !== 'undefined') {
  window.googleTranslateElementInit = function googleTranslateElementInit() {
    new window.google.translate.TranslateElement({
      pageLanguage: 'en',
      includedLanguages: 'es,zh-CN,ru,it,ht,bn,yi,ko,ar,fr,pl,ur,pt',
      autoDisplay: false,
    }, 'google_translate_element');
  };
}

function hasActiveTranslation() {
  const m = document.cookie.match(/(?:^|;\s*)googtrans=\/en\/([^;]+)/);
  return !!m && m[1] !== 'en';
}

// The cookie only changes via LanguageToggle, which reloads the page — so
// there's nothing to subscribe to. Server snapshot is false (no script in
// the static HTML); the client reads the cookie on hydration.
const subscribe = () => () => {};

export default function GoogleTranslateLoader() {
  const active = useSyncExternalStore(subscribe, hasActiveTranslation, () => false);

  // 2026-10-13: injected by hand, only after the PAGE has hydrated
  // (HydrationSignal at the end of each page fires `chp:page-hydrated`):
  //  - afterInteractive / window `load` were too early: page segments hydrate
  //    after the root layout, Translate rewrote their text (<font> tags,
  //    "Low" → "Bajo") → hydration mismatch.
  //  - lazyOnload waits for browser idle — 30–80s in testing.
  // Fallback: 6s after `load` on pages without a HydrationSignal.
  useEffect(() => {
    if (!active) return;
    let timer = null;
    let fallback = null;
    const inject = () => {
      clearTimeout(fallback);
      if (document.querySelector('script[data-chp-gt]')) return;
      timer = setTimeout(() => {
        const s = document.createElement('script');
        s.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
        s.async = true;
        s.dataset.chpGt = '1';
        document.body.appendChild(s);
      }, 200);
    };
    const onLoad = () => { fallback = setTimeout(inject, 6000); };
    if (window.__chpPageHydrated) inject();
    else {
      window.addEventListener('chp:page-hydrated', inject, { once: true });
      if (document.readyState === 'complete') onLoad();
      else window.addEventListener('load', onLoad, { once: true });
    }
    return () => {
      window.removeEventListener('chp:page-hydrated', inject);
      window.removeEventListener('load', onLoad);
      clearTimeout(timer);
      clearTimeout(fallback);
    };
  }, [active]);

  return null;
}
