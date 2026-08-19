/** Animated conic-gradient pie chart — no legend, no tooltips. */

const SLICE_PALETTE = [
  "#5b9fd4",
  "#3dba7a",
  "#c9a227",
  "#e05c5c",
  "#9b7ad4",
  "#e08a4a",
  "#6ec6ca",
  "#d46a9b",
  "#7a8cff",
  "#b8e986",
];

const MANA_HEX = {
  W: "#f0ead6",
  U: "#0e68ab",
  B: "#3d3d3d",
  R: "#c62828",
  G: "#2e7d32",
  C: "#9e9e9e",
};

function pickColor(slice, index) {
  if (slice.colors?.length === 1) return MANA_HEX[slice.colors[0]] || SLICE_PALETTE[index % SLICE_PALETTE.length];
  if (slice.color && MANA_HEX[slice.color]) return MANA_HEX[slice.color];
  if (slice.bracket != null) return SLICE_PALETTE[(slice.bracket - 1) % SLICE_PALETTE.length];
  if (slice.colors?.length > 1) {
    const first = slice.colors[0];
    return MANA_HEX[first] || SLICE_PALETTE[index % SLICE_PALETTE.length];
  }
  return SLICE_PALETTE[index % SLICE_PALETTE.length];
}

function buildConicGradient(slices) {
  const filtered = slices.filter((s) => s.value > 0);
  const total = filtered.reduce((sum, s) => sum + s.value, 0);
  if (!total) return null;

  let cursor = 0;
  const stops = filtered.map((slice, i) => {
    const pct = (slice.value / total) * 100;
    const start = cursor;
    cursor += pct;
    const color = pickColor(slice, i);
    return `${color} ${start.toFixed(2)}% ${cursor.toFixed(2)}%`;
  });

  return { gradient: `conic-gradient(from -90deg, ${stops.join(", ")})`, total };
}

/**
 * @param {Array<{ value: number, color?: string, colors?: string[], bracket?: number }>} slices
 * @param {string|number} animKey — change to replay animation
 */
export function renderPieChart(slices, animKey = 0) {
  const built = buildConicGradient(slices);
  if (!built) {
    return `<div class="pie-panel pie-panel--empty" data-pie-key="${animKey}"></div>`;
  }

  return `
    <div class="pie-panel" data-pie-key="${animKey}">
      <div class="pie-glow"></div>
      <div class="pie-ring" style="background:${built.gradient}"></div>
      <div class="pie-hole"></div>
    </div>`;
}

export function pieValue(row, sortCol) {
  if (sortCol === "wins") return row.wins || 0;
  if (sortCol === "decks") return row.decks || 0;
  if (sortCol === "winRate") return row.games || 0;
  if (sortCol === "bracket") return row.bracket;
  return row.games || 0;
}

export function pieSlicesFromRows(rows, sortCol, mapSlice) {
  return rows.map((row) => ({
    ...mapSlice(row),
    value: pieValue(row, sortCol),
  }));
}
