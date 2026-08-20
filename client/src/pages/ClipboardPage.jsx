import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EntryList } from "@/components/EntryList";
import { ShareCode } from "@/components/ShareCode";
import { useClipboard } from "@/hooks/useClipboard";
import { DEFAULT_TTL, TTL_OPTIONS } from "@/lib/format";
import { noteStyle } from "@/lib/board";
import { ACCEPTED_CODE } from "@/lib/code";
import { cn } from "@/lib/utils";

const STATUS = {
  live: { label: "Live", dot: "bg-emerald-400" },
  connecting: { label: "Connecting…", dot: "bg-slate-300" },
  reconnecting: { label: "Reconnecting…", dot: "bg-amber-400" },
};

export default function ClipboardPage() {
  const { slug: raw } = useParams();
  const slug = (raw ?? "").toUpperCase();

  if (!ACCEPTED_CODE.test(slug)) return <Navigate to="/" replace />;
  // Canonicalise casing so a shared link is always the same string.
  if (raw !== slug) return <Navigate to={`/c/${slug}`} replace />;
  return <Board slug={slug} />;
}

// Leaving has to finish before the route unmounts, so navigation is deferred by
// the length of the flip-out (plus the last card's stagger).
const LEAVE_MS = 460;

// Split out so the hook never runs for an invalid code.
function Board({ slug }) {
  const { entries, limits, status, error, loading, add, remove, setError } = useClipboard(slug);
  const navigate = useNavigate();
  const [draft, setDraft] = useState("");
  const [ttl, setTtl] = useState(DEFAULT_TTL);
  const [sending, setSending] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const leaveTimer = useRef(null);

  useEffect(() => () => clearTimeout(leaveTimer.current), []);

  const leave = (event) => {
    event.preventDefault();
    if (leaving) return;
    setLeaving(true);
    leaveTimer.current = setTimeout(() => navigate("/"), LEAVE_MS);
  };

  const maxBytes = limits?.maxBytes ?? 256 * 1024;
  const bytes = new TextEncoder().encode(draft).length;
  const tooBig = bytes > maxBytes;

  const send = async (event) => {
    event.preventDefault();
    if (!draft.trim() || tooBig || sending) return;
    setSending(true);
    try {
      await add(draft, ttl);
      setDraft("");
      setError(null);
    } catch (cause) {
      setError(cause.message);
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (event) => {
    // Cmd/Ctrl+Enter sends; plain Enter keeps working as a newline, which matters
    // for the code snippets this mostly holds.
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") send(event);
  };

  const badge = STATUS[status] ?? STATUS.connecting;

  return (
    <div className={cn("space-y-6", leaving ? "board-leave" : "board-enter")}>
      <div
        className="flip-item flex items-center justify-between text-[#f5ead9] [text-shadow:0_1px_3px_rgba(0,0,0,0.6)]"
        style={{ "--i": 0 }}
      >
        <a
          href="/"
          onClick={leave}
          className="flex items-center text-sm hover:underline"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          All boards
        </a>
        <span className="flex items-center gap-2 text-sm">
          <span className={cn("h-2 w-2 rounded-full", badge.dot)} />
          {badge.label}
        </span>
      </div>

      <div className="flip-item" style={{ "--i": 1 }}>
        <ShareCode slug={slug} />
      </div>

      <div className="flip-item" style={{ "--i": 2 }}>
        <form onSubmit={send} className="paper space-y-4 p-5 pt-6" style={noteStyle(4)}>
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Paste or type anything…"
            className="min-h-[120px] font-mono"
            autoFocus
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <label htmlFor="ttl" className="text-sm text-[#8a6a4a]">
                Comes down after
              </label>
              <select
                id="ttl"
                value={ttl}
                onChange={(event) => setTtl(Number(event.target.value))}
                className="h-9 rounded-none border-0 border-b border-b-[#cbb79a] bg-transparent pr-6 text-sm transition-colors focus-visible:border-b-[#7a5a33] focus-visible:outline-none focus-visible:ring-0"
              >
                {TTL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <span className={cn("text-xs text-[#8a6a4a]", tooBig && "text-red-700")}>
                {(bytes / 1024).toFixed(1)} / {Math.round(maxBytes / 1024)} KB
              </span>
              <Button type="submit" disabled={!draft.trim() || tooBig || sending}>
                {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Pin it
              </Button>
            </div>
          </div>
          {error && <p className="text-sm text-red-700">{error}</p>}
        </form>
      </div>

      <EntryList entries={entries} onRemove={remove} loading={loading} />
    </div>
  );
}
