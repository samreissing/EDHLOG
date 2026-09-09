import { pct } from "./stats.js";

const CHART_WIDTH = 760;
const CHART_HEIGHT = 260;
const CHART_PAD = { top: 24, right: 24, bottom: 44, left: 44 };

function escAttr(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function renderYGrid(plotH) {
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

/** @param {ReturnType<typeof import('./turn-stats.js').computeTurnGridStats>} rows */
function renderTurnXLabels(rows, plotW) {
  if (!rows.length) return "";

  const minTurn = rows[0].turn;
  const maxTurn = rows[rows.length - 1].turn;

  if (maxTurn - minTurn <= 8) {
    return rows
      .map((row) => {
        const x = turnToX(row.turn, minTurn, maxTurn, plotW);
        return `<text class="trends-axis-label trends-x-label" x="${x}" y="${CHART_HEIGHT - 10}" text-anchor="middle">${row.turn}</text>`;
      })
      .join("");
  }

  const indices = [0, Math.floor((rows.length - 1) / 2), rows.length - 1];
  return indices
    .map((index) => {
      const row = rows[index];
      const x = turnToX(row.turn, minTurn, maxTurn, plotW);
      const anchor = index === 0 ? "start" : index === rows.length - 1 ? "end" : "middle";
      return `<text class="trends-axis-label trends-x-label" x="${x}" y="${CHART_HEIGHT - 10}" text-anchor="${anchor}">${row.turn}</text>`;
    })
    .join("");
}

/**
 * @param {ReturnType<typeof import('./turn-stats.js').computeTurnGridStats>} rows
 */
export function renderTurnWinRateChart(rows) {
  const plotW = CHART_WIDTH - CHART_PAD.left - CHART_PAD.right;
  const plotH = CHART_HEIGHT - CHART_PAD.top - CHART_PAD.bottom;
  const baselineY = CHART_PAD.top + plotH;

  if (!rows.length) {
    return `<div class="turn-wr-chart-wrap muted">No turn data yet — add an end turn when logging games.</div>`;
  }

  const minTurn = rows[0].turn;
  const maxTurn = rows[rows.length - 1].turn;

  const points = rows
    .filter((row) => row.games > 0 && row.winRate != null)
    .map((row) => ({
      turn: row.turn,
      games: row.games,
      wins: row.wins,
      winRate: row.winRate,
      x: turnToX(row.turn, minTurn, maxTurn, plotW),
      y: CHART_PAD.top + plotH - row.winRate * plotH,
    }));

  const linePath = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");

  const areaPath = points.length
    ? `${linePath} L ${points[points.length - 1].x} ${baselineY} L ${points[0].x} ${baselineY} Z`
    : "";

  const dots = points
    .map(
      (point) => `
      <g class="turn-wr-point" data-turn="${point.turn}" data-wr="${point.winRate}" data-games="${point.games}" data-wins="${point.wins}">
        <circle class="turn-wr-point-hit" cx="${point.x}" cy="${point.y}" r="10" />
        <circle class="turn-wr-point-dot" cx="${point.x}" cy="${point.y}" r="3.5" />
      </g>`
    )
    .join("");

  return `
    <div class="turn-wr-chart-wrap">
      <svg class="trends-chart turn-wr-chart" viewBox="0 0 ${CHART_WIDTH} ${CHART_HEIGHT}" role="img" aria-label="Win rate by end turn">
        <defs>
          <linearGradient id="turn-wr-fill-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(91, 159, 212, 0.34)" />
            <stop offset="72%" stop-color="rgba(91, 159, 212, 0.12)" />
            <stop offset="100%" stop-color="rgba(91, 159, 212, 0.02)" />
          </linearGradient>
        </defs>
        ${renderYGrid(plotH)}
        ${areaPath ? `<path class="turn-wr-area" d="${areaPath}" fill="url(#turn-wr-fill-gradient)" />` : ""}
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
      const wr = Number(group.getAttribute("data-wr"));
      const games = group.getAttribute("data-games");
      const wins = group.getAttribute("data-wins");
      tip.innerHTML = `<strong>Turn ${escAttr(turn)}</strong><br>${escAttr(wins)}W / ${escAttr(games)}G · ${pct(wr)}`;
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
