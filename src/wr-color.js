import { pct } from "./stats.js";

/** Commander baseline win rate in a 4-player pod. */
export const BASE_WR = 0.25;

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function hsl(h, s, l) {
  return `hsl(${h} ${s}% ${l}%)`;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpHsl(a, b, t) {
  return hsl(
    lerp(a[0], b[0], t),
    lerp(a[1], b[1], t),
    lerp(a[2], b[2], t)
  );
}

function lerpMulti(stops, rate) {
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    if (rate <= b.at) {
      const span = b.at - a.at || 1;
      const t = (rate - a.at) / span;
      return lerpHsl(a.hsl, b.hsl, clamp(t, 0, 1));
    }
  }
  return hsl(...stops[stops.length - 1].hsl);
}

/** Strong contrast: 25% light green, 40% clearly greener, 100% very dark green. */
export function wrBackgroundColor(wr) {
  const rate = clamp(wr, 0, 1);

  if (rate >= BASE_WR) {
    return lerpMulti(
      [
        { at: BASE_WR, hsl: [128, 48, 84] },
        { at: 0.35, hsl: [132, 52, 68] },
        { at: 0.45, hsl: [136, 58, 48] },
        { at: 0.6, hsl: [140, 62, 34] },
        { at: 0.8, hsl: [144, 68, 22] },
        { at: 1, hsl: [148, 72, 12] },
      ],
      rate
    );
  }

  return lerpMulti(
    [
      { at: 0, hsl: [0, 72, 48] },
      { at: 0.1, hsl: [18, 78, 52] },
      { at: 0.18, hsl: [42, 90, 58] },
      { at: BASE_WR, hsl: [128, 48, 84] },
    ],
    rate
  );
}

export function wrTextColor(wr) {
  const rate = clamp(wr, 0, 1);
  if (rate >= 0.5) return "#f4fff8";
  if (rate >= BASE_WR) return rate >= 0.38 ? "#f0fff4" : "#153520";
  return rate < 0.12 ? "#fff8f8" : "#3d2e08";
}

export function pctCell(wr, digits = 1) {
  if (wr == null || Number.isNaN(wr)) {
    return '<span class="wr-cell wr-na">—</span>';
  }
  const bg = wrBackgroundColor(wr);
  const fg = wrTextColor(wr);
  return `<span class="wr-cell" style="background:${bg};color:${fg}">${pct(wr, digits)}</span>`;
}
