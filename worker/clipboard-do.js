import { DurableObject } from "cloudflare:workers";
import { json } from "./http.js";

// One instance of this class per clipboard code. It owns that clipboard's rows
// *and* its live WebSockets, so there is nothing to coordinate across instances.
//
// Writes arrive over HTTP and are pushed back out over the sockets. The socket is
// push-only on purpose: inverting it would mean reimplementing request/response
// acking over a channel that has none.

const MAX_CONTENT_BYTES = 256 * 1024;
const MAX_ENTRIES = 50;
const MIN_TTL = 5 * 60;
const MAX_TTL = 30 * 24 * 60 * 60;
const DEFAULT_TTL = 24 * 60 * 60;

const COLUMNS = "id, content, created_at, expires_at";

const now = () => Math.floor(Date.now() / 1000);

function clampTtl(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_TTL;
  return Math.min(MAX_TTL, Math.max(MIN_TTL, Math.floor(n)));
}

export class ClipboardDO extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    // Runs on every wake from hibernation, so it stays to one idempotent statement.
    this.sql.exec(
      `CREATE TABLE IF NOT EXISTS entries (
         id         INTEGER PRIMARY KEY AUTOINCREMENT,
         content    TEXT    NOT NULL,
         created_at INTEGER NOT NULL,
         expires_at INTEGER NOT NULL
       )`,
    );
  }

  async fetch(request) {
    // The Worker forwards the request untouched, so the original path is intact:
    // /api/c/<slug> or /api/c/<slug>/ws or /api/c/<slug>/<id>
    const parts = new URL(request.url).pathname.split("/").filter(Boolean);
    const slug = parts[2] ?? "";
    const tail = parts.slice(3);

    if (tail[0] === "ws") return this.#openSocket(request);

    switch (request.method) {
      case "GET":
        return this.#list(slug);
      case "POST":
        return this.#add(request);
      case "DELETE":
        return this.#remove(tail[0]);
      default:
        return json({ error: "method not allowed" }, { status: 405 });
    }
  }

  // --- routes ---------------------------------------------------------------

  async #list(slug) {
    await this.#sweep();
    return json({ slug, entries: this.#all(), limits: this.#limits() });
  }

  async #add(request) {
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "invalid JSON body" }, { status: 400 });
    }

    const content = typeof body?.content === "string" ? body.content : "";
    if (!content.trim()) return json({ error: "content is required" }, { status: 400 });

    const bytes = new TextEncoder().encode(content).length;
    if (bytes > MAX_CONTENT_BYTES) {
      return json(
        { error: "content too large", bytes, limit: MAX_CONTENT_BYTES },
        { status: 413 },
      );
    }

    await this.#sweep();

    const created = now();
    const ttl = clampTtl(body?.ttl);
    this.sql.exec(
      "INSERT INTO entries (content, created_at, expires_at) VALUES (?, ?, ?)",
      content,
      created,
      created + ttl,
    );
    const entry = this.sql.exec(`SELECT ${COLUMNS} FROM entries ORDER BY id DESC LIMIT 1`).one();

    const evicted = this.#trim();
    await this.#reschedule();
    this.#broadcast({ type: "entry", entry, evicted });
    return json({ entry, evicted }, { status: 201 });
  }

  async #remove(rawId) {
    const id = Number(rawId);
    if (!Number.isInteger(id) || id <= 0) return json({ error: "invalid id" }, { status: 400 });

    const found = this.sql.exec("SELECT id FROM entries WHERE id = ?", id).toArray();
    if (!found.length) return json({ error: "no such entry" }, { status: 404 });

    this.sql.exec("DELETE FROM entries WHERE id = ?", id);
    await this.#reschedule();
    this.#broadcast({ type: "removed", ids: [id] });
    return json({ removed: id });
  }

  #openSocket(request) {
    if (request.headers.get("upgrade")?.toLowerCase() !== "websocket") {
      return new Response("expected a websocket upgrade", { status: 426 });
    }
    const [client, server] = Object.values(new WebSocketPair());
    // acceptWebSocket, not server.accept() — the latter pins this object in memory
    // and bills duration for as long as anyone holds the tab open.
    this.ctx.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  // --- hibernatable socket handlers ----------------------------------------

  webSocketMessage(ws, message) {
    if (message === "ping") ws.send("pong");
  }

  webSocketClose(ws, code, reason) {
    // The runtime auto-replies to close frames on recent compatibility dates,
    // so this may already be closed.
    try {
      ws.close(code, reason);
    } catch {
      /* already closed */
    }
  }

  webSocketError(ws) {
    try {
      ws.close(1011, "internal error");
    } catch {
      /* already closed */
    }
  }

  async alarm() {
    await this.#sweep();
    // Leave nothing behind for a clipboard nobody is using any more. Only when no
    // one is connected — closing a live viewer's socket to save a few rows is rude.
    if (this.#count() === 0 && this.ctx.getWebSockets().length === 0) {
      await this.ctx.storage.deleteAll();
    }
  }

  // --- internals ------------------------------------------------------------

  #all() {
    return this.sql.exec(`SELECT ${COLUMNS} FROM entries ORDER BY id DESC`).toArray();
  }

  #count() {
    return this.sql.exec("SELECT COUNT(*) AS n FROM entries").one().n;
  }

  #limits() {
    return { maxBytes: MAX_CONTENT_BYTES, maxEntries: MAX_ENTRIES, minTtl: MIN_TTL, maxTtl: MAX_TTL };
  }

  /** Drop expired rows, tell anyone listening, and return the ids removed. */
  async #sweep() {
    const cutoff = now();
    const doomed = this.sql
      .exec("SELECT id FROM entries WHERE expires_at <= ?", cutoff)
      .toArray()
      .map((row) => row.id);

    if (doomed.length) {
      this.sql.exec("DELETE FROM entries WHERE expires_at <= ?", cutoff);
      this.#broadcast({ type: "expired", ids: doomed });
    }
    // Rearm unconditionally. An alarm is consumed when it fires, so if one ever
    // lands a hair early and rounds down to "nothing expired yet", rescheduling
    // only on a non-empty sweep would leave the object with no alarm at all and
    // the rows would sit there until someone happened to GET.
    await this.#reschedule();
    return doomed;
  }

  /** Enforce MAX_ENTRIES, oldest first. Returns the ids evicted. */
  #trim() {
    const evicted = this.sql
      .exec(`SELECT id FROM entries ORDER BY id DESC LIMIT -1 OFFSET ?`, MAX_ENTRIES)
      .toArray()
      .map((row) => row.id);

    if (evicted.length) {
      const holes = evicted.map(() => "?").join(",");
      this.sql.exec(`DELETE FROM entries WHERE id IN (${holes})`, ...evicted);
    }
    return evicted;
  }

  async #reschedule() {
    const next = this.sql.exec("SELECT MIN(expires_at) AS next FROM entries").one().next;
    if (next == null) {
      await this.ctx.storage.deleteAlarm();
      return;
    }
    await this.ctx.storage.setAlarm(next * 1000);
  }

  #broadcast(message) {
    const payload = JSON.stringify(message);
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(payload);
      } catch {
        /* socket is on its way out; the close handler will clean up */
      }
    }
  }
}
