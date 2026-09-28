/**
 * Converts a neighborhood name to a URL-safe slug.
 * e.g. "Financial District (CD1)" → "financial-district-cd1"
 */
export function slugify(str) {
  return str
    .replace(/\s*\(CD\d+\)/i, '') // strip the "(CD#)" suffix
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')  // replace any run of non-alphanumeric chars with a single hyphen
    .replace(/^-|-$/g, '');        // strip leading/trailing hyphens
}
