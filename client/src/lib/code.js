// A board code is the whole identity of a clipboard, and people arrive holding
// it in several shapes: typed bare into the address bar, pasted as a full URL
// from another device, or read aloud and typed with a stray space. Everything
// that has to recognise a code goes through here.

// What `newCode()` in worker/index.js mints. The server still accepts 4-24 for
// hand-picked codes, so this is the generated length, not the only legal one.
export const CODE_LENGTH = 6;

const GENERATED = /^[A-Z0-9]{6}$/;

/** What the server accepts — must stay in step with SLUG in worker/index.js. */
export const ACCEPTED_CODE = /^[A-Z0-9]{4,24}$/;

/**
 * Strict: is this URL path segment a board code?
 *
 * Exact-length and alphanumeric-only, so asset requests that fall through to
 * the SPA — `favicon.ico`, `robots.txt`, `cork.webp` — cannot be mistaken for
 * codes and bounced to a board that does not exist.
 */
export function codeFromPath(segment) {
  if (typeof segment !== "string") return null;
  const code = segment.toUpperCase();
  return GENERATED.test(code) ? code : null;
}

/**
 * Lenient: pull a code out of whatever a human put in the code field.
 *
 * Two paths on purpose:
 *   - A URL or path (`https://host/c/ABC123`, `/c/ABC123`) — the host must be
 *     ours, since a code lifted from someone else's link means nothing here,
 *     and then the trailing six characters are the code.
 *   - Anything else is treated as the code itself, taken whole. Trailing-six
 *     would silently mangle a hand-picked code longer than six.
 */
export function extractCode(input) {
  if (typeof input !== "string") return null;
  const text = input.trim();
  if (!text) return null;

  const looksLikeUrl = /^[a-z][a-z0-9+.-]*:\/\//i.test(text) || text.startsWith("/");

  if (looksLikeUrl) {
    let url;
    try {
      // The base only applies to relative input and is never read back.
      url = new URL(text, window.location.origin);
    } catch {
      return null;
    }
    if (url.host !== window.location.host) return null;

    const code = url.pathname.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(-CODE_LENGTH);
    return GENERATED.test(code) ? code : null;
  }

  const code = text.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return ACCEPTED_CODE.test(code) ? code : null;
}
