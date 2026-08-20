// One light source for the whole board: above and to the left. Every shadow on
// the page is derived from it. Coherent lighting on plain rectangles reads as
// more real than incoherent lighting on detailed ones, so this is the file that
// matters most for the illusion.

// Where shadows fall, in *page* space: down and to the right.
const LIGHT = { dx: 5, dy: 8 };

// Small, irregular values — a board pinned by hand, not laid out on a grid.
const ROTATIONS = [-1.1, 0.8, -0.5, 1.4, -0.9, 0.35];

// Paper is never one colour. The variation is what stops a stack of notes from
// reading as repeated DOM.
const TINTS = ["#fffdf4", "#fffbef", "#fdf9ee", "#fffcf5", "#fcf8ec", "#fefcf3"];

// Cut edges are never perfectly square.
const RADII = [
  "3px 5px 3px 4px / 4px 3px 5px 3px",
  "4px 3px 5px 3px / 3px 5px 3px 4px",
  "5px 4px 3px 5px / 4px 4px 3px 5px",
];

/**
 * Per-note styling derived from a stable seed (use the entry id, so a note never
 * jumps on re-render).
 *
 * The counter-rotation is the load-bearing bit: `box-shadow` is resolved in the
 * element's own rotated coordinate space, so handing every note the same offset
 * would swing its shadow around with its tilt and the board would look lit from
 * six different directions at once. Rotating the offset by -θ cancels that out,
 * and every shadow lands down-right on screen regardless of how the note sits.
 */
export function noteStyle(seed) {
  const i = Math.abs(Math.trunc(seed));
  const deg = ROTATIONS[i % ROTATIONS.length];
  const theta = (deg * Math.PI) / 180;
  const sx = LIGHT.dx * Math.cos(theta) + LIGHT.dy * Math.sin(theta);
  const sy = -LIGHT.dx * Math.sin(theta) + LIGHT.dy * Math.cos(theta);

  return {
    "--rot": `${deg}deg`,
    "--sx": `${sx.toFixed(2)}px`,
    "--sy": `${sy.toFixed(2)}px`,
    "--paper": TINTS[i % TINTS.length],
    "--radius": RADII[i % RADII.length],
  };
}
