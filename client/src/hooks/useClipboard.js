import { useCallback, useEffect, useRef, useState } from "react";
import { addEntry, deleteEntry, getEntries } from "@/lib/api";

// This hook owns everything the server owns — the entry list, the socket, and the
// actions that change them. Components own their own drafts.

const MAX_BACKOFF = 15_000;
const HEARTBEAT = 30_000;

/**
 * Fold a server message into the entry list. Deliberately idempotent by id: the
 * server broadcasts to *every* socket including the one that posted, so the
 * sender applies its own change twice. Dropping that dedupe means flickering
 * duplicates on the device you typed on.
 */
function apply(entries, message) {
  switch (message.type) {
    case "entry": {
      const evicted = new Set(message.evicted ?? []);
      const rest = entries.filter((e) => e.id !== message.entry.id && !evicted.has(e.id));
      return [message.entry, ...rest];
    }
    case "removed":
    case "expired": {
      const gone = new Set(message.ids);
      return entries.filter((e) => !gone.has(e.id));
    }
    default:
      return entries;
  }
}

export function useClipboard(slug) {
  const [entries, setEntries] = useState([]);
  const [limits, setLimits] = useState(null);
  const [status, setStatus] = useState("connecting");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const data = await getEntries(slug);
      setEntries(data.entries);
      setLimits(data.limits);
      setError(null);
    } catch (cause) {
      setError(cause.message);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    let disposed = false;
    let socket;
    let retry;
    let heartbeat;
    let attempt = 0;

    const connect = () => {
      if (disposed) return;
      const scheme = window.location.protocol === "https:" ? "wss:" : "ws:";
      socket = new WebSocket(`${scheme}//${window.location.host}/api/c/${slug}/ws`);
      socketRef.current = socket;

      socket.onopen = () => {
        attempt = 0;
        setStatus("live");
        // Anything that happened while we were disconnected was never queued, so
        // the list is refetched rather than patched.
        refresh();
        heartbeat = setInterval(() => socket.send("ping"), HEARTBEAT);
      };

      socket.onmessage = (event) => {
        if (event.data === "pong") return;
        let message;
        try {
          message = JSON.parse(event.data);
        } catch {
          return;
        }
        setEntries((prev) => apply(prev, message));
      };

      socket.onerror = () => socket.close();

      socket.onclose = () => {
        clearInterval(heartbeat);
        if (disposed) return;
        setStatus("reconnecting");
        retry = setTimeout(connect, Math.min(MAX_BACKOFF, 500 * 2 ** attempt++));
      };
    };

    connect();

    return () => {
      disposed = true;
      clearTimeout(retry);
      clearInterval(heartbeat);
      socket?.close();
      socketRef.current = null;
    };
  }, [slug, refresh]);

  const add = useCallback(
    async (content, ttl) => {
      const { entry, evicted } = await addEntry(slug, content, ttl);
      setEntries((prev) => apply(prev, { type: "entry", entry, evicted }));
    },
    [slug],
  );

  const remove = useCallback(
    async (id) => {
      await deleteEntry(slug, id);
      setEntries((prev) => apply(prev, { type: "removed", ids: [id] }));
    },
    [slug],
  );

  return { entries, limits, status, error, loading, add, remove, setError };
}
