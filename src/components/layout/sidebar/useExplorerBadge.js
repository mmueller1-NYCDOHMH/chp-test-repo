import { useState, useEffect, useRef } from 'react';

const EXPLORER_KEY = 'chp_visited_cds';
const TROPHY_KEY   = 'chp_trophy_earned';

/**
 * FILE: useExplorerBadge.js
 *
 * "Neighborhoods explored" gamification badge shown at the bottom of the
 * sidebar. Tracks visited community districts in localStorage, awards a
 * permanent trophy at 59/59, and flashes an achievement banner when
 * NeighborhoodMap dispatches chp:all-explored. Part of the 2026-09-04
 * split of Sidebar.jsx.
 *
 * Listens for chp:explorer-reset (dispatched by IntroModal's "Reset visited
 * neighborhoods" button) to clear progress and the trophy. The neighborhood
 * currently being viewed stays counted, so the badge restarts at 1.
 */
export function useExplorerBadge(activeId) {
  const [exploredCount,   setExploredCount]   = useState(0);
  const [trophyEarned,    setTrophyEarned]    = useState(false);
  const [showAchievement, setShowAchievement] = useState(false);
  const achievementTimer = useRef(null);

  // Record each visited neighborhood and update count
  useEffect(() => {
    if (!activeId) return;
    try {
      const stored          = JSON.parse(localStorage.getItem(EXPLORER_KEY) || '[]');
      const set             = new Set(stored);
      const wasAlreadyFull  = set.size >= 59;
      set.add(activeId);
      localStorage.setItem(EXPLORER_KEY, JSON.stringify([...set]));
      setExploredCount(set.size);
      // First time all 59 are visited — earn the trophy permanently
      if (set.size >= 59 && !wasAlreadyFull) {
        localStorage.setItem(TROPHY_KEY, '1');
        setTrophyEarned(true);
      }
    } catch { /* localStorage unavailable */ }
  }, [activeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initialise count + trophy from storage on mount.
  // Also backfills TROPHY_KEY for users who hit 59 before this code was added.
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(EXPLORER_KEY) || '[]');
      setExploredCount(stored.length);
      if (stored.length >= 59 || localStorage.getItem(TROPHY_KEY) === '1') {
        if (stored.length >= 59) localStorage.setItem(TROPHY_KEY, '1');
        setTrophyEarned(true);
      }
    } catch { /* ignore */ }
  }, []);

  // Reset progress on request from the IntroModal's all-visited screen
  const activeIdRef = useRef(activeId);
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);
  useEffect(() => {
    function onReset() {
      const remaining = activeIdRef.current ? [activeIdRef.current] : [];
      try {
        localStorage.setItem(EXPLORER_KEY, JSON.stringify(remaining));
        localStorage.removeItem(TROPHY_KEY);
      } catch { /* localStorage unavailable */ }
      setExploredCount(remaining.length);
      setTrophyEarned(false);
      setShowAchievement(false);
    }
    window.addEventListener('chp:explorer-reset', onReset);
    return () => window.removeEventListener('chp:explorer-reset', onReset);
  }, []);

  // Listen for the all-59 flash achievement from NeighborhoodMap
  useEffect(() => {
    function onAllExplored() {
      setShowAchievement(true);
      clearTimeout(achievementTimer.current);
      achievementTimer.current = setTimeout(() => setShowAchievement(false), 3000);
    }
    window.addEventListener('chp:all-explored', onAllExplored);
    return () => {
      window.removeEventListener('chp:all-explored', onAllExplored);
      clearTimeout(achievementTimer.current);
    };
  }, []);

  function handleExplorerBadgeClick() {
    try {
      const visited = JSON.parse(localStorage.getItem(EXPLORER_KEY) || '[]');
      window.dispatchEvent(new CustomEvent('chp:open-intro-modal', {
        detail: { visitedIds: visited },
      }));
    } catch {
      window.dispatchEvent(new CustomEvent('chp:open-intro-modal'));
    }
  }

  return { exploredCount, trophyEarned, showAchievement, handleExplorerBadgeClick };
}
