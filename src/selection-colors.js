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

function colorAtPathPosition(pathPos) {
  const stops = BROKEN_RAINBOW_STOPS;
  if (pathPos <= 0) return stops[0];
  if (pathPos >= stops.length - 1) return stops[stops.length - 1];
  const seg = Math.floor(pathPos);
  const t = pathPos - seg;
  return mixHex(stops[seg], stops[seg + 1], t);
}

/**
 * Palette index assignment order for N rows (0-based).
 * e.g. 10 rows → 0,9,2,7,4,5,1,8,3,6 (1,10,3,8,5,6,2,9,4,7 in 1-based terms).
 * First pick = index 0 (red), second = index N-1 (violet), then spreads inward.
 */
export function buildSpreadSelectionOrder(count) {
  if (count <= 0) return [];
  if (count === 1) return [0];

  const order = [];
  const used = new Set();
  let low = 0;
  let high = count - 1;

  while (true) {
    if (!used.has(low)) {
      order.push(low);
      used.add(low);
    }
    if (low === high) break;
    if (!used.has(high)) {
      order.push(high);
      used.add(high);
    }
    if (used.size >= count) break;
    const nextLow = low + 2;
    const nextHigh = high - 2;
    if (nextLow > nextHigh) break;
    low = nextLow;
    high = nextHigh;
  }

  low = 0;
  high = count - 1;
  while (low <= high) {
    if (!used.has(low)) {
      order.push(low);
      used.add(low);
    }
    if (low !== high && !used.has(high)) {
      order.push(high);
      used.add(high);
    }
    low += 1;
    high -= 1;
  }

  return order;
}

/**
 * N colors stretched along the rainbow.
 * Index 0 is always red; index N-1 is always violet (first two picks).
 * Middle slots fill the rest of the RVYBOIY path with averaged blends.
 */
export function buildBrokenRainbowPalette(count) {
  const stops = BROKEN_RAINBOW_STOPS;
  if (count <= 0) return [];
  if (count === 1) return [stops[0]];
  if (count === 2) return [stops[0], stops[1]];

  const palette = new Array(count);
  palette[0] = stops[0];
  palette[count - 1] = stops[1];

  const middle = count - 2;
  if (middle === 1) {
    palette[1] = colorAtPathPosition((stops.length - 1) / 2);
    return palette;
  }

  for (let i = 0; i < middle; i += 1) {
    const pathPos = 2 + (i / (middle - 1)) * (stops.length - 1 - 2);
    palette[i + 1] = colorAtPathPosition(pathPos);
  }
  return palette;
}

/** Color at a palette index for a table with totalRows. */
export function colorForSlotIndex(slotIndex, totalRows) {
  const palette = buildBrokenRainbowPalette(totalRows);
  return palette[slotIndex] ?? palette[palette.length - 1] ?? BROKEN_RAINBOW_STOPS[0];
}

function nextSpreadSlot(usedSlots, totalRows) {
  for (const slot of buildSpreadSelectionOrder(totalRows)) {
    if (!usedSlots.has(slot)) return slot;
  }
  return 0;
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
  selectionMap.set(key, nextSpreadSlot(usedSlots, totalRows));
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
