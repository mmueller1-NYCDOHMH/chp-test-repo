/**
 * FILE: indicatorCopy.js
 *
 * Static import of content/copy/indicatorCopy.json — generated from the copy
 * deck CSV (content/copy/measure-copy.csv) by `npm run copy`. Client-safe.
 *
 * This is the indicator ROSTER: every keyed row in the copy deck. It replaces
 * the retired src/config/indicatorMeta.json (2026-09-26).
 *
 * Never hand-edit indicatorCopy.json — edit the CSV and re-run `npm run copy`
 * (it also runs automatically before `npm run dev` / `npm run build`).
 */

import copyData from '../../content/copy/indicatorCopy.json';

const { _unmapped, ...keyed } = copyData;

/** { [key]: { key, topic, flag, section, subsection, measure, context, comparison, type, of, detail, units, indicatorDetail } } */
export const indicatorCopy = keyed;

export const indicatorKeys = Object.keys(keyed);

/** Keyless copy-deck rows (planned / design-in-progress); searchIndex.js lists the live ones. */
export const indicatorCopyUnmapped = _unmapped ?? [];
