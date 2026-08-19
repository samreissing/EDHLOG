/** SVG pie chart sized by a numeric metric per row. */

const SLICE_COLORS = [
  "#5b9fd4",
  "#3dba7a",
  "#c9a227",
  "#e05c5c",
  "#9b7ad4",
  "#e08a4a",
  "#6ec6ca",
  "#d46a9b",
];

const MANA_SLICE = {
  W: "#f8f6d8",
  U: "#0e68ab",
  B: "#2a2a35",
  R: "#d3202a",
  G: "#00733e",
  C: "#888888",
  Bracket: null,
};

function sliceColor(item, index, colorKey) {
  if (colorKey && MANA_SLICE[colorKey]) return MANA_SLICE[colorKey];
  if (item.color && MANA_SLICE[item.color]) return MANA_SLICE[item.color];
  if (item.bracket != null) return SLICE_COLORS[(item.bracket - 1) % SLICE_COLORS.length];
  return SLICE_COLORS[index % SLICE_COLORS.length];
}

function polar(cx, cy, r, angle) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx, cy, r, startAngle, endAngle) {
  if (endAngle - startAngle >= 360) {
    return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`;
  }
  const start = polar(cx, cy, r, startAngle);
  const end = polar(cx, cy, r, endAngle);
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y} Z`;
}

/**
 * @param {Array<{ label: string, value: number, color?: string, bracket?: number }>} slices
 * @param {string} metricLabel
 */
export function renderPieChart(slices, metricLabel = "Total") {
  const filtered = slices.filter((s) => s.value > 0);
  const total = filtered.reduce((sum, s) => sum + s.value, 0);
  if (!total) {
    return `<div class="pie-wrap"><div class="pie-empty">No data</div></div>`;
  }

  const cx = 50;
  const cy = 50;
  const r = 42;
  let angle = 0;
  const paths = filtered.map((slice, i) => {
    const sweep = (slice.value / total) * 360;
    const path = arcPath(cx, cy, r, angle, angle + sweep);
    const fill = sliceColor(slice, i, slice.color);
    angle += sweep;
    return `<path d="${path}" fill="${fill}" stroke="#0d0f14" stroke-width="1"><title>${slice.label}: ${slice.value}</title></path>`;
  });

  const legend = filtered
    .map((slice, i) => {
      const pctVal = ((slice.value / total) * 100).toFixed(1);
      const fill = sliceColor(slice, i, slice.color);
      return `<li><span class="pie-swatch" style="background:${fill}"></span><span>${slice.label}</span><span class="pie-val">${slice.value} (${pctVal}%)</span></li>`;
    })
    .join("");

  return `
    <div class="pie-wrap">
      <svg class="pie-chart" viewBox="0 0 100 100" aria-hidden="true">${paths.join("")}</svg>
      <div class="pie-meta">
        <span class="pie-metric">${metricLabel}</span>
        <ul class="pie-legend">${legend}</ul>
      </div>
    </div>`;
}

export function metricLabelForSort(col) {
  const labels = {
    colorOrder: "Games",
    decks: "Decks",
    games: "Games",
    wins: "Wins",
    winRate: "Games",
    bracket: "Bracket",
  };
  return labels[col] || "Total";
}

export function pieValue(row, sortCol) {
  if (sortCol === "wins") return row.wins || 0;
  if (sortCol === "decks") return row.decks || 0;
  if (sortCol === "winRate") return row.games || 0;
  if (sortCol === "bracket") return row.bracket;
  return row.games || 0;
}

export function pieLabel(row, kind) {
  if (kind === "color") return row.name || row.color;
  if (kind === "bracket") return `Bracket ${row.bracket}`;
  return String(row.label ?? row.name ?? "");
}
