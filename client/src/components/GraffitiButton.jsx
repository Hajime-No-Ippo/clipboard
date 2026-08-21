import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// A marker loop that draws itself around the button's *label* on hover, the way
// you would circle a word on a real board.
//
// The ink wraps the text rather than the button box: on a full-width button a
// box-hugging loop is a rectangle with rounded corners, which reads as a border,
// not a pen stroke.
//
// The SVG scales uniformly (no preserveAspectRatio="none", no non-scaling-stroke).
// That matters: dash lengths are resolved after the viewBox transform, so under a
// non-uniform stretch the pathLength="1" normalisation stops being dependable and
// the "undrawn" state can leak ink before hover.
//
// The loop overshoots its start point on purpose — a scribble that closes exactly
// reads as a shape rather than a stroke.

const LOOP =
  "M32 21 C72 8 142 10 169 25 C191 37 181 59 139 67 " +
  "C99 75 43 70 21 56 C6 46 11 27 42 16";

const SECOND_PASS = "M46 13 C96 6 152 12 175 30";

// Emphasis ticks, added after the circling.
const MARKS = ["M186 13 l10 -8", "M189 62 l10 7", "M15 12 l-10 -8", "M12 63 l-10 7"];

export function GraffitiButton({ children, className, ...props }) {
  return (
    <Button className={cn("graffiti-host relative", className)} {...props}>
      <span className="graffiti-target">
        <svg className="graffiti-ink" viewBox="0 0 200 80" aria-hidden="true" focusable="false">
          <path className="graffiti-stroke" pathLength="1" d={LOOP} />
          <path className="graffiti-stroke graffiti-stroke--second" pathLength="1" d={SECOND_PASS} />
          {MARKS.map((d) => (
            <path key={d} className="graffiti-mark" d={d} />
          ))}
        </svg>
        <span className="relative z-10">{children}</span>
      </span>
    </Button>
  );
}
