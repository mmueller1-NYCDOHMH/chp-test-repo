/**
 * FILE: resolveTemplate.js
 *
 * PURPOSE:
 * Utility function for injecting dynamic values into template strings.
 *
 * DESCRIPTION:
 * Replaces placeholders in the format {{key}} with values from a context object.
 *
 * EXAMPLE:
 * Input:  "Data for {{neighborhood}}"
 * Context: { neighborhood: "Harlem" }
 * Output: "Data for Harlem"
 *
 * RESPONSIBILITIES:
 * - Parse template variables using regex
 * - Safely replace values using provided context
 * - Fallback to empty string if value is missing
 *
 * NOTES:
 * - Currently supports flat keys only (no nested paths)
 * - Can be extended for more advanced templating if needed
 */

export function resolveTemplate(str, context = {}) {
    if (typeof str !== 'string') return str;
  
    return str.replace(/{{(.*?)}}/g, (_, key) => {
      return context[key.trim()] ?? '';
    });
  }