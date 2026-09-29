/**
 * FILE: shortcutsPreference.js
 *
 * PURPOSE:
 * Single source of truth for the user's "keyboard shortcuts on/off" choice.
 * Required by WCAG 2.1.4 Character Key Shortcuts (Level A, carried into 2.2):
 * every single-character shortcut (/ f m e i ?) must be able to be turned off,
 * because speech-input users and people who hit keys by accident can trigger
 * them unintentionally.
 *
 * USAGE:
 * - Every global single-character keydown handler must bail early with
 *     if (!areShortcutsEnabled()) return;
 *   Checked at keypress time, so handlers don't need to re-subscribe.
 * - UI that shows the current state (the toggle in KeyboardShortcutsButton)
 *   uses the useShortcutsEnabled() hook, which re-renders on change.
 * - Esc is NOT a character key and is not covered — never gate it on this.
 *
 * STORAGE:
 * Persisted per browser in localStorage ('chp_shortcuts_enabled' = '0' | '1').
 * Default is ON. If storage is blocked, falls back to an in-memory value for
 * the session so the toggle still works.
 */

import { useSyncExternalStore } from 'react';

const STORAGE_KEY  = 'chp_shortcuts_enabled';
const CHANGE_EVENT = 'chp:shortcuts-change';

let memoryValue = true; // fallback when localStorage is unavailable

export function areShortcutsEnabled() {
  if (typeof window === 'undefined') return true;
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === null ? memoryValue : v !== '0';
  } catch {
    return memoryValue;
  }
}

export function setShortcutsEnabled(enabled) {
  memoryValue = !!enabled;
  try { localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0'); } catch { /* ignore */ }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(callback) {
  window.addEventListener(CHANGE_EVENT, callback);
  // Keep multiple open tabs in sync
  function onStorage(e) { if (e.key === STORAGE_KEY) callback(); }
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener('storage', onStorage);
  };
}

/** React hook — current on/off state, re-renders when it changes. */
export function useShortcutsEnabled() {
  return useSyncExternalStore(subscribe, areShortcutsEnabled, () => true);
}
