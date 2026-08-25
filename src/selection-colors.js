/** Broken rainbow path: R → V → Y → B → O → I → Y */
const BROKEN_RAINBOW_HEX = [
  "#ef4444", // red
  "#7c3aed", // violet
  "#eab308", // yellow
  "#3b82f6", // blue
  "#f97316", // orange
  "#4338ca", // indigo
  "#eab308", // yellow
];

/** Evenly divide the broken rainbow across table rows — one hex per row index. */
export function buildBrokenRainbowPalette(totalRows) {
  if (totalRows <= 0) return [];
  if (totalRows === 1) return [BROKEN_RAINBOW_HEX[0]];
  if (totalRows === BROKEN_RAINBOW_HEX.length) return [...BROKEN_RAINBOW_HEX];

  return Array.from({ length: totalRows }, (_, index) => {
    const anchorIndex = Math.round(
      (index * (BROKEN_RAINBOW_HEX.length - 1)) / (totalRows - 1)
    );
    return BROKEN_RAINBOW_HEX[anchorIndex];
  });
}

export function colorForRowIndex(index, totalRows) {
  return buildBrokenRainbowPalette(totalRows)[index] ?? BROKEN_RAINBOW_HEX[0];
}
