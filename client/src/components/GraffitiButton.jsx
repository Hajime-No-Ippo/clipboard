import { useLayoutEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { INK, randomSeed, tagCircle } from "@/lib/tag";

// A hand-drawn circle round the button's label, on hover.
//
// It encloses the *text*, inside the button — not the button's outline, and not
// a frame around the control. Circled three to five times and blended with
// multiply, so the laps accumulate into real density where they cross instead
// of stacking as flat translucent copies. See lib/tag.js for the geometry.
//
// Nothing scales or fades in as a unit. The ink is only ever *drawn*: something
// that springs into place reads as a sticker arriving rather than a pen moving.
//
// The SVG is measured off the label rather than scaled to it. A fixed viewBox
// stretched to fit distorts stroke weight along one axis and makes the
// dash-based draw unreliable.

const DRAW = 0.1; // seconds for one lap
const SPREAD = 0.3; // total seconds every lap is spread over

export function GraffitiButton({
  children,
  className,
  seed,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  ...props
}) {
  // One circle per mount — never regenerate on hover, or it redraws itself
  // differently halfway through.
  const [fallbackSeed] = useState(randomSeed);
  const active = seed ?? fallbackSeed;

  const root = useRef(null);
  const label = useRef(null);
  const timeline = useRef(null);
  const [box, setBox] = useState(null);

  // Measured off the label, so the circle fits the actual word and follows it
  // when the text or font changes.
  useLayoutEffect(() => {
    const el = label.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width <= 0 || height <= 0) return;
      const next = { w: Math.round(width), h: Math.round(height) };
      setBox((prev) => (prev && prev.w === next.w && prev.h === next.h ? prev : next));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const circle = useMemo(
    () => (box ? tagCircle(active, box.w, box.h) : null),
    [active, box],
  );

  const filterId = `jx-brush-${active}`;

  useLayoutEffect(() => {
    if (!circle) return undefined;

    const ctx = gsap.context(() => {
      // Document order is drawing order: lap after lap, as the hand goes round.
      const strokes = gsap.utils.toArray(".jx-lap path");
      gsap.set(strokes, { strokeDashoffset: 1, autoAlpha: 0 });

      // CSS carries no reduced-motion rule for this, so the preference is
      // honoured here: the circle still appears, it just stops drawing.
      const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const tl = gsap.timeline({ paused: true, defaults: { ease: "power2.out" } });
      tl.to(strokes, {
        strokeDashoffset: 0,
        autoAlpha: 1,
        duration: still ? 0.001 : DRAW,
        // `amount`, not `each`: the lap count varies with the seed, and a
        // per-target delay would make a busier circle take longer. This spreads
        // a fixed total however many laps there are, and overlaps them so the
        // pen never appears to stop between laps.
        stagger: { amount: still ? 0 : SPREAD, from: "start" },
      });

      timeline.current = tl;
    }, root);

    return () => ctx.revert();
  }, [circle]);

  // Reversing from the current position keeps it physical — ink that snaps away
  // reads as a glitch. Faster out than in.
  //
  // Composed with any handler the caller passed rather than spread over it: with
  // `{...props}` after these, a caller supplying its own onMouseEnter would
  // silently kill the ink and there would be nothing to see in the markup.
  const play = (event) => {
    timeline.current?.timeScale(1).play();
    return event;
  };
  const rewind = (event) => {
    timeline.current?.timeScale(1.9).reverse();
    return event;
  };

  const enter = (event) => {
    play(event);
    onMouseEnter?.(event);
  };
  const leave = (event) => {
    rewind(event);
    onMouseLeave?.(event);
  };
  const focus = (event) => {
    play(event);
    onFocus?.(event);
  };
  const blur = (event) => {
    rewind(event);
    onBlur?.(event);
  };

  const bleed = circle?.bleed ?? 0;

  return (
    <Button
      ref={root}
      className={cn("graffiti-host relative", className)}
      {...props}
      onMouseEnter={enter}
      onMouseLeave={leave}
      onFocus={focus}
      onBlur={blur}
    >
      <span className="graffiti-target">
        {circle && (
          <svg
            className="graffiti-ink"
            style={{
              inset: -bleed,
              width: `calc(100% + ${bleed * 2}px)`,
              height: `calc(100% + ${bleed * 2}px)`,
            }}
            viewBox={`0 0 ${box.w + bleed * 2} ${box.h + bleed * 2}`}
            aria-hidden="true"
            focusable="false"
          >
            <defs>
              {/* Displace the edge so it stops reading as clean vector art.
                  Scale is kept below the stroke width on purpose: displacement
                  larger than the stroke tears it into fragments rather than
                  roughening it.

                  There was a second stage here — a high-frequency turbulence
                  masked into the alpha to fake bristle streaks. It was built for
                  the thick straight strokes of the reference and is wrong at
                  this size: its ~0.9px period against a ~3px stroke sliced every
                  lap into two or three parallel hairlines, which is what made
                  three laps look like ten. Do not reintroduce it unless the
                  strokes get several times thicker than the streak period. */}
              <filter id={filterId} x="-25%" y="-25%" width="150%" height="150%">
                <feTurbulence
                  type="fractalNoise"
                  baseFrequency="0.055"
                  numOctaves="3"
                  seed={active % 100}
                  result="grain"
                />
                <feDisplacementMap
                  in="SourceGraphic"
                  in2="grain"
                  scale="1.8"
                  xChannelSelector="R"
                  yChannelSelector="G"
                />
              </filter>
            </defs>

            {/* Shifted by the bleed so the path's own 0,0 lands on the label's
                top-left corner. */}
            <g
              filter={`url(#${filterId})`}
              transform={`translate(${bleed} ${bleed})`}
              stroke={INK}
            >
              {circle.laps.map((lap) => (
                // Alpha lives on the wrapper, not the path: GSAP animates the
                // path's opacity and would otherwise flatten every lap to solid
                // and lose the build-up.
                <g key={lap.d} className="jx-lap" opacity={lap.alpha.toFixed(2)}>
                  <path d={lap.d} pathLength="1" style={{ strokeWidth: lap.width.toFixed(2) }} />
                </g>
              ))}
            </g>
          </svg>
        )}
        <span ref={label} className="relative z-10">
          {children}
        </span>
      </span>
    </Button>
  );
}
