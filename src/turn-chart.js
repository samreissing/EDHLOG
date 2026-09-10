import { pct } from "./stats.js";

const CHART_WIDTH = 760;
const CHART_HEIGHT = 260;
const CHART_PAD = { top: 24, right: 24, bottom: 44, left: 44 };

/** @typedef {"normalizedWr" | "winRate" | "games"} TurnChartMetric */

function escAttr(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

/** @param {number} value */
function niceChartMax(value) {
  if (!Number.isFinite(value) || value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  let nice;
  if (normalized <= 1) nice = 1;
  else if (normalized <= 2) nice = 2;
  else if (normalized <= 5) nice = 5;
  else nice = 10;
  return nice * magnitude;
}

/** @param {number} plotH @param {TurnChartMetric} metric @param {number} [maxValue] */
function renderYGrid(plotH, metric, maxValue = 1) {
  if (metric === "games") {
    const max = niceChartMax(maxValue);
    const yTicks = [0, 0.25, 0.5, 0.75, 1].map((tick) => tick * max);
    return yTicks
      .map((tick) => {
        const y = CHART_PAD.top + plotH - (max ? (tick / max) * plotH : 0);
        const label = Number.isInteger(tick) ? String(tick) : tick.toFixed(1);
        return `<line class="trends-grid-line" x1="${CHART_PAD.left}" y1="${y}" x2="${CHART_WIDTH - CHART_PAD.right}" y2="${y}" />
        <text class="trends-axis-label" x="${CHART_PAD.left - 8}" y="${y + 4}" text-anchor="end">${label}</text>`;
      })
      .join("");
  }

  const yTicks = [0, 0.25, 0.5, 0.75, 1];
  return yTicks
    .map((tick) => {
      const y = CHART_PAD.top + plotH - tick * plotH;
      return `<line class="trends-grid-line" x1="${CHART_PAD.left}" y1="${y}" x2="${CHART_WIDTH - CHART_PAD.right}" y2="${y}" />
        <text class="trends-axis-label" x="${CHART_PAD.left - 8}" y="${y + 4}" text-anchor="end">${Math.round(tick * 100)}%</text>`;
    })
    .join("");
}

/** @param {number} turn @param {number} minTurn @param {number} maxTurn @param {number} plotW */
function turnToX(turn, minTurn, maxTurn, plotW) {
  if (maxTurn <= minTurn) return CHART_PAD.left + plotW / 2;
  const fraction = (turn - minTurn) / (maxTurn - minTurn);
  return CHART_PAD.left + fraction * plotW;
}

/** @param {{ x: number, y: number }[]} points */
function smoothLinePath(points) {
  if (!points.length) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[index - 1] || points[index];
    const p1 = points[index];
    const p2 = points[index + 1];
    const p3 = points[index + 2] || p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return path;
}

/** @param {ReturnType<typeof import('./turn-stats.js').computeTurnGridStats>} rows @param {number} plotW */
function renderTurnXLabels(rows, plotW) {
  if (!rows.length) return "";

  const minTurn = rows[0].turn;
  const maxTurn = rows[rows.length - 1].turn;
  const span = maxTurn - minTurn;
  const labelRows =
    span <= 24 ? rows : rows.filter((_, index) => index % Math.ceil(span / 24) === 0 || index === rows.length - 1);

  return labelRows
    .map((row) => {
      const x = turnToX(row.turn, minTurn, maxTurn, plotW);
      return `<text class="trends-axis-label trends-x-label" x="${x}" y="${CHART_HEIGHT - 10}" text-anchor="middle">${row.turn}</text>`;
    })
    .join("");
}

/**
 * @param {ReturnType<typeof import('./turn-stats.js').computeTurnGridStats>[number]} row
 * @param {TurnChartMetric} metric
 * @param {"player" | "distribution"} mode
 */
function getTurnChartValue(row, metric, mode) {
  if (metric === "games") {
    return row.games > 0 ? row.games : null;
  }

  const ended = mode === "distribution" ? row.games : row.wins + row.losses;
  if (!ended) return null;
  if (metric === "normalizedWr") return row.normalizedWr;
  return row.winRate;
}

/** @param {TurnChartMetric} metric @param {"player" | "distribution"} mode */
function turnChartLabel(metric, mode) {
  if (mode === "distribution") return "Share of games ending by turn";
  if (metric === "games") return "Games reached by turn";
  if (metric === "normalizedWr") return "Normalized win rate by end turn";
  return "Win rate by end turn";
}

/**
 * @param {ReturnType<typeof import('./turn-stats.js').computeTurnGridStats>} rows
 * @param {{ gradientId?: string, mode?: "player" | "distribution", metric?: TurnChartMetric }} [options]
 */
export function renderTurnWinRateChart(rows, options = {}) {
  const { gradientId = "turn-wr-fill-gradient", mode = "player", metric = "winRate" } = options;
  const plotW = CHART_WIDTH - CHART_PAD.left - CHART_PAD.right;
  const plotH = CHART_HEIGHT - CHART_PAD.top - CHART_PAD.bottom;
  const baselineY = CHART_PAD.top + plotH;

  if (!rows.length) {
    return `<div class="turn-wr-chart-wrap muted">No turn data yet — add an end turn when logging games.</div>`;
  }

  const minTurn = rows[0].turn;
  const maxTurn = rows[rows.length - 1].turn;
  const chartValues = rows
    .map((row) => getTurnChartValue(row, metric, mode))
    .filter((value) => value != null);
  const maxChartValue =
    metric === "games" ? Math.max(...chartValues.map((value) => Number(value) || 0), 1) : 1;

  const points = rows
    .map((row) => {
      const ended = mode === "distribution" ? row.games : row.wins + row.losses;
      const value = getTurnChartValue(row, metric, mode);
      const normalized = metric === "games" ? (value ?? 0) / maxChartValue : value;
      return {
        turn: row.turn,
        games: row.games,
        wins: row.wins,
        losses: row.losses,
        ended,
        winRate: row.winRate,
        normalizedWr: row.normalizedWr,
        value,
        x: turnToX(row.turn, minTurn, maxTurn, plotW),
        y: value == null ? null : CHART_PAD.top + plotH - normalized * plotH,
      };
    })
    .filter((point) => point.y != null);

  const linePath = smoothLinePath(points);

  const areaPath = points.length
    ? `${linePath} L ${points[points.length - 1].x} ${baselineY} L ${points[0].x} ${baselineY} Z`
    : "";

  const dots = rows
    .map((row) => {
      const ended = mode === "distribution" ? row.games : row.wins + row.losses;
      const value = getTurnChartValue(row, metric, mode);
      if (value == null) return "";
      const normalized = metric === "games" ? value / maxChartValue : value;
      const x = turnToX(row.turn, minTurn, maxTurn, plotW);
      const y = CHART_PAD.top + plotH - normalized * plotH;
      return `
      <g class="turn-wr-point" data-turn="${row.turn}" data-wr="${row.winRate ?? ""}" data-normalized-wr="${row.normalizedWr ?? ""}" data-value="${value}" data-games="${row.games}" data-wins="${row.wins}" data-losses="${row.losses}" data-ended="${ended}" data-mode="${mode}" data-metric="${metric}">
        <circle class="turn-wr-point-hit" cx="${x}" cy="${y}" r="10" />
        <circle class="turn-wr-point-dot" cx="${x}" cy="${y}" r="3.5" />
      </g>`;
    })
    .join("");

  const chartLabel = turnChartLabel(metric, mode);

  return `
    <div class="turn-wr-chart-wrap" data-turn-chart-metric="${metric}">
      <svg class="trends-chart turn-wr-chart" viewBox="0 0 ${CHART_WIDTH} ${CHART_HEIGHT}" role="img" aria-label="${chartLabel}">
        <defs>
          <linearGradient id="${gradientId}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(91, 159, 212, 0.34)" />
            <stop offset="72%" stop-color="rgba(91, 159, 212, 0.12)" />
            <stop offset="100%" stop-color="rgba(91, 159, 212, 0.02)" />
          </linearGradient>
        </defs>
        ${renderYGrid(plotH, metric, maxChartValue)}
        ${areaPath ? `<path class="turn-wr-area" d="${areaPath}" fill="url(#${gradientId})" />` : ""}
        ${linePath ? `<path class="turn-wr-line" d="${linePath}" />` : ""}
        ${dots}
        ${renderTurnXLabels(rows, plotW)}
        <text class="trends-axis-label" x="${CHART_PAD.left + plotW / 2}" y="${CHART_HEIGHT - 28}" text-anchor="middle">Turn</text>
      </svg>
      <div class="turn-wr-chart-tip" hidden></div>
    </div>`;
}

/** Bind hover tooltips for turn win-rate chart points inside `root`. */
export function bindTurnWinRateChart(root = document) {
  const wrap = root.querySelector(".turn-wr-chart-wrap");
  const tip = wrap?.querySelector(".turn-wr-chart-tip");
  if (!wrap || !tip) return;

  const hideTip = () => {
    tip.hidden = true;
    wrap.querySelectorAll(".turn-wr-point.active").forEach((node) => node.classList.remove("active"));
  };

  wrap.querySelectorAll(".turn-wr-point").forEach((group) => {
    group.addEventListener("mouseenter", () => {
      wrap.querySelectorAll(".turn-wr-point.active").forEach((node) => node.classList.remove("active"));
      group.classList.add("active");
      const turn = group.getAttribute("data-turn");
      const wr = group.getAttribute("data-wr");
      const normalizedWr = group.getAttribute("data-normalized-wr");
      const value = group.getAttribute("data-value");
      const games = group.getAttribute("data-games");
      const wins = group.getAttribute("data-wins");
      const losses = group.getAttribute("data-losses");
      const pointMode = group.getAttribute("data-mode") || "player";
      const metric = group.getAttribute("data-metric") || "winRate";
      if (pointMode === "distribution") {
        tip.innerHTML = `<strong>Turn ${escAttr(turn)}</strong><br>${escAttr(games)} ended · ${pct(Number(wr))} of games`;
      } else if (metric === "games") {
        tip.innerHTML = `<strong>Turn ${escAttr(turn)}</strong><br>${escAttr(value)} games reached`;
      } else if (metric === "normalizedWr") {
        tip.innerHTML = `<strong>Turn ${escAttr(turn)}</strong><br>${escAttr(wins)}W / ${escAttr(losses)}L · ${pct(Number(normalizedWr))} norm WR<br>${escAttr(games)} reached`;
      } else {
        tip.innerHTML = `<strong>Turn ${escAttr(turn)}</strong><br>${escAttr(wins)}W / ${escAttr(losses)}L · ${pct(Number(wr))}<br>${escAttr(games)} reached`;
      }
      tip.hidden = false;
    });

    group.addEventListener("mousemove", (event) => {
      const bounds = wrap.getBoundingClientRect();
      tip.style.left = `${event.clientX - bounds.left}px`;
      tip.style.top = `${event.clientY - bounds.top}px`;
    });

    group.addEventListener("mouseleave", hideTip);
  });

  wrap.addEventListener("mouseleave", hideTip);
}
