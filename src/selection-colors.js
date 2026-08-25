/** Broken rainbow path: R → V → O → I → G → B → Y */
const BROKEN_RAINBOW_STOPS = [
  { h: 0, s: 72, l: 52 },
  { h: 275, s: 55, l: 58 },
  { h: 28, s: 78, l: 52 },
  { h: 248, s: 52, l: 48 },
  { h: 140, s: 62, l: 42 },
  { h: 210, s: 58, l: 52 },
  { h: 48, s: 90, l: 52 },
];

/** Follow the broken path in stop order — not the shortest hue arc (which clusters pinks). */
const SEGMENT_HUE_DELTAS = [
  275, // R → V
  -247, // V → O
  220, // O → I
  -108, // I → G
  70, // G → B
  -162, // B → Y
];

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function hslColor(h, s, l) {
  return `hsl(${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%)`;
}

function interpolateStop(index) {
  const stops = BROKEN_RAINBOW_STOPS;
  if (index <= 0) return stops[0];
  if (index >= stops.length - 1) return stops[stops.length - 1];
  const seg = Math.floor(index);
  const t = index - seg;
  const a = stops[seg];
  const b = stops[seg + 1];
  return {
    h: (a.h + SEGMENT_HUE_DELTAS[seg] * t + 360) % 360,
    s: lerp(a.s, b.s, t),
    l: lerp(a.l, b.l, t),
  };
}

/** Evenly divide the broken rainbow across table rows — no wrap/reuse. */
export function colorForRowIndex(index, totalRows) {
  if (totalRows <= 0) return hslColor(0, 0, 50);
  if (totalRows === 1) {
    const stop = BROKEN_RAINBOW_STOPS[0];
    return hslColor(stop.h, stop.s, stop.l);
  }
  const pathPos = (index / (totalRows - 1)) * (BROKEN_RAINBOW_STOPS.length - 1);
  const stop = interpolateStop(pathPos);
  return hslColor(stop.h, stop.s, stop.l);
}

export function buildBrokenRainbowPalette(totalRows) {
  return Array.from({ length: totalRows }, (_, index) => colorForRowIndex(index, totalRows));
}
