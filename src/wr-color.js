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

/** Background color: light green @ 25%, deeper green toward 100%, yellow then red below 25%. */
export function wrBackgroundColor(wr) {
  const rate = clamp(wr, 0, 1);
  const lightGreen = [140, 52, 78];
  const deepGreen = [145, 58, 32];
  const yellow = [48, 88, 68];
  const red = [0, 68, 52];

  if (rate >= BASE_WR) {
    const t = (rate - BASE_WR) / (1 - BASE_WR);
    return lerpHsl(lightGreen, deepGreen, t);
  }

  const t = rate / BASE_WR;
  if (t <= 0.5) {
    return lerpHsl(red, yellow, t / 0.5);
  }
  return lerpHsl(yellow, lightGreen, (t - 0.5) / 0.5);
}

export function wrTextColor(wr) {
  const rate = clamp(wr, 0, 1);
  if (rate >= BASE_WR) {
    return rate > 0.55 ? "#f0faf4" : "#12341f";
  }
  return rate < 0.12 ? "#fff5f5" : "#3d3010";
}

export function pctCell(wr, digits = 1) {
  if (wr == null || Number.isNaN(wr)) {
    return '<span class="wr-cell wr-na">—</span>';
  }
  const bg = wrBackgroundColor(wr);
  const fg = wrTextColor(wr);
  return `<span class="wr-cell" style="background:${bg};color:${fg}">${pct(wr, digits)}</span>`;
}
