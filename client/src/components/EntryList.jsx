import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/CopyButton";
import { expiresIn, timeAgo } from "@/lib/format";
import { noteStyle } from "@/lib/board";

// The board header, share card and composer occupy the first stagger slots, so
// the notes carry on counting from here rather than restarting at zero.
const FLIP_OFFSET = 3;

function Note({ entry, index, onRemove }) {
  return (
    // The wrapper flips; the sheet inside keeps its own tilt. One element can
    // only hold one transform, and the animation would win.
    <li className="flip-item" style={{ "--i": index + FLIP_OFFSET }}>
      <div className="paper note pin p-5 pt-7" style={noteStyle(entry.id)}>
        <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words font-mono text-sm text-[#2f2418]">
          {entry.content}
        </pre>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#e3d8c4] pt-3">
          <p className="text-xs text-[#8a6a4a]">
            {timeAgo(entry.created_at)} · {expiresIn(entry.expires_at)}
          </p>
          <div className="flex items-center gap-1">
            <CopyButton value={entry.content} />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onRemove(entry.id)}
              aria-label="Remove note"
              className="text-[#8a6a4a] hover:bg-red-50 hover:text-red-700"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </li>
  );
}

export function EntryList({ entries, onRemove, loading }) {
  if (loading) {
    return (
      <p className="py-10 text-center text-sm text-[#f0e2d0] [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">
        Loading…
      </p>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flip-item" style={{ "--i": FLIP_OFFSET }}>
        <div className="rounded-sm border-2 border-dashed border-[#f0e2d0]/40 px-4 py-12 text-center text-sm text-[#f5ead9] [text-shadow:0_1px_3px_rgba(0,0,0,0.6)]">
          Nothing pinned to this board yet. Add something above and it appears on
          every device using this code.
        </div>
      </div>
    );
  }

  return (
    <ul className="space-y-6">
      {entries.map((entry, index) => (
        <Note key={entry.id} entry={entry} index={index} onRemove={onRemove} />
      ))}
    </ul>
  );
}
