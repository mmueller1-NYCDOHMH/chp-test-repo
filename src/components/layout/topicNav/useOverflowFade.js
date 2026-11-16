import { useEffect, useState } from 'react';

/**
 * FILE: useOverflowFade.js
 *
 * QA row 86 (2026-10-12): below ~1220px the desktop category nav overflows
 * horizontally, but its scrollbar is hidden (scrollbar-none) and nothing
 * showed there were more categories — the clipped row read as the complete
 * set. This tracks whether a horizontal scroller has more content to the
 * left/right so TopicNav can show an edge fade + arrow on that side.
 *
 * Returns { attach, canLeft, canRight, scrollBy(dir) } — pass `attach` as the `ref` to the
 * scrolling element. `attach` is a callback ref, so it also works when the
 * element mounts after the first render (TopicNav renders it conditionally).
 */
export function useOverflowFade() {
  // Callback ref → state only (2026-11-16). There used to be a mirrored
  // useRef read inside scrollBy(); the React Compiler flags ref reads
  // reachable from render ("Cannot access refs during render") and skipped
  // optimizing all of TopicNav because of it. The state setter is stable,
  // so it works as a callback ref directly.
  const [el, setEl] = useState(null);
  const attach = setEl;
  const [canLeft,  setCanLeft]  = useState(false);
  const [canRight, setCanRight] = useState(false);

  useEffect(() => {
    if (!el) return;
    let raf = null;
    function measure() {
      raf = null;
      const max = el.scrollWidth - el.clientWidth;
      setCanLeft(el.scrollLeft > 2);
      setCanRight(max - el.scrollLeft > 2);
    }
    const schedule = () => { if (raf == null) raf = requestAnimationFrame(measure); };
    measure();
    el.addEventListener('scroll', schedule, { passive: true });
    const ro = new ResizeObserver(schedule);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', schedule);
      ro.disconnect();
      if (raf != null) cancelAnimationFrame(raf);
    };
  }, [el]);

  function scrollBy(dir) {
    const node = el;
    if (!node) return;
    node.scrollBy({ left: dir * Math.max(160, node.clientWidth * 0.6), behavior: 'smooth' });
  }

  return { attach, canLeft, canRight, scrollBy };
}
