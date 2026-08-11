/**
 * FILE: getIndicatorDescription.js
 *
 * SERVER-SIDE ONLY. Reads a markdown file from /content/indicators/.
 *
 * Usage:
 *   const md = getIndicatorDescription('obesity');
 *   // returns the raw markdown string from content/indicators/obesity.md
 *   // returns null if no file exists for that key (not all indicators need one)
 *
 * Non-developers / data experts: to add or edit an indicator's notes, open
 * the matching .md file in /content/indicators/ and edit it directly.
 * No code changes are needed.
 *
 * To add notes for a new indicator:
 *   1. Create /content/indicators/{indicator-key}.md
 *   2. Write plain text or markdown — it will appear in the "?" notes modal
 *      on the indicator chart card.
 *   That's it. No JS changes required.
 */

import fs from 'fs';
import path from 'path';

const INDICATORS_DIR = path.join(process.cwd(), 'content', 'indicators');

export function getIndicatorDescription(key) {
  if (!key) return null;

  const filePath = path.join(INDICATORS_DIR, `${key}.md`);

  try {
    return fs.readFileSync(filePath, 'utf8').trim();
  } catch {
    // No description file for this indicator — that's fine, not all indicators need one.
    return null;
  }
}
