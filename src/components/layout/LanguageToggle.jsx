'use client';

/**
 * FILE: LanguageToggle.jsx
 *
 * PURPOSE:
 * Language selector powered by Google Translate Website Translator.
 *
 * DESCRIPTION:
 * Renders a custom dropdown with the supported languages. On selection
 * it sets the `googtrans` cookie and reloads the page so Google Translate
 * applies the translation. A hidden #google_translate_element div satisfies
 * the Translate script's requirement for a mount point.
 *
 * SUPPORTED LANGUAGES:
 *   English · Español · 中文 · Русский · Italiano · Kreyòl Ayisyen · বাংলা ·
 *   ייִדיש · 한국어 · العربية · Français · Polski · اردو · Português
 *
 * ADDING LANGUAGES:
 * Add an entry to the LANGUAGES array below AND add its code to
 * `includedLanguages` in app/layout.js (GT only loads listed languages).
 * If the script is right-to-left, add the code to RTL_CODES too.
 * The `code` must be a valid
 * BCP-47 tag that Google Translate recognises (e.g. 'fr', 'ht', 'ko').
 *
 * NOTES:
 * - The Google Translate script is loaded in layout.js via next/script.
 * - RTL languages (Arabic, Urdu, Yiddish) set dir="rtl" on the label span
 *   only, so the text shapes correctly but stays left-aligned with the rest
 *   of the list (dir on the whole row flipped the flex layout).
 * - `notranslate` class on inner labels prevents double-translation of the UI.
 * - Renders once, in PageHeader, on the dark brand-colored background —
 *   use the `variant` prop below for the trigger's text color. PageHeader
 *   is unconditional (no `sections`-based early return like StickyContextBar
 *   has), so this is reachable from every page, including /about.
 *
 * VARIANT:
 *   'onBrand' (default) — white/blue-100 text, for the dark brand header.
 *   'onLight'            — gray/blue text, for use on a white background,
 *                           kept in case this ever needs to render somewhere
 *                           other than PageHeader again.
 */

import { useState, useEffect, useRef, useId } from 'react';

const LANGUAGES = [
  { code: 'en',    label: 'English',        native: 'English'          },
  { code: 'es',    label: 'Spanish',        native: 'Español'          },
  { code: 'zh-CN', label: 'Chinese',        native: '中文'              },
  { code: 'ru',    label: 'Russian',        native: 'Русский'          },
  { code: 'it',    label: 'Italian',        native: 'Italiano'         },
  { code: 'ht',    label: 'Haitian Creole', native: 'Kreyòl Ayisyen'   },
  { code: 'bn',    label: 'Bengali',        native: 'বাংলা'            },
  { code: 'yi',    label: 'Yiddish',        native: 'ייִדיש'           },
  { code: 'ko',    label: 'Korean',         native: '한국어'            },
  { code: 'ar',    label: 'Arabic',         native: 'العربية'          },
  { code: 'fr',    label: 'French',         native: 'Français'         },
  { code: 'pl',    label: 'Polish',         native: 'Polski'           },
  { code: 'ur',    label: 'Urdu',           native: 'اردو'             },
  { code: 'pt',    label: 'Portuguese',     native: 'Português'        },
];

/** Right-to-left scripts — option rows render with dir="rtl". */
const RTL_CODES = new Set(['ar', 'ur', 'yi']);

/** Read the current language from the googtrans cookie, e.g. "/en/es" → "es" */
function getCurrentLang() {
  if (typeof document === 'undefined') return 'en';
  const match = document.cookie.match(/(?:^|;\s*)googtrans=\/en\/([^;]+)/);
  return match ? match[1] : 'en';
}

/** Write the googtrans cookie for both / and the current path (GT requires both) */
function setGoogTransCookie(langCode) {
  const value = langCode === 'en' ? '' : `/en/${langCode}`;
  // Expire old cookie
  document.cookie = 'googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  document.cookie = `googtrans=; domain=${window.location.hostname}; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  if (value) {
    document.cookie = `googtrans=${value}; path=/`;
    document.cookie = `googtrans=${value}; domain=${window.location.hostname}; path=/`;
  }
}

export default function LanguageToggle({ variant = 'onBrand' }) {
  const [open, setOpen]         = useState(false);
  const [current, setCurrent]   = useState('en');
  const containerRef            = useRef(null);
  const toggleRef               = useRef(null);
  const listRef                 = useRef(null);
  const listId                  = useId();
  const isOnBrand                = variant === 'onBrand';

  // Read cookie on mount so the toggle reflects any active translation
  useEffect(() => {
    setCurrent(getCurrentLang());
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // A11Y (2026-09-26): disclosure-menu keyboard support. On open, focus
  // moves to the current language; ↑/↓ (and Home/End) move between
  // options; Escape closes and returns focus to the toggle; Tab closes.
  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => {
      const btns = listRef.current?.querySelectorAll('button');
      const idx  = LANGUAGES.findIndex(l => l.code === current);
      btns?.[Math.max(0, idx)]?.focus();
    });
    return () => cancelAnimationFrame(raf);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleListKeyDown(e) {
    const btns = Array.from(listRef.current?.querySelectorAll('button') ?? []);
    const i = btns.indexOf(document.activeElement);
    let next = null;
    if (e.key === 'ArrowDown') next = (i + 1) % btns.length;
    else if (e.key === 'ArrowUp') next = (i - 1 + btns.length) % btns.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = btns.length - 1;
    else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      toggleRef.current?.focus();
      return;
    } else if (e.key === 'Tab') {
      setOpen(false);
      return;
    }
    if (next != null) { e.preventDefault(); btns[next]?.focus(); }
  }

  function selectLanguage(code) {
    setOpen(false);
    if (code === current) return;
    setGoogTransCookie(code);
    window.location.reload();
  }

  const currentLang = LANGUAGES.find(l => l.code === current) ?? LANGUAGES[0];

  return (
    <>
      {/* Hidden GT mount point — required by the Translate script */}
      <div id="google_translate_element" className="hidden" aria-hidden="true" />

      <div ref={containerRef} className="relative notranslate" lang="en">
        <button
          ref={toggleRef}
          onClick={() => setOpen(v => !v)}
          aria-expanded={open}
          aria-controls={listId}
          aria-label={`Language: ${currentLang.label}. Change language.`}
          className={`flex items-center gap-1.5 px-2 py-1 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 rounded ${
            isOnBrand
              ? 'text-blue-100 hover:text-white focus-visible:ring-white/70'
              : 'text-gray-600 hover:text-brand focus-visible:ring-blue-500'
          }`}
        >
          {/* Globe icon */}
          <svg
            className="w-3.5 h-3.5 shrink-0"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z" />
          </svg>
          <span className="hidden sm:inline">{currentLang.native}</span>
          {/* Chevron */}
          <svg
            className={`w-3 h-3 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          // A11Y (2026-09-26): was role="listbox" with <li role="option">
          // wrapping a <button> — interactive controls nested inside
          // options is invalid ARIA and read inconsistently. Now a plain
          // disclosure list of buttons; the current language is marked
          // with aria-current.
          <ul
            id={listId}
            ref={listRef}
            onKeyDown={handleListKeyDown}
            aria-label="Select language"
            className="absolute right-0 mt-1 w-48 max-h-[min(70vh,28rem)] overflow-y-auto overscroll-contain bg-white rounded-lg shadow-lg ring-1 ring-black/10 z-50 py-1 text-gray-700"
          >
            {LANGUAGES.map(lang => {
              const isSelected = lang.code === current;
              return (
                <li key={lang.code}>
                  <button
                    type="button"
                    aria-current={isSelected ? 'true' : undefined}
                    onClick={() => selectLanguage(lang.code)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500
                      ${isSelected
                        ? 'bg-brand-tint text-brand font-medium'
                        : 'text-gray-700 hover:bg-brand-tint hover:text-brand'
                      }`}
                  >
                    {/* A11Y (2026-09-26, WCAG 3.1.2): lang so screen readers
                        pronounce each native name in its own language — the
                        container is lang="en", so "Español", "中文" etc. were
                        read with the English voice. */}
                    <span lang={lang.code} dir={RTL_CODES.has(lang.code) ? 'rtl' : 'ltr'}>{lang.native}</span>
                    {isSelected && (
                      <svg className="w-4 h-4 shrink-0 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
