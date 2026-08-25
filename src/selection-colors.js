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

function mixHex(fromHex, toHex, t) {
  const a = hexToRgb(fromHex);
  const b = hexToRgb(toHex);
  return rgbToHex(
    a.r + (b.r - a.r) * t,
    a.g + (b.g - a.g) * t,
    a.b + (b.b - a.b) * t
  );
}

function colorAtPathPosition(pathPos) {
  const stops = BROKEN_RAINBOW_STOPS;
  if (pathPos <= 0) return stops[0];
  if (pathPos >= stops.length - 1) return stops[stops.length - 1];
  const seg = Math.floor(pathPos);
  const t = pathPos - seg;
  return mixHex(stops[seg], stops[seg + 1], t);
}

/** Stretch the broken rainbow into N distinct hex colors. */
export function buildBrokenRainbowPalette(count) {
  if (count <= 0) return [];
  if (count === 1) return [BROKEN_RAINBOW_STOPS[0]];

  return Array.from({ length: count }, (_, index) => {
    const pathPos = (index / (count - 1)) * (BROKEN_RAINBOW_STOPS.length - 1);
    return colorAtPathPosition(pathPos);
  });
}

/** Color at a fixed palette slot; palette is stretched to totalRows. */
export function colorForSlotIndex(slotIndex, totalRows) {
  return buildBrokenRainbowPalette(totalRows)[slotIndex] ?? BROKEN_RAINBOW_STOPS[0];
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

export function toggleChartSelection(selectionMap, id, totalRows) {
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
