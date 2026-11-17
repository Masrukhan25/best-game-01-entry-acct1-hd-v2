// utils.js — small math and random helpers shared by every VOIDLIGHT v2 system.
// No dependencies. Everything here is pure and deterministic given its inputs.

export const TAU = Math.PI * 2;

/** Clamp v into [lo, hi]. */
export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Linear interpolation between a and b by t. */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** A uniform random number in [a, b). */
export function rand(a = 1, b) {
  if (b === undefined) return Math.random() * a;
  return a + Math.random() * (b - a);
}

/** A uniform random integer in [a, b]. */
export function randInt(a, b) {
  return Math.floor(rand(a, b + 1));
}

/** A random element of arr. */
export function choice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Seeded RNG (mulberry32) for deterministic wave layouts. */
export function mulberry32(seed) {
  let s = seed >>> 0;
  return function next() {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Squared distance between two points (avoids a sqrt). */
export function dist2(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

/** Angle from (ax, ay) to (bx, by). */
export function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

/** True when two circles overlap. */
export function circlesHit(ax, ay, ar, bx, by, br) {
  const r = ar + br;
  return dist2(ax, ay, bx, by) < r * r;
}

/** Shortest signed turn from angle a toward angle b, in (-PI, PI]. */
export function angleDelta(a, b) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}
