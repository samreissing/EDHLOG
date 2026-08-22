import { pct } from "./stats.js";

/**
 * @param {import('./store.js').Game[]} games
 * @returns {Array<{ index: number, date: string, deck: string, wins: number, games: number, winRate: number }>}
 */
export function computeWinRateSeries(games) {
  let wins = 0;
  return games.map((game, index) => {
    if (game.result === "Win") wins += 1;
    const gamesPlayed = index + 1;
    return {
      index: gamesPlayed,
      date: game.date,
      deck: game.deck,
      wins,
      games: gamesPlayed,
      winRate: wins / gamesPlayed,
    };
  });
}

/**
 * @param {ReturnType<typeof computeWinRateSeries>} series
 * @param {string} title
 */
export function renderWinRateLineChart(series, title = "") {
  if (!series.length) {
    return `<div class="trends-chart-empty"></div>`;
  }

  const width = 760;
  const height = 260;
  const pad = { top: 24, right: 20, bottom: 36, left: 44 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const baseline = 0.25;

  const points = series.map((point, i) => {
    const x = pad.left + (series.length === 1 ? plotW / 2 : (i / (series.length - 1)) * plotW);
    const y = pad.top + plotH - point.winRate * plotH;
    return { ...point, x, y };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const baselineY = pad.top + plotH - baseline * plotH;

  const yTicks = [0, 0.25, 0.5, 0.75, 1];
  const yGrid = yTicks
    .map((tick) => {
      const y = pad.top + plotH - tick * plotH;
      return `<line class="trends-grid-line" x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}" />
        <text class="trends-axis-label" x="${pad.left - 8}" y="${y + 4}" text-anchor="end">${Math.round(tick * 100)}%</text>`;
    })
    .join("");

  const dots = points
    .map(
      (p) => `
      <circle class="trends-point" cx="${p.x}" cy="${p.y}" r="4"
        data-wr="${p.winRate}" data-games="${p.games}" data-wins="${p.wins}"
        data-date="${escAttr(p.date)}" data-deck="${escAttr(p.deck)}" data-index="${p.index}" />
    `
    )
    .join("");

  return `
    <div class="trends-chart-wrap">
      ${title ? `<div class="trends-chart-title">${escAttr(title)}</div>` : ""}
      <svg class="trends-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Win rate over time">
        ${yGrid}
        <line class="trends-baseline" x1="${pad.left}" y1="${baselineY}" x2="${width - pad.right}" y2="${baselineY}" />
        <path class="trends-line" d="${linePath}" />
        ${dots}
        <text class="trends-axis-label" x="${pad.left + plotW / 2}" y="${height - 8}" text-anchor="middle">Games</text>
      </svg>
      <div class="trends-chart-tip" hidden></div>
    </div>`;
}

function escAttr(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

export function bindWinRateLineCharts() {
  document.querySelectorAll(".trends-chart-wrap").forEach((wrap) => {
    const tip = wrap.querySelector(".trends-chart-tip");
    if (!tip) return;

    wrap.querySelectorAll(".trends-point").forEach((point) => {
      point.addEventListener("mouseenter", () => {
        const wr = Number(point.dataset.wr);
        tip.hidden = false;
        tip.innerHTML = `Game ${point.dataset.index}<br>${point.dataset.date}<br>${point.dataset.deck}<br>${pct(wr)} (${point.dataset.wins}/${point.dataset.games})`;
        const rect = wrap.getBoundingClientRect();
        const cx = Number(point.getAttribute("cx"));
        const cy = Number(point.getAttribute("cy"));
        tip.style.left = `${cx}px`;
        tip.style.top = `${cy}px`;
      });
      point.addEventListener("mouseleave", () => {
        tip.hidden = true;
      });
    });
  });
}
