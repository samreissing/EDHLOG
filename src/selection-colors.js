/** Broken rainbow path: R → V → Y → B → O → I → Y */
const BROKEN_RAINBOW_STOPS = [
  "#ef4444", // red
  "#7c3aed", // violet
  "#eab308", // yellow
  "#3b82f6", // blue
  "#f97316", // orange
  "#4338ca", // indigo
  "#facc15", // yellow (end)
];

/** Chart line color when a bracket filter button is active (not table rainbow). */
export const CHART_FILTER_ACCENT = "#5b9fd4";

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

/** RGB average between two anchor stops. */
function mixHex(fromHex, toHex, t) {
  const a = hexToRgb(fromHex);
  const b = hexToRgb(toHex);
  return rgbToHex(
    a.r + (b.r - a.r) * t,
    a.g + (b.g - a.g) * t,
    a.b + (b.b - a.b) * t
  );
}

/**
 * Build N distinct colors along the RVYBOIY path.
 * - N <= 7: first N anchor stops exactly (no repeats).
 * - N > 7: keep all 7 anchors, insert averaged in-between colors on the path segments.
 */
export function buildBrokenRainbowPalette(count) {
  const stops = BROKEN_RAINBOW_STOPS;
  if (count <= 0) return [];
  if (count === 1) return [stops[0]];
  if (count <= stops.length) return stops.slice(0, count);

  const segmentCount = stops.length - 1;
  const extras = count - stops.length;
  const segmentExtras = Array.from({ length: segmentCount }, (_, index) =>
    Math.floor(extras / segmentCount) + (index < extras % segmentCount ? 1 : 0)
  );

  const palette = [];
  for (let seg = 0; seg < segmentCount; seg += 1) {
    const from = stops[seg];
    const to = stops[seg + 1];
    palette.push(from);
    const internal = segmentExtras[seg];
    for (let step = 1; step <= internal; step += 1) {
      palette.push(mixHex(from, to, step / (internal + 1)));
    }
  }
  palette.push(stops[stops.length - 1]);

  return palette.slice(0, count);
}

/** Color for selection slot index; palette always sized to totalRows. */
export function colorForSlotIndex(slotIndex, totalRows) {
  const palette = buildBrokenRainbowPalette(totalRows);
  return palette[slotIndex] ?? palette[palette.length - 1] ?? BROKEN_RAINBOW_STOPS[0];
}

function lowestAvailableSlot(usedSlots) {
  let slot = 0;
  while (usedSlots.has(slot)) slot += 1;
  return slot;
}

/** @returns {Map<string, number>} id -> palette slot index */
export function newChartSelection() {
  return new Map();
}

export function toggleChartSelection(selectionMap, id) {
  const key = String(id);
  if (selectionMap.has(key)) {
    selectionMap.delete(key);
    return false;
  }
  const usedSlots = new Set(selectionMap.values());
  selectionMap.set(key, lowestAvailableSlot(usedSlots));
  return true;
}

export function colorForChartSelection(selectionMap, id, totalRows) {
  const slot = selectionMap.get(String(id));
  return slot == null ? null : colorForSlotIndex(slot, totalRows);
}

/** @deprecated use colorForSlotIndex */
export function colorForSelectionIndex(selectionIndex, selectionCount) {
  return colorForSlotIndex(selectionIndex, selectionCount);
}

/** @deprecated use colorForSlotIndex */
export function colorForRowIndex(index, totalRows) {
  return colorForSlotIndex(index, totalRows);
}
