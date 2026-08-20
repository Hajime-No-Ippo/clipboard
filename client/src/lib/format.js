const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function split(seconds) {
  if (seconds < MINUTE) return [seconds, "sec"];
  if (seconds < HOUR) return [Math.floor(seconds / MINUTE), "min"];
  if (seconds < DAY) return [Math.floor(seconds / HOUR), "hr"];
  return [Math.floor(seconds / DAY), "day"];
}

const plural = (n, unit) => `${n} ${unit}${n === 1 ? "" : "s"}`;

/** "just now" / "4 mins ago" — takes a unix timestamp in seconds. */
export function timeAgo(at) {
  const elapsed = Math.max(0, Math.floor(Date.now() / 1000) - at);
  if (elapsed < 10) return "just now";
  return `${plural(...split(elapsed))} ago`;
}

/** "expires in 23 hrs" — takes a unix timestamp in seconds. */
export function expiresIn(at) {
  const left = at - Math.floor(Date.now() / 1000);
  if (left <= 0) return "expired";
  return `expires in ${plural(...split(left))}`;
}

export const TTL_OPTIONS = [
  { label: "5 min", value: 5 * MINUTE },
  { label: "1 hour", value: HOUR },
  { label: "24 hours", value: DAY },
  { label: "7 days", value: 7 * DAY },
  { label: "30 days", value: 30 * DAY },
];

export const DEFAULT_TTL = DAY;
