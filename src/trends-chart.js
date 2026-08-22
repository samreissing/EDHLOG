import { formatDate, normalizeDate } from "./dates.js";
import { pct } from "./stats.js";

/**
 * One point per calendar day. Multiple games on the same day are combined into
 * a single point using that day's average win rate, while cumulative totals
 * reflect all games through the end of that day.
 * @param {import('./store.js').Game[]} games
 */
export function computeWinRateSeries(games) {
  if (!games.length) return [];

  let cumulativeWins = 0;
  let cumulativeGames = 0;
  /** @type {Map<string, { date: string, dayWins: number, dayGames: number, cumulativeWins: number, cumulativeGames: number }>} */
  const byDay = new Map();

  for (const game of games) {
    cumulativeGames += 1;
    if (game.result === "Win") cumulativeWins += 1;

    const date = normalizeDate(game.date) || game.date;
    const existing = byDay.get(date);
    if (existing) {
      existing.dayGames += 1;
      if (game.result === "Win") existing.dayWins += 1;
      existing.cumulativeWins = cumulativeWins;
      existing.cumulativeGames = cumulativeGames;
    } else {
      byDay.set(date, {
        date,
        dayWins: game.result === "Win" ? 1 : 0,
        dayGames: 1,
        cumulativeWins,
        cumulativeGames,
      });
    }
  }

  return [...byDay.values()].map((day, index) => ({
    index: index + 1,
    date: day.date,
    dayGames: day.dayGames,
    dayWins: day.dayWins,
    dayWinRate: day.dayWins / day.dayGames,
    games: day.cumulativeGames,
    wins: day.cumulativeWins,
    winRate: day.cumulativeWins / day.cumulativeGames,
  }));
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
  const height = 280;
  const pad = { top: 24, right: 20, bottom: 48, left: 44 };
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

  const xLabelIndices =
    series.length <= 3
      ? series.map((_, i) => i)
      : [0, Math.floor((series.length - 1) / 2), series.length - 1];
  const xLabels = xLabelIndices
    .map((i) => {
      const p = points[i];
      return `<text class="trends-axis-label trends-x-label" x="${p.x}" y="${height - 10}" text-anchor="middle">${escAttr(formatDate(series[i].date))}</text>`;
    })
    .join("");

  const dots = points
    .map(
      (p) => `
      <circle class="trends-point" cx="${p.x}" cy="${p.y}" r="4"
        data-wr="${p.winRate}" data-day-wr="${p.dayWinRate}" data-games="${p.games}" data-wins="${p.wins}"
        data-day-games="${p.dayGames}" data-day-wins="${p.dayWins}"
        data-date="${escAttr(p.date)}" data-index="${p.index}" />
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
        ${xLabels}
        <text class="trends-axis-label" x="${pad.left + plotW / 2}" y="${height - 28}" text-anchor="middle">Date</text>
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
        const dayWr = Number(point.dataset.dayWr);
        const dayGames = Number(point.dataset.dayGames);
        const dayWins = Number(point.dataset.dayWins);
        tip.hidden = false;

        const dateLabel = formatDate(point.dataset.date);
        const dayLine =
          dayGames > 1
            ? `${dayWins}W / ${dayGames}G · ${pct(dayWr)} that day`
            : `${dayWins === 1 ? "Win" : "Loss"} that day`;
        tip.innerHTML = `${dateLabel}<br>${dayLine}<br>Overall ${pct(wr)} (${point.dataset.wins}/${point.dataset.games})`;

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
