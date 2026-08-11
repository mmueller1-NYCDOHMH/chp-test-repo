/**
 * FILE: getFlyoutContent.js
 *
 * SERVER-SIDE ONLY. Reads a markdown file from /content/flyouts/.
 *
 * Usage:
 *   const md = getFlyoutContent('demographics');
 *   // returns the raw markdown string from content/flyouts/demographics.md
 *
 * Non-developers: to add or edit flyout content, open the matching .md file
 * in /content/flyouts/ and edit it using standard markdown.
 * No code changes are needed.
 */

import fs from 'fs';
import path from 'path';

const FLYOUTS_DIR = path.join(process.cwd(), 'content', 'flyouts');

export function getFlyoutContent(key) {
  if (!key) return null;

  const filePath = path.join(FLYOUTS_DIR, `${key}.md`);

  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    console.warn(`[getFlyoutContent] No content file found for key: "${key}" (expected ${filePath})`);
    return null;
  }
}
