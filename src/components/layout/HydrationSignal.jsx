'use client';

/**
 * FILE: HydrationSignal.jsx
 *
 * Tells GoogleTranslateLoader that this page's content has finished
 * hydrating, so Google Translate can safely start rewriting its text.
 * Page segments hydrate separately (and later) than the root layout, so
 * loading Translate on window `load` let it change text React hadn't
 * hydrated yet → "Hydration failed … Low / Bajo" (2026-10-13).
 *
 * Render it LAST inside a page's content (not in loading.jsx). Its effect
 * runs once everything before it in that segment has hydrated.
 */
import { useEffect } from 'react';

export default function HydrationSignal() {
  useEffect(() => {
    window.__chpPageHydrated = true;
    window.dispatchEvent(new Event('chp:page-hydrated'));
  }, []);
  return null;
}
