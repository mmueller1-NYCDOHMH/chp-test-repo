/**
 * FILE: /app/neighborhood/[id]/layout.js
 *
 * Intentionally a pass-through (2026-10-02). PageLayout moved up to
 * /app/neighborhood/layout.js so the shell (sidebar, map, header) stays
 * mounted when the neighborhood changes — see the note there. This file can
 * be deleted; it's kept only as a pointer.
 */

export default function NeighborhoodIdLayout({ children }) {
  return children;
}
