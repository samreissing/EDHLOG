/** Broken rainbow path: R → V → O → I → G → B → Y */
const BROKEN_RAINBOW_HEX = [
  "#df3a3a", // red
  "#a855c7", // violet
  "#e07a1f", // orange
  "#4f46b8", // indigo
  "#2a9d5c", // green
  "#3b82b4", // blue
  "#e5b822", // yellow
];

const [RED, VIOLET, ORANGE, INDIGO, GREEN, BLUE, YELLOW] = BROKEN_RAINBOW_HEX;

function hexToRgb(hex) {
  const value = hex.replace("#", "");
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

function rgbToHex(r, g, b) {
  const channel = (value) =>
    Math.max(0, Math.min(255, Math.round(value)))
      .toString(16)
      .padStart(2, "0");
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function mixHex(fromHex, toHex, t) {
  const a = hexToRgb(fromHex);
  const b = hexToRgb(toHex);
  return rgbToHex(lerp(a.r, b.r, t), lerp(a.g, b.g, t), lerp(a.b, b.b, t));
}

/** Trends path: primary stops plus warm/cool bridges (never V↔O — that reads as pink). */
const TRENDS_RAINBOW_ANCHORS = [
  RED,
  VIOLET,
  mixHex(RED, ORANGE, 0.5),
  mixHex(VIOLET, INDIGO, 0.5),
  ORANGE,
  INDIGO,
  GREEN,
  BLUE,
  YELLOW,
];

function samplePalette(source, pathPos) {
  if (pathPos <= 0) return source[0];
  if (pathPos >= source.length - 1) return source[source.length - 1];
  const lo = Math.floor(pathPos);
  const hi = Math.ceil(pathPos);
  if (lo === hi) return source[lo];
  return mixHex(source[lo], source[hi], pathPos - lo);
}

/** Trends Per 100 Games rows: N hex colors evenly spaced along the broken rainbow. */
export function buildTrendsRainbowPalette(totalRows) {
  if (totalRows <= 0) return [];
  if (totalRows === 1) return [RED];
  if (totalRows === BROKEN_RAINBOW_HEX.length) return [...BROKEN_RAINBOW_HEX];

  return Array.from({ length: totalRows }, (_, index) => {
    const anchorIndex = Math.round(
      (index * (TRENDS_RAINBOW_ANCHORS.length - 1)) / (totalRows - 1)
    );
    return TRENDS_RAINBOW_ANCHORS[anchorIndex];
  });
}

/** Brackets and other tables: evenly sample the seven stop hex values. */
export function buildBrokenRainbowPalette(totalRows) {
  if (totalRows <= 0) return [];
  if (totalRows === 1) return [RED];
  if (totalRows === BROKEN_RAINBOW_HEX.length) return [...BROKEN_RAINBOW_HEX];

  return Array.from({ length: totalRows }, (_, index) => {
    const pathPos = (index / (totalRows - 1)) * (BROKEN_RAINBOW_HEX.length - 1);
    return samplePalette(BROKEN_RAINBOW_HEX, pathPos);
  });
}

export function colorForRowIndex(index, totalRows) {
  return buildBrokenRainbowPalette(totalRows)[index] ?? RED;
}

export function trendsColorForRowIndex(index, totalRows) {
  return buildTrendsRainbowPalette(totalRows)[index] ?? RED;
}
