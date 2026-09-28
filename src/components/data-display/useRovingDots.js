'use client';

/**
 * FILE: useRovingDots.js
 *
 * PURPOSE (A11Y, 2026-09-26 — WCAG 2.4.3 Focus Order / 2.1.1 Keyboard):
 * Roving-tabindex keyboard model for dot strips (DistributionStrip,
 * AvertableDeathsChart). Before this, every dot was tabIndex=0, so each
 * strip added ~59 Tab stops between the user and the next control.
 *
 * Now the whole strip is ONE Tab stop:
 *   Tab            → lands on the active dot (the selected neighborhood's
 *                    dot by default, else the lowest value)
 *   ← / ↓          → previous (lower) district
 *   → / ↑          → next (higher) district
 *   Home / End     → lowest / highest
 *   PageDown / Up  → jump 10 districts
 *   Escape         → onEscape() (callers hide their tooltip)
 *
 * Navigation order is by value (lowest → highest), which matches the visual
 * left → right position, independent of DOM/render order (callers render
 * highlighted dots last so they stack on top).
 *
 * USAGE:
 *   const roving = useRovingDots(rowsSortedAscending, { initialGeoId: geoId, onEscape: hideTooltip });
 *   <div {...roving.groupProps(label)}>
 *     {rows.map(r => <div {...roving.dotProps(r)} onFocus={...} />)}
 *   </div>
 *   roving.rankOf(row) → 1-based position in the ascending order
 */
import { useCallback, useMemo, useRef, useState } from 'react';

export function useRovingDots(orderedRows, { initialGeoId = null, onEscape } = {}) {
  const refs = useRef(new Map());
  const [activeId, setActiveId] = useState(null);

  const ids = useMemo(() => orderedRows.map((r) => r.GeoID), [orderedRows]);
  const indexById = useMemo(() => new Map(ids.map((id, i) => [id, i])), [ids]);

  // The one dot that is tabbable. Falls back to the selected neighborhood,
  // then the lowest value, if the remembered one isn't in the data anymore.
  const currentId = indexById.has(activeId)
    ? activeId
    : indexById.has(initialGeoId) ? initialGeoId : ids[0];

  const focusIndex = useCallback((i) => {
    const id = ids[Math.max(0, Math.min(ids.length - 1, i))];
    if (id == null) return;
    setActiveId(id);
    refs.current.get(id)?.focus();
  }, [ids]);

  const onKeyDown = useCallback((e, geoId) => {
    const i = indexById.get(geoId) ?? 0;
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowUp':    focusIndex(i + 1); break;
      case 'ArrowLeft':
      case 'ArrowDown':  focusIndex(i - 1); break;
      case 'Home':       focusIndex(0); break;
      case 'End':        focusIndex(ids.length - 1); break;
      case 'PageUp':     focusIndex(i + 10); break;
      case 'PageDown':   focusIndex(i - 10); break;
      case 'Escape':     onEscape?.(); return; // don't preventDefault — let dialogs close too
      default:           return;
    }
    e.preventDefault();
  }, [indexById, ids.length, focusIndex, onEscape]);

  const groupProps = (label) => ({
    role: 'group',
    'aria-label': `${label}. ${ids.length} community districts, from lowest to highest. Use arrow keys to move between districts.`,
  });

  const dotProps = (row) => ({
    ref: (el) => {
      if (el) refs.current.set(row.GeoID, el);
      else refs.current.delete(row.GeoID);
    },
    tabIndex: row.GeoID === currentId ? 0 : -1,
    onKeyDown: (e) => onKeyDown(e, row.GeoID),
    onClick: () => setActiveId(row.GeoID),
  });

  const rankOf = (row) => (indexById.get(row.GeoID) ?? 0) + 1;

  return { groupProps, dotProps, rankOf, total: ids.length, setActiveId };
}
