/**
 * FILE: getCategoryCardContent.js
 *
 * SERVER-SIDE ONLY. Reads a markdown file from /content/category-cards/.
 *
 * Usage:
 *   getCategoryCardContent('chronic-conditions/why-it-matters')
 *   // returns the raw markdown string from
 *   //   content/category-cards/chronic-conditions/why-it-matters.md
 *
 * Non-developers: to edit a card's text, open the matching .md file in
 * /content/category-cards/ and edit it directly. No code changes needed.
 * To add a new card, create a new .md file and add an entry to the section's
 * config in /src/config/sections/.
 */

import fs from 'fs';
import path from 'path';

const CARDS_DIR = path.join(process.cwd(), 'content', 'category-cards');

export function getCategoryCardContent(key) {
  if (!key) return null;

  const filePath = path.join(CARDS_DIR, `${key}.md`);

  try {
    return fs.readFileSync(filePath, 'utf8').trim();
  } catch {
    console.warn(
      `[getCategoryCardContent] No file found for key: "${key}" (expected ${filePath})`
    );
    return null;
  }
}
