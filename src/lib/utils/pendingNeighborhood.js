'use client';

/**
 * FILE: pendingNeighborhood.js
 *
 * PURPOSE:
 * Optimistic "which neighborhood is selected" state.
 *
 * WHY:
 * The map highlight/fly-to and the sidebar neighborhood pill both read the
 * selected id from useParams(). That value only changes once the router has
 * finished fetching the new route from the server, so after a click the map
 * and the pill sat on the OLD neighborhood until the navigation committed —
 * a visible lag (2026-10-02).
 *
 * HOW:
 * Whoever starts a neighborhood navigation calls setPendingNeighborhood(id)
 * right before router.push(). useActiveNeighborhoodId() returns that pending
 * id immediately, then falls back to the route param once the URL catches up.
 *
 * NOTES:
 * - Module-level store (useSyncExternalStore) rather than React context, so it
 *   needs no provider and survives any remount during the route change.
 * - Pending clears when the route param matches it, or after PENDING_TIMEOUT_MS
 *   as a safety net if the navigation never lands (error, user went Back).
 */

import { useEffect, useSyncExternalStore } from 'react';
import { useParams } from 'next/navigation';

const PENDING_TIMEOUT_MS = 8000;

let pendingId = null;
let timeoutId = null;
const listeners = new Set();

function emit() {
  listeners.forEach(fn => fn());
}

function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function getSnapshot() {
  return pendingId;
}

function getServerSnapshot() {
  return null;
}

export function setPendingNeighborhood(id) {
  const next = id == null ? null : String(id);
  clearTimeout(timeoutId);
  if (next) {
    timeoutId = setTimeout(() => setPendingNeighborhood(null), PENDING_TIMEOUT_MS);
  }
  if (next === pendingId) return;
  pendingId = next;
  emit();
}

/** Selected neighborhood id: the one being navigated to, else the route's. */
export function useActiveNeighborhoodId() {
  const params  = useParams();
  const routeId = params?.id ? String(params.id) : null;
  const pending = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Route caught up with the optimistic value — hand control back to the URL.
  useEffect(() => {
    if (pending && pending === routeId) setPendingNeighborhood(null);
  }, [pending, routeId]);

  return pending ?? routeId;
}
