import { ClipboardDO } from "./clipboard-do.js";
import { json } from "./http.js";

// The Durable Object class has to be a named export of the Worker's entrypoint.
export { ClipboardDO };

// No I/L/O/0/1 — these get read aloud and typed in by hand.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;

// Accepts hand-picked codes as well as generated ones; the upper bound keeps a
// hostile path from minting objects with absurd names.
const SLUG = /^[A-Z0-9]{4,24}$/;
const CLIPBOARD_PATH = /^\/api\/c\/([^/]+)(?:\/.*)?$/;

function newCode() {
  // Rejection sampling: 256 is not a multiple of 31, so plain modulo would bias
  // the first few letters of every code.
  const ceiling = Math.floor(256 / ALPHABET.length) * ALPHABET.length;
  const out = [];
  while (out.length < CODE_LENGTH) {
    for (const byte of crypto.getRandomValues(new Uint8Array(CODE_LENGTH))) {
      if (byte < ceiling && out.length < CODE_LENGTH) out.push(ALPHABET[byte % ALPHABET.length]);
    }
  }
  return out.join("");
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    // run_worker_first routes /api/* here; everything else is the SPA.
    if (!pathname.startsWith("/api/")) return env.ASSETS.fetch(request);

    if (pathname === "/api/clipboard") {
      if (request.method !== "POST") return json({ error: "method not allowed" }, { status: 405 });
      // Codes are minted, not reserved — a clipboard exists once something is put
      // on it, so there is no empty-object to create here.
      return json({ slug: newCode() }, { status: 201 });
    }

    const match = CLIPBOARD_PATH.exec(pathname);
    if (!match) return json({ error: "no such endpoint" }, { status: 404 });

    let slug;
    try {
      slug = decodeURIComponent(match[1]);
    } catch {
      return json({ error: "invalid clipboard code" }, { status: 400 });
    }
    // Validate before touching the binding, so a bad code can never allocate a
    // Durable Object.
    if (!SLUG.test(slug)) return json({ error: "invalid clipboard code" }, { status: 400 });

    const stub = env.CLIPBOARD.get(env.CLIPBOARD.idFromName(slug));
    // Forwarded untouched — reconstructing it would break the WebSocket upgrade.
    return stub.fetch(request);
  },
};
