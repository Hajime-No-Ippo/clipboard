import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GraffitiButton } from "@/components/GraffitiButton";
import { createClipboard } from "@/lib/api";
import { noteStyle } from "@/lib/board";
import { extractCode } from "@/lib/code";

export default function Home() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  const create = async () => {
    setCreating(true);
    setError(null);
    try {
      const { slug } = await createClipboard();
      navigate(`/c/${slug}`);
    } catch (cause) {
      setError(cause.message);
      setCreating(false);
    }
  };

  const open = (event) => {
    event.preventDefault();
    // Accepts a bare code or a full board link pasted from another device.
    const slug = extractCode(code);
    if (!slug) {
      setError(
        code.includes("/")
          ? "That link is not a board on this site."
          : "That is not a valid board code.",
      );
      return;
    }
    navigate(`/c/${slug}`);
  };

  return (
    // board-enter drives the same flip the board page uses, so arriving here —
    // including on the way back from a board — reads as the cards dropping onto
    // the cork rather than appearing.
    <div className="board-enter space-y-6">
      {/* The flip lives on a wrapper: .paper already owns transform for its
          tilt, and the animation would overwrite it. */}
      <div className="flip-item" style={{ "--i": 0 }}>
        <section
          className="paper pin p-6 pt-8 sm:p-8 sm:pt-10"
          style={noteStyle(0)}
        >
          <h1 className="font-serif text-3xl text-[#2f2418] sm:text-4xl">
            Paste here, read there
          </h1>
          <p className="mt-3 max-w-xl text-[#5b4632]">
            Pin some text to a board and it shows up instantly on any other
            device using the same code. No account, no install. Notes come down
            on their own.
          </p>
          <p className="mt-3 max-w-xl text-sm text-[#8a6a4a]">
            Anyone who knows the code can read the board — treat it as a shared
            surface.
          </p>
        </section>
      </div>

      <div className="flip-item" style={{ "--i": 1 }}>
        <section
          className="paper space-y-5 p-6 pt-7 sm:p-7"
          style={noteStyle(1)}
        >
          <GraffitiButton
            size="lg"
            className="w-full"
            onClick={create}
            disabled={creating}
          >
            {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            New board
          </GraffitiButton>

          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-[#e3d8c4]" />
            <span className="text-xs uppercase tracking-widest text-[#8a6a4a]">
              or
            </span>
            <span className="h-px flex-1 bg-[#e3d8c4]" />
          </div>

          <form onSubmit={open} className="space-y-2">
            <label
              htmlFor="code"
              className="text-sm font-semibold text-[#2f2418]"
            >
              Enter a 6 digit code
            </label>
            <div className="flex gap-2">
              <Input
                id="code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="ABC123"
                autoComplete="off"
                spellCheck={false}
                className="font-mono text-lg tracking-[0.3em]"
              />
              <GraffitiButton
                type="submit"
                variant="outline"
                size="icon"
                aria-label="Open board"
              >
                <ArrowRight className="h-4 w-4" />
              </GraffitiButton>
            </div>
          </form>

          {error && <p className="text-sm text-red-700">{error}</p>}
        </section>
      </div>
    </div>
  );
}
