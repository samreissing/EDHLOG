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

/**
 * Color stat games/wins vs peer average (not for C — C uses WR baseline only).
 * ratio 1.0 = dark green; above avg → yellow/red; below avg → cyan/blue/purple.
 */
export function valueBackgroundColor(value, average) {
  if (!average || average <= 0) return "transparent";
  const ratio = value / average;

  if (ratio >= 1) {
    if (ratio <= 1.1) {
      return lerpMulti(
        [
          { at: 1, hsl: [140, 62, 34] },
          { at: 1.1, hsl: [128, 48, 84] },
        ],
        ratio
      );
    }
    return lerpMulti(
      [
        { at: 1.1, hsl: [55, 90, 58] },
        { at: 1.35, hsl: [18, 78, 52] },
        { at: 1.7, hsl: [0, 72, 42] },
        { at: 2.5, hsl: [0, 75, 28] },
      ],
      ratio
    );
  }

  if (ratio >= 0.9) {
    return lerpMulti(
      [
        { at: 0.9, hsl: [185, 55, 48] },
        { at: 1, hsl: [140, 62, 34] },
      ],
      ratio
    );
  }

  return lerpMulti(
    [
      { at: 0, hsl: [275, 58, 20] },
      { at: 0.5, hsl: [245, 52, 32] },
      { at: 0.9, hsl: [185, 55, 48] },
    ],
    ratio
  );
}

export function wrTextColor(wr) {
  const rate = clamp(wr, 0, 1);
  if (rate >= 0.5) return "#f4fff8";
  return "#0D0F0F";
}

export function valueTextColor(value, average) {
  if (!average || average <= 0) return "inherit";
  const ratio = value / average;
  if (ratio >= 0.92 && ratio <= 1.08) return "#f4fff8";
  if (ratio >= 1.35 || ratio <= 0.55) return "#f4fff8";
  return "#0D0F0F";
}

export function pctCell(wr, digits = 2) {
  if (wr == null || Number.isNaN(wr)) {
    return '<span class="wr-cell wr-na">—</span>';
  }
  const bg = wrBackgroundColor(wr);
  const fg = wrTextColor(wr);
  return `<span class="wr-cell" style="background:${bg};color:${fg}">${pct(wr, digits)}</span>`;
}

export function valueCell(value, average, formatted = String(value)) {
  if (value == null || Number.isNaN(value)) {
    return '<span class="wr-cell wr-na">—</span>';
  }
  if (!average || average <= 0) {
    return `<span class="wr-cell">${formatted}</span>`;
  }
  const bg = valueBackgroundColor(value, average);
  const fg = valueTextColor(value, average);
  return `<span class="wr-cell" style="background:${bg};color:${fg}">${formatted}</span>`;
}

/** Average games/wins/decks for color rows excluding C. */
export function colorStatAverage(rows, field) {
  const peers = rows.filter((r) => r.key !== "C");
  if (!peers.length) return 0;
  return peers.reduce((sum, r) => sum + (r[field] || 0), 0) / peers.length;
}
