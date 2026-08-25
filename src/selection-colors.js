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

/**
 * Full table palette stretched to row count.
 * Up to 7 rows: exact RVYBOIY anchor stops.
 * 8+ rows: subdivide the anchor path so extra rows shift slightly along the rainbow.
 */
export function buildBrokenRainbowPalette(count) {
  const stops = BROKEN_RAINBOW_STOPS;
  if (count <= 0) return [];
  if (count === 1) return [stops[0]];
  if (count <= stops.length) return stops.slice(0, count);

  return Array.from({ length: count }, (_, index) => {
    const pathPos = (index / (count - 1)) * (stops.length - 1);
    return colorAtPathPosition(pathPos);
  });
}

/**
 * Color for a selection slot (0 = first pick, 1 = second, …).
 * Slots 0–6 always use the RVYBOIY anchor stops directly (red, violet, yellow, …).
 * Slot 7+ uses the extended palette when the table has more rows than anchors.
 */
export function colorForSlotIndex(slotIndex, totalRows) {
  const stops = BROKEN_RAINBOW_STOPS;
  if (slotIndex < stops.length) return stops[slotIndex];
  return buildBrokenRainbowPalette(totalRows)[slotIndex] ?? stops[stops.length - 1];
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
