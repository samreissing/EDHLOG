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

/** R→V is a hard jump; other segments include midpoints for smoother steps. */
function buildExpandedRainbowHex() {
  const palette = [BROKEN_RAINBOW_HEX[0], BROKEN_RAINBOW_HEX[1]];
  for (let index = 2; index < BROKEN_RAINBOW_HEX.length; index += 1) {
    palette.push(mixHex(BROKEN_RAINBOW_HEX[index - 1], BROKEN_RAINBOW_HEX[index], 0.5));
    palette.push(BROKEN_RAINBOW_HEX[index]);
  }
  return palette;
}

const EXPANDED_RAINBOW_HEX = buildExpandedRainbowHex();

function samplePalette(source, index, totalRows) {
  if (totalRows <= 1) return source[0];
  const pathPos = (index / (totalRows - 1)) * (source.length - 1);
  const lo = Math.floor(pathPos);
  const hi = Math.ceil(pathPos);
  if (lo === hi) return source[lo];
  return mixHex(source[lo], source[hi], pathPos - lo);
}

/** One hex per trends/brackets row, evenly spaced across the broken rainbow. */
export function buildBrokenRainbowPalette(totalRows) {
  if (totalRows <= 0) return [];
  if (totalRows === 1) return [BROKEN_RAINBOW_HEX[0]];
  if (totalRows === BROKEN_RAINBOW_HEX.length) return [...BROKEN_RAINBOW_HEX];
  if (totalRows === EXPANDED_RAINBOW_HEX.length) return [...EXPANDED_RAINBOW_HEX];

  return Array.from({ length: totalRows }, (_, index) =>
    samplePalette(EXPANDED_RAINBOW_HEX, index, totalRows)
  );
}

export function colorForRowIndex(index, totalRows) {
  return buildBrokenRainbowPalette(totalRows)[index] ?? BROKEN_RAINBOW_HEX[0];
}
