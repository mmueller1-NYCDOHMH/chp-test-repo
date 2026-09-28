import { useState, useEffect } from 'react';

/**
 * FILE: useOverflowClamp.js
 *
 * True once `ref`'s content actually overflows its box (used to decide
 * whether to show a fade/"Read more" affordance on a line-clamped
 * paragraph). Re-measures — after the DOM has painted — whenever a value in
 * `deps` changes, and optionally on window resize (part of the 2026-09-04
 * split of ExpandableChartCard.jsx: unifies the on-card subtitle fade check
 * and the notes-modal "Read more" check, which previously each had their
 * own near-identical effect).
 *
 * @param {object} ref - a React ref to the clamped element
 * @param {object} [options]
 * @param {Array}  [options.deps=[]] - re-measure when any of these change
 * @param {boolean} [options.watchResize=false] - also re-measure on window resize
 */
export function useOverflowClamp(ref, { deps = [], watchResize = false } = {}) {
  const [isClamped, setIsClamped] = useState(false);
  useEffect(() => {
    function measure() {
      const el = ref.current;
      if (el) setIsClamped(el.scrollHeight > el.clientHeight + 1);
    }
    const raf = requestAnimationFrame(measure);
    if (watchResize) window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(raf);
      if (watchResize) window.removeEventListener('resize', measure);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return isClamped;
}
