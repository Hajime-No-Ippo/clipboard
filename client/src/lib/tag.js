// A hand-drawn circle round the button's label — the way you circle a word.
//
// It encloses the *text*, inside the button. Not the button's outline, not a
// frame around the control.
//
// One continuous loop, circled three to five times. That repetition is the whole
// effect: a hand circling a word does not stop after one lap, and the laps sit
// roughly parallel and pile up where they touch. Offsetting each lap keeps that
// nested look; jittering individual segments would give scribble instead.
//
// Geometry is generated in *pixel* space against the measured label. A fixed
// viewBox stretched to fit distorts stroke weight along one axis and makes the
// dash-based draw unreliable.

// One pen. A second colour was in here — the reference tag uses crimson and
// cobalt together — but a single red is what this button wants.
export const INK = "#e8264f";

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomSeed() {
  return Math.floor(Math.random() * 0xffffffff);
}

const SAMPLES = 56;
const MAX_STROKE = 3;

/**
 * The ellipse that actually contains the target.
 *
 * Start from even padding on both axes, which keeps a square target — an icon —
 * roughly circular instead of a flat oval. Then, only if the target's corners
 * fall outside that ellipse, grow both radii by exactly enough to swallow them.
 *
 * Solving the enclosure rather than padding by a guessed factor is what lets the
 * same code circle a long word and a 16px arrow and get a sensible shape for
 * both.
 */
const PAD = 10;

function radii(w, h) {
  let rx = w / 2 + PAD;
  let ry = h / 2 + PAD;

  // Ellipse equation at the target's corner: >1 means the corner pokes out.
  const corner = Math.hypot(w / 2 / rx, h / 2 / ry);
  if (corner > 1) {
    rx *= corner * 1.05;
    ry *= corner * 1.05;
  }
  return { rx, ry };
}

/**
 * @param {number} seed
 * @param {number} w label width in px
 * @param {number} h label height in px
 * @returns {{laps: {d: string, width: number, alpha: number}[], bleed: number}}
 */
export function tagCircle(seed, w, h) {
  const rand = rng(seed);
  const { rx, ry } = radii(w, h);
  const cx = w / 2;
  const cy = h / 2;

  const count = 3; // 3-5 laps
  let reach = 0;

  const laps = Array.from({ length: count }, (_, k) => {
    // Laps straddle the true ellipse, so the band stays centred on the word
    // rather than creeping outward as laps are added.
    const offset = (k - (count - 1) / 2) * (1.9 + rand() * 1.3);
    const drift = 0.9 + k * 0.5; // later laps hold the line less well
    const phase = rand() * Math.PI * 2;
    // Each lap starts somewhere different, the way a hand does not lift and
    // restart in the same spot.
    const start = rand() * Math.PI * 2;

    const point = (i) => {
      const a = start + (i / SAMPLES) * Math.PI * 2;
      // A slow wave around the loop plus a little noise: a hand drifts off true
      // gradually, it does not jitter per sample.
      const wobble = offset + Math.sin(i * 0.21 + phase) * drift + (rand() - 0.5) * 0.6;
      const x = cx + Math.cos(a) * (rx + wobble);
      const y = cy + Math.sin(a) * (ry + wobble);
      reach = Math.max(reach, Math.abs(x - cx) - w / 2, Math.abs(y - cy) - h / 2);
      return `${x.toFixed(1)} ${y.toFixed(1)}`;
    };

    const pts = Array.from({ length: SAMPLES }, (_, i) => point(i));
    // Close, then carry on past the start — the crossing tail where the pen met
    // its own line.
    const tail = Array.from({ length: 4 + Math.floor(rand() * 7) }, (_, i) => point(i));
    const d = `M${pts[0]} ${pts.slice(1).map((p) => `L${p}`).join(" ")} L${tail.join(" L")}`;

    return {
      d,
      width: 2.4 + rand() * 2.2,
      // Partial alpha is what lets the laps read as heavier where they cross,
      // once they are multiplied together.
      alpha: 0.5 + rand() * 0.32,
    };
  });

  return { laps, bleed: Math.ceil(reach + MAX_STROKE + 4) };
}
