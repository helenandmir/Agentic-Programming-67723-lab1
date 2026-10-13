// Shared helpers, constants and palette.

export const ISLAND_R = 10;

export const PALETTE = {
  grass: 0x7ed957,
  grassEdge: 0x5fb83a,
  rock: 0x8b6b4a,
  rockDark: 0x6e5440,
  wall: 0xfff3e0,
  roofs: [0xff6b6b, 0x2ec4b6, 0xffd166, 0x9b5de5, 0xf15bb5],
  water: 0x4cc9f0,
  foliage: [0x2d9c5a, 0x43aa8b, 0x90be6d],
  trunk: 0x7a4e2d,
  windowGlow: 0xffe8a3,
  door: 0x5a3a2a,
  skyTop: 0x1a1446,
  skyMid: 0x6a4c93,
  horizon: 0xffb4a2,
  sun: 0xffd6a5,
  citizens: [0xff6b6b, 0xffd166, 0x4cc9f0, 0xf15bb5, 0x9b5de5, 0xff9f1c, 0x80ed99],
};

// Deterministic RNG so the island looks identical on every load.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const rng = mulberry32(42);
export const rand = (a = 0, b = 1) => a + (b - a) * rng();
export const pick = (arr) => arr[Math.floor(rng() * arr.length)];

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
export const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOutBack = (t) => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

// Squash-and-stretch factor for a squash timer running from 0 upward (seconds).
export function squashFactor(tau) {
  if (tau === undefined || tau < 0 || tau > 0.8) return 1;
  return 1 + Math.sin(tau * 22) * Math.exp(-6 * tau) * 0.35;
}

// The single place where an entity's final scale is computed:
// base × category scale × squash (volume-preserving on x/z).
export function applyScale(obj, categoryScale = 1, extraSquashY = 1) {
  const ud = obj.userData;
  const k = (ud.baseScale ?? 1) * categoryScale;
  const s = squashFactor(ud.squash) * extraSquashY;
  const xz = 1 / Math.sqrt(s);
  obj.scale.set(k * xz, k * s, k * xz);
}

// Pick a random item different from the previous one (for quips).
export function pickFresh(arr, prev) {
  if (arr.length < 2) return arr[0];
  let v;
  do { v = pick(arr); } while (v === prev);
  return v;
}
