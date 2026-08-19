/** SVG donut pie chart with slice hover values. */

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

export function getBracketColor(bracket) {
  return SLICE_PALETTE[(bracket - 1) % SLICE_PALETTE.length];
}

export function pickSliceColor(slice, index) {
  if (slice.colors?.length === 1) return MANA_HEX[slice.colors[0]] || SLICE_PALETTE[index % SLICE_PALETTE.length];
  if (slice.color && MANA_HEX[slice.color]) return MANA_HEX[slice.color];
  if (slice.bracket != null) return getBracketColor(slice.bracket);
  if (slice.colors?.length > 1) {
    return MANA_HEX[slice.colors[0]] || SLICE_PALETTE[index % SLICE_PALETTE.length];
  }
  return SLICE_PALETTE[index % SLICE_PALETTE.length];
}

function polar(cx, cy, r, deg) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function donutArc(cx, cy, rOut, rIn, startDeg, endDeg) {
  const sweep = endDeg - startDeg;
  if (sweep <= 0) return "";
  if (sweep >= 360) endDeg = startDeg + 359.999;

  const so = polar(cx, cy, rOut, startDeg);
  const eo = polar(cx, cy, rOut, endDeg);
  const si = polar(cx, cy, rIn, endDeg);
  const ei = polar(cx, cy, rIn, startDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;

  return `M ${so.x} ${so.y} A ${rOut} ${rOut} 0 ${large} 1 ${eo.x} ${eo.y} L ${si.x} ${si.y} A ${rIn} ${rIn} 0 ${large} 0 ${ei.x} ${ei.y} Z`;
}

function escAttr(str) {
  return String(str).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function sliceLabel(row) {
  if (row.bracket != null) return `Bracket ${row.bracket}`;
  if (row.name) return row.name;
  if (row.key) return row.key;
  return "Slice";
}

function sliceFill(slice, index, startDeg, sweep, animKey) {
  if (slice.bracket != null) {
    return { fill: getBracketColor(slice.bracket), def: null };
  }

  const manaColors = (slice.colors || (slice.color ? [slice.color] : [])).filter((c) => MANA_HEX[c]);
  if (manaColors.length <= 1) {
    return {
      fill: manaColors[0] ? MANA_HEX[manaColors[0]] : pickSliceColor(slice, index),
      def: null,
    };
  }

  const id = `pg-${animKey}-${index}`;
  const mid = ((startDeg + sweep / 2 - 90) * Math.PI) / 180;
  const x1 = 50 + 40 * Math.cos(mid + Math.PI);
  const y1 = 50 + 40 * Math.sin(mid + Math.PI);
  const x2 = 50 + 40 * Math.cos(mid);
  const y2 = 50 + 40 * Math.sin(mid);
  const stops = manaColors
    .map((color, idx) => {
      const offset = manaColors.length === 1 ? 0 : (idx / (manaColors.length - 1)) * 100;
      return `<stop offset="${offset}%" stop-color="${MANA_HEX[color]}" />`;
    })
    .join("");
  const def = `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops}</linearGradient>`;
  return { fill: `url(#${id})`, def };
}

/**
 * @param {Array<{ value: number, hover?: string, color?: string, colors?: string[], bracket?: number }>} slices
 */
export function renderPieChart(slices, animKey = 0) {
  const filtered = slices.filter((s) => s.value > 0);
  const total = filtered.reduce((sum, s) => sum + s.value, 0);
  if (!total) {
    return `<div class="pie-panel pie-panel--empty" data-pie-key="${animKey}"></div>`;
  }

  let angle = 0;
  const defs = [];
  const paths = filtered.map((slice, i) => {
    const sweep = (slice.value / total) * 360;
    const d = donutArc(50, 50, 44, 28, angle, angle + sweep);
    const { fill, def } = sliceFill(slice, i, angle, sweep, animKey);
    if (def) defs.push(def);
    const hover = slice.hover || String(slice.value);
    angle += sweep;
    return `<path class="pie-slice" d="${d}" fill="${fill}" data-hover="${escAttr(hover)}" style="animation-delay:${i * 0.045}s" />`;
  });

  return `
    <div class="pie-panel" data-pie-key="${animKey}">
      <svg class="pie-svg" viewBox="0 0 100 100" aria-hidden="true">${defs.length ? `<defs>${defs.join("")}</defs>` : ""}${paths.join("")}</svg>
      <div class="pie-tooltip" hidden></div>
    </div>`;
}

export function pieValue(row, sortCol) {
  if (sortCol === "wins") return row.wins || 0;
  if (sortCol === "decks") return row.decks || 0;
  if (sortCol === "winRate") return row.games || 0;
  if (sortCol === "bracket") return row.games || 0;
  return row.games || 0;
}

export function pieHoverText(row, sortCol) {
  const label = sliceLabel(row);
  if (sortCol === "wins") return `${label}: ${row.wins || 0} wins`;
  if (sortCol === "decks") return `${label}: ${row.decks || 0} decks`;
  if (sortCol === "winRate" || sortCol === "bracket") return `${label}: ${row.games || 0} games`;
  return `${label}: ${row.games || 0} games`;
}

export function pieSlicesFromRows(rows, sortCol, mapSlice) {
  return rows.map((row) => {
    const slice = mapSlice(row);
    return {
      ...slice,
      value: pieValue(row, sortCol),
      hover: slice.hover ?? pieHoverText(row, sortCol),
    };
  });
}

export function bindPieCharts(root = document.getElementById("main")) {
  if (!root) return;
  root.querySelectorAll(".pie-panel:not(.pie-panel--empty)").forEach((panel) => {
    const tip = panel.querySelector(".pie-tooltip");
    const svg = panel.querySelector(".pie-svg");
    if (!tip || !svg) return;

    panel.querySelectorAll(".pie-slice").forEach((slice) => {
      slice.addEventListener("mouseenter", () => {
        tip.textContent = slice.getAttribute("data-hover") || "";
        tip.hidden = false;
      });
      slice.addEventListener("mousemove", (e) => {
        const rect = panel.getBoundingClientRect();
        tip.style.left = `${e.clientX - rect.left}px`;
        tip.style.top = `${e.clientY - rect.top}px`;
      });
      slice.addEventListener("mouseleave", () => {
        tip.hidden = true;
      });
    });
  });
}
