import { compareGamesChronologically, formatDate, normalizeDate } from "./dates.js";
import { pct, winRate } from "./stats.js";

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

function renderChartFrame({ plotW, plotH, baselineY, xLabels, title, headerHtml, body }) {
  const header =
    headerHtml || (title ? `<div class="trends-chart-title">${escAttr(title)}</div>` : "");
  return `
    <div class="trends-chart-wrap">
      ${header}
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

function midpointDate(startDate, endDate) {
  const start = normalizeDate(startDate);
  const end = normalizeDate(endDate);
  if (!start || !end || start === end) return start || end;
  const startMs = new Date(`${start}T00:00:00`).getTime();
  const endMs = new Date(`${end}T00:00:00`).getTime();
  return new Date(Math.round((startMs + endMs) / 2)).toISOString().slice(0, 10);
}

function renderFixedRangeXLabels(range) {
  const plotW = CHART_WIDTH - CHART_PAD.left - CHART_PAD.right;
  const leftX = CHART_PAD.left;
  const rightX = CHART_PAD.left + plotW;
  const midX = CHART_PAD.left + plotW / 2;
  const start = normalizeDate(range.start);
  const end = normalizeDate(range.end);

  if (!start || !end) return "";

  if (start === end) {
    return `<text class="trends-axis-label trends-x-label" x="${midX}" y="${CHART_HEIGHT - 10}" text-anchor="middle">${escAttr(formatDate(start))}</text>`;
  }

  const midDate = midpointDate(start, end);
  return `
    <text class="trends-axis-label trends-x-label" x="${leftX}" y="${CHART_HEIGHT - 10}" text-anchor="start">${escAttr(formatDate(start))}</text>
    <text class="trends-axis-label trends-x-label" x="${midX}" y="${CHART_HEIGHT - 10}" text-anchor="middle">${escAttr(formatDate(midDate))}</text>
    <text class="trends-axis-label trends-x-label" x="${rightX}" y="${CHART_HEIGHT - 10}" text-anchor="end">${escAttr(formatDate(end))}</text>`;
}

function renderXLabels(points, series, { startDate, endDate } = {}) {
  if (startDate && endDate) {
    return renderFixedRangeXLabels({ start: startDate, end: endDate });
  }

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

function renderPointGroups(points, { seriesId = "", color = null, label = "" } = {}) {
  const sortedPoints = [...points].sort((a, b) => a.x - b.x);
  const linePath = sortedPoints
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  return {
    linePath,
    color,
    dots: sortedPoints
      .map(
        (p) => `
      <g class="trends-point-group${seriesId ? ` trends-point-group-${seriesId}` : ""}"
        data-series-id="${escAttr(seriesId)}"
        data-series-label="${escAttr(label || seriesId)}"
        data-series-color="${escAttr(color || "")}"
        data-wr="${p.winRate}" data-day-wr="${p.dayWinRate}" data-games="${p.games}" data-wins="${p.wins}"
        data-day-games="${p.dayGames}" data-day-wins="${p.dayWins}"
        data-date="${escAttr(p.date)}" data-index="${p.index}">
        <circle class="trends-point-hit" cx="${p.x}" cy="${p.y}" r="10" />
        <circle class="${color ? "trends-point trends-point-series" : "trends-point"}" cx="${p.x}" cy="${p.y}" r="3"${color ? ` style="fill: ${color}"` : ""} />
      </g>
    `
      )
      .join(""),
  };
}

function renderBaselineAndGrid(plotH) {
  const baselineY = CHART_PAD.top + plotH - 0.25 * plotH;
  return {
    baselineY,
    markup: `
      ${renderYGrid(plotH)}
      <line class="trends-baseline" x1="${CHART_PAD.left}" y1="${baselineY}" x2="${CHART_WIDTH - CHART_PAD.right}" y2="${baselineY}" />`,
  };
}

/**
 * @param {ReturnType<typeof computeWinRateSeries>} series
 * @param {string} title
 * @param {{ start: string, end: string }|null} [range]
 */
/** @param {number} min @param {number} max @param {number} boundsMin @param {number} boundsMax */
export function clampTrendsGameRange(min, max, boundsMin, boundsMax) {
  const loBound = Math.round(Number(boundsMin)) || 1;
  const hiBound = Math.round(Number(boundsMax)) || loBound;
  const minBound = Math.min(loBound, hiBound);
  const maxBound = Math.max(loBound, hiBound);
  let lo = Math.round(Number(min)) || minBound;
  let hi = Math.round(Number(max)) || maxBound;
  lo = Math.max(minBound, Math.min(lo, maxBound));
  hi = Math.max(minBound, Math.min(hi, maxBound));
  if (lo > hi) lo = hi;
  if (hi < lo) hi = lo;
  return { min: lo, max: hi };
}

/**
 * @param {{ title: string, winRate: number | null, min: number, max: number, boundsMin: number, boundsMax: number }} options
 */
export function renderTrendsChartHeader(options) {
  const { title, winRate, min, max, boundsMin, boundsMax } = options;
  const span = boundsMax - boundsMin;
  const showRange = span > 0;
  const startPct = showRange ? ((min - boundsMin) / span) * 100 : 0;
  const endPct = showRange ? ((max - boundsMin) / span) * 100 : 100;

  return `
    <div class="trends-chart-header">
      <div class="trends-chart-header-title">
        <span class="trends-chart-title">${escAttr(title)}</span>
        <span class="trends-chart-wr">${winRate != null ? escAttr(pct(winRate)) : "—"}</span>
      </div>
      ${
        showRange
          ? `<div class="trends-game-range">
        <input type="number" class="trends-game-range-input" id="trends-game-min-input"
          min="${boundsMin}" max="${boundsMax}" value="${min}" aria-label="Minimum game" />
        <div class="trends-game-range-track">
          <div class="trends-game-range-fill" style="--range-start:${startPct}%;--range-end:${endPct}%"></div>
          <input type="range" class="trends-game-range-slider" id="trends-game-min-slider"
            min="${boundsMin}" max="${boundsMax}" value="${min}" aria-label="Minimum game slider" />
          <input type="range" class="trends-game-range-slider" id="trends-game-max-slider"
            min="${boundsMin}" max="${boundsMax}" value="${max}" aria-label="Maximum game slider" />
        </div>
        <input type="number" class="trends-game-range-input" id="trends-game-max-input"
          min="${boundsMin}" max="${boundsMax}" value="${max}" aria-label="Maximum game" />
      </div>`
          : ""
      }
    </div>`;
}

/** @param {number} min @param {number} max @param {number} boundsMin @param {number} boundsMax */
function syncTrendsGameRangeDom(min, max, boundsMin, boundsMax) {
  const minSlider = document.getElementById("trends-game-min-slider");
  const maxSlider = document.getElementById("trends-game-max-slider");
  const minInput = document.getElementById("trends-game-min-input");
  const maxInput = document.getElementById("trends-game-max-input");
  const fill = document.querySelector(".trends-game-range-fill");
  const span = boundsMax - boundsMin;
  if (minSlider) minSlider.value = String(min);
  if (maxSlider) maxSlider.value = String(max);
  if (minInput) minInput.value = String(min);
  if (maxInput) maxInput.value = String(max);
  if (fill && span > 0) {
    fill.style.setProperty("--range-start", `${((min - boundsMin) / span) * 100}%`);
    fill.style.setProperty("--range-end", `${((max - boundsMin) / span) * 100}%`);
  }
}

/**
 * @param {number} boundsMin
 * @param {number} boundsMax
 * @param {(range: { min: number, max: number }) => void} onChange
 */
export function bindTrendsGameRangeControls(boundsMin, boundsMax, onChange) {
  const minSlider = document.getElementById("trends-game-min-slider");
  const maxSlider = document.getElementById("trends-game-max-slider");
  const minInput = document.getElementById("trends-game-min-input");
  const maxInput = document.getElementById("trends-game-max-input");
  if (!minSlider || !maxSlider || !minInput || !maxInput || boundsMax <= boundsMin) return;

  const commit = (min, max) => {
    const clamped = clampTrendsGameRange(min, max, boundsMin, boundsMax);
    syncTrendsGameRangeDom(clamped.min, clamped.max, boundsMin, boundsMax);
    onChange(clamped);
  };

  minSlider.addEventListener("input", () => {
    let min = Number(minSlider.value);
    let max = Number(maxSlider.value);
    if (min > max) max = min;
    syncTrendsGameRangeDom(min, max, boundsMin, boundsMax);
  });
  maxSlider.addEventListener("input", () => {
    let min = Number(minSlider.value);
    let max = Number(maxSlider.value);
    if (max < min) min = max;
    syncTrendsGameRangeDom(min, max, boundsMin, boundsMax);
  });
  minSlider.addEventListener("change", () => {
    commit(Number(minSlider.value), Number(maxSlider.value));
  });
  maxSlider.addEventListener("change", () => {
    commit(Number(minSlider.value), Number(maxSlider.value));
  });

  minInput.addEventListener("change", () => {
    commit(Number(minInput.value), Number(maxInput.value));
  });
  maxInput.addEventListener("change", () => {
    commit(Number(minInput.value), Number(maxInput.value));
  });
}

export function renderWinRateLineChart(series, title = "", range = null, headerHtml = null) {
  const plotW = CHART_WIDTH - CHART_PAD.left - CHART_PAD.right;
  const plotH = CHART_HEIGHT - CHART_PAD.top - CHART_PAD.bottom;
  const { baselineY, markup: gridMarkup } = renderBaselineAndGrid(plotH);

  if (!series.length) {
    const xLabels = range ? renderFixedRangeXLabels(range) : "";
    return renderChartFrame({
      plotW,
      plotH,
      baselineY,
      xLabels,
      title,
      headerHtml,
      body: gridMarkup,
    });
  }

  const points = range
    ? renderDateAlignedPoints(series, range.start, range.end)
    : renderIndexedPoints(series);
  const rendered = renderPointGroups(points);

  return renderChartFrame({
    plotW,
    plotH,
    baselineY,
    xLabels: range ? renderFixedRangeXLabels(range) : renderXLabels(points, series),
    title,
    headerHtml,
    body: `
      ${gridMarkup}
      <path class="trends-line" d="${rendered.linePath}" />
      ${rendered.dots}`,
  });
}

/**
 * @param {Array<{ id: string|number, label: string, color: string, series: ReturnType<typeof computeWinRateSeries> }>} seriesList
 * @param {{ start: string, end: string }} range
 * @param {string} title
 */
export function renderMultiWinRateLineChart(seriesList, range, title = "", headerHtml = null) {
  const plotW = CHART_WIDTH - CHART_PAD.left - CHART_PAD.right;
  const plotH = CHART_HEIGHT - CHART_PAD.top - CHART_PAD.bottom;
  const { baselineY, markup: gridMarkup } = renderBaselineAndGrid(plotH);

  const renderedSeries = (seriesList || [])
    .filter((entry) => entry.series?.length)
    .map((entry) => {
      const points = renderDateAlignedPoints(entry.series, range.start, range.end);
      const rendered = renderPointGroups(points, {
        seriesId: String(entry.id),
        color: entry.color,
        label: entry.label,
      });
      return { ...entry, points, rendered };
    });

  const legend =
    renderedSeries.length > 0
      ? `
    <div class="trends-chart-legend">
      ${renderedSeries
        .map(
          (entry) => `
        <span class="trends-legend-item" style="--series-color:${entry.color}">
          <span class="trends-legend-swatch"></span>${escAttr(entry.label)}
        </span>`
        )
        .join("")}
    </div>`
      : "";

  return `
    ${legend}
    ${renderChartFrame({
      plotW,
      plotH,
      baselineY,
      xLabels: renderFixedRangeXLabels(range),
      title,
      headerHtml,
      body: `
        ${gridMarkup}
        ${renderedSeries
          .map(
            (entry) => `
          <path class="trends-line-series" fill="none" style="stroke: ${entry.color}" d="${entry.rendered.linePath}" />
          ${entry.rendered.dots}`
          )
          .join("")}`,
    })}`;
}

function formatMonthLabel(monthKey) {
  const [year, month] = monthKey.split("-");
  if (!year || !month) return monthKey;
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function computeMostActiveMonth(sorted) {
  /** @type {Map<string, number>} */
  const byMonth = new Map();

  for (const game of sorted) {
    const date = normalizeDate(game.date);
    if (!date) continue;
    const month = date.slice(0, 7);
    byMonth.set(month, (byMonth.get(month) || 0) + 1);
  }

  if (!byMonth.size) return null;

  let best = null;
  for (const [month, games] of byMonth) {
    if (!best || games > best.games) {
      best = { month, games };
    }
  }

  return best;
}

function computeLongestBreak(sorted) {
  const dates = [...new Set(sorted.map((game) => normalizeDate(game.date)).filter(Boolean))].sort();
  if (dates.length < 2) return null;

  let maxDays = 0;
  let from = dates[0];
  let to = dates[1];

  for (let i = 1; i < dates.length; i += 1) {
    const prevMs = new Date(`${dates[i - 1]}T00:00:00`).getTime();
    const currMs = new Date(`${dates[i]}T00:00:00`).getTime();
    const days = Math.round((currMs - prevMs) / (1000 * 60 * 60 * 24));
    if (days > maxDays) {
      maxDays = days;
      from = dates[i - 1];
      to = dates[i];
    }
  }

  return { days: maxDays, from, to };
}

/**
 * @param {import('./store.js').Game[]} games
 */
export function computeTrendsSummary(games) {
  const sorted = [...games].sort(compareGamesChronologically);
  let longestWinStreak = 0;
  let longestLossStreak = 0;
  let runningWin = 0;
  let runningLoss = 0;

  for (const game of sorted) {
    if (game.result === "Win") {
      runningWin += 1;
      runningLoss = 0;
      longestWinStreak = Math.max(longestWinStreak, runningWin);
    } else {
      runningLoss += 1;
      runningWin = 0;
      longestLossStreak = Math.max(longestLossStreak, runningLoss);
    }
  }

  /** @type {{ type: "win" | "loss" | null, length: number }} */
  let currentStreak = { type: null, length: 0 };
  if (sorted.length) {
    const lastResult = sorted[sorted.length - 1].result === "Win" ? "win" : "loss";
    let length = 0;
    for (let i = sorted.length - 1; i >= 0; i -= 1) {
      const isWin = sorted[i].result === "Win";
      if ((lastResult === "win" && isWin) || (lastResult === "loss" && !isWin)) {
        length += 1;
      } else {
        break;
      }
    }
    currentStreak = { type: lastResult, length };
  }

  return {
    longestWinStreak,
    longestLossStreak,
    currentStreak,
    mostActiveMonth: computeMostActiveMonth(sorted),
    longestBreak: computeLongestBreak(sorted),
  };
}

function formatStreakCount(value) {
  return value > 0 ? String(value) : "—";
}

function formatCurrentStreak(streak) {
  if (!streak.type || !streak.length) return "—";
  return `${streak.type === "win" ? "W" : "L"}${streak.length}`;
}

/**
 * @param {ReturnType<typeof computeTrendsSummary>} summary
 * @param {{ streakMode?: "hidden" | "current" | "at-end" }} [options]
 */
export function renderTrendsSummaryStats(summary, options = {}) {
  const streakMode = options.streakMode ?? "current";
  const currentClass =
    summary.currentStreak.type === "win"
      ? " trends-streak-win"
      : summary.currentStreak.type === "loss"
        ? " trends-streak-loss"
        : "";
  const activeMonthDetail = summary.mostActiveMonth ? `${summary.mostActiveMonth.games} games` : "";
  const longestBreakDetail = summary.longestBreak
    ? `${formatDate(summary.longestBreak.from)} – ${formatDate(summary.longestBreak.to)}`
    : "";
  const streakLabel = streakMode === "at-end" ? "Streak at End" : "Current Streak";
  const streakCard =
    streakMode === "hidden"
      ? ""
      : `
        <div class="stat-card">
          <span class="stat-label">${streakLabel}</span>
          <span class="stat-value${currentClass}">${formatCurrentStreak(summary.currentStreak)}</span>
        </div>`;
  const gridClass =
    streakMode === "hidden" ? "stat-grid trends-summary-stats trends-summary-stats--compact" : "stat-grid trends-summary-stats";

  return `
    <section class="trends-summary-section">
      <div class="${gridClass}">
        ${streakCard}
        <div class="stat-card">
          <span class="stat-label">Longest Win Streak</span>
          <span class="stat-value trends-streak-win">${formatStreakCount(summary.longestWinStreak)}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Longest Losing Streak</span>
          <span class="stat-value trends-streak-loss">${formatStreakCount(summary.longestLossStreak)}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Most Active Month</span>
          <span class="stat-value">${summary.mostActiveMonth ? escAttr(formatMonthLabel(summary.mostActiveMonth.month)) : "—"}</span>
          ${activeMonthDetail ? `<span class="stat-sub">${escAttr(activeMonthDetail)}</span>` : ""}
        </div>
        <div class="stat-card">
          <span class="stat-label">Longest Break</span>
          <span class="stat-value">${summary.longestBreak ? `${summary.longestBreak.days} days` : "—"}</span>
          ${longestBreakDetail ? `<span class="stat-sub">${escAttr(longestBreakDetail)}</span>` : ""}
        </div>
      </div>
    </section>`;
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
        const seriesColor = group.dataset.seriesColor;
        const seriesLabel = group.dataset.seriesLabel;
        const prefix = seriesLabel ? `${seriesLabel}<br>` : "";
        tip.hidden = false;
        group.classList.add("active");
        point.setAttribute("r", "5");
        if (seriesColor) point.setAttribute("fill", seriesColor);

        const dateLabel = formatDate(group.dataset.date);
        const dayLine =
          dayGames > 1
            ? `${dayWins}W / ${dayGames}G · ${pct(dayWr)} that day`
            : `${dayWins === 1 ? "Win" : "Loss"} that day`;
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
        if (group.dataset.seriesColor) point.setAttribute("fill", group.dataset.seriesColor);
      };

      group.addEventListener("mouseenter", showTip);
      group.addEventListener("mouseleave", hideTip);
    });
  });
}
