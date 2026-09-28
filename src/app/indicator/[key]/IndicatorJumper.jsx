'use client';

/**
 * FILE: IndicatorJumper.jsx
 *
 * PURPOSE:
 * Lets a reader switch which indicator the standalone page (/indicator/[key])
 * is showing, without leaving the page — the piece that turns this route
 * from "one chart's landing page" into a general-purpose template for
 * browsing any indicator (2026-09-09, per Morgan). Preserves the current
 * `?geo=` neighborhood, if any, across the switch.
 *
 * Grouped by topic (optgroup) using the same section labels the neighborhood
 * profile's sidebar uses (content/sectionTitles.json via page.js's
 * buildIndicatorOptions()), so the ~90-entry list is actually scannable
 * instead of one long flat alphabetical dump.
 *
 * PROPS:
 *   groups      — [{ topicId, label, indicators: [{ key, title }] }], built
 *                 server-side in page.js from getAllIndicatorMeta()
 *   currentKey  — the indicator key currently shown
 *   geoId       — current neighborhood `id` slug, or '' for citywide
 */

import { useRouter } from 'next/navigation';

export default function IndicatorJumper({ groups = [], currentKey, geoId = '' }) {
  const router = useRouter();

  function handleChange(e) {
    const key = e.target.value;
    if (!key) return;
    const url = geoId ? `/indicator/${key}?geo=${geoId}` : `/indicator/${key}`;
    router.push(url);
  }

  return (
    <div className="flex flex-col gap-1 min-w-0 flex-1">
      <label htmlFor="indicator-jumper" className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
        Indicator
      </label>
      <select
        id="indicator-jumper"
        value={currentKey}
        onChange={handleChange}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        {groups.map(group => (
          <optgroup key={group.topicId} label={group.label}>
            {group.indicators.map(ind => (
              <option key={ind.key} value={ind.key}>{ind.title}</option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}
