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

const CHART_WIDTH = 760;
const CHART_HEIGHT = 280;
const CHART_PAD = { top: 24, right: 48, bottom: 48, left: 44 };

function dateToX(date, startDate, endDate, plotW) {
  const start = normalizeDate(startDate);
  const end = normalizeDate(endDate);
  const current = normalizeDate(date);
  if (!start || !end || !current) return CHART_PAD.left;
  if (start === end) return CHART_PAD.left + plotW / 2;
  const startMs = new Date(`${start}T00:00:00`).getTime();
  const endMs = new Date(`${end}T00:00:00`).getTime();
  const currentMs = new Date(`${current}T00:00:00`).getTime();
  const span = endMs - startMs;
  if (!span) return CHART_PAD.left + plotW / 2;
  const fraction = Math.min(1, Math.max(0, (currentMs - startMs) / span));
  return CHART_PAD.left + fraction * plotW;
}

function renderChartFrame({ plotW, plotH, baselineY, xLabels, title, body }) {
  return `
    <div class="trends-chart-wrap">
      ${title ? `<div class="trends-chart-title">${escAttr(title)}</div>` : ""}
      <svg class="trends-chart" viewBox="0 0 ${CHART_WIDTH} ${CHART_HEIGHT}" role="img" aria-label="Win rate over time">
        ${body}
        ${xLabels}
        <text class="trends-axis-label" x="${CHART_PAD.left + plotW / 2}" y="${CHART_HEIGHT - 28}" text-anchor="middle">Date</text>
      </svg>
      <div class="trends-chart-tip" hidden></div>
    </div>`;
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

function renderXLabels(points, series, { startDate, endDate } = {}) {
  if (!points.length) return "";

  const indices =
    points.length <= 3
      ? points.map((_, i) => i)
      : [0, Math.floor((points.length - 1) / 2), points.length - 1];

  return indices
    .map((i) => {
      const p = points[i];
      const label = formatDate(series[i].date);
      const isFirst = i === 0;
      const isLast = i === points.length - 1;
      const anchor = isFirst ? "start" : isLast ? "end" : "middle";
      let x = p.x;
      if (isFirst) x = Math.max(p.x, CHART_PAD.left);
      if (isLast) x = Math.min(p.x, CHART_WIDTH - CHART_PAD.right);
      return `<text class="trends-axis-label trends-x-label" x="${x}" y="${CHART_HEIGHT - 10}" text-anchor="${anchor}">${escAttr(label)}</text>`;
    })
    .join("");
}

function renderIndexedPoints(series, color = null) {
  const plotW = CHART_WIDTH - CHART_PAD.left - CHART_PAD.right;
  const plotH = CHART_HEIGHT - CHART_PAD.top - CHART_PAD.bottom;

  return series.map((point, i) => {
    const x =
      CHART_PAD.left + (series.length === 1 ? plotW / 2 : (i / (series.length - 1)) * plotW);
    const y = CHART_PAD.top + plotH - point.winRate * plotH;
    return { ...point, x, y };
  });
}

function renderDateAlignedPoints(series, startDate, endDate) {
  const plotW = CHART_WIDTH - CHART_PAD.left - CHART_PAD.right;
  const plotH = CHART_HEIGHT - CHART_PAD.top - CHART_PAD.bottom;

  return series.map((point) => {
    const x = dateToX(point.date, startDate, endDate, plotW);
    const y = CHART_PAD.top + plotH - point.winRate * plotH;
    return { ...point, x, y };
  });
}

function renderPointGroups(points, { seriesId = "", color = null } = {}) {
  const style = color ? ` style="--series-color:${color}"` : "";
  const pointClass = color ? "trends-point trends-point-series" : "trends-point";
  const lineClass = color ? "trends-line trends-line-series" : "trends-line";
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return {
    lineClass,
    linePath,
    dots: points
      .map(
        (p) => `
      <g class="trends-point-group${seriesId ? ` trends-point-group-${seriesId}` : ""}"${style}
        data-series-id="${escAttr(seriesId)}"
        data-wr="${p.winRate}" data-day-wr="${p.dayWinRate}" data-games="${p.games}" data-wins="${p.wins}"
        data-day-games="${p.dayGames}" data-day-wins="${p.dayWins}"
        data-date="${escAttr(p.date)}" data-index="${p.index}">
        <circle class="trends-point-hit" cx="${p.x}" cy="${p.y}" r="10" />
        <circle class="${pointClass}" cx="${p.x}" cy="${p.y}" r="3" />
      </g>
    `
      )
      .join(""),
  };
}

/**
 * @param {ReturnType<typeof computeWinRateSeries>} series
 * @param {string} title
 */
export function renderWinRateLineChart(series, title = "") {
  if (!series.length) {
    return `<div class="trends-chart-empty"></div>`;
  }

  const plotW = CHART_WIDTH - CHART_PAD.left - CHART_PAD.right;
  const plotH = CHART_HEIGHT - CHART_PAD.top - CHART_PAD.bottom;
  const baselineY = CHART_PAD.top + plotH - 0.25 * plotH;
  const points = renderIndexedPoints(series);
  const rendered = renderPointGroups(points);

  return renderChartFrame({
    plotW,
    plotH,
    baselineY,
    xLabels: renderXLabels(points, series),
    title,
    body: `
      ${renderYGrid(plotH)}
      <line class="trends-baseline" x1="${CHART_PAD.left}" y1="${baselineY}" x2="${CHART_WIDTH - CHART_PAD.right}" y2="${baselineY}" />
      <path class="${rendered.lineClass}" d="${rendered.linePath}" />
      ${rendered.dots}`,
  });
}

/**
 * @param {Array<{ id: string|number, label: string, color: string, series: ReturnType<typeof computeWinRateSeries> }>} seriesList
 * @param {{ start: string, end: string }} range
 * @param {string} title
 */
export function renderMultiWinRateLineChart(seriesList, range, title = "") {
  const nonEmpty = seriesList.filter((entry) => entry.series.length);
  if (!nonEmpty.length) {
    return `<div class="trends-chart-empty"></div>`;
  }

  const plotW = CHART_WIDTH - CHART_PAD.left - CHART_PAD.right;
  const plotH = CHART_HEIGHT - CHART_PAD.top - CHART_PAD.bottom;
  const baselineY = CHART_PAD.top + plotH - 0.25 * plotH;

  const renderedSeries = nonEmpty.map((entry) => {
    const points = renderDateAlignedPoints(entry.series, range.start, range.end);
    const rendered = renderPointGroups(points, { seriesId: String(entry.id), color: entry.color });
    return { ...entry, points, rendered };
  });

  const labelSeries = renderedSeries.reduce(
    (longest, entry) => (entry.points.length > longest.points.length ? entry : longest),
    renderedSeries[0]
  );

  const legend = `
    <div class="trends-chart-legend">
      ${renderedSeries
        .map(
          (entry) => `
        <span class="trends-legend-item" style="--series-color:${entry.color}">
          <span class="trends-legend-swatch"></span>${escAttr(entry.label)}
        </span>`
        )
        .join("")}
    </div>`;

  return `
    ${legend}
    ${renderChartFrame({
      plotW,
      plotH,
      baselineY,
      xLabels: renderXLabels(labelSeries.points, labelSeries.series, range),
      title,
      body: `
        ${renderYGrid(plotH)}
        <line class="trends-baseline" x1="${CHART_PAD.left}" y1="${baselineY}" x2="${CHART_WIDTH - CHART_PAD.right}" y2="${baselineY}" />
        ${renderedSeries
          .map(
            (entry) => `
          <path class="${entry.rendered.lineClass}" d="${entry.rendered.linePath}" style="--series-color:${entry.color}" />
          ${entry.rendered.dots}`
          )
          .join("")}`,
    })}`;
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
    const svg = wrap.querySelector(".trends-chart");
    if (!tip || !svg) return;

    wrap.querySelectorAll(".trends-point-group").forEach((group) => {
      const point = group.querySelector(".trends-point");
      if (!point) return;

      const showTip = () => {
        const wr = Number(group.dataset.wr);
        const dayWr = Number(group.dataset.dayWr);
        const dayGames = Number(group.dataset.dayGames);
        const dayWins = Number(group.dataset.dayWins);
        const seriesId = group.dataset.seriesId;
        tip.hidden = false;
        group.classList.add("active");
        point.setAttribute("r", "5");

        const dateLabel = formatDate(group.dataset.date);
        const dayLine =
          dayGames > 1
            ? `${dayWins}W / ${dayGames}G · ${pct(dayWr)} that day`
            : `${dayWins === 1 ? "Win" : "Loss"} that day`;
        const prefix = seriesId ? `Seat ${seriesId}<br>` : "";
        tip.innerHTML = `${prefix}${dateLabel}<br>${dayLine}<br>Overall ${pct(wr)} (${group.dataset.wins}/${group.dataset.games})`;

        const cx = Number(point.getAttribute("cx"));
        const cy = Number(point.getAttribute("cy"));
        const pt = svg.createSVGPoint();
        pt.x = cx;
        pt.y = cy;
        const screen = pt.matrixTransform(svg.getScreenCTM());
        const wrapRect = wrap.getBoundingClientRect();
        tip.style.left = `${screen.x - wrapRect.left}px`;
        tip.style.top = `${screen.y - wrapRect.top}px`;
      };

      const hideTip = () => {
        tip.hidden = true;
        group.classList.remove("active");
        point.setAttribute("r", "3");
      };

      group.addEventListener("mouseenter", showTip);
      group.addEventListener("mouseleave", hideTip);
    });
  });
}
