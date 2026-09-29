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
 * The init callback (googleTranslateElementInit) is still defined inline in
 * app/layout.js, so it exists before this script calls it.
 */

import { useSyncExternalStore } from 'react';
import Script from 'next/script';

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

  if (!active) return null;

  return (
    <Script
      src="https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
      strategy="afterInteractive"
    />
  );
}
