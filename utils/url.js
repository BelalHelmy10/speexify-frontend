// web/src/utils/url.js
// ─────────────────────────────────────────────────────────────────────────────
// URL utilities: normalize external links (meeting URLs, etc.)
// Ensures links are safe and absolute so <a href> works correctly.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalize a meeting/external URL:
 * - Adds https:// if no scheme is present
 * - Expands protocol-relative //example.com → https://example.com
 * - Rejects javascript:/data:/vbscript: schemes
 */
export const getSafeExternalUrl = (u) => {
  if (!u || typeof u !== "string") return "";
  const trimmed = u.trim();

  // block dangerous schemes
  const bad = /^(javascript|data|vbscript):/i;
  if (bad.test(trimmed)) return "";

  // already absolute (http:// or https://)
  const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed);
  if (hasScheme) return trimmed;

  // protocol-relative (//zoom.us/j/…)
  if (trimmed.startsWith("//")) return `https:${trimmed}`;

  // default: prepend https://
  return `https://${trimmed.replace(/^\/+/, "")}`;
};
