'use client';

/**
 * FILE: lastNeighborhood.js
 *
 * PURPOSE:
 * Remembers which neighborhood profile the visitor last viewed, so pages
 * outside /neighborhood/[id] (e.g. /about) and the site header can link
 * back to it by name instead of to the default neighborhood.
 *
 * WHY (2026-10-07):
 * Feedback that returning from "About this tool" wasn't intuitive. `/`
 * always redirects to DEFAULT_NEIGHBORHOOD_ID, so a "back" link pointing at
 * `/` only looked right when the visitor happened to come from the default.
 *
 * STORAGE:
 * sessionStorage ('chp_last_neighborhood' = JSON { id, name }) — "back"
 * only makes sense within the current visit. Client-only on purpose: the
 * production host is static, so no cookies / server reads. If storage is
 * blocked, falls back to an in-memory value for the session.
 *
 * USAGE:
 * - <RememberNeighborhood id name /> on the profile page writes it.
 * - useLastNeighborhood() returns { id, name } | null (null on the server
 *   and until a profile has been viewed).
 */

import { useSyncExternalStore } from 'react';

const STORAGE_KEY  = 'chp_last_neighborhood';
const CHANGE_EVENT = 'chp:last-neighborhood-change';

let memoryRaw   = null; // fallback when sessionStorage is unavailable
let cachedRaw   = null; // getSnapshot must return a stable reference
let cachedValue = null;

function readRaw() {
  try {
    return sessionStorage.getItem(STORAGE_KEY) ?? memoryRaw;
  } catch {
    return memoryRaw;
  }
}

function getSnapshot() {
  const raw = readRaw();
  if (raw === cachedRaw) return cachedValue;
  cachedRaw = raw;
  try {
    const parsed = raw ? JSON.parse(raw) : null;
    cachedValue = parsed?.id && parsed?.name ? parsed : null;
  } catch {
    cachedValue = null;
  }
  return cachedValue;
}

function getServerSnapshot() {
  return null;
}

function subscribe(callback) {
  window.addEventListener(CHANGE_EVENT, callback);
  return () => window.removeEventListener(CHANGE_EVENT, callback);
}

export function rememberNeighborhood({ id, name }) {
  if (!id || !name) return;
  const raw = JSON.stringify({ id: String(id), name: String(name) });
  if (raw === readRaw()) return;
  memoryRaw = raw;
  try { sessionStorage.setItem(STORAGE_KEY, raw); } catch { /* ignore */ }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** React hook — last-viewed neighborhood { id, name }, or null. */
export function useLastNeighborhood() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
