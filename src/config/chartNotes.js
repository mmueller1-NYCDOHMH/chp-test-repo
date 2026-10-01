/**
 * FILE: chartNotes.js
 *
 * Static import of content/site/chartNotes.json (2026-09-30). Client-safe.
 *
 *   getChartNote(key) — per-indicator note shown in the (?) NotesModal, or null
 *   generalNotes      — site-wide caveats: { unreliable, suppressed }
 *
 * Edit the JSON, not this file.
 */

import chartNotesData from '../../content/site/chartNotes.json';

export const generalNotes = chartNotesData.general ?? {};

export function getChartNote(key) {
  if (!key) return null;
  return chartNotesData.indicators?.[key] ?? null;
}
