import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// A marker loop that draws itself around the button on hover, the way you would
// circle something on a real board.
//
// Two details do the work:
//   - pathLength="1" normalises every path to a length of 1, so the dash
//     animation needs no measuring and behaves identically at any button width.
//   - preserveAspectRatio="none" lets the loop stretch to the button, while
//     vector-effect="non-scaling-stroke" keeps the ink an even weight instead of
//     smearing horizontally with it.
//
// The loop deliberately overshoots its start point; a scribble that closes
// exactly reads as a border, not a pen stroke.

const LOOP =
  "M18 14 C70 5 140 9 196 7 C252 5 292 10 293 26 C294 42 274 55 214 56 " +
  "C154 57 78 56 26 54 C7 53 5 33 12 21 C16 14 26 9 40 8";

const SECOND_PASS = "M30 9 C84 2 152 6 206 4 C258 2 296 11 295 27";

// Emphasis ticks, the marks you add after circling something.
const MARKS = ["M303 10 l11 -8", "M303 54 l11 7", "M-3 10 l-11 -8", "M-3 54 l-11 7"];

export function GraffitiButton({ children, className, ...props }) {
  return (
    <span className="graffiti">
      <Button className={cn("relative z-10", className)} {...props}>
        {children}
      </Button>
      <svg
        className="graffiti-ink"
        viewBox="0 0 300 64"
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        <path className="graffiti-stroke" pathLength="1" d={LOOP} />
        <path className="graffiti-stroke graffiti-stroke--second" pathLength="1" d={SECOND_PASS} />
        {MARKS.map((d) => (
          <path key={d} className="graffiti-mark" d={d} />
        ))}
      </svg>
    </span>
  );
}
