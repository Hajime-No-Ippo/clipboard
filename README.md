# Clipboard — paste here, read there

A shared text clipboard. Open a clipboard with a six-character code, paste something in,
and it appears instantly on every other device using that code. No account, no install.
Entries expire on their own.

Runs entirely on Cloudflare: a Worker serves the React SPA and the API, and a **Durable
Object** holds each clipboard's contents and its live WebSocket connections.

## How it works

```
Browser (React SPA)
  │  GET  /                 → static asset
  │  GET  /c/ABC123         → SPA fallback, routed client-side
  │  POST /api/c/ABC123     → append an entry
  │  GET  /api/c/ABC123     → list entries
  │  WS   /api/c/ABC123/ws  → live push
  ▼
Worker (worker/index.js) — validates the code, resolves it to a Durable Object
  ▼
ClipboardDO (worker/clipboard-do.js) — one instance per code
  ├─ SQLite storage: entries (content, created_at, expires_at)
  ├─ Hibernatable WebSockets for fan-out
  └─ An alarm that sweeps expired rows
```

Two properties worth knowing before changing anything:

- **Writes go over HTTP; pushes come back over the WebSocket.** The socket is push-only
  (it speaks only `ping`/`pong` inbound). Sending writes over it would mean reimplementing
  request/response acking over a channel that has none.
- **The server broadcasts to every socket, including the one that posted.** The client
  folds messages in idempotently by id (`apply()` in `useClipboard.js`). Remove that dedupe
  and you get flickering duplicates on the device you typed on.

`ctx.acceptWebSocket()` is used rather than `server.accept()`, so an open tab does not pin
the object in memory or accrue duration charges while idle. That is why there is no
in-memory socket array — `ctx.getWebSockets()` is the only source of truth, and it survives
hibernation.

## Layout

```
worker/
  index.js         router: validates the code, forwards to the Durable Object
  clipboard-do.js  the whole backend — storage, TTL alarm, socket fan-out
  http.js          json() helper; sets no-store on every API response
client/            React 19 + Vite 7 + Tailwind + shadcn/ui
  src/App.jsx                 shell + routes
  src/pages/Home.jsx          create or enter a code
  src/pages/ClipboardPage.jsx the clipboard itself
  src/hooks/useClipboard.js   owns the entry list and the socket
  src/lib/api.js              fetch wrappers
  src/lib/format.js           timeAgo, expiresIn, TTL options
  src/components/             ShareCode, EntryList, CopyButton, ui/ (shadcn)
wrangler.jsonc     Worker + Durable Object + static asset config
```

## Commands

```bash
npm install          # installs the client too, via postinstall
npm run dev          # builds the client, then `wrangler dev` on :8787
npm run build        # client only → client/dist
npm run deploy       # build + wrangler deploy
```

Always deploy with `npm run deploy`, never bare `wrangler deploy` — the assets directory is
whatever `client/dist` happens to contain, and deploying an unbuilt tree uploads zero files
and serves a blank page.

`vite dev` on its own will not work: `/api/*` only exists inside the Worker. Use
`wrangler dev`, which runs the Worker, the Durable Object, and the asset server together
with real SQLite.

## Limits

Enforced server-side in `clipboard-do.js`; the client reads them back from `GET /api/c/:slug`.

| Limit | Value |
|---|---|
| Entry size | 256 KB |
| Entries per clipboard | 50 (oldest evicted) |
| TTL | 5 minutes – 30 days, default 24 hours |
| Code alphabet | `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (no I/L/O/0/1) |

Text only. There is no file upload and no plan for one.

## Security

**Anyone who knows the code can read the clipboard.** There is no auth. Treat it as a shared
surface, not a private one.

- Six characters from a 31-character alphabet is ~10⁹ codes. That is fine against guessing a
  *specific* code and weak against bulk enumeration — add per-IP rate limiting on reads
  before this carries anything sensitive, and raise `CODE_LENGTH` in `worker/index.js`.
- Every `/api` response is `Cache-Control: no-store`.
- Entry content is never logged.
- Not implemented, and the right next step: an optional client-side passphrase, so the
  server stores ciphertext it cannot read.

## API

| Method | Path | Body | Result |
|---|---|---|---|
| `POST` | `/api/clipboard` | — | `{ slug }` — mints a code; the clipboard exists once something is put on it |
| `GET` | `/api/c/:slug` | — | `{ slug, entries, limits }`, newest first |
| `POST` | `/api/c/:slug` | `{ content, ttl? }` | `{ entry, evicted }` |
| `DELETE` | `/api/c/:slug/:id` | — | `{ removed }` |
| `WS` | `/api/c/:slug/ws` | — | pushes `entry` / `removed` / `expired` |

Codes are validated against `^[A-Z0-9]{4,24}$` **before** the Durable Object binding is
touched, so a malformed path can never allocate an object.
