import {
  initData,
  saveData,
  exportData,
  importData,
  resetToSeed,
  nextGameId,
  nextDeckId,
  getLastSeedSync,
} from "./store.js";
import {
  computeDeckStats,
  computeOverview,
  computeBracketStats,
  computeBracketDetail,
  computeYearStats,
  computeRolling100Stats,
  colorBadge,
  sortDeckList,
  pct,
} from "./stats.js";
import { formatDate, gameSortKey, gameYear, normalizeDate, normalizeTime, nowTime, todayISO, compareGamesChronologically } from "./dates.js";
import { colorIdentitySortIndex } from "./color-identity.js";
import { pctCell, valueCell, colorStatAverage } from "./wr-color.js";
import { sortHeader, applySort, toggleSort, WINS_SORT_TIE_BREAKERS } from "./table.js";
import {
  getBracketColor,
  renderPieChart,
  pieSlicesFromRows,
  pickSliceColor,
  colorStatSlice,
  bindPieCharts,
} from "./pie-chart.js";
import {
  computeColorStatsAdvanced,
  colorColumnSortLabel,
  colorViewLabel,
  cycleColorView,
  colorMatchupRowMatchesSearch,
} from "./color-stats.js";
import {
  deckKey,
  deckId,
  deckTitle,
  deckLabel,
  deckCommander,
  findDeck,
  deckMapByKey,
  deckLabelForKey,
  deckTitleForKey,
  resolveMyCommander,
} from "./deck-identity.js";
import {
  buildEntityReport,
  renderEntityReportModal,
  renderPlayerReportLink,
  renderDeckReportLink,
} from "./entity-report.js";
import { loadImagesIntoEntityReport } from "./scryfall.js";
import { bindPodAutocomplete, MY_PLAYER_NAME } from "./opponent-search.js";
import {
  warmCommanderMatchupCache,
  collectPartnerCommanderNames,
} from "./commander-names.js";
import {
  warmCommanderColorCache,
  collectOwnedDeckCommanderNames,
  backfillDeckColorIdentities,
  getCommanderColorIdentity,
  getDeckColors,
} from "./commander-colors.js";
import { bindModalBackdropDismiss } from "./modals.js";
import {
  computeAllMatchups,
  formatMatchupImpact,
  matchupImpactClass,
  MATCHUP_TABS,
  collectAllPodCommanderNames,
} from "./matchups.js";
import { computeAllTotals, TOTALS_TABS } from "./totals.js";
import {
  computeWinRateSeries,
  computeTrendsSummary,
  renderTrendsSummaryStats,
  renderWinRateLineChart,
  renderMultiWinRateLineChart,
  bindWinRateLineCharts,
} from "./trends-chart.js";
import {
  gamesForColorSeries,
  gamesForBracketSeries,
  gamesForTrendsWindowSeries,
  gamesInChartRange,
  getChartDateBounds,
  getEffectiveChartRange,
} from "./chart-series.js";
import {
  CHART_FILTER_ACCENT,
  colorForChartSelection,
  newChartSelection,
  toggleChartSelection,
} from "./selection-colors.js";
import {
  computeSeatStats,
  gamesForSeatSeries,
  getSeatDateBounds,
  SEAT_COLORS,
  SEAT_VIEW_LABELS,
  SEAT_VIEW_MODES,
} from "./seats.js";

const VIEWS = [
  { id: "stats", label: "Stats" },
  { id: "decks", label: "Decks" },
  { id: "games", label: "Games" },
];

const STATS_TABS = [
  { id: "overview", label: "Overview" },
  { id: "colors", label: "Colors" },
  { id: "brackets", label: "Brackets" },
  { id: "trends", label: "Trends" },
  { id: "seats", label: "Seats" },
  { id: "matchups", label: "Matchups" },
  { id: "totals", label: "Totals" },
];

const DECK_STATUS_OPTIONS = [
  { id: "active", label: "Active" },
  { id: "retired", label: "Retired" },
  { id: "all", label: "All" },
];

let data = null;
let currentView = "stats";
let statsTab = "overview";
let statsBracketFilter = "";
/** @type {"filter"|"table"|null} */
let bracketsChartMode = null;
let matchupTab = "players";
let matchupSearch = "";
let matchupColorView = "wubrgc";
let matchupColorAgg = "inclusive";
let matchupBracketFilter = "";
let matchupSplitPartners = false;
let matchupSplitPlayers = false;
let totalsTab = "decks";
let totalsSearch = "";
let totalsSplitPartners = false;
let totalsExcludeMe = false;
let totalsColorView = "exact";
let totalsColorAgg = "exclusive";
/** @type {{ kind: 'all' } | { kind: 'window', rangeStart: number, rangeEnd: number } | { kind: 'cumulative', rangeEnd: number } | { kind: 'year', year: string }} */
let trendsFilter = { kind: "all" };
let selectedSeats = [];
let seatViewMode = "mine";
let seatRange = { start: null, end: null, customized: false };
let decksTab = "active";
let gameModalOpen = false;
let deckModalOpen = false;
let viewingGameId = null;
let editingGameId = null;
let editingDeckName = null;
/** @type {{ kind: 'player' | 'deck', key: string, playerScope?: string | null, deckSlotId?: string | null } | null} */
let entityReport = null;
/** @type {'players' | 'decks'} */
let entityReportMatchupTab = "players";
let deckSort = "normWr";
let deckSortDir = "desc";
let deckBracketFilter = "";
let logFilters = { deck: "", result: "", year: "" };
let colorView = "wubrgc";
let colorAgg = "inclusive";
let colorSortOrder = "wubrgc";
/** @type {"all" | "active" | "retired"} */
let statsDeckFilter = "all";
/** @type {Map<string, string>} */
let colorsChartSelection = new Set();
let colorsChartRange = { start: null, end: null, customized: false };
let bracketsChartSelection = newChartSelection();
let bracketsChartRange = { start: null, end: null, customized: false };
/** @type {Set<string>} */
let trendsWindowSelection = newChartSelection();
/** @type {Map<string, { rangeStart: number, rangeEnd: number, label: string }>} */
let trendsWindowMeta = new Map();
let trendsChartRange = { start: null, end: null, customized: false };
let pieAnimKey = 0;
let colorsPieAnimKey = 0;
let bracketsPieAnimKey = 0;
let lastColorsPieSignature = "";
let lastBracketsPieSignature = "";
let tableSort = {
  "color-stats": { col: "colorOrder", dir: "asc" },
  "bracket-stats": { col: "bracket", dir: "asc" },
  "trends-windows": { col: "rangeStart", dir: "asc" },
  "trends-cumulative": { col: "games", dir: "asc" },
  "decks-main": { col: "normWr", dir: "desc" },
  "game-log": { col: "date", dir: "desc" },
  matchups: { col: "normalizedMatchupImpact", dir: "desc" },
  "totals-decks": { col: "normalizedWr", dir: "desc" },
  "totals-players": { col: "normalizedWr", dir: "desc" },
  "totals-colors": { col: "normalizedWr", dir: "desc" },
};

function resetStatsTabState(tab) {
  if (tab === "colors") {
    colorView = "wubrgc";
    colorAgg = "inclusive";
    colorSortOrder = "wubrgc";
    colorsChartSelection = new Set();
    colorsChartRange = { start: null, end: null, customized: false };
    lastColorsPieSignature = "";
    tableSort["color-stats"] = { col: "colorOrder", dir: "asc" };
    pieAnimKey++;
  } else if (tab === "brackets") {
    bracketsChartMode = null;
    bracketsChartSelection = newChartSelection();
    bracketsChartRange = { start: null, end: null, customized: false };
    lastBracketsPieSignature = "";
    tableSort["bracket-stats"] = { col: "bracket", dir: "asc" };
    pieAnimKey++;
  } else if (tab === "trends") {
    trendsFilter = { kind: "all" };
    trendsWindowSelection = newChartSelection();
    trendsWindowMeta = new Map();
    trendsChartRange = { start: null, end: null, customized: false };
    tableSort["trends-windows"] = { col: "rangeStart", dir: "asc" };
    tableSort["trends-cumulative"] = { col: "games", dir: "asc" };
  } else if (tab === "seats") {
    selectedSeats = [];
    seatViewMode = "mine";
    seatRange = { start: null, end: null, customized: false };
  } else if (tab === "matchups") {
    matchupTab = "players";
    matchupSearch = "";
    matchupColorView = "wubrgc";
    matchupColorAgg = "inclusive";
    matchupBracketFilter = "";
    matchupSplitPartners = false;
    matchupSplitPlayers = false;
    tableSort.matchups = { col: "normalizedMatchupImpact", dir: "desc" };
  } else if (tab === "totals") {
    totalsTab = "decks";
    totalsSearch = "";
    totalsSplitPartners = false;
    totalsExcludeMe = false;
    totalsColorView = "exact";
    totalsColorAgg = "exclusive";
    tableSort["totals-decks"] = { col: "normalizedWr", dir: "desc" };
    tableSort["totals-players"] = { col: "normalizedWr", dir: "desc" };
    tableSort["totals-colors"] = { col: "normalizedWr", dir: "desc" };
  }
}

function resetAllStatsTabStates() {
  STATS_TABS.forEach((tab) => resetStatsTabState(tab.id));
}

function resetDecksViewState() {
  decksTab = "active";
  deckBracketFilter = "";
  deckSort = "normWr";
  deckSortDir = "desc";
  closeDeckModal();
  tableSort["decks-main"] = { col: "normWr", dir: "desc" };
}

function resetGamesViewState() {
  gameModalOpen = false;
  editingGameId = null;
  viewingGameId = null;
  logFilters = { deck: "", result: "", year: "" };
  tableSort["game-log"] = { col: "date", dir: "desc" };
}


function renderMatchupDeckCell(subject, decks) {
  return renderDeckReportLink(subject, decks, { label: subject });
}

function renderMatchupOpponentDeckCell(row, decks) {
  if (matchupSplitPlayers && row.opponentPlayer) {
    return renderDeckReportLink(row.opponent, decks, {
      label: `${row.opponentPlayer} · ${row.opponent}`,
      playerScope: row.opponentPlayer,
    });
  }
  return renderDeckReportLink(row.opponent, decks, { label: row.opponent });
}

function openEntityReport(kind, key, playerScope = null, deckSlotId = null) {
  if (deckModalOpen) closeDeckModal();
  entityReport = { kind, key, playerScope, deckSlotId };
  entityReportMatchupTab = "players";
  syncEntityReportModal();
}

function switchEntityReportMatchupTab(tabId) {
  if (!entityReport || (tabId !== "players" && tabId !== "decks")) return;
  entityReportMatchupTab = tabId;

  const modal = document.getElementById("entity-report-modal");
  if (!modal) return;

  modal.querySelectorAll("[data-entity-matchup-tab]").forEach((btn) => {
    const active = btn.dataset.entityMatchupTab === tabId;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-selected", active ? "true" : "false");
  });

  modal.querySelectorAll("[data-entity-matchup-panel]").forEach((panel) => {
    panel.hidden = panel.dataset.entityMatchupPanel !== tabId;
  });
}

function getStatsScope() {
  const statsDecks = filterDecksForStats(data.decks, statsDeckFilter);
  const statsGames = filterGamesForStats(data.games, data.decks, statsDeckFilter);
  const filteredDeckStats = computeDeckStats(
    statsDeckFilter === "all" ? data.decks : statsDecks,
    statsGames
  );
  return { statsDecks, statsGames, filteredDeckStats };
}

function renderStatsToolbar(idPrefix, bounds, range, { deckFilter = false, extra = "" } = {}) {
  return `
    <div class="filters inline stats-range-toolbar seat-range-filters">
      ${deckFilter ? renderStatsDeckFilterToggle() : ""}
      ${extra}
      <div class="stats-range-dates">
        <label>From <input type="date" id="${idPrefix}-range-start" min="${bounds.min}" max="${bounds.max}" value="${range.start}" /></label>
        <label>To <input type="date" id="${idPrefix}-range-end" min="${bounds.min}" max="${bounds.max}" value="${range.end}" /></label>
      </div>
    </div>`;
}

function renderDateRangeFilters(idPrefix, bounds, range, options = {}) {
  return renderStatsToolbar(idPrefix, bounds, range, options);
}

function renderStatsDeckFilterToggle() {
  return `<button type="button" class="btn btn-ghost btn-sm stats-deck-filter-toggle" id="stats-deck-filter-toggle">${statsDeckFilterLabel(statsDeckFilter)}</button>`;
}

function renderBracketFilterButtons() {
  return ["", "1", "2", "3", "4", "5"]
    .map((b) => {
      const active = bracketsChartMode !== "table" && statsBracketFilter === b;
      return `
          <button type="button" class="btn btn-ghost btn-sm bracket-filter-btn ${active ? "active" : ""}" data-bracket-filter="${b}">
            ${b ? `Bracket ${b}` : "All Brackets"}
          </button>`;
    })
    .join("");
}

function chartSeriesRowStyle(color) {
  return color ? ` style="--series-color:${color}"` : "";
}

function renderChartSection(chartHtml, clearButtonId) {
  return `
    <div class="chart-section">
      <div class="chart-clear-row">
        <button type="button" class="btn btn-ghost btn-sm" id="${clearButtonId}">Clear Selection</button>
      </div>
      ${chartHtml}
    </div>`;
}

async function refreshCommanderColorCache() {
  await Promise.all([
    warmCommanderMatchupCache(collectPartnerCommanderNames(data.games)),
    warmCommanderColorCache([
      ...collectAllPodCommanderNames(data.games),
      ...collectPartnerCommanderNames(data.games),
      ...collectOwnedDeckCommanderNames(data.decks),
    ]),
  ]);
  const changed = backfillDeckColorIdentities(data.decks);
  if (changed) saveData(data);
  if (deckModalOpen) return;
  render();
}

async function boot() {
  data = await initData();
  const sync = getLastSeedSync();
  bindEvents();
  renderNav();
  render();
  setTimeout(() => {
    void refreshCommanderColorCache();
  }, 0);
  bindModalBackdropDismiss({
    deck: () => {
      closeDeckModal();
      render();
    },
    game: () => {
      editingGameId = null;
      gameModalOpen = false;
      render();
    },
    gameDetail: () => {
      viewingGameId = null;
      render();
    },
    entityReport: () => {
      entityReport = null;
      syncEntityReportModal();
    },
  });
  if (sync) {
    if (sync.removed > 0) {
      toast(`Removed ${sync.removed} duplicate games — now at ${sync.games + sync.keptLocal} total`);
    } else if (sync.keptLocal > 0) {
      toast(`Synced ${sync.games} games from spreadsheet (${sync.keptLocal} local-only kept)`);
    } else {
      toast(`Synced ${sync.games} games from spreadsheet`);
    }
  }
}

function bindEvents() {
  document.addEventListener("click", (e) => {
    const entityBtn = e.target.closest("[data-entity-report]");
    if (entityBtn) {
      openEntityReport(
        entityBtn.dataset.entityReport,
        entityBtn.dataset.entityKey,
        entityBtn.dataset.entityPlayerScope || null,
        entityBtn.dataset.entityDeckSlot || null
      );
      return;
    }

    if (e.target.id === "close-entity-report") {
      entityReport = null;
      syncEntityReportModal();
      return;
    }

    const entityMatchupTabBtn = e.target.closest("[data-entity-matchup-tab]");
    if (entityMatchupTabBtn && entityReport) {
      switchEntityReportMatchupTab(entityMatchupTabBtn.dataset.entityMatchupTab);
      return;
    }

    if (e.target.id === "save-deck-btn") {
      saveDeckFromForm();
      return;
    }

    if (e.target.id === "delete-deck-modal") {
      if (!editingDeckName) return;
      if (!confirm("Delete this deck?")) return;
      const key = editingDeckName;
      data.decks = data.decks.filter((d) => deckId(d) !== key);
      data.games = data.games.filter((g) => g.deck !== key);
      if (entityReport?.deckSlotId === key || entityReport?.key === key) {
        entityReport = null;
        syncEntityReportModal();
      }
      closeDeckModal();
      saveData(data);
      render();
      toast("Deleted");
      return;
    }
  });

  document.addEventListener("submit", (e) => {
    if (e.target.id !== "deck-form") return;
    e.preventDefault();
    saveDeckFromForm();
  });

  document.getElementById("nav").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-view]");
    if (!btn) return;
    const prevView = currentView;
    currentView = btn.dataset.view;
    if (prevView === "stats" && currentView !== "stats") {
      resetStatsTabState(statsTab);
    }
    if (currentView === "stats") {
      statsTab = "overview";
      resetAllStatsTabStates();
    }
    if (currentView === "decks") {
      resetDecksViewState();
    }
    if (currentView === "games") {
      resetGamesViewState();
    }
    if (currentView !== "decks") {
      closeDeckModal();
    }
    renderNav();
    render();
  });

  document.getElementById("main").addEventListener("input", (e) => {
    if (e.target.id === "matchup-search") {
      matchupSearch = e.target.value;
      render();
    } else if (e.target.id === "totals-search") {
      totalsSearch = e.target.value;
      render();
    } else if (e.target.id === "seats-range-start" || e.target.id === "seats-range-end") {
      seatRange.customized = true;
      seatRange.start = document.getElementById("seats-range-start")?.value || null;
      seatRange.end = document.getElementById("seats-range-end")?.value || null;
      render();
    } else if (e.target.id === "colors-range-start" || e.target.id === "colors-range-end") {
      colorsChartRange.customized = true;
      colorsChartRange.start = document.getElementById("colors-range-start")?.value || null;
      colorsChartRange.end = document.getElementById("colors-range-end")?.value || null;
      render();
    } else if (e.target.id === "brackets-range-start" || e.target.id === "brackets-range-end") {
      bracketsChartRange.customized = true;
      bracketsChartRange.start = document.getElementById("brackets-range-start")?.value || null;
      bracketsChartRange.end = document.getElementById("brackets-range-end")?.value || null;
      render();
    } else if (e.target.id === "trends-range-start" || e.target.id === "trends-range-end") {
      trendsChartRange.customized = true;
      trendsChartRange.start = document.getElementById("trends-range-start")?.value || null;
      trendsChartRange.end = document.getElementById("trends-range-end")?.value || null;
      render();
    }
  });

  document.getElementById("main").addEventListener("click", (e) => {
    const sortTh = e.target.closest("[data-sort-table]");
    if (sortTh) {
      const tableId = sortTh.getAttribute("data-sort-table");
      const col = sortTh.getAttribute("data-sort-col");
      tableSort[tableId] = toggleSort(tableSort[tableId], col);
      if (tableId === "decks-main") {
        deckSort = col;
        deckSortDir = tableSort[tableId].dir;
        if (col === "lastPlayed") deckSort = "recent";
        else if (col === "createdAt") deckSort = "newest";
      }
      render();
      return;
    }

    if (e.target.id === "stats-deck-filter-toggle") {
      statsDeckFilter =
        statsDeckFilter === "all" ? "active" : statsDeckFilter === "active" ? "retired" : "all";
      if (statsTab === "colors") colorsChartSelection = new Set();
      if (statsTab === "brackets") bracketsChartSelection = newChartSelection();
      pieAnimKey++;
      render();
      return;
    }

    if (e.target.id === "matchup-split-partners") {
      matchupSplitPartners = e.target.checked;
      render();
      return;
    }

    if (e.target.id === "matchup-split-players") {
      matchupSplitPlayers = e.target.checked;
      render();
      return;
    }

    if (e.target.id === "totals-split-partners") {
      totalsSplitPartners = e.target.checked;
      render();
      return;
    }

    if (e.target.id === "totals-exclude-me") {
      totalsExcludeMe = e.target.checked;
      render();
      return;
    }

    if (e.target.id === "totals-color-view-toggle") {
      totalsColorView = cycleColorView(totalsColorView);
      render();
      return;
    }

    if (e.target.id === "totals-color-agg-toggle") {
      totalsColorAgg = totalsColorAgg === "inclusive" ? "exclusive" : "inclusive";
      render();
      return;
    }

    if (e.target.id === "matchup-color-view-toggle") {
      matchupColorView = cycleColorView(matchupColorView);
      render();
      return;
    }

    if (e.target.id === "matchup-color-agg-toggle") {
      matchupColorAgg = matchupColorAgg === "inclusive" ? "exclusive" : "inclusive";
      render();
      return;
    }

    const matchupBracketBtn = e.target.closest("[data-matchup-bracket-filter]");
    if (matchupBracketBtn) {
      matchupBracketFilter = matchupBracketBtn.getAttribute("data-matchup-bracket-filter") || "";
      render();
      return;
    }

    if (e.target.id === "color-order-toggle") {
      colorSortOrder = colorSortOrder === "wubrgc" ? "cgrbuw" : "wubrgc";
      tableSort["color-stats"] = { col: "colorOrder", dir: "asc" };
      pieAnimKey++;
      render();
      return;
    }

    if (e.target.id === "color-view-toggle") {
      colorView = cycleColorView(colorView);
      colorsChartSelection = new Set();
      pieAnimKey++;
      render();
      return;
    }

    if (e.target.id === "color-agg-toggle") {
      colorAgg = colorAgg === "inclusive" ? "exclusive" : "inclusive";
      colorsChartSelection = new Set();
      pieAnimKey++;
      render();
      return;
    }

    const bracketFilterBtn = e.target.closest("[data-bracket-filter]");
    if (bracketFilterBtn) {
      statsBracketFilter = bracketFilterBtn.getAttribute("data-bracket-filter") || "";
      bracketsChartSelection = newChartSelection();
      bracketsChartMode = "filter";
      render();
      return;
    }

    const trendsCumulativeBtn = e.target.closest("[data-trends-cumulative]");
    if (trendsCumulativeBtn) {
      trendsWindowSelection = newChartSelection();
      trendsWindowMeta = new Map();
      resetTrendsChartRange();
      trendsFilter = {
        kind: "cumulative",
        rangeEnd: Number(trendsCumulativeBtn.dataset.rangeEnd),
      };
      render();
      return;
    }

    const trendsYearBtn = e.target.closest("[data-trends-year]");
    if (trendsYearBtn) {
      trendsWindowSelection = newChartSelection();
      trendsWindowMeta = new Map();
      resetTrendsChartRange();
      trendsFilter = { kind: "year", year: trendsYearBtn.dataset.trendsYear };
      render();
      return;
    }

    const trendsAllBtn = e.target.closest("[data-trends-all]");
    if (trendsAllBtn) {
      trendsWindowSelection = newChartSelection();
      trendsWindowMeta = new Map();
      resetTrendsChartRange();
      trendsFilter = { kind: "all" };
      render();
      return;
    }

    const matchupBtn = e.target.closest("[data-matchup-tab]");
    if (matchupBtn) {
      const nextMatchupTab = matchupBtn.getAttribute("data-matchup-tab");
      matchupTab = nextMatchupTab;
      render();
      return;
    }

    const totalsBtn = e.target.closest("[data-totals-tab]");
    if (totalsBtn) {
      totalsTab = totalsBtn.getAttribute("data-totals-tab");
      render();
      return;
    }

    const statsBtn = e.target.closest("[data-stats-tab]");
    if (statsBtn) {
      const nextTab = statsBtn.getAttribute("data-stats-tab");
      if (nextTab !== statsTab) resetStatsTabState(statsTab);
      statsTab = nextTab;
      render();
      return;
    }

    if (e.target.id === "clear-colors-chart") {
      colorsChartSelection = new Set();
      render();
      return;
    }

    if (e.target.id === "clear-brackets-chart") {
      bracketsChartSelection = newChartSelection();
      bracketsChartMode = null;
      render();
      return;
    }

    if (e.target.id === "clear-trends-chart") {
      trendsWindowSelection = newChartSelection();
      trendsWindowMeta = new Map();
      resetTrendsChartRange();
      render();
      return;
    }

    if (e.target.id === "clear-seats-chart") {
      selectedSeats = [];
      render();
      return;
    }

    const colorChartRow = e.target.closest("[data-color-chart-row]");
    if (colorChartRow && statsTab === "colors") {
      const key = colorChartRow.dataset.colorChartRow;
      if (colorsChartSelection.has(key)) colorsChartSelection.delete(key);
      else colorsChartSelection.add(key);
      render();
      return;
    }

    const bracketChartRow = e.target.closest("[data-bracket-chart-row]");
    if (bracketChartRow && statsTab === "brackets") {
      const bracket = Number(bracketChartRow.dataset.bracketChartRow);
      const id = String(bracket);
      const rowCount = getStats().bracketStats.filter((b) => b.games > 0).length;
      statsBracketFilter = "";
      bracketsChartMode = "table";
      toggleChartSelection(bracketsChartSelection, id, rowCount);
      if (!bracketsChartSelection.size) bracketsChartMode = null;
      render();
      return;
    }

    const trendsWindowToggle = e.target.closest("[data-trends-window-toggle]");
    if (trendsWindowToggle) {
      const rangeStart = Number(trendsWindowToggle.dataset.rangeStart);
      const rangeEnd = Number(trendsWindowToggle.dataset.rangeEnd);
      const id = `${rangeStart}-${rangeEnd}`;
      const rowCount = getStats().rolling.windows.length;
      trendsFilter = { kind: "all" };
      resetTrendsChartRange();
      if (trendsWindowSelection.has(id)) {
        trendsWindowSelection.delete(id);
        trendsWindowMeta.delete(id);
      } else {
        toggleChartSelection(trendsWindowSelection, id, rowCount);
        trendsWindowMeta.set(id, {
          rangeStart,
          rangeEnd,
          label: trendsWindowToggle.dataset.label || `${rangeStart}-${rangeEnd}`,
        });
      }
      render();
      return;
    }

    const seatToggleBtn = e.target.closest("[data-seat-toggle]");
    if (seatToggleBtn) {
      const seat = Number(seatToggleBtn.dataset.seatToggle);
      if (selectedSeats.includes(seat)) {
        selectedSeats = selectedSeats.filter((s) => s !== seat);
      } else {
        selectedSeats = [...selectedSeats, seat].sort((a, b) => a - b);
      }
      render();
      return;
    }

    const seatViewBtn = e.target.closest("[data-seat-view-cycle]");
    if (seatViewBtn) {
      const index = SEAT_VIEW_MODES.indexOf(seatViewMode);
      seatViewMode = SEAT_VIEW_MODES[(index + 1) % SEAT_VIEW_MODES.length];
      seatRange = { start: null, end: null, customized: false };
      render();
      return;
    }

    if (e.target.id === "add-game-btn") {
      editingGameId = null;
      viewingGameId = null;
      gameModalOpen = true;
      render();
      return;
    }

    if (e.target.id === "delete-game-modal") {
      if (!editingGameId) return;
      if (!confirm("Delete this game?")) return;
      data.games = data.games.filter((g) => g.id !== editingGameId);
      editingGameId = null;
      gameModalOpen = false;
      saveData(data);
      render();
      toast("Deleted");
      return;
    }

    if (e.target.id === "close-game-detail") {
      viewingGameId = null;
      render();
      return;
    }

    const viewGameBtn = e.target.closest(".view-game");
    if (viewGameBtn) {
      viewingGameId = viewGameBtn.dataset.id;
      gameModalOpen = false;
      editingGameId = null;
      render();
      return;
    }

    if (e.target.id === "add-deck-btn") {
      openDeckModal();
      return;
    }

    const editDeckBtn = e.target.closest(".edit-deck");
    if (editDeckBtn) {
      openDeckModal(editDeckBtn.dataset.name);
      return;
    }

    const editBtn = e.target.closest(".edit-game");
    if (editBtn) {
      editingGameId = editBtn.dataset.id;
      viewingGameId = null;
      gameModalOpen = true;
      render();
      return;
    }

    const quickWin = e.target.closest(".quick-win");
    const quickLoss = e.target.closest(".quick-loss");
    if (quickWin || quickLoss) {
      fillLogForm({
        deck: (quickWin || quickLoss).dataset.deck,
        result: quickWin ? "Win" : "Loss",
      });
      return;
    }

    if (e.target.closest(".result-toggle.result-locked")) {
      e.preventDefault();
      syncResultFromSeats();
    }
  });

  document.getElementById("main").addEventListener("change", (e) => {
    const { id, value, checked } = e.target;

    if (id === "deck-status") {
      decksTab = value;
      render();
    } else if (id === "deck-bracket") {
      deckBracketFilter = value;
      render();
    } else if (id === "deck-sort") {
      deckSort = value;
      let col = value;
      let dir = deckSortDir;
      if (value === "recent") {
        col = "lastPlayed";
        dir = "desc";
      } else if (value === "newest") {
        col = "createdAt";
        dir = "desc";
      }
      tableSort["decks-main"] = { col, dir };
      deckSortDir = dir;
      render();
    } else if (e.target.name === "deck") {
      syncBracketFromDeck();
    } else if (e.target.name === "mySeat") {
      syncPodFormSeats();
      syncResultFromSeats();
    } else if (e.target.name === "winnerSeat") {
      syncResultFromSeats();
    } else if (e.target.name === "result") {
      const form = document.getElementById("add-game-form");
      const winnerSeat = Number(form?.querySelector('[name="winnerSeat"]')?.value) || 0;
      if (winnerSeat > 0) syncResultFromSeats();
    } else if (id === "filter-deck" || id === "filter-result" || id === "filter-year") {
      logFilters = {
        deck: document.getElementById("filter-deck")?.value || "",
        result: document.getElementById("filter-result")?.value || "",
        year: document.getElementById("filter-year")?.value || "",
      };
      applyLogFilters();
    }
  });

  document.getElementById("main").addEventListener("submit", (e) => {
    if (e.target.id === "add-game-form") {
      e.preventDefault();
      e.target.querySelectorAll('[name="result"]').forEach((el) => {
        el.disabled = false;
      });
      saveGameFromForm(new FormData(e.target));
    }
  });

  document.getElementById("export-btn").addEventListener("click", exportData);
  document.getElementById("import-btn").addEventListener("click", () => {
    document.getElementById("import-file").click();
  });
  document.getElementById("import-file").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      data = await importData(file);
      render();
      toast("Data imported");
    } catch {
      toast("Import failed — check the JSON file", true);
    }
    e.target.value = "";
  });
  document.getElementById("reset-btn").addEventListener("click", async () => {
    if (
      !confirm(
        "Delete all games, decks, and recorded players? Export a backup first if you want to keep your data."
      )
    ) {
      return;
    }
    data = await resetToSeed();
    render();
    toast("Site reset");
  });
}

function renderNav() {
  const nav = document.getElementById("nav");
  nav.innerHTML = VIEWS.map(
    (v) =>
      `<button type="button" class="nav-btn ${v.id === currentView ? "active" : ""}" data-view="${v.id}">${v.label}</button>`
  ).join("");
}

function subTabs(tabs, active, attr) {
  return `<div class="sub-tabs" role="tablist">${tabs
    .map(
      (t) =>
        `<button type="button" role="tab" aria-selected="${t.id === active}" class="sub-tab ${t.id === active ? "active" : ""}" data-${attr}="${t.id}">${t.label}</button>`
    )
    .join("")}</div>`;
}

function resetTrendsChartRange() {
  trendsChartRange = { start: null, end: null, customized: false };
}

function getTrendsChartGames(games, windows, windowSelection) {
  const sorted = [...games].sort(compareGamesChronologically);

  if (windowSelection.size && windows?.length) {
    const selectedWindows = windows.filter((window) =>
      windowSelection.has(`${window.rangeStart}-${window.rangeEnd}`)
    );
    if (selectedWindows.length) {
      return selectedWindows.flatMap((window) =>
        sorted.slice(window.rangeStart - 1, window.rangeEnd)
      );
    }
  }

  return gamesForTrendsFilter(games);
}

function gamesForTrendsFilter(games) {
  const sorted = [...games].sort(compareGamesChronologically);
  if (trendsFilter.kind === "all") return sorted;
  if (trendsFilter.kind === "window") {
    return sorted.slice(trendsFilter.rangeStart - 1, trendsFilter.rangeEnd);
  }
  if (trendsFilter.kind === "cumulative") {
    return sorted.slice(0, trendsFilter.rangeEnd);
  }
  if (trendsFilter.kind === "year") {
    return sorted.filter((g) => gameYear(g.date) === trendsFilter.year);
  }
  return sorted;
}

function trendsChartTitle() {
  if (trendsFilter.kind === "all") return "All games";
  if (trendsFilter.kind === "window") {
    return `Games ${trendsFilter.rangeStart}–${trendsFilter.rangeEnd}`;
  }
  if (trendsFilter.kind === "cumulative") return `Games 1–${trendsFilter.rangeEnd}`;
  if (trendsFilter.kind === "year") return trendsFilter.year;
  return "";
}

function isTrendsCumulativeActive(cumulativeRow) {
  return trendsFilter.kind === "cumulative" && trendsFilter.rangeEnd === cumulativeRow.games;
}

function isTrendsYearActive(yearRow) {
  return trendsFilter.kind === "year" && trendsFilter.year === yearRow.year;
}

let lastMatchupDeckRows = [];

function getEffectiveSeatRange(games) {
  const bounds = getSeatDateBounds(games, seatViewMode);
  if (!seatRange.customized) {
    return { start: bounds.min, end: bounds.max, bounds };
  }
  const start = seatRange.start || bounds.min;
  const end = seatRange.end || bounds.max;
  return {
    start: start < bounds.min ? bounds.min : start,
    end: end > bounds.max ? bounds.max : end,
    bounds,
  };
}

function bindHoverTip(tip, triggers, getContent) {
  if (!tip) return;

  triggers.forEach((el) => {
    const content = getContent(el);
    if (!content) return;

    const showTip = (e) => {
      tip.hidden = false;
      tip.innerHTML = content;
      tip.style.left = `${e.clientX + 12}px`;
      tip.style.top = `${e.clientY + 12}px`;
    };

    el.addEventListener("mouseenter", showTip);
    el.addEventListener("mousemove", showTip);
    el.addEventListener("mouseleave", () => {
      tip.hidden = true;
    });
  });
}

function formatPlayerBreakdownTip(breakdown) {
  if (!breakdown?.length) return "";
  return breakdown.map((row) => `${escapeHtml(row.player)}: ${row.games}`).join("<br>");
}

function bindMatchupDeckTips() {
  const tip = document.getElementById("matchup-deck-tip");
  if (!tip) return;

  bindHoverTip(tip, document.querySelectorAll(".matchup-pop-trigger"), (el) => {
    const row = lastMatchupDeckRows[Number(el.dataset.matchupRowIndex)];
    return formatPlayerBreakdownTip(row?.opponentPlayerBreakdown);
  });
}

function statsDeckFilterLabel(filter) {
  if (filter === "active") return "Active";
  if (filter === "retired") return "Retired";
  return "All Decks";
}

/** @param {import('./store.js').Deck[]} decks @param {"all" | "active" | "retired"} filter */
function filterDecksForStats(decks, filter) {
  if (filter === "active") return decks.filter((d) => !d.retired);
  if (filter === "retired") return decks.filter((d) => d.retired);
  return decks;
}

/** @param {import('./store.js').Game[]} games @param {import('./store.js').Deck[]} decks @param {"all" | "active" | "retired"} filter */
function filterGamesForStats(games, decks, filter) {
  if (filter === "all") return games;
  const deckMap = deckMapByKey(decks);
  return games.filter((game) => {
    const retired = deckMap.get(game.deck)?.retired ?? false;
    return filter === "retired" ? retired : !retired;
  });
}

function getStats() {
  const deckStats = computeDeckStats(data.decks, data.games);
  const statsDecks = filterDecksForStats(data.decks, statsDeckFilter);
  const statsGames = filterGamesForStats(data.games, data.decks, statsDeckFilter);
  const filteredDeckStats = computeDeckStats(
    statsDeckFilter === "all" ? data.decks : statsDecks,
    statsGames
  );
  const overview = computeOverview(statsGames);
  return {
    deckStats,
    overview,
    colorStats: computeColorStatsAdvanced(filteredDeckStats, {
      view: colorView,
      agg: colorAgg,
      sortOrder: colorSortOrder,
    }),
    bracketStats: computeBracketStats(statsGames, filteredDeckStats),
    yearStats: computeYearStats(statsGames),
    rolling: computeRolling100Stats(statsGames),
    matchups: computeAllMatchups(statsGames, {
      splitPartners: matchupSplitPartners,
      splitPlayers: matchupSplitPlayers,
      colorOptions: {
        decks: data.decks,
        deckFilter: statsDeckFilter,
        bracketFilter: "",
        view: matchupColorView,
        agg: matchupColorAgg,
      },
    }),
    totals: computeAllTotals(data.games, data.decks, {
      splitPartners: totalsSplitPartners,
      excludeMyPlayer: totalsExcludeMe,
      view: totalsColorView,
      agg: totalsColorAgg,
    }),
  };
}

function syncEntityReportModal() {
  let modal = document.getElementById("entity-report-modal");
  if (!entityReport || deckModalOpen) {
    modal?.remove();
    return;
  }

  const report = buildEntityReport(data.games, data.decks, {
    kind: entityReport.kind,
    key: entityReport.key,
    playerScope: entityReport.playerScope,
    deckSlotId: entityReport.deckSlotId,
    splitPartners: totalsSplitPartners,
  });

  if (!modal) {
    modal = document.createElement("div");
    modal.id = "entity-report-modal";
    modal.className = "modal";
    document.body.appendChild(modal);
  }

  modal.classList.remove("hidden");
  modal.innerHTML = renderEntityReportModal(report, data.decks, entityReportMatchupTab);
  bindWinRateLineCharts();
  void loadImagesIntoEntityReport(report.title);
}

function findEditingDeck() {
  if (!editingDeckName) return null;
  return data.decks.find((d) => deckId(d) === editingDeckName) || findDeck(data.decks, editingDeckName);
}

function closeDeckModal() {
  deckModalOpen = false;
  editingDeckName = null;
  document.getElementById("deck-modal")?.remove();
}

/** @param {string | null | undefined} [deckIdToEdit] */
function openDeckModal(deckIdToEdit = null) {
  editingDeckName = deckIdToEdit || null;
  entityReport = null;
  deckModalOpen = true;
  syncEntityReportModal();
  showDeckModal();
}

function showDeckModal() {
  document.getElementById("deck-modal")?.remove();

  const modal = document.createElement("div");
  modal.id = "deck-modal";
  modal.className = "modal deck-modal-layer";
  modal.innerHTML = renderDeckModalContent();
  document.body.appendChild(modal);
}

function saveDeckFromForm() {
  const form = document.getElementById("deck-form");
  if (!form) return;

  const fd = new FormData(form);
  const commander = String(fd.get("commander") || "").trim();
  if (!commander) {
    toast("Commander is required", true);
    return;
  }

  let colors = fd.getAll("color");
  if (!colors.length) {
    colors = getCommanderColorIdentity(commander);
  }

  const deck = {
    id: nextDeckId(data),
    name: String(fd.get("name") || "").trim(),
    commander,
    bracket: Number(fd.get("bracket")),
    colors,
    retired: fd.get("retired") === "on",
    createdAt: normalizeDate(String(fd.get("createdAt") || "")) || todayISO(),
  };
  const originalId = String(fd.get("originalId") || "").trim();

  if (originalId) {
    const idx = data.decks.findIndex((d) => deckId(d) === originalId);
    if (idx < 0) {
      toast("Deck not found", true);
      return;
    }
    const existing = data.decks[idx];
    const commanderClash = data.decks.some(
      (d) =>
        deckId(d) !== originalId &&
        getCommanderInfo(deckCommander(d)).canonicalName === getCommanderInfo(commander).canonicalName
    );
    if (commanderClash) {
      toast("Another deck already uses that commander", true);
      return;
    }
    data.decks[idx] = { ...existing, ...deck, id: originalId };
    closeDeckModal();
    saveData(data);
    toast("Deck saved");
    render();
    void refreshCommanderColorCache();
    return;
  }

  if (
    data.decks.some(
      (d) => getCommanderInfo(deckCommander(d)).canonicalName === getCommanderInfo(commander).canonicalName
    )
  ) {
    toast("Deck exists", true);
    return;
  }

  data.decks.push(deck);
  closeDeckModal();
  saveData(data);
  toast(`Added ${deckTitle(deck)}`);
  render();
  void refreshCommanderColorCache();
}

function renderDeckModalContent() {
  const editingDeck = findEditingDeck();
  const createdAtValue = editingDeck?.createdAt
    ? normalizeDate(editingDeck.createdAt) || todayISO()
    : todayISO();

  return `
    <div class="modal-content modal-content-deck">
      <h3>${editingDeck ? "Edit Deck" : "Add Deck"}</h3>
      <form id="deck-form" class="deck-form" novalidate>
        ${editingDeck ? `<input type="hidden" name="originalId" value="${escapeHtml(deckId(editingDeck))}" />` : ""}
        <label>Name<input name="name" placeholder="Optional deck name" value="${editingDeck ? escapeHtml(editingDeck.name || "") : ""}" /></label>
        <label>Commander<input name="commander" required value="${editingDeck ? escapeHtml(deckLabel(editingDeck)) : ""}" /></label>
        <label>Created<input type="date" name="createdAt" value="${createdAtValue}" /></label>
        <label>Bracket<select name="bracket">${[1, 2, 3, 4, 5].map((b) => `<option value="${b}" ${(editingDeck ? editingDeck.bracket : 4) === b ? "selected" : ""}>${b}</option>`).join("")}</select></label>
        <fieldset class="color-fieldset"><legend>Colors</legend>
          ${["W", "U", "B", "R", "G"].map((c) => `<label class="checkbox mana-check"><input type="checkbox" name="color" value="${c}" ${editingDeck?.colors?.includes(c) ? "checked" : ""} />${colorBadge([c])}</label>`).join("")}
        </fieldset>
        <label class="checkbox"><input type="checkbox" name="retired" ${editingDeck?.retired ? "checked" : ""} /> Retired</label>
        <div class="form-actions${editingDeck ? " form-actions--split" : ""}">
          ${editingDeck ? `<button type="button" class="btn btn-danger" id="delete-deck-modal">Delete</button>` : ""}
          <button type="button" class="btn btn-primary" id="save-deck-btn">${editingDeck ? "Save" : "Add Deck"}</button>
        </div>
      </form>
    </div>`;
}

function render() {
  const matchupSearchFocused = document.activeElement?.id === "matchup-search";
  const matchupSearchPos = matchupSearchFocused ? document.activeElement.selectionStart : null;
  const totalsSearchFocused = document.activeElement?.id === "totals-search";
  const totalsSearchPos = totalsSearchFocused ? document.activeElement.selectionStart : null;

  const main = document.getElementById("main");
  if (currentView === "stats") main.innerHTML = renderStats();
  else if (currentView === "decks") main.innerHTML = renderDecks();
  else main.innerHTML = renderGames();

  if (currentView === "games") applyLogFilters();
  bindPieCharts();
  if (currentView === "stats" && (statsTab === "trends" || statsTab === "seats" || statsTab === "colors" || statsTab === "brackets")) {
    bindWinRateLineCharts();
  }
  if (currentView === "stats" && statsTab === "matchups" && matchupTab === "decks") {
    bindMatchupDeckTips();
  }
  if (gameModalOpen) {
    syncPodFormSeats();
    syncResultFromSeats();
    syncBracketFromDeck();
    bindPodAutocomplete(document.getElementById("add-game-form"), data.games);
  }
  syncEntityReportModal();

  if (matchupSearchFocused) {
    const el = document.getElementById("matchup-search");
    if (el) {
      el.focus();
      if (matchupSearchPos != null) el.setSelectionRange(matchupSearchPos, matchupSearchPos);
    }
  }

  if (totalsSearchFocused) {
    const el = document.getElementById("totals-search");
    if (el) {
      el.focus();
      if (totalsSearchPos != null) el.setSelectionRange(totalsSearchPos, totalsSearchPos);
    }
  }
}

function applyLogFilters() {
  const { deck, result, year } = logFilters;
  const count = document.getElementById("filter-count");
  if (!count) return;

  let visible = 0;
  document.querySelectorAll("#game-log-table tbody tr").forEach((row) => {
    const show =
      (!deck || row.dataset.deck === deck) &&
      (!result || row.dataset.result === result) &&
      (!year || row.dataset.year === year);
    row.hidden = !show;
    if (show) visible++;
  });
  count.textContent = `${visible} games`;
}

function statCard(label, value, isWr = false) {
  const rendered = isWr ? pctCell(value) : `<span class="stat-value">${value}</span>`;
  return `<div class="stat-card"><span class="stat-label">${label}</span>${rendered}</div>`;
}

function impactCell(value, title = "") {
  const cls = matchupImpactClass(value);
  const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
  return `<span class="impact-cell ${cls}"${titleAttr}>${formatMatchupImpact(value)}</span>`;
}

function renderPodium(podium, labelForDeck = deckLabel) {
  if (!podium.length) {
    return "";
  }

  const labels = ["1st", "2nd", "3rd"];
  return `<div class="podium">${podium
    .map(
      (deck, index) => `
      <div class="podium-slot podium-${index + 1}">
        <span class="podium-rank">${labels[index]}</span>
        <strong class="podium-name">${renderDeckReportLink(deckCommander(deck), data.decks, { label: labelForDeck(deck), playerScope: MY_PLAYER_NAME, deckSlotId: deckId(deck) })}</strong>
        <span class="podium-meta">${deck.wins}W · ${deck.games}G · ${pct(deck.normalizedWr)} norm</span>
      </div>`
    )
    .join("")}</div>`;
}

function renderTurnStats(detail) {
  const turnWin = detail.avgTurnWin != null ? detail.avgTurnWin.toFixed(1) : "—";
  const turnLoss = detail.avgTurnLoss != null ? detail.avgTurnLoss.toFixed(1) : "—";

  return `
      <div class="stat-grid stat-grid-compact">
        ${statCard("Avg Turn (Win)", turnWin)}
        ${statCard("Avg Turn (Loss)", turnLoss)}
      </div>`;
}

function pieSliceSignature(slices) {
  return slices
    .filter((slice) => slice.value > 0)
    .map((slice) => `${slice.value}:${slice.key ?? ""}:${slice.bracket ?? ""}:${(slice.colors || []).join("")}`)
    .sort()
    .join("|");
}

function getPieRenderState(slices, tab) {
  const signature = pieSliceSignature(slices);
  if (tab === "colors") {
    const changed = signature !== lastColorsPieSignature;
    if (changed) {
      lastColorsPieSignature = signature;
      colorsPieAnimKey += 1;
    }
    return { key: colorsPieAnimKey, animate: changed };
  }
  const changed = signature !== lastBracketsPieSignature;
  if (changed) {
    lastBracketsPieSignature = signature;
    bracketsPieAnimKey += 1;
  }
  return { key: bracketsPieAnimKey, animate: changed };
}

function renderStats() {
  const s = getStats();
  let body = "";

  if (statsTab === "overview") {
    const { statsDecks, statsGames } = getStatsScope();
    const scopeDecks = statsDeckFilter === "all" ? data.decks : statsDecks;
    const bracketDetail = computeBracketDetail(statsGames, scopeDecks, statsBracketFilter);

    body = `
      <div class="filters inline overview-toolbar">
        ${renderStatsDeckFilterToggle()}
        <div class="bracket-filter-row overview-bracket-filters">${renderBracketFilterButtons()}</div>
      </div>
      <div class="stat-grid">
        ${statCard("Games", bracketDetail.overview.games)}
        ${statCard("Wins", bracketDetail.overview.wins)}
        ${statCard("Losses", bracketDetail.overview.losses)}
        ${statCard("Win Rate", bracketDetail.overview.winRate, true)}
      </div>
      ${renderTurnStats(bracketDetail)}
      <h3 class="section-sub">Top Decks</h3>
      ${renderPodium(bracketDetail.podium, deckTitle)}
      `;
  } else if (statsTab === "colors") {
    const { statsDecks, statsGames } = getStatsScope();
    const sortCol = tableSort["color-stats"]?.col || "colorOrder";
    const colors = applySort(
      s.colorStats,
      tableSort["color-stats"],
      {
        colorOrder: (c) => c.colorOrder,
        name: (c) => c.name,
        decks: (c) => c.decks,
        games: (c) => c.games,
        wins: (c) => c.wins,
        winRate: (c) => c.winRate,
      },
      WINS_SORT_TIE_BREAKERS
    );
    const pieSlices = pieSlicesFromRows(colors, sortCol, (c) => ({
      colors: c.displayColors,
      color: c.key !== "C" && c.displayColors.length === 1 ? c.displayColors[0] : undefined,
      key: c.key,
    }));

    const avgGames = colorStatAverage(colors, "games");
    const avgWins = colorStatAverage(colors, "wins");
    const avgDecks = colorStatAverage(colors, "decks");
    const chartRange = getEffectiveChartRange(statsGames, colorsChartRange);
    const colorChart = renderMultiWinRateLineChart(
      colors
        .map((c, index) => ({ c, index }))
        .filter(({ c }) => colorsChartSelection.has(c.key))
        .map(({ c, index }) => ({
          id: c.key,
          label: c.key === "C" ? "Colorless" : c.key,
          color: pickSliceColor(colorStatSlice(c), index),
          series: computeWinRateSeries(
            gamesForColorSeries(
              statsGames,
              statsDecks,
              c.key,
              colorView === "exact" ? "exclusive" : colorAgg,
              chartRange.start,
              chartRange.end
            )
          ),
        })),
      chartRange
    );

    const colorsPie = getPieRenderState(pieSlices, "colors");

    body = `
      ${renderStatsToolbar("colors", chartRange.bounds, chartRange, {
        deckFilter: true,
        extra: `
        <button type="button" class="btn btn-ghost btn-sm" id="color-view-toggle">${colorViewLabel(colorView)}</button>
        <button type="button" class="btn btn-ghost btn-sm" id="color-agg-toggle">${colorAgg === "inclusive" ? "Inclusive" : "Exclusive"}</button>`,
      })}
      <div class="chart-table-row">
        <div class="chart-table-grow">
          <table class="table compact sortable-table">
            <thead><tr>
              <th class="sortable col-color-order" id="color-order-toggle">${colorColumnSortLabel(colorSortOrder)}</th>
              ${sortHeader("color-stats", "decks", "Decks", tableSort["color-stats"])}
              ${sortHeader("color-stats", "games", "G", tableSort["color-stats"])}
              ${sortHeader("color-stats", "wins", "W", tableSort["color-stats"])}
              ${sortHeader("color-stats", "winRate", "WR", tableSort["color-stats"])}
            </tr></thead>
            <tbody>
              ${colors
                .map((c, index) => {
                  const seriesColor = colorsChartSelection.has(c.key)
                    ? pickSliceColor(colorStatSlice(c), index)
                    : null;
                  return `
                <tr class="chart-series-selectable${seriesColor ? " active" : ""}" data-color-chart-row="${c.key}"${chartSeriesRowStyle(seriesColor)}>
                  <td><span class="color-label">${colorBadge(c.displayColors)}</span></td>
                  <td>${c.key === "C" ? c.decks : valueCell(c.decks, avgDecks)}</td>
                  <td>${c.key === "C" ? c.games : valueCell(c.games, avgGames)}</td>
                  <td>${c.key === "C" ? c.wins : valueCell(c.wins, avgWins)}</td>
                  <td>${c.games ? pctCell(c.winRate) : "—"}</td>
                </tr>`;
                })
                .join("")}
            </tbody>
          </table>
        </div>
        ${renderPieChart(pieSlices, colorsPie.key, { animate: colorsPie.animate })}
      </div>
      ${renderChartSection(colorChart, "clear-colors-chart")}`;
  } else if (statsTab === "brackets") {
    const { statsDecks, statsGames } = getStatsScope();
    const sortCol = tableSort["bracket-stats"]?.col || "bracket";
    const brackets = applySort(
      s.bracketStats.filter((b) => b.games > 0),
      tableSort["bracket-stats"],
      {
        bracket: (b) => b.bracket,
        games: (b) => b.games,
        wins: (b) => b.wins,
        winRate: (b) => b.winRate,
      },
      WINS_SORT_TIE_BREAKERS
    );
    const pieSlices = pieSlicesFromRows(brackets, sortCol, (b) => ({
      bracket: b.bracket,
    }));
    const chartRange = getEffectiveChartRange(statsGames, bracketsChartRange);
    const bracketsPie = getPieRenderState(pieSlices, "brackets");

    let bracketSeries = [];
    if (bracketsChartMode === "filter" && statsBracketFilter) {
      const filteredBracket = brackets.find((b) => String(b.bracket) === statsBracketFilter);
      if (filteredBracket) {
        bracketSeries = [
          {
            id: filteredBracket.bracket,
            label: `Bracket ${filteredBracket.bracket}`,
            color: CHART_FILTER_ACCENT,
            series: computeWinRateSeries(
              gamesForBracketSeries(
                statsGames,
                statsDecks,
                filteredBracket.bracket,
                chartRange.start,
                chartRange.end
              )
            ),
          },
        ];
      }
    } else if (bracketsChartMode === "table" && bracketsChartSelection.size) {
      bracketSeries = brackets
        .filter((b) => bracketsChartSelection.has(String(b.bracket)))
        .map((b) => ({
          id: b.bracket,
          label: `Bracket ${b.bracket}`,
          color: colorForChartSelection(bracketsChartSelection, b.bracket, brackets.length),
          series: computeWinRateSeries(
            gamesForBracketSeries(
              statsGames,
              statsDecks,
              b.bracket,
              chartRange.start,
              chartRange.end
            )
          ),
        }));
    }
    const bracketChart = renderMultiWinRateLineChart(bracketSeries, chartRange);

    body = `
      ${renderDateRangeFilters("brackets", chartRange.bounds, chartRange, { deckFilter: true })}
      <div class="chart-table-row">
        <div class="chart-table-grow">
          <table class="table compact sortable-table">
            <thead><tr>
              ${sortHeader("bracket-stats", "bracket", "Brkt", tableSort["bracket-stats"])}
              ${sortHeader("bracket-stats", "games", "G", tableSort["bracket-stats"])}
              ${sortHeader("bracket-stats", "wins", "W", tableSort["bracket-stats"])}
              ${sortHeader("bracket-stats", "winRate", "WR", tableSort["bracket-stats"])}
            </tr></thead>
            <tbody>
              ${brackets
                .map((b) => {
                  const seriesColor = colorForChartSelection(bracketsChartSelection, b.bracket, brackets.length);
                  return `
                <tr class="chart-series-selectable${seriesColor ? " active" : ""}" data-bracket-chart-row="${b.bracket}"${chartSeriesRowStyle(seriesColor)}>
                  <td><span class="bracket-pill" style="background:${getBracketColor(b.bracket)}">${b.bracket}</span></td><td>${b.games}</td><td>${b.wins}</td>
                  <td>${pctCell(b.winRate)}</td>
                </tr>`;
                })
                .join("")}
            </tbody>
          </table>
        </div>
        ${renderPieChart(pieSlices, bracketsPie.key, { animate: bracketsPie.animate })}
      </div>
      ${renderChartSection(bracketChart, "clear-brackets-chart")}`;
  } else if (statsTab === "trends") {
    const { statsGames } = getStatsScope();
    const windowsForChart = s.rolling.windows.length
      ? applySort(s.rolling.windows, tableSort["trends-windows"], {
          label: (w) => w.label,
          rangeStart: (w) => w.rangeStart,
          games: (w) => w.games,
          winRate: (w) => w.winRate,
        })
      : [];
    const chartGames = getTrendsChartGames(statsGames, windowsForChart, trendsWindowSelection);
    const chartRange = getEffectiveChartRange(
      chartGames.length ? chartGames : statsGames,
      trendsChartRange
    );
    const summaryGames = gamesInChartRange(statsGames, chartRange);
    let streakMode = "current";
    if (trendsFilter.kind !== "all") {
      streakMode = "hidden";
    } else {
      const latestGameDate = getChartDateBounds(statsGames).max;
      if (trendsChartRange.customized && chartRange.end < latestGameDate) {
        streakMode = "at-end";
      }
    }
    const trendsSummary = renderTrendsSummaryStats(computeTrendsSummary(summaryGames), { streakMode });

    let chart = "";
    if (trendsWindowSelection.size && windowsForChart.length) {
      chart = renderMultiWinRateLineChart(
        windowsForChart
          .filter((window) => trendsWindowSelection.has(`${window.rangeStart}-${window.rangeEnd}`))
          .map((window) => {
            const id = `${window.rangeStart}-${window.rangeEnd}`;
            return {
              id,
              label: window.label,
              color: colorForChartSelection(trendsWindowSelection, id, windowsForChart.length),
              series: computeWinRateSeries(
                gamesForTrendsWindowSeries(statsGames, window.rangeStart, window.rangeEnd)
              ),
            };
          }),
        chartRange
      );
    } else {
      chart = renderWinRateLineChart(
        computeWinRateSeries(chartGames),
        trendsChartTitle(),
        chartRange
      );
    }

    if (!s.rolling.windows.length) {
      body = `${renderDateRangeFilters("trends", chartRange.bounds, chartRange, { deckFilter: true })}${trendsSummary}${renderChartSection(chart, "clear-trends-chart")}`;
    } else {
      const windows = windowsForChart;
      const cumulative = applySort(s.rolling.cumulative, tableSort["trends-cumulative"], {
        label: (w) => w.label,
        games: (w) => w.games,
        winRate: (w) => w.winRate,
      });

      body = `
        ${renderDateRangeFilters("trends", chartRange.bounds, chartRange, { deckFilter: true })}
        ${trendsSummary}
        <h3 class="section-sub">By Year</h3>
        <div class="year-row">
          <button type="button" class="year-chip trends-selectable ${trendsFilter.kind === "all" ? "active" : ""}" data-trends-all>
            <strong>All Time</strong>
            <span>${s.overview.games}g · ${s.overview.wins}w · ${pctCell(s.overview.winRate)}</span>
          </button>
          ${s.yearStats
            .map(
              (y) => `
            <button type="button" class="year-chip trends-selectable ${isTrendsYearActive(y) ? "active" : ""}"
              data-trends-year="${y.year}">
              <strong>${y.year}</strong>
              <span>${y.games}g · ${y.wins}w · ${pctCell(y.winRate)}</span>
            </button>`
            )
            .join("")}
        </div>
        <div class="two-col">
          <div>
            <h3 class="section-sub">Per 100 Games</h3>
            <table class="table compact sortable-table trends-table">
              <thead><tr>
                ${sortHeader("trends-windows", "rangeStart", "Games", tableSort["trends-windows"])}
                ${sortHeader("trends-windows", "winRate", "WR", tableSort["trends-windows"])}
              </tr></thead>
              <tbody>
                ${windows
                  .map((w) => {
                    const id = `${w.rangeStart}-${w.rangeEnd}`;
                    const seriesColor = colorForChartSelection(trendsWindowSelection, id, windows.length);
                    return `
                  <tr class="chart-series-selectable trends-selectable${seriesColor ? " active" : ""}"
                    data-trends-window-toggle data-label="${escapeHtml(w.label)}"
                    data-range-start="${w.rangeStart}" data-range-end="${w.rangeEnd}"${chartSeriesRowStyle(seriesColor)}>
                    <td>${w.label}</td>
                    <td>${pctCell(w.winRate)}</td>
                  </tr>`;
                  })
                  .join("")}
              </tbody>
            </table>
          </div>
          <div>
            <h3 class="section-sub">Cumulative</h3>
            <table class="table compact sortable-table trends-table">
              <thead><tr>
                ${sortHeader("trends-cumulative", "games", "Games", tableSort["trends-cumulative"])}
                ${sortHeader("trends-cumulative", "winRate", "WR", tableSort["trends-cumulative"])}
              </tr></thead>
              <tbody>
                ${cumulative
                  .map(
                    (w) => `
                  <tr class="trends-selectable ${isTrendsCumulativeActive(w) ? "active" : ""}"
                    data-trends-cumulative data-range-end="${w.games}">
                    <td>${w.label}</td>
                    <td>${pctCell(w.winRate)}</td>
                  </tr>`
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        </div>
        ${renderChartSection(chart, "clear-trends-chart")}`;
    }
  } else if (statsTab === "seats") {
    const { statsGames } = getStatsScope();
    const bounds = getSeatDateBounds(statsGames, seatViewMode);
    const range = getEffectiveSeatRange(statsGames);
    const seatStats = computeSeatStats(statsGames, seatViewMode);
    const seatChart = renderMultiWinRateLineChart(
      selectedSeats.map((seat) => ({
        id: seat,
        label: `Seat ${seat}`,
        color: SEAT_COLORS[seat],
        series: computeWinRateSeries(
          gamesForSeatSeries(statsGames, seat, range.start, range.end, seatViewMode)
        ),
      })),
      range
    );

    body = `
      ${renderDateRangeFilters("seats", bounds, range, { deckFilter: true })}
      <div class="seat-toggle-row">
        <button type="button" class="seat-toggle seat-view-toggle" data-seat-view-cycle title="Cycle seat perspective">
          <strong>${SEAT_VIEW_LABELS[seatViewMode]}</strong>
        </button>
        ${seatStats
          .map(
            (seat) => `
          <button type="button" class="seat-toggle ${selectedSeats.includes(seat.seat) ? "active" : ""}"
            data-seat-toggle="${seat.seat}" style="--seat-color:${SEAT_COLORS[seat.seat]}">
            <strong>${seat.label}</strong>
            <span>${seat.games}G · ${seat.wins}W · ${seat.games ? pctCell(seat.winRate) : "—"}</span>
          </button>`
          )
          .join("")}
      </div>
      ${renderChartSection(seatChart, "clear-seats-chart")}`;
  } else if (statsTab === "matchups") {
    const isDeckTab = matchupTab === "decks";
    const isColorTab = matchupTab === "colors";
    const query = matchupSearch.trim().toLowerCase();
    const sorted = applySort(
      s.matchups[matchupTab] || [],
      tableSort.matchups,
      {
        subject: (r) => r.subject,
        opponent: (r) => r.opponent,
        games: (r) => r.games,
        wins: (r) => r.wins,
        opponentCount: (r) => r.opponentCount ?? 0,
        winRate: (r) => r.winRate,
        matchupImpact: (r) => r.matchupImpact,
        normalizedMatchupImpact: (r) => r.normalizedMatchupImpact,
        opponentMatchupImpact: (r) => r.opponentMatchupImpact,
        opponentNormalizedMatchupImpact: (r) => r.opponentNormalizedMatchupImpact,
        outcomeTieRank: (r) => r.sharedLosses - r.losses,
      },
      {
        ...WINS_SORT_TIE_BREAKERS,
        matchupImpact: ["outcomeTieRank", "games"],
        normalizedMatchupImpact: ["outcomeTieRank", "games"],
        opponentMatchupImpact: "games",
        opponentNormalizedMatchupImpact: "games",
      }
    );
    const ranked = sorted.map((row, index) => ({ ...row, rank: index + 1 }));
    const rows = ranked.filter((row) => {
      if (!query) return true;
      if (isDeckTab) {
        return (
          row.opponent.toLowerCase().includes(query) ||
          row.subject.toLowerCase().includes(query) ||
          (row.opponentPlayer && row.opponentPlayer.toLowerCase().includes(query))
        );
      }
      if (isColorTab) {
        return colorMatchupRowMatchesSearch(row, query);
      }
      return row.opponent.toLowerCase().includes(query);
    });
    lastMatchupDeckRows = isDeckTab ? rows : [];

    const searchPlaceholder = isDeckTab
      ? "Search my or opponent decks"
      : isColorTab
        ? 'Search Color: "WUB"'
        : "Search opponents";

    const colorToolbarControls = isColorTab
      ? `<button type="button" class="btn btn-ghost btn-sm" id="matchup-color-view-toggle">${colorViewLabel(matchupColorView)}</button>
        <button type="button" class="btn btn-ghost btn-sm" id="matchup-color-agg-toggle">${matchupColorAgg === "inclusive" ? "Inclusive" : "Exclusive"}</button>
        <label class="checkbox matchup-split-partners">
          <input type="checkbox" id="matchup-split-partners" ${matchupSplitPartners ? "checked" : ""} />
          Split partners
        </label>`
      : "";

    const deckToolbarControls = isDeckTab
      ? `<label class="checkbox matchup-split-partners">
          <input type="checkbox" id="matchup-split-partners" ${matchupSplitPartners ? "checked" : ""} />
          Split partners
        </label>
        <label class="checkbox matchup-split-players">
          <input type="checkbox" id="matchup-split-players" ${matchupSplitPlayers ? "checked" : ""} />
          Split Players
        </label>`
      : "";

    const subjectHeader = isDeckTab
      ? sortHeader("matchups", "subject", "Deck", tableSort.matchups)
      : isColorTab
        ? sortHeader("matchups", "subject", "My Colors", tableSort.matchups)
        : "";
    const opponentHeader = sortHeader(
      "matchups",
      "opponent",
      isDeckTab ? "Opponent Deck" : isColorTab ? "Opponent Colors" : "Opponent",
      tableSort.matchups
    );

    body = `
      ${subTabs(MATCHUP_TABS, matchupTab, "matchup-tab")}
      <div class="filters inline matchup-filters">
        ${renderStatsDeckFilterToggle()}
        ${colorToolbarControls}
        ${deckToolbarControls}
        <input type="search" id="matchup-search" class="input matchup-search" placeholder="${searchPlaceholder}" value="${escapeHtml(matchupSearch)}" />
      </div>
      <table class="table compact sortable-table matchup-table">
        <thead><tr>
          <th class="col-rank">#</th>
          ${subjectHeader}
          ${opponentHeader}
          ${sortHeader("matchups", "games", "G", tableSort.matchups)}
          ${sortHeader("matchups", "wins", "W", tableSort.matchups)}
          ${isDeckTab && !matchupSplitPlayers ? sortHeader("matchups", "opponentCount", "Pop", tableSort.matchups) : ""}
          ${sortHeader("matchups", "winRate", "WR", tableSort.matchups)}
          ${sortHeader("matchups", "matchupImpact", "MI", tableSort.matchups)}
          ${sortHeader("matchups", "normalizedMatchupImpact", "NMI", tableSort.matchups)}
          ${sortHeader("matchups", "opponentMatchupImpact", "Opp MI", tableSort.matchups)}
          ${sortHeader("matchups", "opponentNormalizedMatchupImpact", "Opp NMI", tableSort.matchups)}
        </tr></thead>
        <tbody>
          ${rows
            .map(
              (row, rowIndex) => `
            <tr>
              <td class="col-rank">${row.rank}</td>
              ${
                isDeckTab
                  ? `<td class="matchup-deck-col">${renderMatchupDeckCell(row.subject, data.decks)}</td>`
                  : isColorTab
                    ? `<td class="matchup-color-col"><span class="color-label">${colorBadge(row.subjectColors || [])}</span></td>`
                    : ""
              }
              ${
                isDeckTab
                  ? `<td class="matchup-deck-col">${renderMatchupOpponentDeckCell(row, data.decks)}</td>`
                  : isColorTab
                    ? `<td class="matchup-color-col"><span class="color-label">${colorBadge(row.opponentColors || [])}</span></td>`
                    : `<td>${renderPlayerReportLink(row.opponent)}</td>`
              }
              <td>${row.games}</td>
              <td>${row.wins}</td>
              ${isDeckTab && !matchupSplitPlayers ? `<td class="matchup-pop-col">${row.opponentCount ? `<span class="matchup-pop-trigger has-tip" data-matchup-row-index="${rowIndex}">${row.opponentCount}</span>` : "—"}</td>` : ""}
              <td>${pctCell(row.winRate)}</td>
              <td>${impactCell(row.matchupImpact)}</td>
              <td>${impactCell(row.normalizedMatchupImpact)}</td>
              <td>${impactCell(row.opponentMatchupImpact)}</td>
              <td>${impactCell(row.opponentNormalizedMatchupImpact)}</td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>
      ${isDeckTab && !matchupSplitPlayers ? `<div id="matchup-deck-tip" class="deck-opponent-tip" hidden></div>` : ""}`;
  } else if (statsTab === "totals") {
    const isDeckTab = totalsTab === "decks";
    const isPlayerTab = totalsTab === "players";
    const isColorTab = totalsTab === "colors";
    const query = totalsSearch.trim().toLowerCase();
    const tableId = `totals-${totalsTab}`;
    const rows = applySort(
      s.totals[totalsTab] || [],
      tableSort[tableId],
      {
        name: (r) => r.name,
        colors: (r) => colorIdentitySortIndex(r.colors || []),
        pilotCount: (r) => r.pilotCount ?? 0,
        commanderCount: (r) => r.commanderCount ?? 0,
        playerCount: (r) => r.playerCount ?? 0,
        games: (r) => r.games,
        wins: (r) => r.wins,
        winRate: (r) => r.winRate,
        normalizedWr: (r) => r.normalizedWr,
      },
      WINS_SORT_TIE_BREAKERS
    )
      .map((row, index) => ({ ...row, rank: index + 1 }))
      .filter((row) => !query || row.name.toLowerCase().includes(query));

    const nameHeader = isDeckTab ? "Deck" : isPlayerTab ? "Player" : "Colors";

    const splitPartnersControl =
      isDeckTab || isColorTab
        ? `<label class="checkbox totals-split-partners">
          <input type="checkbox" id="totals-split-partners" ${totalsSplitPartners ? "checked" : ""} />
          Split partners
        </label>`
        : "";

    const excludeMeControl = `<label class="checkbox totals-exclude-me">
      <input type="checkbox" id="totals-exclude-me" ${totalsExcludeMe ? "checked" : ""} />
      Exclude my data
    </label>`;

    const totalsSearchInput = `<input type="search" id="totals-search" class="input totals-search" placeholder="Search ${nameHeader.toLowerCase()}" value="${escapeHtml(totalsSearch)}" />`;

    const totalsToolbar = isColorTab
      ? `<div class="filters inline totals-filters totals-color-toolbar">
        <button type="button" class="btn btn-ghost btn-sm" id="totals-color-view-toggle">${colorViewLabel(totalsColorView)}</button>
        <button type="button" class="btn btn-ghost btn-sm" id="totals-color-agg-toggle">${totalsColorAgg === "inclusive" ? "Inclusive" : "Exclusive"}</button>
        ${splitPartnersControl}
        ${excludeMeControl}
        ${totalsSearchInput}
      </div>`
      : `<div class="filters inline totals-filters">
        ${splitPartnersControl}
        ${excludeMeControl}
        ${totalsSearchInput}
      </div>`;

    const extraHeader = isDeckTab
      ? sortHeader(tableId, "pilotCount", "Pilots", tableSort[tableId])
      : isPlayerTab
        ? sortHeader(tableId, "commanderCount", "Decks", tableSort[tableId])
        : `${sortHeader(tableId, "playerCount", "Pilots", tableSort[tableId])}${sortHeader(tableId, "commanderCount", "Decks", tableSort[tableId])}`;

    body = `
      ${subTabs(TOTALS_TABS, totalsTab, "totals-tab")}
      ${totalsToolbar}
      <table class="table compact sortable-table totals-table">
        <thead><tr>
          <th class="col-rank">#</th>
          ${sortHeader(tableId, "name", nameHeader, tableSort[tableId])}
          ${isDeckTab ? sortHeader(tableId, "colors", "Color Identity", tableSort[tableId], "totals-ci-col") : ""}
          ${extraHeader}
          ${sortHeader(tableId, "games", "G", tableSort[tableId])}
          ${sortHeader(tableId, "wins", "W", tableSort[tableId])}
          ${sortHeader(tableId, "winRate", "WR", tableSort[tableId])}
          ${sortHeader(tableId, "normalizedWr", "Norm WR", tableSort[tableId])}
        </tr></thead>
        <tbody>
          ${rows
            .map(
              (row) => `
            <tr>
              <td class="col-rank">${row.rank}</td>
              ${
                isDeckTab
                  ? `<td class="totals-name-col">${renderDeckReportLink(row.name, data.decks, { label: row.name })}</td><td class="totals-color-col"><span class="color-label">${colorBadge(row.colors || [])}</span></td>`
                  : isColorTab
                    ? `<td class="totals-color-col"><span class="color-label">${colorBadge(row.displayColors || [])}</span></td>`
                    : `<td>${renderPlayerReportLink(row.name)}</td>`
              }
              ${
                isDeckTab
                  ? `<td>${row.pilotCount || "—"}</td>`
                  : isPlayerTab
                    ? `<td>${row.commanderCount || "—"}</td>`
                    : `<td>${row.playerCount || "—"}</td><td>${row.commanderCount || "—"}</td>`
              }
              <td>${row.games}</td>
              <td>${row.wins}</td>
              <td>${pctCell(row.winRate)}</td>
              <td>${pctCell(row.normalizedWr)}</td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>`;
  }

  return `<section class="section">${subTabs(STATS_TABS, statsTab, "stats-tab")}${body}</section>`;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderDecks() {
  const { deckStats } = getStats();
  let list = deckStats;
  if (decksTab === "active") list = list.filter((d) => !d.retired);
  else if (decksTab === "retired") list = list.filter((d) => d.retired);
  if (deckBracketFilter) list = list.filter((d) => String(d.bracket) === deckBracketFilter);

  const sortState = tableSort["decks-main"] || { col: deckSort, dir: deckSortDir };
  deckSort = sortState.col;
  deckSortDir = sortState.dir;
  if (sortState.col === "lastPlayed") deckSort = "recent";
  else if (sortState.col === "createdAt") deckSort = "newest";
  else if (sortState.col === "colors") deckSort = "colors";

  list = sortDeckList(list, sortState.col, sortState.dir);

  const showLastPlayed = deckSort === "recent" || sortState.col === "lastPlayed";
  const dateSortCol = showLastPlayed ? "lastPlayed" : "createdAt";
  const dateColLabel = showLastPlayed ? "Played" : "Added";
  const dateCell = (d) =>
    showLastPlayed ? (d.lastPlayed ? formatDate(d.lastPlayed) : "—") : formatDate(d.createdAt);

  return `
    <section class="section">
      <div class="section-header">
        <div class="filters inline">
          <label>Status <select id="deck-status">${DECK_STATUS_OPTIONS.map((opt) => `<option value="${opt.id}" ${decksTab === opt.id ? "selected" : ""}>${opt.label}</option>`).join("")}</select></label>
          <label>Bracket <select id="deck-bracket"><option value="">All</option>${[1, 2, 3, 4, 5].map((b) => `<option value="${b}" ${deckBracketFilter === String(b) ? "selected" : ""}>${b}</option>`).join("")}</select></label>
          <label>Sort <select id="deck-sort">
            <option value="normWr" ${deckSort === "normWr" ? "selected" : ""}>Norm WR</option>
            <option value="games" ${deckSort === "games" ? "selected" : ""}>Most games</option>
            <option value="wr" ${deckSort === "wr" ? "selected" : ""}>Win rate</option>
            <option value="newest" ${deckSort === "newest" ? "selected" : ""}>Newest</option>
            <option value="recent" ${deckSort === "recent" ? "selected" : ""}>Most recent</option>
            <option value="name" ${deckSort === "name" ? "selected" : ""}>Name</option>
          </select></label>
        </div>
        <button type="button" class="btn btn-primary" id="add-deck-btn">+ Deck</button>
      </div>
      <div class="table-wrap">
        <table class="table sortable-table decks-table">
          <colgroup>
            <col class="decks-col-date" />
            <col class="decks-col-name" />
            <col class="decks-col-colors" />
            <col class="decks-col-bracket" />
            <col class="decks-col-games" />
            <col class="decks-col-wins" />
            <col class="decks-col-stat" />
            <col class="decks-col-stat" />
            <col class="decks-col-actions" />
          </colgroup>
          <thead><tr>
            ${sortHeader("decks-main", dateSortCol, dateColLabel, sortState, "deck-date-col")}
            ${sortHeader("decks-main", "name", "Deck", sortState, "deck-name-col")}
            ${sortHeader("decks-main", "colors", "Color Identity", sortState, "deck-colors-col")}
            ${sortHeader("decks-main", "bracket", "Bracket", sortState, "deck-tight-col")}
            ${sortHeader("decks-main", "games", "Games", sortState, "deck-tight-col")}
            ${sortHeader("decks-main", "wins", "Wins", sortState, "deck-tight-col")}
            ${sortHeader("decks-main", "normWr", "Norm WR", sortState, "deck-stat-col")}
            ${sortHeader("decks-main", "winRate", "Win Rate", sortState, "deck-stat-col")}
            <th class="row-actions-col"></th>
          </tr></thead>
          <tbody>
            ${list.length ? list.map((d) => `<tr><td class="deck-date">${dateCell(d)}</td><td class="deck-name">${renderDeckReportLink(deckCommander(d), data.decks, { label: deckTitle(d), deckSlotId: deckId(d) })}</td><td class="deck-colors">${colorBadge(getDeckColors(d))}</td><td class="deck-tight">${d.bracket}</td><td class="deck-tight">${d.games}</td><td class="deck-tight">${d.wins}</td><td class="deck-stat">${d.games ? pctCell(d.normalizedWr) : "—"}</td><td class="deck-stat">${d.games ? pctCell(d.winRate) : "—"}</td><td class="row-actions"><button type="button" class="btn-icon edit-deck" data-name="${escapeHtml(deckId(d))}" title="Edit deck">✎</button></td></tr>`).join("") : '<tr><td colspan="9"></td></tr>'}
          </tbody>
        </table>
      </div>
    </section>`;
}

function renderGames() {
  let games = [...data.games];
  games = applySort(games, tableSort["game-log"], {
    date: (g) => gameSortKey(g),
    deck: (g) => g.deck,
    result: (g) => (g.result === "Win" ? 1 : 0),
    mySeat: (g) => g.mySeat || 0,
    turn: (g) => g.turn || 0,
  });

  const decks = [...data.decks]
    .sort((a, b) => deckLabel(a).localeCompare(deckLabel(b)))
    .map((d) => deckId(d));
  const years = [...new Set(data.games.map((g) => gameYear(g.date)))].sort();
  const sort = tableSort["game-log"];
  const editing = editingGameId ? data.games.find((g) => g.id === editingGameId) : null;
  const viewing = viewingGameId ? data.games.find((g) => g.id === viewingGameId) : null;

  return `
    <section class="section">
      <div class="section-header">
        <div class="filters inline">
          <label>Deck<select id="filter-deck"><option value="">All</option>${decks.map((d) => `<option value="${escapeHtml(d)}" ${logFilters.deck === d ? "selected" : ""}>${escapeHtml(deckLabelForKey(d, data.decks))}</option>`).join("")}</select></label>
          <label>Result<select id="filter-result"><option value="">All</option><option value="Win" ${logFilters.result === "Win" ? "selected" : ""}>Wins</option><option value="Loss" ${logFilters.result === "Loss" ? "selected" : ""}>Losses</option></select></label>
          <label>Year<select id="filter-year"><option value="">All</option>${years.map((y) => `<option value="${y}" ${logFilters.year === y ? "selected" : ""}>${y}</option>`).join("")}</select></label>
          <span class="filter-count" id="filter-count">${games.length} games</span>
        </div>
        <button type="button" class="btn btn-primary" id="add-game-btn">+ Game</button>
      </div>
      <div class="table-wrap">
        <table class="table sortable-table" id="game-log-table">
          <thead><tr>
            ${sortHeader("game-log", "date", "Date", sort)}
            ${sortHeader("game-log", "deck", "Deck", sort)}
            ${sortHeader("game-log", "mySeat", "Seat", sort)}
            ${sortHeader("game-log", "turn", "End Turn", sort)}
            ${sortHeader("game-log", "result", "Result", sort)}
            <th class="row-actions-col"></th>
          </tr></thead>
          <tbody>${games.map((g) => gameRow(g)).join("")}</tbody>
        </table>
      </div>
    </section>
    <div id="game-modal" class="modal ${gameModalOpen ? "" : "hidden"}">
      <div class="modal-content modal-content-wide">
        <h3>${editing ? "Edit Game" : "Log Game"}</h3>
        ${renderLogForm()}
      </div>
    </div>
    <div id="game-detail-modal" class="modal ${viewing ? "" : "hidden"}">
      <div class="modal-content modal-content-wide">
        <h3>Game Details</h3>
        ${viewing ? renderGameDetail(viewing) : ""}
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" id="close-game-detail">Close</button>
        </div>
      </div>
    </div>`;
}

function seatOptions(selected = "") {
  return [1, 2, 3, 4]
    .map(
      (n) =>
        `<option value="${n}" ${String(selected) === String(n) ? "selected" : ""}>${n}</option>`
    )
    .join("");
}

function opponentName(game, seat) {
  if (!game?.opponents) return "";
  const row = game.opponents.find((o) => o.seat === seat);
  return row?.name || "";
}

function playerName(game, seat) {
  if (!game) return "";
  if (game.mySeat === seat && game.myPlayer) return game.myPlayer;
  const row = game.opponents?.find((o) => o.seat === seat);
  return row?.player || "";
}

function fieldValue(value, placeholder = "—") {
  const text = value != null && value !== "" ? String(value) : placeholder;
  return `<span class="field-value">${escapeHtml(text)}</span>`;
}

/** @param {string} value @param {'player' | 'deck'} [kind] @param {import('./store.js').Game | null} [game] @param {number | null} [seat] */
function fieldValueLink(value, kind = "player", game = null, seat = null) {
  if (value == null || value === "") {
    return fieldValue("—");
  }
  if (kind === "player") {
    return `<span class="field-value">${renderPlayerReportLink(value)}</span>`;
  }
  const playerScope = game && seat ? podPlayerName(game, seat) : null;
  return `<span class="field-value">${renderDeckReportLink(value, data.decks, { label: value, playerScope })}</span>`;
}

function podPlayerName(game, seat) {
  if (Number(game.mySeat) === seat) return MY_PLAYER_NAME;
  return playerName(game, seat);
}

function podCommanderName(game, seat) {
  if (Number(game.mySeat) === seat) return resolveMyCommander(game, data.decks);
  return opponentName(game, seat);
}

function winnerSeatForGame(game) {
  if (game.winnerSeat) return Number(game.winnerSeat);
  if (game.mySeat && game.result === "Win") return Number(game.mySeat);
  return 0;
}

function seatOutcomeClass(game, seat) {
  const winnerSeat = winnerSeatForGame(game);
  if (!winnerSeat) {
    if (Number(game.mySeat) === seat && game.result === "Loss") return "pod-seat-loss";
    return "";
  }
  return seat === winnerSeat ? "pod-seat-win" : "pod-seat-loss";
}

function renderGameDetail(game) {
  return `
    <div class="game-form game-form-readonly game-detail-view">
      <label>Date${fieldValue(formatDate(game.date))}</label>
      <label>Time${fieldValue(game.time)}</label>
      <fieldset class="pod-fieldset">
        <legend>Pod</legend>
        ${[1, 2, 3, 4]
          .map(
            (seat) => `
          <div class="pod-seat-row ${seatOutcomeClass(game, seat)}">
            <label class="pod-player">Player ${seat}${fieldValueLink(podPlayerName(game, seat))}</label>
            <label class="pod-commander">Commander${fieldValueLink(podCommanderName(game, seat), "deck", game, seat)}</label>
          </div>`
          )
          .join("")}
      </fieldset>
    </div>`;
}

function deckBracketValue(deckName) {
  return findDeck(data.decks, deckName)?.bracket ?? 4;
}

function recentDecksPlayed(deckStats, limit = 5) {
  const sorted = [...data.games].sort((a, b) => compareGamesChronologically(b, a));
  const seen = new Set();
  /** @type {typeof deckStats} */
  const recent = [];

  for (const game of sorted) {
    if (!game.deck || seen.has(game.deck)) continue;
    const deck = deckStats.find((d) => deckId(d) === game.deck && !d.retired);
    if (!deck) continue;
    seen.add(game.deck);
    recent.push(deck);
    if (recent.length >= limit) break;
  }

  return recent;
}

function renderLogForm() {
  const { deckStats } = getStats();
  const decks = sortDeckList(
    deckStats.filter((d) => !d.retired),
    "recent",
    "desc"
  );
  const quickDecks = recentDecksPlayed(deckStats, 5);
  const editing = editingGameId ? data.games.find((g) => g.id === editingGameId) : null;
  const today = todayISO();
  const dateVal = editing?.date || today;
  const timeVal = editing?.time ?? (editing ? "" : nowTime());
  const resultWin = !editing || editing.result === "Win";
  const resultLoss = editing?.result === "Loss";
  const bracketVal =
    editing?.bracket ?? (editing?.deck ? deckBracketValue(editing.deck) : "");

  return `
    <form id="add-game-form" class="game-form">
      ${editing ? `<input type="hidden" name="gameId" value="${escapeHtml(editing.id)}" />` : ""}
      <label>Date<input type="date" name="date" value="${dateVal}" required /></label>
      <label>Time<input type="time" name="time" value="${escapeHtml(timeVal)}" /></label>
      <label>My deck<select name="deck" required><option value="">Select…</option>${decks
        .map(
          (d) =>
            `<option value="${escapeHtml(deckId(d))}" data-bracket="${d.bracket}" ${editing?.deck === deckId(d) ? "selected" : ""}>${escapeHtml(deckLabel(d))}</option>`
        )
        .join("")}</select></label>
      <label>Bracket<select name="bracket"><option value="" ${!bracketVal ? "selected" : ""}>—</option>${[
        1, 2, 3, 4, 5,
      ]
        .map(
          (b) =>
            `<option value="${b}" ${String(bracketVal) === String(b) ? "selected" : ""}>${b}</option>`
        )
        .join("")}</select></label>
      <label>My seat<select name="mySeat"><option value="">—</option>${seatOptions(editing?.mySeat)}</select></label>
      <label>Turn ended<input type="number" name="turn" min="1" placeholder="Optional" value="${editing?.turn ?? ""}" /></label>
      <label>Winning seat<select name="winnerSeat"><option value="">—</option>${seatOptions(editing?.winnerSeat)}</select></label>
      <fieldset class="pod-fieldset">
        <legend>Pod</legend>
        ${[1, 2, 3, 4]
          .map(
            (seat) => `
          <div class="pod-seat-row" data-opponent-seat="${seat}">
            <label class="pod-player">Player ${seat}
              <div class="opponent-input-wrap">
                <input type="text" class="player-input" name="player-${seat}" value="${escapeHtml(playerName(editing, seat))}" placeholder="Player name" autocomplete="off" />
                <ul class="opponent-suggestions" hidden role="listbox"></ul>
              </div>
            </label>
            <label class="pod-commander">Commander
              <div class="opponent-input-wrap">
                <input type="text" class="opponent-input" name="opponent-${seat}" value="${escapeHtml(opponentName(editing, seat))}" placeholder="Commander name" autocomplete="off" />
                <ul class="opponent-suggestions" hidden role="listbox"></ul>
              </div>
            </label>
          </div>`
          )
          .join("")}
      </fieldset>
      <label>Result
        <div class="result-toggle">
          <label class="radio-card"><input type="radio" name="result" value="Win" ${resultWin ? "checked" : ""} /><span>Win</span></label>
          <label class="radio-card loss"><input type="radio" name="result" value="Loss" ${resultLoss ? "checked" : ""} /><span>Loss</span></label>
        </div>
      </label>
      <div class="form-actions${editing ? " form-actions--split" : ""}">
        ${editing ? `<button type="button" class="btn btn-danger" id="delete-game-modal">Delete</button>` : ""}
        <button type="submit" class="btn btn-primary btn-lg">${editing ? "Save" : "Save Game"}</button>
      </div>
    </form>
    <div class="quick-log">
      <h3>Quick fill</h3>
      <div class="quick-grid">
        ${quickDecks
          .map(
            (d) => `
          <div class="quick-deck">
            <span class="quick-name">${colorBadge(getDeckColors(d))} ${escapeHtml(deckLabel(d))}</span>
            <button type="button" class="btn btn-sm win quick-win" data-deck="${escapeHtml(deckId(d))}">W</button>
            <button type="button" class="btn btn-sm loss quick-loss" data-deck="${escapeHtml(deckId(d))}">L</button>
          </div>`
          )
          .join("")}
      </div>
    </div>`;
}

function gameRow(g) {
  const cls = g.result === "Win" ? "win" : "loss";
  const deck = findDeck(data.decks, g.deck);
  const deckDisplay = deck ? deckTitle(deck) : deckTitleForKey(g.deck, data.decks);
  const deckLink = renderDeckReportLink(deck ? deckCommander(deck) : resolveMyCommander(g, data.decks), data.decks, {
    label: deckDisplay,
    playerScope: MY_PLAYER_NAME,
    deckSlotId: g.deck,
  });
  return `<tr data-deck="${escapeHtml(g.deck)}" data-result="${g.result}" data-year="${gameYear(g.date)}">
    <td><button type="button" class="link-btn view-game" data-id="${g.id}">${formatDate(g.date)}</button></td><td class="deck-name">${deckLink}</td>
    <td>${g.mySeat || "—"}</td><td>${g.turn || "—"}</td>
    <td><span class="result-pill ${cls}">${g.result}</span></td>
    <td class="row-actions">
      <button type="button" class="btn-icon edit-game" data-id="${g.id}" title="Edit game">✎</button>
    </td></tr>`;
}

function parseGameForm(fd) {
  const mySeatRaw = fd.get("mySeat");
  const mySeat = mySeatRaw ? Number(mySeatRaw) : 0;
  const opponents = [1, 2, 3, 4].flatMap((seat) => {
    if (mySeat && seat === mySeat) return [];
    const name = String(fd.get(`opponent-${seat}`) || "").trim();
    const player = String(fd.get(`player-${seat}`) || "").trim();
    if (!name && !player) return [];
    return [{ seat, name, ...(player ? { player } : {}) }];
  });
  const winnerSeatRaw = fd.get("winnerSeat");
  const turnRaw = fd.get("turn");
  const timeRaw = fd.get("time");

  const game = {
    date: fd.get("date"),
    deck: fd.get("deck"),
    result: fd.get("result"),
    source: "local",
  };

  const time = normalizeTime(String(timeRaw || ""));
  if (time) game.time = time;

  const bracketRaw = fd.get("bracket");
  if (bracketRaw) {
    const bracket = Number(bracketRaw);
    if (!Number.isNaN(bracket) && bracket >= 1 && bracket <= 5) game.bracket = bracket;
  }

  if (mySeatRaw) {
    game.mySeat = Number(mySeatRaw);
    game.opponents = opponents;
    const myPlayer = String(fd.get(`player-${mySeat}`) || "").trim();
    if (myPlayer) game.myPlayer = myPlayer;
  }
  if (winnerSeatRaw) {
    game.winnerSeat = Number(winnerSeatRaw);
    if (mySeatRaw) {
      game.result = Number(winnerSeatRaw) === Number(mySeatRaw) ? "Win" : "Loss";
    }
  }
  if (turnRaw) {
    const turn = Number(turnRaw);
    if (!Number.isNaN(turn) && turn > 0) game.turn = turn;
  }
  return game;
}

function applyGameCommanderSnapshot(payload, existingGame = null) {
  const deck = findDeck(data.decks, payload.deck);
  if (existingGame?.deck === payload.deck && existingGame.myCommander) {
    payload.myCommander = existingGame.myCommander;
    return;
  }
  if (deck) payload.myCommander = deckCommander(deck);
}

function saveGameFromForm(fd) {
  const payload = parseGameForm(fd);
  if (!payload.deck) return toast("Pick a deck", true);

  if (editingGameId) {
    const idx = data.games.findIndex((g) => g.id === editingGameId);
    if (idx >= 0) {
      const existing = data.games[idx];
      applyGameCommanderSnapshot(payload, existing);
      const updated = {
        id: editingGameId,
        date: payload.date,
        deck: payload.deck,
        result: payload.result,
        source: "local",
      };
      if (payload.myCommander) updated.myCommander = payload.myCommander;
      if (payload.mySeat) {
        updated.mySeat = payload.mySeat;
        updated.opponents = payload.opponents || [];
        if (payload.myPlayer) updated.myPlayer = payload.myPlayer;
      }
      if (payload.winnerSeat) updated.winnerSeat = payload.winnerSeat;
      if (payload.turn) updated.turn = payload.turn;
      if (payload.time) updated.time = payload.time;
      if (payload.bracket) updated.bracket = payload.bracket;
      data.games[idx] = updated;
    }
    editingGameId = null;
    gameModalOpen = false;
    saveData(data);
    toast("Game saved");
    void refreshCommanderColorCache();
    return;
  }

  applyGameCommanderSnapshot(payload);
  data.games.push({ id: nextGameId(data.games), ...payload });
  saveData(data);
  gameModalOpen = false;
  toast(`${payload.result} logged`);
  void refreshCommanderColorCache();
}

function fillLogForm({ deck, result }) {
  editingGameId = null;
  const form = document.getElementById("add-game-form");
  if (!form) return;
  const deckSelect = form.querySelector('[name="deck"]');
  const resultInput = form.querySelector(`[name="result"][value="${result}"]`);
  const winnerSeat = Number(form.querySelector('[name="winnerSeat"]')?.value) || 0;
  if (deckSelect) deckSelect.value = deck;
  syncBracketFromDeck();
  if (winnerSeat === 0 && resultInput) resultInput.checked = true;
  form.querySelector('[name="date"]')?.focus();
  syncPodFormSeats();
  syncResultFromSeats();
}

function syncResultFromSeats() {
  const form = document.getElementById("add-game-form");
  if (!form) return;

  const mySeat = Number(form.querySelector('[name="mySeat"]')?.value) || 0;
  const winnerSeat = Number(form.querySelector('[name="winnerSeat"]')?.value) || 0;
  const winInput = form.querySelector('[name="result"][value="Win"]');
  const lossInput = form.querySelector('[name="result"][value="Loss"]');
  const toggle = form.querySelector(".result-toggle");
  const locked = winnerSeat > 0;

  if (toggle) toggle.classList.toggle("result-locked", locked);
  if (winInput) winInput.disabled = locked;
  if (lossInput) lossInput.disabled = locked;

  if (locked && mySeat > 0) {
    const isWin = winnerSeat === mySeat;
    if (winInput) winInput.checked = isWin;
    if (lossInput) lossInput.checked = !isWin;
  }
}

function syncBracketFromDeck() {
  const form = document.getElementById("add-game-form");
  if (!form) return;

  const deckSelect = form.querySelector('[name="deck"]');
  const bracketSelect = form.querySelector('[name="bracket"]');
  if (!deckSelect || !bracketSelect) return;

  const selected = deckSelect.selectedOptions[0];
  const bracket = selected?.dataset.bracket;
  if (bracket) bracketSelect.value = bracket;
}

function syncPodFormSeats() {
  const form = document.getElementById("add-game-form");
  if (!form) return;
  const mySeat = Number(form.querySelector('[name="mySeat"]')?.value) || 0;
  const fieldset = form.querySelector(".pod-fieldset");
  if (fieldset) fieldset.hidden = mySeat === 0;

  form.querySelectorAll("[data-opponent-seat]").forEach((row) => {
    const seat = Number(row.dataset.opponentSeat);
    const isMySeat = mySeat > 0 && seat === mySeat;
    row.hidden = isMySeat;
    if (isMySeat) {
      const playerInput = row.querySelector(".player-input");
      const commanderInput = row.querySelector(".opponent-input");
      if (playerInput) {
        playerInput.value = "";
        playerInput.closest(".opponent-input-wrap")?.querySelector(".opponent-suggestions")?.setAttribute("hidden", "");
      }
      if (commanderInput) {
        commanderInput.value = "";
        commanderInput.closest(".opponent-input-wrap")?.querySelector(".opponent-suggestions")?.setAttribute("hidden", "");
      }
    }
  });
}

function toast(msg, isError = false) {
  const el = document.createElement("div");
  el.className = `toast ${isError ? "error" : ""}`;
  el.textContent = msg;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add("show"));
  setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => el.remove(), 300);
  }, 2200);
}

boot();
