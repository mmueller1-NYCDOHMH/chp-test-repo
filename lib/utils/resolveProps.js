/**
 * FILE: resolveProps.js
 *
 * PURPOSE:
 * Resolves an entire props object's string values through resolveTemplate.
 *
 * DESCRIPTION:
 * Walks each entry in the provided props object and runs resolveTemplate
 * on every value against the supplied context. Non-string values pass
 * through unchanged (handled by resolveTemplate itself).
 *
 * EXAMPLE:
 * Input:   { title: "Profile for {{neighborhood}}", count: 5 }
 * Context: { neighborhood: "Harlem" }
 * Output:  { title: "Profile for Harlem", count: 5 }
 *
 * RESPONSIBILITIES:
 * - Apply template substitution across an entire props object
 * - Return a new object (no mutation of the input)
 *
 * NOTES:
 * - Currently shallow — does not recurse into nested objects or arrays
 * - Used by Block to prepare config-driven props before render
 */

import { resolveTemplate } from './resolveTemplate';

export function resolveProps(props = {}, context = {}) {
  return Object.fromEntries(
    Object.entries(props).map(([key, value]) => [
      key,
      resolveTemplate(value, context)
    ])
  );
}
