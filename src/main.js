import {
  initData,
  saveData,
  exportData,
  importData,
  downloadDataBackup,
  resetToSeed,
  nextGameId,
  nextDeckId,
  getLastSeedSync,
  loadData,
  recordRemovedSeedDeck,
  linkDeckSeedKey,
} from "./store.js";
import {
  chooseDataFile,
  disconnectDataFile,
  getDataFileStatus,
  isDataFileConnected,
  isDataFileStorageSupported,
  readConnectedDataFile,
  reconnectDataFile,
  requestPersistentBrowserStorage,
  writeConnectedDataFile,
} from "./file-storage.js";
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
  winRate,
  bracketFilterLabel,
  cycleBracketFilter,
  gameBracket,
  filterGamesByBracket,
} from "./stats.js";
import { formatDate, gameSortKey, gameYear, normalizeDate, normalizeTime, nowTime, todayISO, compareGamesChronologically } from "./dates.js";
import { colorIdentitySortIndex } from "./color-identity.js";
import { pctCell, valueCell, colorStatAverage } from "./wr-color.js";
import {
  sortHeader,
  applySort,
  toggleSort,
  toggleDeckDateSort,
  WINS_SORT_TIE_BREAKERS,
} from "./table.js";
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
  colorMatchupSideMatchesSearch,
} from "./color-stats.js";
import {
  deckKey,
  deckId,
  deckTitle,
  deckLabel,
  deckCommander,
  findDeck,
  deckMapByKey,
  deckTitleForKey,
  resolveMyCommander,
  resolveDeckCommanderOnDate,
} from "./deck-identity.js";
import {
  buildEntityReport,
  getEntityChartContext,
  renderEntityReportModal,
  renderPlayerReportLink,
  renderArchetypeReportLink,
  renderDeckReportLink,
  fitEntityDeckCardStats,
  gameHasPodDetail,
  renderGameLogPodCard,
} from "./entity-report.js";
import { loadImagesIntoRoot } from "./scryfall.js";
import { bindPodAutocomplete, MY_PLAYER_NAME } from "./opponent-search.js";
import {
  bindDeckTagAutocompletes,
  deckHasTribalArchetype,
  formatArchetypesForInput,
  formatTribesForInput,
  parseArchetypesFromInput,
  sortArchetypeTags,
  parseTribesFromInput,
} from "./deck-archetype-search.js";
import {
  warmCommanderMatchupCache,
  collectPartnerCommanderNames,
  getCommanderInfo,
} from "./commander-names.js";
import {
  warmCommanderColorCache,
  collectOwnedDeckCommanderNames,
  backfillDeckColorIdentities,
  getCommanderColorIdentity,
  getDeckColors,
  collectOpponentCommanderNames,
} from "./commander-colors.js";
import { bindFormAccidentalNavigationGuard, bindModalBackdropDismiss } from "./modals.js";
import {
  computeOpponentDeckStats,
  ensureOpponentDecks,
  findOpponentDeck,
  getOpponentDeckColors,
  backfillOpponentDeckColorIdentities,
  linkGameOpponentsToDecks,
  opponentDeckCommander,
  opponentDeckTitle,
  syncOpponentDecksFromGames,
  updateOpponentDeckProfile,
} from "./opponent-decks.js";
import {
  scanForRecoverableData,
  scanBackupFiles,
  renderRecoveryModal,
  getRecoveryFinding,
  mergeRecovery,
} from "./recovery.js";
import {
  computeAllMatchups,
  computePodAllMatchups,
  formatMatchupImpact,
  invalidateMatchupCache,
  matchupImpactClass,
  MATCHUP_TABS,
  POD_MATCHUP_TABS,
  collectAllPodCommanderNames,
  gameHasMySeat,
  nonMySeatNumbers,
  opponentEntryForPodSlot,
  opponentWinnerPodSlot,
  podFormSlots,
  podRowOutcomeClass,
  podRowWinnerKey,
  podSlotCommanderLabel,
  podSlotPlayerLabel,
} from "./matchups.js";
import { computeAllTotals, TOTALS_TABS } from "./totals.js";
import {
  computeArchetypeStats,
  computePodTagStats,
  mergeArchetypeStatsRows,
  archetypeViewLabel,
  archetypeColumnHeaderLabel,
  cycleArchetypeView,
} from "./archetype-stats.js";
import { computeTurnGridStats, computeTurnDistributionStats } from "./turn-stats.js";
import { renderTurnWinRateChart, bindTurnWinRateChart, turnChartLabel } from "./turn-chart.js";
import {
  computeWinRateSeries,
  computeTrendsSummary,
  renderTrendsSummaryStats,
  renderTrendsChartHeader,
  renderWinRateLineChart,
  renderMultiWinRateLineChart,
  bindWinRateLineCharts,
  bindTrendsGameRangeControls,
  clampTrendsGameRange,
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
  formatSeatBestWinStreak,
  formatSeatSitStreak,
  gamesForSeatSeries,
  getSeatDateBounds,
  SEAT_COLORS,
  SEAT_VIEW_LABELS,
  SEAT_VIEW_MODES,
} from "./seats.js";

const VIEWS = [
  { id: "stats", label: "My Stats" },
  { id: "totals", label: "Total Stats" },
  { id: "decks", label: "Decks" },
  { id: "games", label: "Games" },
];

const STATS_TABS = [
  { id: "overview", label: "Overview" },
  { id: "brackets", label: "Brackets" },
  { id: "colors", label: "Colors" },
  { id: "archetypes", label: "Archetypes" },
  { id: "seats", label: "Seats" },
  { id: "turns", label: "Turns" },
  { id: "trends", label: "Trends" },
  { id: "matchups", label: "Matchups" },
];

const DECKS_PAGE_TABS = [
  { id: "mine", label: "My Decks" },
  { id: "opponents", label: "Opponent Decks" },
];

let data = null;
let currentView = "stats";
let statsTab = "overview";
let statsBracketFilter = "";
/** @type {"filter"|"table"|null} */
let bracketsChartMode = null;
let matchupTab = "players";
let matchupSubjectSearch = "";
let matchupOpponentSearch = "";
let matchupColorView = "wubrgc";
let matchupColorAgg = "inclusive";
let matchupSplitPartners = false;
let matchupSplitPlayers = false;
let matchupCombineDecks = false;
/** @type {import('./archetype-stats.js').ArchetypeView} */
let matchupArchetypeView = "unique";
const MATCHUP_TABLE_ROW_CAP = 3500;
/** @type {string | null} */
let statsMemoKey = null;
/** @type {ReturnType<typeof computeStatsPayload> | null} */
let statsMemo = null;
let totalsTab = "decks";
let totalsMatchupTab = "players";
let totalsSearch = "";
let totalsMatchupSubjectSearch = "";
let totalsMatchupOpponentSearch = "";
let totalsSplitPartners = false;
let totalsExcludeMe = false;
let totalsBracketFilter = "";
let totalsColorView = "exact";
let totalsColorAgg = "exclusive";
/** @type {{ kind: 'all' } | { kind: 'window', rangeStart: number, rangeEnd: number } | { kind: 'cumulative', rangeEnd: number } | { kind: 'year', year: string }} */
let trendsFilter = { kind: "all" };
let selectedSeats = [];
let totalsSelectedSeats = [];
let seatViewMode = "mine";
let seatRange = { start: null, end: null, customized: false };
let decksTab = "active";
let decksPageTab = "mine";
let decksOpponentPlayerSearch = "";
let decksOpponentCommanderSearch = "";
let decksDeckSearch = "";
let editingOpponentDeckId = null;
let gameModalOpen = false;
let deckModalOpen = false;
let viewingGameId = null;
let editingGameId = null;
let gameSaveInFlight = false;
let editingDeckName = null;
let editingDeckIndex = -1;
/** @type {{ kind: 'player' | 'deck' | 'archetype', key: string, playerScope?: string | null, deckSlotId?: string | null, opponentDeckId?: string | null, archetypeView?: 'unique' | 'combined' | 'exact', tagKind?: 'archetype' | 'tribe', archetypeScope?: 'mine' | 'all' | 'opponents' } | null} */
let entityReport = null;
/** @type {ReturnType<typeof snapshotEntityReportState>[]} */
let entityReportStack = [];
let entityReportScrollToTop = false;
/** @type {'games' | 'decks' | 'players'} */
let entityReportTab = "games";
/** @type {{ players: import('./table.js').SortState, decks: import('./table.js').SortState }} */
let entityReportMatchupSort = {
  players: { col: "normalizedWinRate", dir: "desc" },
  decks: { col: "normalizedWinRate", dir: "desc" },
};
let entityReportGamesSort = { col: "date", dir: "desc" };
/** @type {'overview' | 'archetypes' | 'seats'} */
let entityReportHeroTab = "overview";
let entityReportChartRange = { start: null, end: null, customized: false };
let entityReportGameRange = { min: 1, max: null, customized: false };
/** @type {import('./recovery.js').RecoveryFinding[]} */
let recoveryFindings = [];
let deckBracketFilter = "";
let logFilters = { deck: "", bracket: "", result: "", year: "" };
/** @type {'list' | 'grid'} */
let gamesViewMode = "list";
let colorView = "wubrgc";
let colorAgg = "inclusive";
let colorSortOrder = "wubrgc";
let archetypeView = "unique";
let archetypeShowTribes = false;
/** @type {"all" | "active" | "retired"} */
let statsDeckFilter = "all";
/** @type {"normalizedWr" | "winRate" | "games" | "wins" | "losses"} */
let turnChartMetric = "games";
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
let trendsGameRange = { min: 1, max: null, customized: false };
let pieAnimKey = 0;
let colorsPieAnimKey = 0;
let bracketsPieAnimKey = 0;
let lastColorsPieSignature = "";
let lastBracketsPieSignature = "";
let tableSort = {
  "color-stats": { col: "colorOrder", dir: "asc" },
  "archetype-stats": { col: "normalizedWr", dir: "desc" },
  "turn-stats": { col: "turn", dir: "asc" },
  "bracket-stats": { col: "bracket", dir: "asc" },
  "trends-windows": { col: "rangeStart", dir: "asc" },
  "trends-cumulative": { col: "games", dir: "asc" },
  "decks-main": { col: "name", dir: "asc" },
  "opponent-decks-main": { col: "lastPlayed", dir: "desc" },
  "game-log": { col: "date", dir: "desc" },
  matchups: { col: "normalizedWinRate", dir: "desc" },
  "totals-matchups": { col: "normalizedWinRate", dir: "desc" },
  "totals-decks": { col: "normalizedWr", dir: "desc" },
  "totals-players": { col: "normalizedWr", dir: "desc" },
  "totals-colors": { col: "normalizedWr", dir: "desc" },
};

function resetStatsGlobalState() {
  statsBracketFilter = "";
  statsDeckFilter = "all";
}

function resetStatsTabState(tab) {
  resetStatsGlobalState();
  if (tab === "overview") {
    // Global stats filters only.
  } else if (tab === "colors") {
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
    trendsGameRange = { min: 1, max: null, customized: false };
    tableSort["trends-windows"] = { col: "rangeStart", dir: "asc" };
    tableSort["trends-cumulative"] = { col: "games", dir: "asc" };
  } else if (tab === "archetypes") {
    archetypeView = "unique";
    tableSort["archetype-stats"] = { col: "normalizedWr", dir: "desc" };
  } else if (tab === "turns") {
    tableSort["turn-stats"] = { col: "turn", dir: "asc" };
  } else if (tab === "seats") {
    selectedSeats = [];
    seatViewMode = "mine";
    seatRange = { start: null, end: null, customized: false };
  } else if (tab === "matchups") {
    matchupTab = "players";
    matchupSubjectSearch = "";
    matchupOpponentSearch = "";
    matchupColorView = "wubrgc";
    matchupColorAgg = "inclusive";
    matchupSplitPartners = false;
    matchupSplitPlayers = false;
    matchupCombineDecks = false;
    matchupArchetypeView = "unique";
    tableSort.matchups = { col: "normalizedWinRate", dir: "desc" };
  }
}

function resetTotalsViewState() {
  totalsTab = "decks";
  totalsMatchupTab = "players";
  totalsSearch = "";
  totalsMatchupSubjectSearch = "";
  totalsMatchupOpponentSearch = "";
  totalsSplitPartners = false;
  totalsExcludeMe = false;
  totalsSelectedSeats = [];
  totalsBracketFilter = "";
  totalsColorView = "exact";
  totalsColorAgg = "exclusive";
  matchupArchetypeView = "unique";
  tableSort["totals-decks"] = { col: "normalizedWr", dir: "desc" };
  tableSort["totals-players"] = { col: "normalizedWr", dir: "desc" };
  tableSort["totals-colors"] = { col: "normalizedWr", dir: "desc" };
  tableSort["totals-matchups"] = { col: "normalizedWinRate", dir: "desc" };
  tableSort["turn-stats"] = { col: "turn", dir: "asc" };
}

function resetAllStatsTabStates() {
  STATS_TABS.forEach((tab) => resetStatsTabState(tab.id));
}

function resetDecksViewState() {
  decksTab = "active";
  decksPageTab = "mine";
  deckBracketFilter = "";
  decksOpponentPlayerSearch = "";
  decksOpponentCommanderSearch = "";
  decksDeckSearch = "";
  closeDeckModal();
  tableSort["decks-main"] = { col: "name", dir: "asc" };
  tableSort["opponent-decks-main"] = { col: "lastPlayed", dir: "desc" };
}

function resetGamesViewState() {
  gameModalOpen = false;
  editingGameId = null;
  viewingGameId = null;
  gamesViewMode = "list";
  logFilters = { deck: "", bracket: "", result: "", year: "" };
  tableSort["game-log"] = { col: "date", dir: "desc" };
}

function snapshotEntityReportState() {
  return {
    entityReport: entityReport ? { ...entityReport } : null,
    entityReportTab,
    entityReportHeroTab,
    entityReportChartRange: { ...entityReportChartRange },
    entityReportGameRange: { ...entityReportGameRange },
    entityReportMatchupSort: {
      players: { ...entityReportMatchupSort.players },
      decks: { ...entityReportMatchupSort.decks },
    },
    entityReportGamesSort: { ...entityReportGamesSort },
  };
}

function restoreEntityReportState(snapshot) {
  entityReport = snapshot.entityReport ? { ...snapshot.entityReport } : null;
  entityReportTab = snapshot.entityReportTab;
  entityReportHeroTab = snapshot.entityReportHeroTab;
  entityReportChartRange = { ...snapshot.entityReportChartRange };
  entityReportGameRange = { ...snapshot.entityReportGameRange };
  entityReportMatchupSort = {
    players: { ...snapshot.entityReportMatchupSort.players },
    decks: { ...snapshot.entityReportMatchupSort.decks },
  };
  entityReportGamesSort = { ...snapshot.entityReportGamesSort };
}

function resetEntityReportViewState() {
  entityReportTab = "games";
  entityReportHeroTab = "overview";
  entityReportChartRange = { start: null, end: null, customized: false };
  entityReportGameRange = { min: 1, max: null, customized: false };
  entityReportMatchupSort = {
    players: { col: "normalizedWinRate", dir: "desc" },
    decks: { col: "normalizedWinRate", dir: "desc" },
  };
  entityReportGamesSort = { col: "date", dir: "desc" };
}

function dismissEntityReport() {
  entityReport = null;
  entityReportStack = [];
  resetEntityReportViewState();
  syncEntityReportModal();
}

function goBackEntityReport() {
  if (!entityReportStack.length) {
    dismissEntityReport();
    return;
  }
  restoreEntityReportState(entityReportStack.pop());
  entityReportScrollToTop = true;
  syncEntityReportModal();
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

function openEntityReport(
  kind,
  key,
  playerScope = null,
  deckSlotId = null,
  opponentDeckId = null,
  archetypeOptions = {}
) {
  if (deckModalOpen) closeDeckModal();
  if (entityReport) {
    entityReportStack.push(snapshotEntityReportState());
  }
  entityReport = {
    kind,
    key,
    playerScope,
    deckSlotId,
    opponentDeckId,
    archetypeView: archetypeOptions.archetypeView,
    tagKind: archetypeOptions.tagKind,
    archetypeScope: archetypeOptions.archetypeScope,
  };
  resetEntityReportViewState();
  entityReportScrollToTop = true;
  syncEntityReportModal();
}

/** @param {Element} entityBtn */
function openEntityReportFromButton(entityBtn) {
  openEntityReport(
    entityBtn.getAttribute("data-entity-kind") || "",
    entityBtn.getAttribute("data-entity-key") || "",
    entityBtn.getAttribute("data-entity-player-scope"),
    entityBtn.getAttribute("data-entity-deck-slot"),
    entityBtn.getAttribute("data-entity-opponent-deck"),
    {
      archetypeView: entityBtn.getAttribute("data-entity-archetype-view") || "unique",
      tagKind: entityBtn.getAttribute("data-entity-archetype-tag-kind") || "archetype",
      archetypeScope: entityBtn.getAttribute("data-entity-archetype-scope") || "mine",
    }
  );
}

function switchEntityReportHeroTab(tabId) {
  if (!entityReport || !["overview", "archetypes", "seats"].includes(tabId)) return;
  if (tabId === "archetypes" && entityReport.kind !== "deck") return;
  entityReportHeroTab = tabId;

  const modal = document.getElementById("entity-report-modal");
  if (!modal) return;

  modal.querySelectorAll("[data-entity-hero-tab]").forEach((btn) => {
    const active = btn.dataset.entityHeroTab === tabId;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-selected", active ? "true" : "false");
  });

  modal.querySelectorAll("[data-entity-hero-panel]").forEach((panel) => {
    panel.hidden = panel.dataset.entityHeroPanel !== tabId;
  });
}

function resetEntityReportGameRange() {
  entityReportGameRange = { min: 1, max: null, customized: false };
}

function switchEntityReportTab(tabId) {
  if (!entityReport || !["games", "decks", "players"].includes(tabId)) return;
  entityReportTab = tabId;

  const modal = document.getElementById("entity-report-modal");
  if (!modal) return;

  modal.querySelectorAll("[data-entity-report-tab]").forEach((btn) => {
    const active = btn.dataset.entityReportTab === tabId;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-selected", active ? "true" : "false");
  });

  modal.querySelectorAll("[data-entity-report-panel]").forEach((panel) => {
    panel.hidden = panel.dataset.entityReportPanel !== tabId;
  });
}

function getStatsScope() {
  const statsDecks = filterDecksForStats(data.decks, statsDeckFilter);
  const statsGames = filterGamesByBracket(
    filterGamesForStats(data.games, data.decks, statsDeckFilter),
    data.decks,
    statsBracketFilter
  );
  const filteredDeckStats = computeDeckStats(
    statsDeckFilter === "all" ? data.decks : statsDecks,
    statsGames
  );
  return { statsDecks, statsGames, filteredDeckStats };
}

function getTotalsScopeGames() {
  return filterGamesByBracket(data.games, data.decks, totalsBracketFilter);
}

/** @param {{ turn: number, reachedPct: number }} row */
function renderTurnStatHeading(row) {
  return `<div class="turn-stat-label"><span class="turn-stat-title">Turn ${row.turn}</span><span class="turn-stat-reached">– ${pct(row.reachedPct, 2)} of games</span></div>`;
}

/** @param {ReturnType<typeof computeTurnGridStats>} turns */
function renderTurnStatsGrid(turns) {
  return `<div class="turn-stats-grid">${turns
    .map((row) => {
      const ended = row.wins + row.losses;
      return `
          <div class="turn-stat-box${row.games ? "" : " turn-stat-box-empty"}">
            ${renderTurnStatHeading(row)}
            <div class="turn-stat-gwl">
              <div class="turn-stat-gwl-item"><span class="turn-stat-metric-label">G</span><strong>${row.games}</strong></div>
              <div class="turn-stat-gwl-item"><span class="turn-stat-metric-label">W</span><strong>${row.wins}</strong></div>
              <div class="turn-stat-gwl-item"><span class="turn-stat-metric-label">L</span><strong>${row.losses}</strong></div>
            </div>
            <div class="turn-stat-wr">
              <div><span class="turn-stat-metric-label">WR</span><strong>${ended ? pctCell(row.winRate) : "—"}</strong></div>
              <div><span class="turn-stat-metric-label">Norm WR</span><strong>${ended ? pctCell(row.normalizedWr) : "—"}</strong></div>
            </div>
          </div>`;
    })
    .join("")}</div>`;
}

/** @param {ReturnType<typeof computeTurnDistributionStats>} turns */
function renderTurnDistributionGrid(turns) {
  return `<div class="turn-stats-grid">${turns
    .map(
      (row) => `
          <div class="turn-stat-box${row.games ? "" : " turn-stat-box-empty"}">
            ${renderTurnStatHeading(row)}
            <div class="turn-stat-gwl turn-stat-gw">
              <div class="turn-stat-gwl-item"><span class="turn-stat-metric-label">G</span><strong>${row.games}</strong></div>
              <div class="turn-stat-gwl-item"><span class="turn-stat-metric-label">WR</span><strong>${row.games ? pctCell(row.winRate) : "—"}</strong></div>
            </div>
          </div>`
    )
    .join("")}</div>`;
}

function renderStatsToolbar(idPrefix, bounds, range, { bracketFilter = false, deckFilter = false, extra = "" } = {}) {
  return `
    <div class="filters inline stats-range-toolbar seat-range-filters">
      ${bracketFilter ? renderBracketFilterToggle("stats-bracket-filter-toggle", statsBracketFilter) : ""}
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

function renderBracketFilterToggle(buttonId, bracketFilter) {
  const active = !!bracketFilter;
  return `<button type="button" class="btn btn-ghost btn-sm bracket-filter-btn ${active ? "active" : ""}" id="${buttonId}">${bracketFilterLabel(bracketFilter)}</button>`;
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
      ...collectOpponentCommanderNames(data.games),
    ]),
  ]);
  const ownedChanged = backfillDeckColorIdentities(data.decks);
  const opponentChanged = backfillOpponentDeckColorIdentities(ensureOpponentDecks(data));
  if (ownedChanged || opponentChanged) saveData(data);
  render();
}

function ensureRecoverButton() {
  const actions = document.querySelector(".footer-actions");
  if (!actions || document.getElementById("recover-btn")) return;
  const resetBtn = document.getElementById("reset-btn");
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn btn-ghost";
  btn.id = "recover-btn";
  btn.textContent = "Recover data";
  if (resetBtn) actions.insertBefore(btn, resetBtn);
  else actions.appendChild(btn);
}

function updateStorageStatus() {
  const statusEl = document.getElementById("storage-status");
  const warningEl = document.getElementById("storage-file-warning");
  const createBtn = document.getElementById("data-file-create-btn");
  const openBtn = document.getElementById("data-file-open-btn");
  const reconnectBtn = document.getElementById("data-file-reconnect-btn");
  const disconnectBtn = document.getElementById("data-file-disconnect-btn");
  if (!statusEl) return;

  const fileStatus = getDataFileStatus();
  const supported = isDataFileStorageSupported();

  if (createBtn) createBtn.hidden = !supported;
  if (openBtn) openBtn.hidden = !supported;

  if (!supported) {
    statusEl.textContent = "Data is stored in your browser — export JSON backups regularly.";
    if (warningEl) warningEl.hidden = true;
    if (reconnectBtn) reconnectBtn.hidden = true;
    if (disconnectBtn) disconnectBtn.hidden = true;
    return;
  }

  if (fileStatus.connected && fileStatus.fileName) {
    if (disconnectBtn) disconnectBtn.hidden = false;
    if (fileStatus.permissionNeeded) {
      statusEl.textContent = `Data file: ${fileStatus.fileName} (needs permission)`;
      if (reconnectBtn) reconnectBtn.hidden = false;
      if (warningEl) {
        warningEl.textContent = "Click Reconnect file to resume auto-saving.";
        warningEl.hidden = false;
      }
    } else if (fileStatus.lastError) {
      statusEl.textContent = `Data file: ${fileStatus.fileName}`;
      if (reconnectBtn) reconnectBtn.hidden = false;
      if (warningEl) {
        warningEl.textContent = fileStatus.lastError;
        warningEl.hidden = false;
      }
    } else {
      statusEl.textContent = `Auto-saving to ${fileStatus.fileName}`;
      if (reconnectBtn) reconnectBtn.hidden = true;
      if (warningEl) warningEl.hidden = true;
    }
    return;
  }

  if (disconnectBtn) disconnectBtn.hidden = true;
  if (reconnectBtn) reconnectBtn.hidden = true;
  statusEl.textContent =
    "Browser storage only — create or open a data file (for example D:\\EDHLOG\\edhlog-data.json) so restarts cannot wipe your data.";
  if (warningEl) {
    warningEl.textContent = "Recommended: pick a file on your D: drive once, then every save updates that file automatically.";
    warningEl.hidden = false;
  }
}

async function connectDataFile(mode) {
  try {
    const handle = await chooseDataFile(mode);
    const current = loadData();
    if (current) {
      await writeConnectedDataFile(current);
    } else if (mode === "open") {
      const imported = await readConnectedDataFile();
      if (imported) {
        saveData(imported);
        data = imported;
      }
    }
    updateStorageStatus();
    render();
    toast(`Now auto-saving to ${handle.name}`);
  } catch (err) {
    if (err?.name === "AbortError") return;
    toast(String(err?.message || err), true);
  }
}

async function boot() {
  sessionStorage.removeItem("edhlog-stale-reload");
  void requestPersistentBrowserStorage();
  data = await initData();
  const sync = getLastSeedSync();
  ensureRecoverButton();
  updateStorageStatus();
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
    entityReport: goBackEntityReport,
    recovery: closeRecoveryModal,
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
  bindFormAccidentalNavigationGuard();

  document.addEventListener("click", (e) => {
    const entityReportBackBtn = e.target.closest("#entity-report-back");
    if (entityReportBackBtn) {
      goBackEntityReport();
      return;
    }

    const entityBtn = e.target.closest("[data-entity-kind]");
    if (entityBtn) {
      openEntityReportFromButton(entityBtn);
      return;
    }

    const entityReportTabBtn = e.target.closest("[data-entity-report-tab]");
    if (entityReportTabBtn && entityReport) {
      switchEntityReportTab(entityReportTabBtn.dataset.entityReportTab);
      return;
    }

    const entityHeroTabBtn = e.target.closest("[data-entity-hero-tab]");
    if (entityHeroTabBtn && entityReport) {
      switchEntityReportHeroTab(entityHeroTabBtn.dataset.entityHeroTab);
      return;
    }
  });

  document.getElementById("nav").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-view]");
    if (!btn) return;
    const prevView = currentView;
    currentView = btn.dataset.view;
    if (prevView === "stats" && currentView !== "stats") {
      resetAllStatsTabStates();
    }
    if (prevView === "totals" && currentView !== "totals") {
      resetTotalsViewState();
    }
    if (prevView === "decks" && currentView !== "decks") {
      resetDecksViewState();
    }
    if (prevView === "games" && currentView !== "games") {
      resetGamesViewState();
    }
    if (currentView === "stats") {
      statsTab = "overview";
      resetAllStatsTabStates();
    }
    if (currentView === "totals") {
      resetTotalsViewState();
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
    dismissEntityReport();
    renderNav();
    render();
  });

  document.getElementById("main").addEventListener("input", (e) => {
    if (e.target.id === "matchup-subject-search") {
      matchupSubjectSearch = e.target.value;
      render();
    } else if (e.target.id === "matchup-opponent-search") {
      matchupOpponentSearch = e.target.value;
      render();
    } else if (e.target.id === "totals-matchup-subject-search") {
      totalsMatchupSubjectSearch = e.target.value;
      render();
    } else if (e.target.id === "totals-matchup-opponent-search") {
      totalsMatchupOpponentSearch = e.target.value;
      render();
    } else if (e.target.id === "totals-search") {
      totalsSearch = e.target.value;
      render();
    } else if (e.target.id === "decks-opponent-player-search") {
      decksOpponentPlayerSearch = e.target.value;
      render();
    } else if (e.target.id === "decks-opponent-commander-search") {
      decksOpponentCommanderSearch = e.target.value;
      render();
    } else if (e.target.id === "decks-deck-search") {
      decksDeckSearch = e.target.value;
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
      resetTrendsGameRange();
      render();
    } else if (e.target.id === "entity-report-range-start" || e.target.id === "entity-report-range-end") {
      entityReportChartRange.customized = true;
      entityReportChartRange.start = document.getElementById("entity-report-range-start")?.value || null;
      entityReportChartRange.end = document.getElementById("entity-report-range-end")?.value || null;
      resetEntityReportGameRange();
      syncEntityReportModal();
    }
  });

  document.getElementById("main").addEventListener("click", (e) => {
    if (e.target.closest("#game-log-view-list")) {
      if (gamesViewMode !== "list") {
        gamesViewMode = "list";
        render();
      }
      return;
    }

    if (e.target.closest("#game-log-view-grid")) {
      if (gamesViewMode !== "grid") {
        gamesViewMode = "grid";
        render();
      }
      return;
    }

    const sortTh = e.target.closest("[data-sort-table]");
    if (sortTh) {
      const tableId = sortTh.getAttribute("data-sort-table");
      const col = sortTh.getAttribute("data-sort-col");
      if (tableId === "turn-stats" && col === "turn" && tableSort[tableId]?.col !== col) {
        tableSort[tableId] = { col: "turn", dir: "asc" };
        turnChartMetric = "games";
      } else if (
        (tableId === "decks-main" || tableId === "opponent-decks-main") &&
        col === "date"
      ) {
        tableSort[tableId] = toggleDeckDateSort(tableSort[tableId]);
      } else {
        tableSort[tableId] = toggleSort(tableSort[tableId], col);
      }
      if (tableId === "turn-stats" && statsTab === "turns") {
        const metric = turnChartMetricFromSortCol(tableSort[tableId]?.col);
        if (metric) turnChartMetric = metric;
      }
      render();
      return;
    }

    if (e.target.id === "decks-status-filter-toggle") {
      decksTab = decksTab === "active" ? "retired" : decksTab === "retired" ? "all" : "active";
      render();
      return;
    }

    if (e.target.id === "decks-bracket-filter-toggle") {
      deckBracketFilter = cycleBracketFilter(deckBracketFilter);
      render();
      return;
    }

    if (e.target.id === "stats-deck-filter-toggle") {
      statsDeckFilter =
        statsDeckFilter === "all" ? "active" : statsDeckFilter === "active" ? "retired" : "all";
      if (statsTab === "colors") colorsChartSelection = new Set();
      if (statsTab === "brackets") bracketsChartSelection = newChartSelection();
      if (statsTab === "trends") resetTrendsGameRange();
      pieAnimKey++;
      render();
      return;
    }

    if (e.target.id === "turn-chart-metric-toggle") {
      turnChartMetric =
        turnChartMetric === "normalizedWr"
          ? "winRate"
          : turnChartMetric === "winRate"
            ? "games"
            : "normalizedWr";
      tableSort["turn-stats"] = { col: "turn", dir: "asc" };
      render();
      return;
    }

    if (e.target.id === "matchup-combine-decks") {
      matchupCombineDecks = e.target.checked;
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

    if (e.target.id === "matchup-archetype-view-toggle") {
      matchupArchetypeView = cycleArchetypeView(matchupArchetypeView);
      invalidateMatchupCache();
      requestAnimationFrame(() => render());
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

    if (e.target.id === "archetype-view-toggle") {
      archetypeView = cycleArchetypeView(archetypeView);
      render();
      return;
    }

    if (e.target.id === "archetype-show-tribes") {
      archetypeShowTribes = e.target.checked;
      render();
      return;
    }

    if (e.target.id === "overview-bracket-filter-toggle" || e.target.id === "stats-bracket-filter-toggle") {
      statsBracketFilter = cycleBracketFilter(statsBracketFilter);
      if (statsTab === "brackets") {
        bracketsChartSelection = newChartSelection();
        bracketsChartMode = statsBracketFilter ? "filter" : null;
      }
      if (statsTab === "colors") {
        colorsChartSelection = new Set();
        pieAnimKey++;
      }
      if (statsTab === "trends") resetTrendsGameRange();
      render();
      return;
    }

    if (e.target.id === "totals-bracket-filter-toggle") {
      totalsBracketFilter = cycleBracketFilter(totalsBracketFilter);
      render();
      return;
    }

    const trendsCumulativeBtn = e.target.closest("[data-trends-cumulative]");
    if (trendsCumulativeBtn) {
      trendsWindowSelection = newChartSelection();
      trendsWindowMeta = new Map();
      resetTrendsChartRange();
      resetTrendsGameRange();
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
      resetTrendsGameRange();
      trendsFilter = { kind: "year", year: trendsYearBtn.dataset.trendsYear };
      render();
      return;
    }

    const trendsAllBtn = e.target.closest("[data-trends-all]");
    if (trendsAllBtn) {
      trendsWindowSelection = newChartSelection();
      trendsWindowMeta = new Map();
      resetTrendsChartRange();
      resetTrendsGameRange();
      trendsFilter = { kind: "all" };
      render();
      return;
    }

    const matchupBtn = e.target.closest("[data-matchup-tab]");
    if (matchupBtn) {
      const nextMatchupTab = matchupBtn.getAttribute("data-matchup-tab");
      if (nextMatchupTab !== matchupTab) resetStatsTabState("matchups");
      matchupTab = nextMatchupTab;
      render();
      return;
    }

    const totalsBtn = e.target.closest("[data-totals-tab]");
    if (totalsBtn) {
      const nextTotalsTab = totalsBtn.getAttribute("data-totals-tab");
      if (nextTotalsTab !== totalsTab) {
        if (nextTotalsTab === "matchups") totalsMatchupTab = "players";
        totalsTab = nextTotalsTab;
      }
      render();
      return;
    }

    const totalsMatchupBtn = e.target.closest("[data-totals-matchup-tab]");
    if (totalsMatchupBtn) {
      totalsMatchupTab = totalsMatchupBtn.getAttribute("data-totals-matchup-tab") || "players";
      tableSort["totals-matchups"] = { col: "normalizedWinRate", dir: "desc" };
      render();
      return;
    }

    const statsBtn = e.target.closest("[data-stats-tab]");
    if (statsBtn) {
      const nextTab = statsBtn.getAttribute("data-stats-tab");
      if (nextTab !== statsTab) {
        resetStatsTabState(statsTab);
        resetStatsTabState(nextTab);
        dismissEntityReport();
      }
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
      resetTrendsGameRange();
      render();
      return;
    }

    if (e.target.id === "clear-seats-chart") {
      selectedSeats = [];
      render();
      return;
    }

    if (e.target.id === "clear-totals-seats-chart") {
      totalsSelectedSeats = [];
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
      resetTrendsGameRange();
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

    const totalsSeatToggleBtn = e.target.closest("[data-totals-seat-toggle]");
    if (totalsSeatToggleBtn) {
      const seat = Number(totalsSeatToggleBtn.dataset.totalsSeatToggle);
      if (totalsSelectedSeats.includes(seat)) {
        totalsSelectedSeats = totalsSelectedSeats.filter((s) => s !== seat);
      } else {
        totalsSelectedSeats = [...totalsSelectedSeats, seat].sort((a, b) => a - b);
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

    const addGameBtn = e.target.closest("#add-game-btn");
    if (addGameBtn) {
      e.preventDefault();
      editingGameId = null;
      viewingGameId = null;
      gameModalOpen = true;
      render();
      return;
    }

    if (e.target.closest("#save-game-btn")) {
      e.preventDefault();
      const form = document.getElementById("add-game-form");
      if (!form) return;
      form.querySelectorAll('[name="result"]').forEach((el) => {
        el.disabled = false;
      });
      saveGameFromForm(new FormData(form));
      return;
    }

    if (e.target.closest("#save-deck-btn")) {
      e.preventDefault();
      const form = document.getElementById("deck-form");
      if (form) saveDeckFromForm(form);
      return;
    }

    if (e.target.id === "delete-game-modal") {
      if (!editingGameId) return;
      if (!confirm("Delete this game?")) return;
      data.games = data.games.filter((g) => g.id !== editingGameId);
      syncOpponentDecksFromGames(data);
      editingGameId = null;
      gameModalOpen = false;
      saveData(data);
      render();
      toast("Deleted");
      return;
    }

    if (e.target.closest(".game-detail-step")) {
      const btn = e.target.closest(".game-detail-step");
      if (btn.disabled || !btn.dataset.id) return;
      viewingGameId = btn.dataset.id;
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
      editingDeckName = null;
      editingDeckIndex = -1;
      editingOpponentDeckId = null;
      dismissEntityReport();
      deckModalOpen = true;
      render();
      return;
    }

    if (e.target.id === "delete-deck-modal") {
      const originalId = document.getElementById("deck-form")?.querySelector('[name="originalId"]')?.value;
      const key = String(originalId || editingDeckName || "").trim();
      if (!key) return;
      if (!confirm("Delete this deck?")) return;
      const deck = findDeck(data.decks, key);
      if (deck) recordRemovedSeedDeck(data, deck);
      data.decks = data.decks.filter((d) => deckId(d) !== key);
      data.games = data.games.filter((g) => g.deck !== key);
      syncOpponentDecksFromGames(data);
      if (entityReport?.deckSlotId === key || entityReport?.key === key) {
        dismissEntityReport();
      }
      closeDeckModal();
      saveData(data);
      render();
      toast("Deleted");
      return;
    }

    const editDeckBtn = e.target.closest(".edit-deck");
    if (editDeckBtn) {
      const ref = editDeckBtn.dataset.name;
      const deck = findDeck(data.decks, ref);
      if (deck && ensureDeckHasId(deck)) saveData(data);
      editingDeckIndex = deck ? data.decks.indexOf(deck) : -1;
      editingDeckName = deck ? deckId(deck) : ref;
      editingOpponentDeckId = null;
      dismissEntityReport();
      deckModalOpen = true;
      render();
      return;
    }

    const editOpponentDeckBtn = e.target.closest(".edit-opponent-deck");
    if (editOpponentDeckBtn) {
      editingOpponentDeckId = editOpponentDeckBtn.dataset.opponentDeckId || null;
      editingDeckName = null;
      editingDeckIndex = -1;
      dismissEntityReport();
      deckModalOpen = true;
      render();
      return;
    }

    const decksPageTabBtn = e.target.closest("[data-decks-page-tab]");
    if (decksPageTabBtn) {
      decksPageTab = decksPageTabBtn.dataset.decksPageTab || "mine";
      closeDeckModal();
      render();
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
    }
  });

  document.getElementById("main").addEventListener("change", (e) => {
    const { id, value, checked } = e.target;

    if (e.target.name === "deck") {
      syncBracketFromDeck();
    } else if (e.target.name === "mySeat") {
      const form = document.getElementById("add-game-form");
      const prev = Number(form?.dataset.prevMySeat) || 0;
      const next = Number(e.target.value) || 0;
      if (form && prev !== next) remapPodFormSeats(form, prev, next);
      syncPodFormSeats();
    } else if (e.target.name === "winnerPodSlot") {
      syncResultFromWinnerToggle();
    } else if (e.target.name === "result") {
      if (e.target.value === "Win") {
        const form = document.getElementById("add-game-form");
        if (form) clearWinnerPodSlotToggles(form);
      }
    } else if (
      id === "filter-deck" ||
      id === "filter-bracket" ||
      id === "filter-result" ||
      id === "filter-year"
    ) {
      logFilters = {
        deck: document.getElementById("filter-deck")?.value || "",
        bracket: document.getElementById("filter-bracket")?.value || "",
        result: document.getElementById("filter-result")?.value || "",
        year: document.getElementById("filter-year")?.value || "",
      };
      render();
    }
  });

  document.getElementById("main").addEventListener("submit", (e) => {
    if (e.target.id === "add-game-form") {
      e.preventDefault();
      e.target.querySelectorAll('[name="result"]').forEach((el) => {
        el.disabled = false;
      });
      saveGameFromForm(new FormData(e.target));
    } else if (e.target.id === "deck-form") {
      e.preventDefault();
      saveDeckFromForm(e.target);
    }
  });

  document.getElementById("export-btn").addEventListener("click", exportData);
  document.getElementById("data-file-create-btn")?.addEventListener("click", () => {
    void connectDataFile("create");
  });
  document.getElementById("data-file-open-btn")?.addEventListener("click", () => {
    void connectDataFile("open");
  });
  document.getElementById("data-file-reconnect-btn")?.addEventListener("click", async () => {
    const ok = await reconnectDataFile();
    if (!ok) {
      toast("Click Allow when the browser asks to access your data file.", true);
      updateStorageStatus();
      return;
    }
    const imported = await readConnectedDataFile();
    const current = loadData();
    if (imported && current) {
      const fileGames = imported.games?.length || 0;
      const localGames = current.games?.length || 0;
      if (fileGames >= localGames) {
        saveData(imported);
        data = imported;
      } else {
        await writeConnectedDataFile(current);
      }
    } else if (imported) {
      saveData(imported);
      data = imported;
    } else if (current) {
      await writeConnectedDataFile(current);
    }
    updateStorageStatus();
    render();
    toast("Data file reconnected — auto-saving resumed");
  });
  document.getElementById("data-file-disconnect-btn")?.addEventListener("click", async () => {
    if (
      !confirm(
        "Stop auto-saving to the data file? Your data will remain in browser storage only until you connect a file again."
      )
    ) {
      return;
    }
    await disconnectDataFile();
    updateStorageStatus();
    toast("Using browser storage only");
  });
  document.getElementById("recover-btn")?.addEventListener("click", () => {
    void openRecoveryModal();
  });
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

function resetTrendsGameRange() {
  trendsGameRange = { min: 1, max: null, customized: false };
}

function globalGameIndices(sortedGames, poolGames) {
  if (!poolGames.length) return [];
  const idSet = new Set(poolGames.map((g) => g.id));
  const indices = [];
  sortedGames.forEach((game, index) => {
    if (idSet.has(game.id)) indices.push(index + 1);
  });
  return indices;
}

/** @param {import('./store.js').Game[]} sortedStatsGames @param {Array<{ rangeStart: number, rangeEnd: number }>} windowsForChart */
function getTrendsPoolGames(sortedStatsGames, windowsForChart) {
  if (trendsWindowSelection.size && windowsForChart?.length) {
    return windowsForChart
      .filter((window) => trendsWindowSelection.has(`${window.rangeStart}-${window.rangeEnd}`))
      .flatMap((window) => sortedStatsGames.slice(window.rangeStart - 1, window.rangeEnd));
  }
  return gamesForTrendsFilter(sortedStatsGames);
}

/** @param {import('./store.js').Game[]} statsGames @param {Array<{ rangeStart: number, rangeEnd: number }>} windowsForChart */
function getTrendsChartContext(statsGames, windowsForChart) {
  const sorted = [...statsGames].sort(compareGamesChronologically);
  const total = sorted.length;
  let poolGames = getTrendsPoolGames(sorted, windowsForChart);
  const filterBounds = getChartDateBounds(poolGames.length ? poolGames : sorted);

  if (trendsChartRange.customized) {
    const dateRange = getEffectiveChartRange(poolGames.length ? poolGames : sorted, trendsChartRange);
    poolGames = gamesInChartRange(poolGames, dateRange);
  }

  const indices = globalGameIndices(sorted, poolGames);
  const boundsMin = indices.length ? Math.min(...indices) : 1;
  const boundsMax = indices.length ? Math.max(...indices) : Math.max(1, total);
  const gameRange = normalizeTrendsGameRange(boundsMin, boundsMax);
  const rangeGames = gamesForTrendsGameRange(sorted, gameRange);
  const chartGames = rangeGames.length ? rangeGames : poolGames.length ? poolGames : sorted;
  const chartRange = getEffectiveChartRange(chartGames, trendsChartRange);

  return {
    sorted,
    poolGames,
    filterBounds,
    boundsMin,
    boundsMax,
    gameRange,
    rangeGames,
    chartRange,
  };
}

function normalizeTrendsGameRange(boundsMin, boundsMax) {
  if (boundsMin > boundsMax) {
    return { min: boundsMax, max: boundsMax };
  }
  const min = trendsGameRange.customized ? trendsGameRange.min ?? boundsMin : boundsMin;
  const max = trendsGameRange.customized ? trendsGameRange.max ?? boundsMax : boundsMax;
  return clampTrendsGameRange(min, max, boundsMin, boundsMax);
}

/** @param {import('./store.js').Game[]} games @param {{ min: number, max: number }} range */
function gamesForTrendsGameRange(games, range) {
  const sorted = [...games].sort(compareGamesChronologically);
  return sorted.slice(range.min - 1, range.max);
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
  if (trendsFilter.kind === "all") return "";
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

/** @param {import("./turn-chart.js").TurnChartMetric} metric */
function turnChartMetricLabel(metric) {
  if (metric === "winRate") return "Win Rate";
  if (metric === "games") return "Games";
  if (metric === "wins") return "Wins";
  if (metric === "losses") return "Losses";
  return "Norm WR";
}

/** @param {string} col */
function turnChartMetricFromSortCol(col) {
  if (col === "turn" || col === "games") {
    return "games";
  }
  if (col === "winRate" || col === "normalizedWr" || col === "wins" || col === "losses") {
    return col;
  }
  return null;
}

function renderTurnChartMetricToggle() {
  return `<button type="button" class="btn btn-ghost btn-sm" id="turn-chart-metric-toggle">${turnChartMetricLabel(turnChartMetric)}</button>`;
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

function getArchetypeTagKind() {
  return archetypeShowTribes ? "tribe" : "archetype";
}

function renderArchetypeTribeToggle() {
  return `<label class="checkbox archetype-tribe-toggle">
    <input type="checkbox" id="archetype-show-tribes" ${archetypeShowTribes ? "checked" : ""} />
    Tribes
  </label>`;
}

function computeArchetypeTableRows(games, { scope = "mine", view, tagKind }) {
  if (scope === "opponents") {
    return computePodTagStats(games, ensureOpponentDecks(data), {
      view,
      tagKind,
      excludeMyPlayer: true,
    });
  }
  if (scope === "all") {
    return mergeArchetypeStatsRows(
      computeArchetypeStats(games, data.decks, { view, tagKind }),
      computePodTagStats(games, ensureOpponentDecks(data), {
        view,
        tagKind,
        excludeMyPlayer: false,
      })
    );
  }
  return computeArchetypeStats(games, data.decks, { view, tagKind });
}

function renderArchetypeStatsTable(rows, emptyMessage, linkOptions = {}) {
  const { tagKind = "archetype", scope = "mine" } = linkOptions;
  const sortState = tableSort["archetype-stats"] || {
    col: "normalizedWr",
    dir: "desc",
  };
  const labelHeader = archetypeColumnHeaderLabel(tagKind === "tribe");
  const labelSort = sortState.col === "label" ? sortState : null;
  const avgGames = colorStatAverage(rows, "games");
  const avgWins = colorStatAverage(rows, "wins");
  const avgDecks = colorStatAverage(rows, "decks");

  return `
      <table class="table compact sortable-table">
        <thead><tr>
          ${sortHeader("archetype-stats", "label", labelHeader, labelSort)}
          ${sortHeader("archetype-stats", "decks", "Decks", sortState)}
          ${sortHeader("archetype-stats", "games", "G", sortState)}
          ${sortHeader("archetype-stats", "wins", "W", sortState)}
          ${sortHeader("archetype-stats", "winRate", "WR", sortState)}
          ${sortHeader("archetype-stats", "normalizedWr", "Norm WR", sortState)}
        </tr></thead>
        <tbody>
          ${
            rows.length
              ? rows
                  .map(
                    (row) => `
            <tr>
              <td>${renderArchetypeReportLink(row.key, row.label, {
                view: archetypeView,
                tagKind,
                scope,
              })}</td>
              <td>${valueCell(row.decks, avgDecks)}</td>
              <td>${valueCell(row.games, avgGames)}</td>
              <td>${valueCell(row.wins, avgWins)}</td>
              <td>${row.games ? pctCell(row.winRate) : "—"}</td>
              <td>${row.games ? pctCell(row.normalizedWr) : "—"}</td>
            </tr>`
                  )
                  .join("")
              : `<tr><td colspan="6">${emptyMessage}</td></tr>`
          }
        </tbody>
      </table>`;
}

function emptyTotalsSnapshot() {
  return {
    decks: [],
    players: [],
    colors: [],
    matchups: { players: [], decks: [], colors: [], archetypes: [] },
  };
}

function buildStatsMemoKey() {
  return JSON.stringify({
    games: data.games.length,
    lastGameId: data.games[data.games.length - 1]?.id,
    decks: data.decks.length,
    view: currentView,
    statsTab,
    totalsTab,
    matchupTab,
    totalsMatchupTab,
    statsBracketFilter,
    statsDeckFilter,
    matchupSplitPartners,
    matchupSplitPlayers,
    matchupCombineDecks,
    matchupColorView,
    matchupColorAgg,
    totalsSplitPartners,
    totalsExcludeMe,
    totalsBracketFilter,
    totalsColorView,
    totalsColorAgg,
    colorView,
    colorAgg,
    colorSortOrder,
    archetypeView,
  });
}

/** @param {ReturnType<typeof buildMyMatchupRows> extends infer _U ? any[] : never} rows */
function capMatchupTableRows(rows) {
  if (rows.length <= MATCHUP_TABLE_ROW_CAP) {
    return { rows, capped: false };
  }
  return { rows: rows.slice(0, MATCHUP_TABLE_ROW_CAP), capped: true };
}

function matchupTextIncludes(value, query) {
  if (!query) return true;
  return String(value || "")
    .trim()
    .toLowerCase()
    .includes(query);
}

function opponentDeckRowMatchesCommanderSearch(deck, query) {
  if (!query) return true;
  if (matchupTextIncludes(opponentDeckCommander(deck), query)) return true;
  return (deck.commanderAliases || []).some((alias) => matchupTextIncludes(alias, query));
}

function opponentDeckRowMatchesDeckSearch(deck, query) {
  if (!query) return true;
  if (matchupTextIncludes(deck.name, query)) return true;
  return matchupTextIncludes(opponentDeckTitle(deck), query);
}

function myDeckRowMatchesDeckSearch(deck, query) {
  if (!query) return true;
  if (matchupTextIncludes(deckTitle(deck), query)) return true;
  if (matchupTextIncludes(deckLabel(deck), query)) return true;
  return matchupTextIncludes(deckCommander(deck), query);
}

function renderMatchupSearchInputs({
  subjectId,
  opponentId,
  subjectValue,
  opponentValue,
  subjectPlaceholder,
  opponentPlaceholder,
  showSubject = true,
}) {
  if (!showSubject) {
    return `<input type="search" id="${opponentId}" class="input matchup-search" placeholder="${escapeHtml(opponentPlaceholder)}" value="${escapeHtml(opponentValue)}" />`;
  }
  return `<div class="matchup-search-group">
        <input type="search" id="${subjectId}" class="input matchup-search" placeholder="${escapeHtml(subjectPlaceholder)}" value="${escapeHtml(subjectValue)}" />
        <input type="search" id="${opponentId}" class="input matchup-search" placeholder="${escapeHtml(opponentPlaceholder)}" value="${escapeHtml(opponentValue)}" />
      </div>`;
}

/** @param {string} id @param {number | null} pos */
function restoreSearchInputFocus(id, pos) {
  const el = document.getElementById(id);
  if (!el) return;
  el.focus();
  if (pos != null && el instanceof HTMLInputElement) {
    el.setSelectionRange(pos, pos);
  }
}

function getStatsScopeGames() {
  return filterGamesByBracket(
    filterGamesForStats(data.games, data.decks, statsDeckFilter),
    data.decks,
    statsBracketFilter
  );
}

function myStatsMatchupOptions() {
  return {
    splitPartners: matchupSplitPartners,
    splitPlayers: matchupSplitPlayers,
    combineDecks: matchupCombineDecks,
    opponentDecks: ensureOpponentDecks(data),
    colorOptions: {
      decks: data.decks,
      deckFilter: statsDeckFilter,
      bracketFilter: statsBracketFilter,
      view: matchupColorView,
      agg: matchupColorAgg,
    },
    archetypeView: matchupArchetypeView,
  };
}

function totalsMatchupOptions() {
  return {
    splitPartners: totalsSplitPartners,
    excludeMyPlayer: totalsExcludeMe,
    view: totalsColorView,
    agg: totalsColorAgg,
    bracketFilter: totalsBracketFilter,
    opponentDecks: ensureOpponentDecks(data),
    archetypeView: matchupArchetypeView,
  };
}

/** @param {ReturnType<typeof computeStatsPayload>} payload */
function refreshMatchupStatsInMemo(payload) {
  const statsGames = getStatsScopeGames();
  const myMatchupTab =
    currentView === "stats" && statsTab === "matchups" ? matchupTab : null;
  const totalsMatchupOnly =
    currentView === "totals" && totalsTab === "matchups" ? totalsMatchupTab : null;

  if (myMatchupTab) {
    const fresh = computeAllMatchups(statsGames, myStatsMatchupOptions(), myMatchupTab);
    payload.matchups[myMatchupTab] = fresh[myMatchupTab];
  }

  if (currentView === "totals" && totalsTab === "matchups" && totalsMatchupOnly) {
    const freshPod = computePodAllMatchups(
      filterGamesByBracket(data.games, data.decks, totalsBracketFilter),
      data.decks,
      ensureOpponentDecks(data),
      totalsMatchupOptions(),
      totalsMatchupOnly
    );
    payload.totals.matchups[totalsMatchupOnly] = freshPod[totalsMatchupOnly];
  }

  payload._matchupArchetypeView = matchupArchetypeView;
  return payload;
}

function computeStatsPayload() {
  const deckStats = computeDeckStats(data.decks, data.games);
  const statsDecks = filterDecksForStats(data.decks, statsDeckFilter);
  const statsGames = getStatsScopeGames();
  const filteredDeckStats = computeDeckStats(
    statsDeckFilter === "all" ? data.decks : statsDecks,
    statsGames
  ).map((deck) => ({
    ...deck,
    colors: getDeckColors(deck),
  }));
  const overview = computeOverview(statsGames);
  const myMatchupTab =
    currentView === "stats" && statsTab === "matchups" ? matchupTab : null;
  const totalsMatchupOnly =
    currentView === "totals" && totalsTab === "matchups" ? totalsMatchupTab : null;

  return {
    deckStats,
    overview,
    colorStats: computeColorStatsAdvanced(filteredDeckStats, {
      view: colorView,
      agg: colorAgg,
      sortOrder: colorSortOrder,
      bracketFilter: statsBracketFilter,
    }),
    bracketStats: computeBracketStats(statsGames, filteredDeckStats),
    yearStats: computeYearStats(statsGames),
    rolling: computeRolling100Stats(statsGames),
    matchups: computeAllMatchups(statsGames, myStatsMatchupOptions(), myMatchupTab),
    totals:
      currentView === "totals"
        ? computeAllTotals(data.games, data.decks, {
            ...totalsMatchupOptions(),
            matchupTab: totalsMatchupOnly,
            skipMatchups: totalsTab !== "matchups",
          })
        : emptyTotalsSnapshot(),
  };
}

function getStats() {
  const key = buildStatsMemoKey();
  if (statsMemo && statsMemoKey === key) {
    if (statsMemo._matchupArchetypeView !== matchupArchetypeView) {
      refreshMatchupStatsInMemo(statsMemo);
    }
    return statsMemo;
  }
  statsMemo = computeStatsPayload();
  statsMemo._matchupArchetypeView = matchupArchetypeView;
  statsMemoKey = key;
  return statsMemo;
}

function handleEntityReportModalClick(e) {
  if (!entityReport) return;
  const sortTh = e.target.closest("th[data-sort-col]");
  if (!sortTh) return;
  const tableId = sortTh.getAttribute("data-sort-table");
  const col = sortTh.getAttribute("data-sort-col");
  if (!tableId || !col) return;

  if (tableId === "entity-games") {
    entityReportGamesSort = toggleSort(entityReportGamesSort, col);
  } else if (tableId === "entity-matchups-players") {
    entityReportMatchupSort.players = toggleSort(entityReportMatchupSort.players, col);
  } else if (tableId === "entity-matchups-decks") {
    entityReportMatchupSort.decks = toggleSort(entityReportMatchupSort.decks, col);
  } else {
    return;
  }

  syncEntityReportModal();
}

function closeRecoveryModal() {
  document.getElementById("recovery-modal")?.remove();
}

async function openRecoveryModal() {
  closeRecoveryModal();
  recoveryFindings = await scanForRecoverableData();
  paintRecoveryModal();
}

function paintRecoveryModal() {
  closeRecoveryModal();
  const wrapper = document.createElement("div");
  wrapper.innerHTML = renderRecoveryModal(recoveryFindings, {
    currentGames: data.games.length,
    currentDecks: data.decks.length,
    origin: window.location.origin + window.location.pathname,
  });
  const modal = wrapper.firstElementChild;
  if (!modal) return;
  document.body.appendChild(modal);
  bindRecoveryModalEvents(modal);
}

function bindRecoveryModalEvents(modal) {
  modal.querySelector("#recovery-close-btn")?.addEventListener("click", closeRecoveryModal);
  modal.querySelector("#recovery-rescan-btn")?.addEventListener("click", async () => {
    recoveryFindings = await scanForRecoverableData();
    paintRecoveryModal();
    toast("Scan complete");
  });
  modal.querySelector("#recovery-file-input")?.addEventListener("change", async (e) => {
    const files = [...(e.target.files || [])];
    if (!files.length) return;
    recoveryFindings = [...recoveryFindings, ...(await scanBackupFiles(files))];
    paintRecoveryModal();
    e.target.value = "";
  });
  modal.querySelectorAll("[data-recovery-merge]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const finding = getRecoveryFinding(recoveryFindings, btn.getAttribute("data-recovery-merge"));
      if (!finding?.data) return;
      const { merged, missingGames, missingDecks } = mergeRecovery(data, finding.data);
      if (!missingGames.length && !missingDecks.length) {
        toast("Nothing new to merge from that snapshot");
        return;
      }
      if (!saveData(merged)) {
        toast("Recovery merge failed — storage may be full", true);
        return;
      }
      data = merged;
      closeRecoveryModal();
      render();
      toast(`Recovered ${missingGames.length} games and ${missingDecks.length} decks`);
    });
  });
  modal.querySelectorAll("[data-recovery-replace]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const finding = getRecoveryFinding(recoveryFindings, btn.getAttribute("data-recovery-replace"));
      if (!finding?.data) return;
      if (
        !confirm(
          `Replace all current data with this snapshot (${finding.stats?.games || 0} games, ${finding.stats?.decks || 0} decks)? Export a backup first if you are unsure.`
        )
      ) {
        return;
      }
      if (!saveData(finding.data)) {
        toast("Recovery replace failed — storage may be full", true);
        return;
      }
      data = finding.data;
      closeRecoveryModal();
      render();
      toast("Data restored from snapshot");
    });
  });
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
    opponentDeckId: entityReport.opponentDeckId,
    opponentDecks: data.opponentDecks || [],
    splitPartners: totalsSplitPartners,
    archetypeView: entityReport.archetypeView,
    tagKind: entityReport.tagKind,
    archetypeScope: entityReport.archetypeScope,
  });
  const chartContext = getEntityChartContext(
    report.chartGames,
    entityReportChartRange,
    entityReportGameRange
  );

  if (!modal) {
    modal = document.createElement("div");
    modal.id = "entity-report-modal";
    modal.className = "modal";
    modal.addEventListener("click", handleEntityReportModalClick);
    document.body.appendChild(modal);
  }

  modal.classList.remove("hidden");
  const scrollEl = modal.querySelector(".entity-report-body");
  const scrollToTop = entityReportScrollToTop;
  const scrollTop = scrollToTop ? 0 : scrollEl?.scrollTop ?? 0;
  modal.innerHTML = renderEntityReportModal(
    report,
    data.decks,
    entityReportTab,
    entityReportMatchupSort,
    entityReportGamesSort,
    { heroTab: entityReportHeroTab, chartContext, canGoBack: entityReportStack.length > 0, opponentDecks: data.opponentDecks || [] }
  );
  const newScrollEl = modal.querySelector(".entity-report-body");
  if (newScrollEl) {
    newScrollEl.scrollTop = scrollToTop ? 0 : scrollTop;
    if (scrollToTop) entityReportScrollToTop = false;
  }
  bindWinRateLineCharts();
  bindTrendsGameRangeControls(
    chartContext.boundsMin,
    chartContext.boundsMax,
    ({ min, max }) => {
      entityReportGameRange = { min, max, customized: true };
      syncEntityReportModal();
    },
    "entity-report"
  );
  fitEntityDeckCardStats(modal);
  void loadImagesIntoRoot(modal.querySelector("[data-entity-report-root]"));
}

function findEditingDeck() {
  if (editingDeckIndex >= 0 && data.decks[editingDeckIndex]) {
    return data.decks[editingDeckIndex];
  }
  if (!editingDeckName) return null;
  return data.decks.find((d) => deckId(d) === editingDeckName) || findDeck(data.decks, editingDeckName);
}

function resolveEditingDeckIndex(deckRef) {
  if (!deckRef) return -1;
  const byId = data.decks.findIndex((d) => deckId(d) === deckRef);
  if (byId >= 0) return byId;
  const deck = findDeck(data.decks, deckRef);
  return deck ? data.decks.indexOf(deck) : -1;
}

function ensureDeckHasId(deck) {
  if (deck.id) return false;
  deck.id = nextDeckId(data);
  return true;
}

/** @param {import('./store.js').Deck} deck */
function deckHistorySnapshot(deck) {
  return {
    commander: deckCommander(deck),
    name: String(deck.name || ""),
    bracket: deck.bracket ?? 4,
    colors: [...(deck.colors || [])],
    changedAt: todayISO(),
  };
}

/** @param {import('./store.js').Deck} existing @param {{ commander: string }} next */
function deckCommanderChanged(existing, next) {
  const prevCommander = getCommanderInfo(deckCommander(existing)).canonicalName;
  const nextCommander = getCommanderInfo(next.commander).canonicalName;
  return prevCommander !== nextCommander;
}

/** @param {import('./store.js').Deck[]} decks @param {string} commander @param {number} [excludeIndex] */
function decksWithSameCommander(decks, commander, excludeIndex = -1) {
  const target = getCommanderInfo(commander).canonicalName;
  return decks.filter(
    (deck, index) =>
      index !== excludeIndex &&
      getCommanderInfo(deckCommander(deck)).canonicalName === target
  );
}

/** @param {import('./store.js').Deck[]} decks @param {string} commander @param {string} name @param {number} [excludeIndex] */
function deckNameClashMessage(decks, commander, name, excludeIndex = -1) {
  const trimmed = String(name || "").trim();
  const sameCommanderDecks = decksWithSameCommander(decks, commander, excludeIndex);

  if (sameCommanderDecks.length && !trimmed) {
    return "Give this deck a name — another deck already uses this commander";
  }

  if (!trimmed) return null;

  const nameKey = trimmed.toLowerCase();
  const duplicate = decks.find(
    (deck, index) =>
      index !== excludeIndex && String(deck.name || "").trim().toLowerCase() === nameKey
  );
  if (duplicate) {
    return "Another deck already uses that name";
  }

  return null;
}

function backfillGameCommandersForDeck(deck) {
  const id = deckId(deck);
  if (!id) return false;
  let changed = false;
  for (const game of data.games) {
    if (game.deck !== id) continue;
    const commander = resolveDeckCommanderOnDate(deck, game.date);
    if (commander && game.myCommander !== commander) {
      game.myCommander = commander;
      changed = true;
    }
  }
  return changed;
}

function findEditingOpponentDeck() {
  if (!editingOpponentDeckId) return null;
  return findOpponentDeck(ensureOpponentDecks(data), editingOpponentDeckId);
}

function closeDeckModal() {
  deckModalOpen = false;
  editingDeckName = null;
  editingDeckIndex = -1;
  editingOpponentDeckId = null;
}

function saveOpponentDeckFromForm(formOverride = null) {
  const form = formOverride || document.getElementById("deck-form");
  if (!form || !editingOpponentDeckId) return;

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

  const opponentDecks = ensureOpponentDecks(data);
  const updated = updateOpponentDeckProfile(opponentDecks, editingOpponentDeckId, {
    name: String(fd.get("name") || "").trim(),
    commander,
    colors,
    archetypes: sortArchetypeTags(parseArchetypesFromInput(fd.get("archetypes"))),
    tribes: deckHasTribalArchetype(parseArchetypesFromInput(fd.get("archetypes")))
      ? sortArchetypeTags(parseTribesFromInput(fd.get("tribes")))
      : [],
    createdAt: normalizeDate(String(fd.get("createdAt") || "")) || todayISO(),
  });

  if (!updated) {
    toast("Opponent deck not found", true);
    return;
  }

  if (!saveData(data)) {
    toast("Failed to save deck — storage may be full", true);
    return;
  }

  closeDeckModal();
  toast("Opponent deck saved");
  render();
  void refreshCommanderColorCache();
}

function saveDeckFromForm(formOverride = null) {
  if (editingOpponentDeckId) {
    saveOpponentDeckFromForm(formOverride);
    return;
  }
  const form = formOverride || document.getElementById("deck-form");
  if (!form) {
    toast("Could not save deck — form missing", true);
    return;
  }

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

  const deckPayload = {
    name: String(fd.get("name") || "").trim(),
    commander,
    bracket: Number(fd.get("bracket")) || 4,
    colors,
    archetypes: sortArchetypeTags(parseArchetypesFromInput(fd.get("archetypes"))),
    tribes: deckHasTribalArchetype(parseArchetypesFromInput(fd.get("archetypes")))
      ? sortArchetypeTags(parseTribesFromInput(fd.get("tribes")))
      : [],
    retired: fd.get("retired") === "on",
    createdAt: normalizeDate(String(fd.get("createdAt") || "")) || todayISO(),
  };

  const originalId = String(fd.get("originalId") || "").trim();
  const editIndex =
    editingDeckIndex >= 0
      ? editingDeckIndex
      : originalId
        ? data.decks.findIndex((d) => deckId(d) === originalId)
        : editingDeckName
          ? resolveEditingDeckIndex(editingDeckName)
          : -1;

  if (editIndex >= 0) {
    const existing = data.decks[editIndex];
    if (!existing) {
      toast("Deck not found", true);
      return;
    }
    const deckIdToKeep = deckId(existing) || originalId || nextDeckId(data);
    const nameClash = deckNameClashMessage(data.decks, commander, deckPayload.name, editIndex);
    if (nameClash) {
      toast(nameClash, true);
      return;
    }

    const history = [...(existing.history || [])];
    const commanderChanged = deckCommanderChanged(existing, deckPayload);
    if (commanderChanged) {
      history.push(deckHistorySnapshot(existing));
      linkDeckSeedKey(data, deckIdToKeep, deckCommander(existing));
    }

    data.decks[editIndex] = {
      ...existing,
      ...deckPayload,
      id: deckIdToKeep,
      history,
      createdAt: deckPayload.createdAt || existing.createdAt || todayISO(),
    };

    if (commanderChanged) {
      backfillGameCommandersForDeck(data.decks[editIndex]);
    }

    if (!saveData(data)) {
      toast("Failed to save deck — storage may be full", true);
      return;
    }
    closeDeckModal();
    toast("Deck saved");
    render();
    void refreshCommanderColorCache();
    return;
  }

  const nameClash = deckNameClashMessage(data.decks, commander, deckPayload.name);
  if (nameClash) {
    toast(nameClash, true);
    return;
  }

  data.decks.push({
    ...deckPayload,
    id: nextDeckId(data),
    history: [],
  });
  if (!saveData(data)) {
    data.decks.pop();
    toast("Failed to add deck — storage may be full", true);
    return;
  }
  closeDeckModal();
  toast(`Added ${deckTitle(deckPayload)}`);
  render();
  void refreshCommanderColorCache();
}

function render() {
  const matchupSearchFocusId = [
    "matchup-subject-search",
    "matchup-opponent-search",
    "totals-matchup-subject-search",
    "totals-matchup-opponent-search",
  ].find((id) => document.activeElement?.id === id);
  const matchupSearchPos =
    matchupSearchFocusId && document.activeElement instanceof HTMLInputElement
      ? document.activeElement.selectionStart
      : null;
  const totalsSearchFocused = document.activeElement?.id === "totals-search";
  const totalsSearchPos = totalsSearchFocused ? document.activeElement.selectionStart : null;

  const main = document.getElementById("main");
  if (currentView === "stats") main.innerHTML = renderStats();
  else if (currentView === "totals") main.innerHTML = renderTotals();
  else if (currentView === "decks") main.innerHTML = renderDecks();
  else main.innerHTML = renderGames();

  bindPieCharts();
  if (
    currentView === "stats" &&
    (statsTab === "trends" ||
      statsTab === "seats" ||
      statsTab === "colors" ||
      statsTab === "brackets")
  ) {
    bindWinRateLineCharts();
    if (statsTab === "trends") {
      const { statsGames } = getStatsScope();
      const { boundsMin, boundsMax } = getTrendsChartContext(statsGames, getStats().rolling.windows);
      bindTrendsGameRangeControls(boundsMin, boundsMax, ({ min, max }) => {
        trendsGameRange = { min, max, customized: true };
        render();
      });
    }
  }
  if (currentView === "totals" && totalsTab === "seats") {
    bindWinRateLineCharts();
  }
  if (currentView === "stats" && statsTab === "turns") {
    bindTurnWinRateChart();
  }
  if (currentView === "totals" && totalsTab === "turns") {
    bindTurnWinRateChart();
  }
  if (currentView === "stats" && statsTab === "matchups" && matchupTab === "decks") {
    bindMatchupDeckTips();
  }
  if (gameModalOpen) {
    syncPodFormSeats();
    syncResultFromWinnerToggle();
    syncBracketFromDeck();
    const gameForm = document.getElementById("add-game-form");
    bindGameDeckSelect(gameForm);
    const decksForPodSearch = editingGameId
      ? data.decks
      : data.decks.filter((d) => !d.retired);
    bindPodAutocomplete(gameForm, data.games, decksForPodSearch);
  }
  syncEntityReportModal();

  if (matchupSearchFocusId) {
    restoreSearchInputFocus(matchupSearchFocusId, matchupSearchPos);
  }

  if (totalsSearchFocused) {
    const el = document.getElementById("totals-search");
    if (el) {
      el.focus();
      if (totalsSearchPos != null) el.setSelectionRange(totalsSearchPos, totalsSearchPos);
    }
  }

  if (currentView === "decks" && deckModalOpen) {
    bindDeckTagAutocompletes(
      document.getElementById("deck-form"),
      data.decks,
      ensureOpponentDecks(data)
    );
    const nameInput = document.querySelector('#deck-form input[name="name"]');
    nameInput?.focus();
    if (editingDeckName) nameInput?.select();
    void refreshDeckModalColorsIfNeeded();
  }
}

async function refreshDeckModalColorsIfNeeded() {
  if (currentView !== "decks" || !deckModalOpen) return;

  const opponentDeck = findEditingOpponentDeck();
  const ownedDeck = editingDeckName ? findEditingDeck() : null;
  const commander = opponentDeck
    ? opponentDeckCommander(opponentDeck)
    : ownedDeck
      ? deckCommander(ownedDeck)
      : "";
  if (!commander) return;

  const storedColors = opponentDeck?.colors ?? ownedDeck?.colors;
  if (storedColors?.length) return;

  if (getCommanderColorIdentity(commander).length) {
    render();
    return;
  }

  await warmCommanderColorCache([commander]);
  render();
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

function matchupWrSortHeaders(tableId, sort) {
  return `
          ${sortHeader(tableId, "normalizedWinRate", "NWR", sort)}
          ${sortHeader(tableId, "opponentWinRate", "OPWR", sort)}
          ${sortHeader(tableId, "normalizedOpponentWinRate", "NOPWR", sort)}`;
}

/** @param {{ normalizedWinRate?: number, opponentWinRate?: number, normalizedOpponentWinRate?: number }} row */
function matchupWrCells(row) {
  return `
              <td>${pctCell(row.normalizedWinRate)}</td>
              <td>${pctCell(row.opponentWinRate)}</td>
              <td>${pctCell(row.normalizedOpponentWinRate)}</td>`;
}

/** @param {string} key @param {string} label @param {{ view?: import('./archetype-stats.js').ArchetypeView, scope?: 'mine' | 'all' | 'opponents' }} linkOptions */
function renderMatchupArchetypeCell(key, label, linkOptions) {
  return `<td class="matchup-archetype-col">${renderArchetypeReportLink(key, label, linkOptions)}</td>`;
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
        <span class="podium-meta">${deck.wins}W · ${deck.games}G · ${pct(deck.winRate)} · ${pct(deck.normalizedWr)} norm</span>
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
        ${renderBracketFilterToggle("overview-bracket-filter-toggle", statsBracketFilter)}
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
        bracketFilter: true,
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
    const {
      sorted: sortedStatsGames,
      filterBounds,
      boundsMin,
      boundsMax,
      gameRange,
      rangeGames,
      chartRange,
    } = getTrendsChartContext(statsGames, windowsForChart);
    const rangeWins = rangeGames.filter((g) => g.result === "Win").length;
    const headerWinRate = rangeGames.length ? winRate(rangeWins, rangeGames.length) : null;
    const chartHeader = renderTrendsChartHeader({
      title: trendsChartTitle(),
      winRate: headerWinRate,
      gameCount: rangeGames.length,
      min: gameRange.min,
      max: gameRange.max,
      boundsMin,
      boundsMax,
    });
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
      const rangeGameIds = new Set(rangeGames.map((g) => g.id));
      chart = renderMultiWinRateLineChart(
        windowsForChart
          .filter((window) => trendsWindowSelection.has(`${window.rangeStart}-${window.rangeEnd}`))
          .map((window) => {
            const id = `${window.rangeStart}-${window.rangeEnd}`;
            const windowGames = gamesForTrendsWindowSeries(
              statsGames,
              window.rangeStart,
              window.rangeEnd
            ).filter((g) => rangeGameIds.has(g.id));
            return {
              id,
              label: window.label,
              color: colorForChartSelection(trendsWindowSelection, id, windowsForChart.length),
              series: computeWinRateSeries(windowGames),
            };
          }),
        chartRange,
        trendsChartTitle(),
        chartHeader
      );
    } else {
      chart = renderWinRateLineChart(
        computeWinRateSeries(rangeGames),
        trendsChartTitle(),
        chartRange,
        chartHeader
      );
    }

    if (!s.rolling.windows.length) {
      body = `${renderDateRangeFilters("trends", filterBounds, chartRange, { bracketFilter: true, deckFilter: true })}${trendsSummary}${renderChartSection(chart, "clear-trends-chart")}`;
    } else {
      const windows = windowsForChart;
      const cumulative = applySort(s.rolling.cumulative, tableSort["trends-cumulative"], {
        label: (w) => w.label,
        games: (w) => w.games,
        winRate: (w) => w.winRate,
      });

      body = `
        ${renderDateRangeFilters("trends", filterBounds, chartRange, { bracketFilter: true, deckFilter: true })}
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
        ${renderChartSection(chart, "clear-trends-chart")}
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
        </div>`;
    }
  } else if (statsTab === "archetypes") {
    const { statsGames } = getStatsScope();
    const tagKind = getArchetypeTagKind();
    const archetypes = applySort(
      computeArchetypeTableRows(statsGames, { scope: "mine", view: archetypeView, tagKind }),
      tableSort["archetype-stats"],
      {
        label: (row) => row.label,
        decks: (row) => row.decks,
        games: (row) => row.games,
        wins: (row) => row.wins,
        winRate: (row) => row.winRate,
        normalizedWr: (row) => row.normalizedWr,
      },
      WINS_SORT_TIE_BREAKERS
    );
    const emptyMessage =
      tagKind === "tribe"
        ? "No tribe data yet — add tribes to your decks."
        : "No archetype data yet — add archetypes to your decks.";

    body = `
      <div class="filters inline archetype-toolbar">
        ${renderStatsDeckFilterToggle()}
        ${renderBracketFilterToggle("stats-bracket-filter-toggle", statsBracketFilter)}
        ${renderArchetypeTribeToggle()}
        <button type="button" class="btn btn-ghost btn-sm" id="archetype-view-toggle">${archetypeViewLabel(archetypeView)}</button>
      </div>
      ${renderArchetypeStatsTable(archetypes, emptyMessage, { tagKind, scope: "mine" })}`;
  } else if (statsTab === "turns") {
    const { statsGames } = getStatsScope();
    const turnRows = computeTurnGridStats(statsGames);
    const turns = applySort(
      turnRows,
      tableSort["turn-stats"],
      {
        turn: (row) => row.turn,
        wins: (row) => row.wins,
        losses: (row) => row.losses,
        winRate: (row) => row.winRate ?? -1,
        normalizedWr: (row) => row.normalizedWr ?? -1,
      },
      WINS_SORT_TIE_BREAKERS
    );
    const turnChart = renderTurnWinRateChart(turnRows, { metric: turnChartMetric });

    body = `
      <div class="filters inline turns-toolbar">
        ${renderStatsDeckFilterToggle()}
        ${renderBracketFilterToggle("stats-bracket-filter-toggle", statsBracketFilter)}
      </div>
      <table class="table compact sortable-table turn-stats-sort">
        <thead><tr>
          ${sortHeader("turn-stats", "turn", "Turn", tableSort["turn-stats"])}
          ${sortHeader("turn-stats", "wins", "Wins", tableSort["turn-stats"])}
          ${sortHeader("turn-stats", "losses", "Losses", tableSort["turn-stats"])}
          ${sortHeader("turn-stats", "winRate", "WR", tableSort["turn-stats"])}
          ${sortHeader("turn-stats", "normalizedWr", "Norm WR", tableSort["turn-stats"])}
        </tr></thead>
      </table>
      ${
        turnRows.length
          ? `${renderTurnStatsGrid(turns)}
          <div class="turn-chart-toolbar filters inline">
            ${renderTurnChartMetricToggle()}
            <span class="turn-chart-metric-caption">${escapeHtml(turnChartLabel(turnChartMetric, "player"))}</span>
          </div>
          ${turnChart}`
          : `<p class="muted">No turn data yet — add an end turn when logging games.</p>`
      }`;
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
      ${renderDateRangeFilters("seats", bounds, range, { bracketFilter: true, deckFilter: true })}
      <div class="seat-toggle-row">
        <button type="button" class="seat-toggle seat-view-toggle" data-seat-view-cycle title="Cycle seat perspective">
          <strong>${SEAT_VIEW_LABELS[seatViewMode]}</strong>
        </button>
        ${seatStats
          .map(
            (seat) => `
          <div class="seat-toggle-col">
            <button type="button" class="seat-toggle ${selectedSeats.includes(seat.seat) ? "active" : ""}"
              data-seat-toggle="${seat.seat}" style="--seat-color:${SEAT_COLORS[seat.seat]}">
              <div class="seat-toggle-header"><strong>${seat.label}</strong></div>
              <span>${seat.games}G · ${seat.wins}W · ${seat.games ? pctCell(seat.winRate) : "—"}</span>
            </button>
            ${
              seatViewMode === "mine"
                ? `<div class="seat-streak-stats">
              <div class="seat-streak-line">${formatSeatBestWinStreak(seat.longestWinStreak)}</div>
              <div class="seat-streak-line">${formatSeatSitStreak(seat.longestSitStreak)}</div>
            </div>`
                : ""
            }
          </div>`
          )
          .join("")}
      </div>
      ${renderChartSection(seatChart, "clear-seats-chart")}`;
  } else if (statsTab === "matchups") {
    const isDeckTab = matchupTab === "decks";
    const isColorTab = matchupTab === "colors";
    const isArchetypeTab = matchupTab === "archetypes";
    const isPlayerTab = matchupTab === "players";
    const subjectQuery = matchupSubjectSearch.trim().toLowerCase();
    const opponentQuery = matchupOpponentSearch.trim().toLowerCase();
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
        normalizedWinRate: (r) => r.normalizedWinRate,
        opponentWinRate: (r) => r.opponentWinRate,
        normalizedOpponentWinRate: (r) => r.normalizedOpponentWinRate,
        outcomeTieRank: (r) => r.sharedLosses - r.losses,
      },
      {
        ...WINS_SORT_TIE_BREAKERS,
        normalizedWinRate: ["outcomeTieRank", "games"],
        opponentWinRate: "games",
        normalizedOpponentWinRate: "games",
      }
    );
    const ranked = sorted.map((row, index) => ({ ...row, rank: index + 1 }));
    let rows = ranked.filter((row) => {
      if (isColorTab) {
        if (!colorMatchupSideMatchesSearch(row, "subject", subjectQuery)) return false;
        if (!colorMatchupSideMatchesSearch(row, "opponent", opponentQuery)) return false;
        return true;
      }
      if (isArchetypeTab) {
        if (!matchupTextIncludes(row.subject, subjectQuery)) return false;
        if (!matchupTextIncludes(row.opponent, opponentQuery)) return false;
        return true;
      }
      if (isDeckTab) {
        if (matchupCombineDecks) {
          if (subjectQuery) return false;
          if (!opponentQuery) return true;
          return (
            matchupTextIncludes(row.opponent, opponentQuery) ||
            matchupTextIncludes(row.opponentPlayer, opponentQuery)
          );
        }
        if (!matchupTextIncludes(row.subject, subjectQuery)) return false;
        if (!opponentQuery) return true;
        return (
          matchupTextIncludes(row.opponent, opponentQuery) ||
          matchupTextIncludes(row.opponentPlayer, opponentQuery)
        );
      }
      if (isPlayerTab) {
        if (subjectQuery) return false;
        return matchupTextIncludes(row.opponent, opponentQuery);
      }
      return matchupTextIncludes(row.opponent, opponentQuery);
    });
    let matchupRowsCapped = false;
    if (isArchetypeTab) {
      const capped = capMatchupTableRows(rows);
      rows = capped.rows;
      matchupRowsCapped = capped.capped;
    }
    lastMatchupDeckRows = isDeckTab ? rows : [];

    const subjectSearchPlaceholder = isDeckTab
      ? "Search my decks"
      : isColorTab
        ? 'Search my colors (WUB, Green, Simic…)'
        : isArchetypeTab
          ? "Search my archetypes"
          : "";
    const opponentSearchPlaceholder = isDeckTab
      ? matchupCombineDecks
        ? "Search opponent decks"
        : "Search opponent decks"
      : isColorTab
        ? 'Search opp. colors (WUB, Green, Simic…)'
        : isArchetypeTab
          ? "Search opponent archetypes"
          : "Search opponents";
    const showSubjectSearch = !isPlayerTab && !(isDeckTab && matchupCombineDecks);

    const archetypeToolbarControls = isArchetypeTab
      ? `<button type="button" class="btn btn-ghost btn-sm" id="matchup-archetype-view-toggle">${archetypeViewLabel(matchupArchetypeView)}</button>`
      : "";

    const colorToolbarControls = isColorTab
      ? `<button type="button" class="btn btn-ghost btn-sm" id="matchup-color-view-toggle">${colorViewLabel(matchupColorView)}</button>
        <button type="button" class="btn btn-ghost btn-sm" id="matchup-color-agg-toggle">${matchupColorAgg === "inclusive" ? "Inclusive" : "Exclusive"}</button>
        <label class="checkbox matchup-split-partners">
          <input type="checkbox" id="matchup-split-partners" ${matchupSplitPartners ? "checked" : ""} />
          Split partners
        </label>`
      : "";

    const deckToolbarControls = isDeckTab
      ? `<label class="checkbox matchup-combine-decks">
          <input type="checkbox" id="matchup-combine-decks" ${matchupCombineDecks ? "checked" : ""} />
          Combine Decks
        </label>
        <label class="checkbox matchup-split-partners">
          <input type="checkbox" id="matchup-split-partners" ${matchupSplitPartners ? "checked" : ""} />
          Split partners
        </label>
        <label class="checkbox matchup-split-players">
          <input type="checkbox" id="matchup-split-players" ${matchupSplitPlayers ? "checked" : ""} />
          Split Players
        </label>`
      : "";

    const subjectHeader = isDeckTab && !matchupCombineDecks
      ? sortHeader("matchups", "subject", "Deck", tableSort.matchups)
      : isColorTab
        ? sortHeader("matchups", "subject", "My Colors", tableSort.matchups)
        : isArchetypeTab
          ? sortHeader("matchups", "subject", "Archetype", tableSort.matchups, "matchup-archetype-col")
          : "";
    const opponentHeader = sortHeader(
      "matchups",
      "opponent",
      isDeckTab
        ? "Opponent Deck"
        : isColorTab
          ? "Opponent Colors"
          : isArchetypeTab
            ? "Opponent Archetype"
            : "Opponent",
      tableSort.matchups,
      isArchetypeTab ? "matchup-archetype-col" : ""
    );

    body = `
      ${subTabs(MATCHUP_TABS, matchupTab, "matchup-tab")}
      <div class="filters inline matchup-filters">
        ${renderBracketFilterToggle("stats-bracket-filter-toggle", statsBracketFilter)}
        ${renderStatsDeckFilterToggle()}
        ${colorToolbarControls}
        ${archetypeToolbarControls}
        ${deckToolbarControls}
        ${renderMatchupSearchInputs({
          subjectId: "matchup-subject-search",
          opponentId: "matchup-opponent-search",
          subjectValue: matchupSubjectSearch,
          opponentValue: matchupOpponentSearch,
          subjectPlaceholder: subjectSearchPlaceholder,
          opponentPlaceholder: opponentSearchPlaceholder,
          showSubject: showSubjectSearch,
        })}
      </div>
      <table class="table compact sortable-table matchup-table ${isArchetypeTab ? "matchup-table-archetypes" : ""}">
        <thead><tr>
          <th class="col-rank">#</th>
          ${subjectHeader}
          ${opponentHeader}
          ${sortHeader("matchups", "games", "G", tableSort.matchups)}
          ${sortHeader("matchups", "wins", "W", tableSort.matchups)}
          ${isDeckTab && !matchupSplitPlayers ? sortHeader("matchups", "opponentCount", "Pop", tableSort.matchups) : ""}
          ${sortHeader("matchups", "winRate", "WR", tableSort.matchups)}
          ${matchupWrSortHeaders("matchups", tableSort.matchups)}
        </tr></thead>
        <tbody>
          ${rows
            .map(
              (row, rowIndex) => `
            <tr>
              <td class="col-rank">${row.rank}</td>
              ${
                isDeckTab && !matchupCombineDecks
                  ? `<td class="matchup-deck-col">${renderMatchupDeckCell(row.subject, data.decks)}</td>`
                  : isColorTab
                    ? `<td class="matchup-color-col"><span class="color-label">${colorBadge(row.subjectColors || [])}</span></td>`
                    : isArchetypeTab
                      ? renderMatchupArchetypeCell(row.subject, row.subject, {
                          view: matchupArchetypeView,
                          scope: "mine",
                        })
                      : ""
              }
              ${
                isDeckTab
                  ? `<td class="matchup-deck-col">${renderMatchupOpponentDeckCell(row, data.decks)}</td>`
                  : isColorTab
                    ? `<td class="matchup-color-col"><span class="color-label">${colorBadge(row.opponentColors || [])}</span></td>`
                    : isArchetypeTab
                      ? renderMatchupArchetypeCell(row.opponent, row.opponent, {
                          view: matchupArchetypeView,
                          scope: "opponents",
                        })
                      : `<td>${renderPlayerReportLink(row.opponent)}</td>`
              }
              <td>${row.games}</td>
              <td>${row.wins}</td>
              ${isDeckTab && !matchupSplitPlayers ? `<td class="matchup-pop-col">${row.opponentCount ? `<span class="matchup-pop-trigger has-tip" data-matchup-row-index="${rowIndex}">${row.opponentCount}</span>` : "—"}</td>` : ""}
              <td>${pctCell(row.winRate)}</td>
              ${matchupWrCells(row)}
            </tr>`
            )
            .join("")}
        </tbody>
      </table>
      ${
        matchupRowsCapped
          ? `<p class="muted matchup-row-cap-note">Showing the first ${MATCHUP_TABLE_ROW_CAP} rows (sorted). Use search or Unique view for narrower results.</p>`
          : ""
      }
      ${isDeckTab && !matchupSplitPlayers ? `<div id="matchup-deck-tip" class="deck-opponent-tip" hidden></div>` : ""}`;
  }

  return `<section class="section">${subTabs(STATS_TABS, statsTab, "stats-tab")}${body}</section>`;
}

function renderTotals() {
  const s = getStats();
  let body = "";
  const isDeckTab = totalsTab === "decks";
  const isPlayerTab = totalsTab === "players";
  const isColorTab = totalsTab === "colors";
  const isArchetypeTab = totalsTab === "archetypes";
  const isMatchupsTab = totalsTab === "matchups";
  const isSeatsTab = totalsTab === "seats";
  const isTurnsTab = totalsTab === "turns";
  const totalsGames = getTotalsScopeGames();
  const bracketFilterControl = renderBracketFilterToggle(
    "totals-bracket-filter-toggle",
    totalsBracketFilter
  );
  const excludeMeControl = `<label class="checkbox totals-exclude-me">
      <input type="checkbox" id="totals-exclude-me" ${totalsExcludeMe ? "checked" : ""} />
      Exclude my data
    </label>`;

  if (isMatchupsTab) {
    const isPodDeckTab = totalsMatchupTab === "decks";
    const isPodColorTab = totalsMatchupTab === "colors";
    const isPodArchetypeTab = totalsMatchupTab === "archetypes";
    const isPodPlayerTab = totalsMatchupTab === "players";
    const subjectQuery = totalsMatchupSubjectSearch.trim().toLowerCase();
    const opponentQuery = totalsMatchupOpponentSearch.trim().toLowerCase();
    const matchupSort = tableSort["totals-matchups"];
    const sorted = applySort(
      s.totals.matchups?.[totalsMatchupTab] || [],
      matchupSort,
      {
        subjectPlayer: (r) => r.subjectPlayer,
        opponentPlayer: (r) => r.opponentPlayer,
        subject: (r) => r.subject,
        opponent: (r) => r.opponent,
        games: (r) => r.games,
        wins: (r) => r.wins,
        winRate: (r) => r.winRate,
        normalizedWinRate: (r) => r.normalizedWinRate,
        opponentWinRate: (r) => r.opponentWinRate,
        normalizedOpponentWinRate: (r) => r.normalizedOpponentWinRate,
        outcomeTieRank: (r) => r.sharedLosses - r.losses,
      },
      {
        ...WINS_SORT_TIE_BREAKERS,
        normalizedWinRate: ["outcomeTieRank", "games"],
        opponentWinRate: "games",
        normalizedOpponentWinRate: "games",
      }
    );
    let rows = sorted
      .map((row, index) => ({ ...row, rank: index + 1 }))
      .filter((row) => {
        if (isPodColorTab) {
          if (!colorMatchupSideMatchesSearch(row, "subject", subjectQuery)) return false;
          if (!colorMatchupSideMatchesSearch(row, "opponent", opponentQuery)) return false;
          return true;
        }

        const subjectParts =
          isPodPlayerTab || isPodDeckTab
            ? [row.subjectPlayer, row.subject]
            : [row.subject];
        const opponentParts =
          isPodPlayerTab || isPodDeckTab
            ? [row.opponentPlayer, row.opponent]
            : [row.opponent];

        if (
          subjectQuery &&
          !subjectParts.filter(Boolean).some((part) => matchupTextIncludes(part, subjectQuery))
        ) {
          return false;
        }
        if (
          opponentQuery &&
          !opponentParts.filter(Boolean).some((part) => matchupTextIncludes(part, opponentQuery))
        ) {
          return false;
        }
        return true;
      });
    let totalsMatchupRowsCapped = false;
    if (isPodArchetypeTab) {
      const capped = capMatchupTableRows(rows);
      rows = capped.rows;
      totalsMatchupRowsCapped = capped.capped;
    }

    const subjectDimHeader = isPodDeckTab
      ? "Deck"
      : isPodColorTab
        ? "Colors"
        : isPodArchetypeTab
          ? "Archetype"
          : "";
    const opponentDimHeader = isPodDeckTab
      ? "Opponent Deck"
      : isPodColorTab
        ? "Opponent Colors"
        : isPodArchetypeTab
          ? "Opponent Archetype"
          : "";

    const splitPartnersControl =
      isPodDeckTab || isPodColorTab
        ? `<label class="checkbox totals-split-partners">
          <input type="checkbox" id="totals-split-partners" ${totalsSplitPartners ? "checked" : ""} />
          Split partners
        </label>`
        : "";

    const colorToolbar =
      isPodColorTab
        ? `<button type="button" class="btn btn-ghost btn-sm" id="totals-color-view-toggle">${colorViewLabel(totalsColorView)}</button>
        <button type="button" class="btn btn-ghost btn-sm" id="totals-color-agg-toggle">${totalsColorAgg === "inclusive" ? "Inclusive" : "Exclusive"}</button>`
        : "";

    const archetypeToolbar =
      isPodArchetypeTab
        ? `<button type="button" class="btn btn-ghost btn-sm" id="matchup-archetype-view-toggle">${archetypeViewLabel(matchupArchetypeView)}</button>`
        : "";

    const showPlayerColumns = isPodPlayerTab || isPodDeckTab;

    const dimensionHeaders = isPodPlayerTab
      ? ""
      : `${sortHeader(
          "totals-matchups",
          "subject",
          subjectDimHeader,
          matchupSort,
          isPodArchetypeTab ? "matchup-archetype-col" : ""
        )}`;
    const opponentDimHeaderSort = isPodPlayerTab
      ? ""
      : `${sortHeader(
          "totals-matchups",
          "opponent",
          opponentDimHeader,
          matchupSort,
          isPodArchetypeTab ? "matchup-archetype-col" : ""
        )}`;

    const subjectPlayerHeader = showPlayerColumns
      ? sortHeader("totals-matchups", "subjectPlayer", "Player", matchupSort)
      : "";
    const opponentPlayerHeader = showPlayerColumns
      ? sortHeader("totals-matchups", "opponentPlayer", "Opponent", matchupSort)
      : "";

    const dimensionCells = (row) => {
      if (isPodPlayerTab) return "";
      if (isPodDeckTab) {
        return `<td class="matchup-deck-col">${renderDeckReportLink(row.subject, data.decks, {
          label: row.subject,
        })}</td>`;
      }
      if (isPodColorTab) {
        return `<td class="matchup-color-col"><span class="color-label">${colorBadge(row.subjectColors || [])}</span></td>`;
      }
      return renderMatchupArchetypeCell(row.subject, row.subject, {
        view: matchupArchetypeView,
        scope: "all",
      });
    };

    const opponentDimCells = (row) => {
      if (isPodPlayerTab) return "";
      if (isPodDeckTab) {
        return `<td class="matchup-deck-col">${renderDeckReportLink(row.opponent, data.decks, {
          label: row.opponent,
        })}</td>`;
      }
      if (isPodColorTab) {
        return `<td class="matchup-color-col"><span class="color-label">${colorBadge(row.opponentColors || [])}</span></td>`;
      }
      return renderMatchupArchetypeCell(row.opponent, row.opponent, {
        view: matchupArchetypeView,
        scope: "all",
      });
    };

    body = `
      ${subTabs(TOTALS_TABS, totalsTab, "totals-tab")}
      ${subTabs(POD_MATCHUP_TABS, totalsMatchupTab, "totals-matchup-tab")}
      <div class="filters inline totals-filters matchup-filters">
        ${bracketFilterControl}
        ${colorToolbar}
        ${archetypeToolbar}
        ${splitPartnersControl}
        ${excludeMeControl}
        ${renderMatchupSearchInputs({
          subjectId: "totals-matchup-subject-search",
          opponentId: "totals-matchup-opponent-search",
          subjectValue: totalsMatchupSubjectSearch,
          opponentValue: totalsMatchupOpponentSearch,
          subjectPlaceholder: isPodPlayerTab
            ? "Search player"
            : isPodDeckTab
              ? "Search player or deck"
              : isPodColorTab
                ? "Search colors (WUB, Green, Simic…)"
                : "Search archetypes",
          opponentPlaceholder: isPodPlayerTab
            ? "Search opponent"
            : isPodDeckTab
              ? "Search opponent or deck"
              : isPodColorTab
                ? "Search opp. colors (WUB, Green, Simic…)"
                : "Search opponent archetypes",
          showSubject: true,
        })}
      </div>
      <table class="table compact sortable-table matchup-table totals-matchup-table ${isPodArchetypeTab ? "matchup-table-archetypes" : ""}">
        <thead><tr>
          <th class="col-rank">#</th>
          ${subjectPlayerHeader}
          ${dimensionHeaders}
          ${opponentPlayerHeader}
          ${opponentDimHeaderSort}
          ${sortHeader("totals-matchups", "games", "G", matchupSort)}
          ${sortHeader("totals-matchups", "wins", "W", matchupSort)}
          ${sortHeader("totals-matchups", "winRate", "WR", matchupSort)}
          ${matchupWrSortHeaders("totals-matchups", matchupSort)}
        </tr></thead>
        <tbody>
          ${rows
            .map(
              (row) => `
            <tr>
              <td class="col-rank">${row.rank}</td>
              ${showPlayerColumns ? `<td>${renderPlayerReportLink(row.subjectPlayer)}</td>` : ""}
              ${dimensionCells(row)}
              ${showPlayerColumns ? `<td>${renderPlayerReportLink(row.opponentPlayer)}</td>` : ""}
              ${opponentDimCells(row)}
              <td>${row.games}</td>
              <td>${row.wins}</td>
              <td>${pctCell(row.winRate)}</td>
              ${matchupWrCells(row)}
            </tr>`
            )
            .join("")}
        </tbody>
      </table>
      ${
        totalsMatchupRowsCapped
          ? `<p class="muted matchup-row-cap-note">Showing the first ${MATCHUP_TABLE_ROW_CAP} rows (sorted). Use search or Unique view for narrower results.</p>`
          : ""
      }`;
  } else if (isArchetypeTab) {
      const tagKind = getArchetypeTagKind();
      const archetypes = applySort(
        computeArchetypeTableRows(totalsGames, {
          scope: totalsExcludeMe ? "opponents" : "all",
          view: archetypeView,
          tagKind,
        }),
        tableSort["archetype-stats"],
        {
          label: (row) => row.label,
          decks: (row) => row.decks,
          games: (row) => row.games,
          wins: (row) => row.wins,
          winRate: (row) => row.winRate,
          normalizedWr: (row) => row.normalizedWr,
        },
        WINS_SORT_TIE_BREAKERS
      );
      const emptyMessage = totalsExcludeMe
        ? tagKind === "tribe"
          ? "No tribe data yet — add tribes to opponent decks."
          : "No archetype data yet — add archetypes to opponent decks."
        : tagKind === "tribe"
          ? "No tribe data yet — add tribes to your decks."
          : "No archetype data yet — add archetypes to your decks.";

      body = `
      ${subTabs(TOTALS_TABS, totalsTab, "totals-tab")}
      <div class="filters inline totals-filters archetype-toolbar">
        ${bracketFilterControl}
        ${renderArchetypeTribeToggle()}
        ${excludeMeControl}
        <button type="button" class="btn btn-ghost btn-sm" id="archetype-view-toggle">${archetypeViewLabel(archetypeView)}</button>
      </div>
      ${renderArchetypeStatsTable(archetypes, emptyMessage, {
        tagKind,
        scope: totalsExcludeMe ? "opponents" : "all",
      })}`;
    } else if (isSeatsTab) {
      const seatOptions = { excludeMySeat: totalsExcludeMe };
      const bounds = getSeatDateBounds(totalsGames, "total", seatOptions);
      const range = { start: bounds.min, end: bounds.max };
      const seatStats = computeSeatStats(totalsGames, "total", seatOptions);
      const seatChart = renderMultiWinRateLineChart(
        totalsSelectedSeats.map((seat) => ({
          id: seat,
          label: `Seat ${seat}`,
          color: SEAT_COLORS[seat],
          series: computeWinRateSeries(
            gamesForSeatSeries(totalsGames, seat, range.start, range.end, "total", seatOptions)
          ),
        })),
        range
      );

      body = `
      ${subTabs(TOTALS_TABS, totalsTab, "totals-tab")}
      <div class="filters inline totals-filters">
        ${bracketFilterControl}
        ${excludeMeControl}
      </div>
      <div class="seat-toggle-row seat-toggle-row--four">
        ${seatStats
          .map(
            (seat) => `
          <button type="button" class="seat-toggle ${totalsSelectedSeats.includes(seat.seat) ? "active" : ""}"
            data-totals-seat-toggle="${seat.seat}" style="--seat-color:${SEAT_COLORS[seat.seat]}">
            <div class="seat-toggle-header"><strong>${seat.label}</strong></div>
            <span>${seat.games}G · ${seat.wins}W · ${seat.games ? pctCell(seat.winRate) : "—"}</span>
          </button>`
          )
          .join("")}
      </div>
      ${renderChartSection(seatChart, "clear-totals-seats-chart")}`;
    } else if (isTurnsTab) {
      const turnRows = computeTurnDistributionStats(totalsGames, {
        decks: data.decks,
      });
      const turns = applySort(
        turnRows,
        tableSort["turn-stats"],
        {
          turn: (row) => row.turn,
          winRate: (row) => row.winRate ?? -1,
        },
        WINS_SORT_TIE_BREAKERS
      );
      const turnChart = renderTurnWinRateChart(turnRows, {
        gradientId: "totals-turn-wr-fill-gradient",
        mode: "distribution",
      });

      body = `
      ${subTabs(TOTALS_TABS, totalsTab, "totals-tab")}
      <div class="filters inline totals-filters">
        ${bracketFilterControl}
      </div>
      <table class="table compact sortable-table turn-stats-sort">
        <thead><tr>
          ${sortHeader("turn-stats", "turn", "Turn", tableSort["turn-stats"])}
          ${sortHeader("turn-stats", "winRate", "WR", tableSort["turn-stats"])}
        </tr></thead>
      </table>
      ${
        turnRows.length
          ? `${renderTurnDistributionGrid(turns)}
          ${turnChart}`
          : `<p class="muted">No turn data yet — add an end turn when logging games.</p>`
      }`;
    } else {
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
        bracket: (r) => r.bracket ?? null,
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

    const totalsSearchInput = `<input type="search" id="totals-search" class="input totals-search" placeholder="Search ${nameHeader.toLowerCase()}" value="${escapeHtml(totalsSearch)}" />`;

    const totalsToolbar = isColorTab
      ? `<div class="filters inline totals-filters totals-color-toolbar">
        ${bracketFilterControl}
        <button type="button" class="btn btn-ghost btn-sm" id="totals-color-view-toggle">${colorViewLabel(totalsColorView)}</button>
        <button type="button" class="btn btn-ghost btn-sm" id="totals-color-agg-toggle">${totalsColorAgg === "inclusive" ? "Inclusive" : "Exclusive"}</button>
        ${splitPartnersControl}
        ${excludeMeControl}
        ${totalsSearchInput}
      </div>`
      : `<div class="filters inline totals-filters">
        ${bracketFilterControl}
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
          ${isDeckTab ? sortHeader(tableId, "bracket", "Bracket", tableSort[tableId]) : ""}
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
                  ? `<td class="totals-name-col">${renderDeckReportLink(row.name, data.decks, { label: row.name })}</td><td class="totals-color-col"><span class="color-label">${colorBadge(row.colors || [])}</span></td><td>${row.bracket ?? "—"}</td>`
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

  return `<section class="section totals-page">${body}</section>`;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderDecksFilterToggles(isOpponentsPage = false) {
  const statusToggle = isOpponentsPage
    ? ""
    : `<button type="button" class="btn btn-ghost btn-sm stats-deck-filter-toggle" id="decks-status-filter-toggle">${statsDeckFilterLabel(decksTab)}</button>`;
  return `
    ${statusToggle}
    ${renderBracketFilterToggle("decks-bracket-filter-toggle", deckBracketFilter)}`;
}

function deckDateSortMode(sortState) {
  return sortState.col === "lastPlayed" ? "recent" : "added";
}

function deckDateColumnLabel(sortState) {
  return deckDateSortMode(sortState) === "recent" ? "Most Recent" : "Added";
}

function deckDateSortHeaderState(sortState) {
  if (sortState.col !== "createdAt" && sortState.col !== "lastPlayed") return null;
  return { col: "date", dir: sortState.dir };
}

/** @param {number | null | undefined} bracket */
function formatDeckBracket(bracket) {
  if (bracket == null) return "—";
  return Number.isInteger(bracket) ? String(bracket) : bracket.toFixed(1);
}

function renderDeckModal(editingDeck, editingOpponentDeck) {
  const createdAtValue = editingDeck?.createdAt
    ? normalizeDate(editingDeck.createdAt) || todayISO()
    : editingOpponentDeck?.createdAt
      ? normalizeDate(editingOpponentDeck.createdAt) || todayISO()
      : todayISO();
  const archetypes = editingDeck?.archetypes || editingOpponentDeck?.archetypes;
  const tribes = editingDeck?.tribes || editingOpponentDeck?.tribes;
  const showTribeField = deckHasTribalArchetype(archetypes);
  const bracket = editingDeck?.bracket ?? editingOpponentDeck?.bracket ?? 4;
  const colors = editingDeck
    ? getDeckColors(editingDeck)
    : editingOpponentDeck
      ? getOpponentDeckColors(editingOpponentDeck)
      : [];
  const retired = editingDeck?.retired;
  const commanderValue = editingDeck
    ? deckLabel(editingDeck)
    : editingOpponentDeck
      ? opponentDeckCommander(editingOpponentDeck)
      : "";
  const nameValue = editingDeck?.name || editingOpponentDeck?.name || "";
  const isOpponentEdit = !!editingOpponentDeck;

  return `
    <div id="deck-modal" class="modal${deckModalOpen ? "" : " hidden"}">
      <div class="modal-content modal-content-deck">
        <h3>${isOpponentEdit ? "Edit Opponent Deck" : editingDeck ? "Edit Deck" : "Add Deck"}</h3>
        <form id="deck-form" class="deck-form" novalidate>
          ${editingDeck ? `<input type="hidden" name="originalId" value="${escapeHtml(deckId(editingDeck))}" />` : ""}
          ${isOpponentEdit ? `<input type="hidden" name="opponentDeckId" value="${escapeHtml(editingOpponentDeck.id)}" />` : ""}
          ${
            isOpponentEdit
              ? `<label>Player<span class="deck-player-readonly">${escapeHtml(editingOpponentDeck.player || "—")}</span></label>`
              : ""
          }
          <label>Name<input name="name" placeholder="Optional deck name" value="${escapeHtml(nameValue)}" /></label>
          <label>Commander<input name="commander" value="${escapeHtml(commanderValue)}" /></label>
          <label>Created<input type="date" name="createdAt" value="${createdAtValue}" /></label>
          ${
            isOpponentEdit
              ? ""
              : `<label>Bracket<select name="bracket">${[1, 2, 3, 4, 5].map((b) => `<option value="${b}" ${bracket === b ? "selected" : ""}>${b}</option>`).join("")}</select></label>`
          }
          <label>Archetypes
            <div class="deck-archetype-wrap opponent-input-wrap">
              <textarea name="archetypes" class="deck-archetype-input opponent-input" rows="1" placeholder="Turbo, Storm, …" autocomplete="off">${escapeHtml(formatArchetypesForInput(archetypes))}</textarea>
              <ul class="opponent-suggestions deck-archetype-suggestions" hidden role="listbox"></ul>
            </div>
          </label>
          <label class="deck-tribe-field"${showTribeField ? "" : " hidden"}>Tribe
            <div class="deck-tribe-wrap opponent-input-wrap">
              <textarea name="tribes" class="deck-tribe-input opponent-input" rows="1" placeholder="Elf, Dragon, …" autocomplete="off">${escapeHtml(formatTribesForInput(tribes))}</textarea>
              <ul class="opponent-suggestions deck-tribe-suggestions" hidden role="listbox"></ul>
            </div>
          </label>
          <fieldset class="color-fieldset"><legend>Colors</legend>
            ${["W", "U", "B", "R", "G"].map((c) => `<label class="checkbox mana-check"><input type="checkbox" name="color" value="${c}" ${colors.includes(c) ? "checked" : ""} />${colorBadge([c])}</label>`).join("")}
          </fieldset>
          ${isOpponentEdit ? "" : `<label class="checkbox"><input type="checkbox" name="retired" ${retired ? "checked" : ""} /> Retired</label>`}
          <div class="form-actions${editingDeck && !isOpponentEdit ? " form-actions--split" : ""}">
            ${editingDeck && !isOpponentEdit ? `<button type="button" class="btn btn-danger" id="delete-deck-modal">Delete</button>` : ""}
            <button type="button" class="btn btn-primary" id="save-deck-btn">${editingDeck || isOpponentEdit ? "Save" : "Add Deck"}</button>
          </div>
        </form>
      </div>
    </div>`;
}

function renderDecks() {
  const isOpponentsPage = decksPageTab === "opponents";
  const sortTableId = isOpponentsPage ? "opponent-decks-main" : "decks-main";
  const sortState = tableSort[sortTableId] || {
    col: isOpponentsPage ? "lastPlayed" : "name",
    dir: isOpponentsPage ? "desc" : "asc",
  };

  let list = isOpponentsPage
    ? computeOpponentDeckStats(data.games, ensureOpponentDecks(data), data.decks)
    : getStats().deckStats;

  if (!isOpponentsPage) {
    if (decksTab === "active") list = list.filter((d) => !d.retired);
    else if (decksTab === "retired") list = list.filter((d) => d.retired);
  }
  if (deckBracketFilter) list = list.filter((d) => String(d.bracket) === deckBracketFilter);

  const opponentPlayerQuery = decksOpponentPlayerSearch.trim().toLowerCase();
  const opponentCommanderQuery = decksOpponentCommanderSearch.trim().toLowerCase();
  const deckSearchQuery = decksDeckSearch.trim().toLowerCase();

  if (isOpponentsPage) {
    list = list.filter(
      (d) =>
        matchupTextIncludes(d.player, opponentPlayerQuery) &&
        opponentDeckRowMatchesCommanderSearch(d, opponentCommanderQuery) &&
        opponentDeckRowMatchesDeckSearch(d, deckSearchQuery)
    );
  } else {
    list = list.filter((d) => myDeckRowMatchesDeckSearch(d, deckSearchQuery));
  }

  list = sortDeckList(list, sortState.col, sortState.dir);

  const showLastPlayed = deckDateSortMode(sortState) === "recent";
  const dateColLabel = deckDateColumnLabel(sortState);
  const dateSortHeaderState = deckDateSortHeaderState(sortState);
  const dateCell = (d) =>
    showLastPlayed ? (d.lastPlayed ? formatDate(d.lastPlayed) : "—") : formatDate(d.createdAt);

  const editingDeck = editingDeckName ? findEditingDeck() : null;
  const editingOpponentDeck = findEditingOpponentDeck();
  const pageTabs = DECKS_PAGE_TABS.map(
    (tab) =>
      `<button type="button" role="tab" aria-selected="${decksPageTab === tab.id}" class="folder-tab ${decksPageTab === tab.id ? "active" : ""}" data-decks-page-tab="${tab.id}">${tab.label}</button>`
  ).join("");

  const decksTabSearches = `
      <div class="decks-tab-searches matchup-search-group">
        ${
          isOpponentsPage
            ? `<input type="search" id="decks-opponent-player-search" class="input matchup-search" placeholder="Search opponents" value="${escapeHtml(decksOpponentPlayerSearch)}" />
            <input type="search" id="decks-opponent-commander-search" class="input matchup-search" placeholder="Search commanders" value="${escapeHtml(decksOpponentCommanderSearch)}" />
            <input type="search" id="decks-deck-search" class="input matchup-search" placeholder="Search decks" value="${escapeHtml(decksDeckSearch)}" />`
            : `<input type="search" id="decks-deck-search" class="input matchup-search" placeholder="Search decks" value="${escapeHtml(decksDeckSearch)}" />`
        }
      </div>`;

  const tableBody = isOpponentsPage
    ? list.length
      ? list
          .map(
            (d) => `
            <tr>
              <td class="deck-date">${dateCell(d)}</td>
              <td class="deck-player">${d.player ? renderPlayerReportLink(d.player) : "—"}</td>
              <td class="deck-name">${renderDeckReportLink(opponentDeckCommander(d), data.decks, {
                label: opponentDeckTitle(d),
                playerScope: d.player,
                opponentDeckId: d.id,
              })}</td>
              <td class="deck-colors">${colorBadge(getOpponentDeckColors(d))}</td>
              <td class="deck-tight">${formatDeckBracket(d.bracket)}</td>
              <td class="deck-tight">${d.games}</td>
              <td class="deck-tight">${d.wins}</td>
              <td class="deck-stat">${d.games ? pctCell(d.winRate) : "—"}</td>
              <td class="deck-stat">${d.games ? pctCell(d.normalizedWr) : "—"}</td>
              <td class="row-actions"><button type="button" class="btn-icon edit-opponent-deck" data-opponent-deck-id="${escapeHtml(d.id)}" title="Edit opponent deck">✎</button></td>
            </tr>`
          )
          .join("")
      : `<tr><td colspan="10"></td></tr>`
    : list.length
      ? list
          .map(
            (d) => `
            <tr>
              <td class="deck-date">${dateCell(d)}</td>
              <td class="deck-name">${renderDeckReportLink(deckCommander(d), data.decks, { label: deckTitle(d), deckSlotId: deckId(d) })}</td>
              <td class="deck-colors">${colorBadge(getDeckColors(d))}</td>
              <td class="deck-tight">${d.bracket}</td>
              <td class="deck-tight">${d.games}</td>
              <td class="deck-tight">${d.wins}</td>
              <td class="deck-stat">${d.games ? pctCell(d.winRate) : "—"}</td>
              <td class="deck-stat">${d.games ? pctCell(d.normalizedWr) : "—"}</td>
              <td class="row-actions"><button type="button" class="btn-icon edit-deck" data-name="${escapeHtml(deckId(d) || deckKey(d))}" title="Edit deck">✎</button></td>
            </tr>`
          )
          .join("")
      : `<tr><td colspan="9"></td></tr>`;

  const opponentHeaders = `
            ${sortHeader(sortTableId, "date", dateColLabel, dateSortHeaderState, "deck-date-col")}
            <th class="deck-player-col">Player</th>
            ${sortHeader(sortTableId, "name", "Deck", sortState, "deck-name-col")}
            ${sortHeader(sortTableId, "colors", "Color Identity", sortState, "deck-colors-col")}
            ${sortHeader(sortTableId, "bracket", "Bracket", sortState, "deck-tight-col")}
            ${sortHeader(sortTableId, "games", "Games", sortState, "deck-tight-col")}
            ${sortHeader(sortTableId, "wins", "Wins", sortState, "deck-tight-col")}
            ${sortHeader(sortTableId, "winRate", "Win Rate", sortState, "deck-stat-col")}
            ${sortHeader(sortTableId, "normWr", "Norm WR", sortState, "deck-stat-col")}
            <th class="row-actions-col"></th>`;

  const mineHeaders = `
            ${sortHeader(sortTableId, "date", dateColLabel, dateSortHeaderState, "deck-date-col")}
            ${sortHeader(sortTableId, "name", "Deck", sortState, "deck-name-col")}
            ${sortHeader(sortTableId, "colors", "Color Identity", sortState, "deck-colors-col")}
            ${sortHeader(sortTableId, "bracket", "Bracket", sortState, "deck-tight-col")}
            ${sortHeader(sortTableId, "games", "Games", sortState, "deck-tight-col")}
            ${sortHeader(sortTableId, "wins", "Wins", sortState, "deck-tight-col")}
            ${sortHeader(sortTableId, "winRate", "Win Rate", sortState, "deck-stat-col")}
            ${sortHeader(sortTableId, "normWr", "Norm WR", sortState, "deck-stat-col")}
            <th class="row-actions-col"></th>`;

  return `
    <div class="decks-page">
      <div class="folder-tabs-row">
        <div class="folder-tabs" role="tablist">${pageTabs}</div>
        ${decksTabSearches}
      </div>
      <section class="section decks-page-panel">
        <div class="section-header">
          <div class="filters inline stats-range-toolbar">
            ${renderDecksFilterToggles(isOpponentsPage)}
          </div>
          ${isOpponentsPage ? "" : `<button type="button" class="btn btn-primary btn-sm" id="add-deck-btn">+ Deck</button>`}
        </div>
        <div class="table-wrap">
          <table class="table sortable-table decks-table${isOpponentsPage ? " decks-table-opponents" : ""}">
            ${
              isOpponentsPage
                ? `<colgroup>
            <col class="decks-col-date" />
            <col class="decks-col-player" />
            <col class="decks-col-name" />
            <col class="decks-col-colors" />
            <col class="decks-col-bracket" />
            <col class="decks-col-games" />
            <col class="decks-col-wins" />
            <col class="decks-col-stat" />
            <col class="decks-col-stat" />
            <col class="decks-col-actions" />
          </colgroup>`
                : `<colgroup>
            <col class="decks-col-date" />
            <col class="decks-col-name" />
            <col class="decks-col-colors" />
            <col class="decks-col-bracket" />
            <col class="decks-col-games" />
            <col class="decks-col-wins" />
            <col class="decks-col-stat" />
            <col class="decks-col-stat" />
            <col class="decks-col-actions" />
          </colgroup>`
            }
            <thead><tr>${isOpponentsPage ? opponentHeaders : mineHeaders}</tr></thead>
            <tbody>${tableBody}</tbody>
          </table>
        </div>
      </section>
    </div>
    ${renderDeckModal(editingDeck, editingOpponentDeck)}`;
}

function filterLogGames(games) {
  const { deck, bracket, result, year } = logFilters;
  const deckMap = deckMapByKey(data.decks);
  return games.filter((game) => {
    if (deck && game.deck !== deck) return false;
    if (bracket && String(gameBracket(game, deckMap)) !== String(bracket)) return false;
    if (result && game.result !== result) return false;
    if (year && gameYear(game.date) !== year) return false;
    return true;
  });
}

function renderGameLogViewToggle() {
  return `
          <div class="game-log-view-toggle" role="group" aria-label="Games view">
            <button type="button" class="game-log-view-btn ${gamesViewMode === "list" ? "active" : ""}" id="game-log-view-list" aria-label="List view" aria-pressed="${gamesViewMode === "list"}">
              <span class="game-log-view-icon game-log-view-icon-list" aria-hidden="true"><span></span><span></span></span>
            </button>
            <button type="button" class="game-log-view-btn ${gamesViewMode === "grid" ? "active" : ""}" id="game-log-view-grid" aria-label="Grid view" aria-pressed="${gamesViewMode === "grid"}">
              <span class="game-log-view-icon game-log-view-icon-grid" aria-hidden="true"><span></span><span></span><span></span><span></span></span>
            </button>
          </div>`;
}

function renderGameLogTableHead(sort) {
  return `
            ${sortHeader("game-log", "date", "Date", sort)}
            ${sortHeader("game-log", "deck", "Deck", sort)}
            ${sortHeader("game-log", "bracket", "Bracket", sort)}
            ${sortHeader("game-log", "mySeat", "Seat", sort)}
            ${sortHeader("game-log", "turn", "End Turn", sort)}
            ${sortHeader("game-log", "result", "Result", sort)}
            <th class="row-actions-col"></th>`;
}

function renderGameLogTable(games, sort) {
  return `
      <div class="table-wrap">
        <table class="table sortable-table" id="game-log-table">
          <thead><tr>${renderGameLogTableHead(sort)}</tr></thead>
          <tbody>${games.map((g) => gameRow(g)).join("")}</tbody>
        </table>
      </div>`;
}

function renderGameLogBody(games, sort) {
  if (gamesViewMode === "grid") {
    const podGames = games.filter(gameHasPodDetail);
    const simpleGames = games.filter((game) => !gameHasPodDetail(game));
    const podGrid = podGames.length
      ? `<div class="entity-game-pod-list game-log-pod-list">${podGames.map((game) => renderGameLogPodCard(game, data.decks)).join("")}</div>`
      : "";
    const simpleList = simpleGames.length
      ? `<div class="game-log-simple-list">${renderGameLogTable(simpleGames, sort)}</div>`
      : "";
    return `${podGrid}${simpleList}`;
  }

  return renderGameLogTable(games, sort);
}

function renderGames() {
  let games = filterLogGames([...data.games]);
  games = applySort(games, tableSort["game-log"], {
    date: (g) => gameSortKey(g),
    deck: (g) => g.deck,
    bracket: (g) => gameBracket(g, new Map(data.decks.map((d) => [deckId(d), d]))),
    mySeat: (g) => g.mySeat || 0,
    turn: (g) => (Number(g.turn) > 0 ? Number(g.turn) : null),
    result: (g) => (g.result === "Win" ? 1 : 0),
  });

  const decks = [...data.decks]
    .sort((a, b) => deckTitle(a).localeCompare(deckTitle(b)))
    .map((d) => deckId(d));
  const years = [...new Set(data.games.map((g) => gameYear(g.date)))].sort();
  const sort = tableSort["game-log"];
  const editing = editingGameId ? data.games.find((g) => g.id === editingGameId) : null;
  const viewing = viewingGameId ? data.games.find((g) => g.id === viewingGameId) : null;

  return `
    <section class="section">
      <div class="section-header">
        <div class="filters inline game-log-filters">
          ${renderGameLogViewToggle()}
          <label class="game-log-filter-deck">Deck<select id="filter-deck" class="game-log-filter-deck-select"><option value="">All</option>${decks.map((d) => `<option value="${escapeHtml(d)}" ${logFilters.deck === d ? "selected" : ""}>${escapeHtml(deckTitleForKey(d, data.decks))}</option>`).join("")}</select></label>
          <label>Bracket<select id="filter-bracket"><option value="">All</option>${[1, 2, 3, 4, 5]
            .map(
              (b) =>
                `<option value="${b}" ${String(logFilters.bracket) === String(b) ? "selected" : ""}>${b}</option>`
            )
            .join("")}</select></label>
          <label>Result<select id="filter-result"><option value="">All</option><option value="Win" ${logFilters.result === "Win" ? "selected" : ""}>Wins</option><option value="Loss" ${logFilters.result === "Loss" ? "selected" : ""}>Losses</option></select></label>
          <label>Year<select id="filter-year"><option value="">All</option>${years.map((y) => `<option value="${y}" ${logFilters.year === y ? "selected" : ""}>${y}</option>`).join("")}</select></label>
          <span class="filter-count" id="filter-count">${games.length} games</span>
        </div>
        <button type="button" class="btn btn-primary" id="add-game-btn">+ Game</button>
      </div>
      ${renderGameLogBody(games, sort)}
    </section>
    <div id="game-modal" class="modal ${gameModalOpen ? "" : "hidden"}">
      <div class="modal-content modal-content-wide">
        <h3>${editing ? "Edit Game" : "Log Game"}</h3>
        ${renderLogForm()}
      </div>
    </div>
    <div id="game-detail-modal" class="modal ${viewing ? "" : "hidden"}">
      <div class="modal-content modal-content-wide modal-content-game-detail">
        <div class="game-detail-header">
          <h3 class="game-detail-title">Game Details</h3>
          ${viewing ? renderGameDetailNav(viewing.id) : ""}
        </div>
        ${viewing ? renderGameDetail(viewing) : ""}
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

function opponentName(game, slot) {
  if (!game) return "";
  if (gameHasMySeat(game)) {
    if (Number(game.mySeat) === slot) return "";
    return opponentEntryForPodSlot(game, slot)?.name || "";
  }
  return game.opponents?.[slot - 1]?.name || "";
}

function playerName(game, slot) {
  if (!game) return "";
  if (gameHasMySeat(game)) {
    if (Number(game.mySeat) === slot) return game.myPlayer || "";
    return opponentEntryForPodSlot(game, slot)?.player || "";
  }
  return game.opponents?.[slot - 1]?.player || "";
}

function readPodSlot(form, slot) {
  return {
    player: String(form.querySelector(`[name="player-${slot}"]`)?.value || "").trim(),
    commander: String(form.querySelector(`[name="opponent-${slot}"]`)?.value || "").trim(),
  };
}

function writePodSlot(form, slot, { player, commander }) {
  const playerInput = form.querySelector(`[name="player-${slot}"]`);
  const commanderInput = form.querySelector(`[name="opponent-${slot}"]`);
  if (playerInput) playerInput.value = player;
  if (commanderInput) commanderInput.value = commander;
}

function clearPodSlot(form, slot) {
  writePodSlot(form, slot, { player: "", commander: "" });
}

function collectPodEntries(form, mySeat) {
  const entries = [];
  for (const slot of podFormSlots(mySeat)) {
    if (mySeat && slot === mySeat) continue;
    const entry = readPodSlot(form, slot);
    if (entry.player || entry.commander) entries.push(entry);
  }
  return entries;
}

function remapPodFormSeats(form, prevMySeat, nextMySeat) {
  const entries = collectPodEntries(form, prevMySeat);
  for (let slot = 1; slot <= 4; slot += 1) clearPodSlot(form, slot);

  if (nextMySeat) {
    const targets = nonMySeatNumbers(nextMySeat);
    entries.forEach((entry, index) => {
      if (targets[index]) writePodSlot(form, targets[index], entry);
    });
    return;
  }

  entries.forEach((entry, index) => {
    if (index < 3) writePodSlot(form, index + 1, entry);
  });
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

function getFilteredSortedGames() {
  let games = [...data.games];
  games = applySort(games, tableSort["game-log"], {
    date: (g) => gameSortKey(g),
    deck: (g) => g.deck,
    bracket: (g) => gameBracket(g, deckMapByKey(data.decks)),
    mySeat: (g) => g.mySeat || 0,
    turn: (g) => (Number(g.turn) > 0 ? Number(g.turn) : null),
    result: (g) => (g.result === "Win" ? 1 : 0),
  });
  const { deck, bracket, result, year } = logFilters;
  const deckMap = deckMapByKey(data.decks);
  return games.filter((game) => {
    if (deck && game.deck !== deck) return false;
    if (bracket && String(gameBracket(game, deckMap)) !== String(bracket)) return false;
    if (result && game.result !== result) return false;
    if (year && gameYear(game.date) !== year) return false;
    return true;
  });
}

function gameDetailNeighbors(gameId) {
  const games = getFilteredSortedGames();
  const index = games.findIndex((game) => game.id === gameId);
  return {
    prev: index > 0 ? games[index - 1].id : null,
    next: index >= 0 && index < games.length - 1 ? games[index + 1].id : null,
    index,
    total: games.length,
  };
}

function renderGameDetailNav(gameId) {
  const { prev, next, index, total } = gameDetailNeighbors(gameId);
  const position = index >= 0 ? `${index + 1} / ${total}` : "";
  return `
    <div class="game-detail-nav">
      <button type="button" class="btn btn-ghost game-detail-step" id="game-detail-prev" ${prev ? `data-id="${escapeHtml(prev)}"` : "disabled"} aria-label="Previous game">←</button>
      <span class="game-detail-position">${position}</span>
      <button type="button" class="btn btn-ghost game-detail-step" id="game-detail-next" ${next ? `data-id="${escapeHtml(next)}"` : "disabled"} aria-label="Next game">→</button>
    </div>`;
}

function renderGameDetail(game) {
  const bracket = gameBracket(game, deckMapByKey(data.decks));
  const turn = Number(game.turn) > 0 ? String(game.turn) : "—";
  const mySeat = Number(game.mySeat) || 0;
  const hasPodPlayers = gameHasPodDetail(game);
  const podSlots = podFormSlots(mySeat);
  const myCommander = resolveMyCommander(game, data.decks);
  const myPodRow =
    hasPodPlayers && !gameHasMySeat(game)
      ? `
          <div class="pod-seat-row ${podRowOutcomeClass(game, 0, mySeat, true)}">
            <label class="pod-player">Player w${fieldValueLink(MY_PLAYER_NAME)}</label>
            <label class="pod-commander">Commander w<span class="field-value">${renderDeckReportLink(myCommander, data.decks, { label: myCommander, playerScope: MY_PLAYER_NAME, deckSlotId: game.deck })}</span></label>
          </div>`
      : "";
  const opponentRows = podSlots
    .map(
      (seat) => `
          <div class="pod-seat-row ${podRowOutcomeClass(game, seat, mySeat, false)}">
            <label class="pod-player">${podSlotPlayerLabel(seat, mySeat)}${fieldValueLink(podPlayerName(game, seat))}</label>
            <label class="pod-commander">${podSlotCommanderLabel(seat, mySeat)}${fieldValueLink(podCommanderName(game, seat), "deck", game, seat)}</label>
          </div>`
    )
    .join("");
  const podSection = hasPodPlayers
    ? `
      <fieldset class="pod-fieldset">
        <legend>Pod</legend>
        ${myPodRow}${opponentRows}
      </fieldset>`
    : "";
  const isWin = game.result === "Win";
  const resultSection = hasPodPlayers
    ? podSection
    : `<div class="game-detail-result ${isWin ? "game-detail-result-win" : "game-detail-result-loss"}">${isWin ? "Win" : "Loss"}</div>`;
  return `
    <div class="game-form game-form-readonly game-detail-view">
      <div class="game-form-row game-form-row-split">
        <label>Date${fieldValue(formatDate(game.date))}</label>
        <label>Time${fieldValue(game.time)}</label>
      </div>
      <div class="game-form-row game-form-row-split">
        <label>Bracket${fieldValue(bracket)}</label>
        <label>Turn Ended${fieldValue(turn)}</label>
      </div>
      ${resultSection}
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

function renderPodSeatRow(seat, formMySeat, editing) {
  const slotKey = podRowWinnerKey(seat, formMySeat, false);
  const selected =
    editing?.result === "Loss" && opponentWinnerPodSlot(editing) === slotKey;
  return `
          <div class="pod-seat-row" data-opponent-seat="${seat}">
            <div class="pod-seat-headers">
              <div class="pod-player-header">
                <span class="pod-field-label pod-player-label" data-pod-player-label>${podSlotPlayerLabel(seat, formMySeat)}</span>
                <label class="pod-winner-btn-wrap">
                  <input type="radio" name="winnerPodSlot" value="${escapeHtml(slotKey)}" ${selected ? "checked" : ""} />
                  <span class="btn btn-ghost pod-winner-btn">Mark as winner</span>
                </label>
              </div>
              <span class="pod-field-label pod-commander-label" data-pod-commander-label>${podSlotCommanderLabel(seat, formMySeat)}</span>
            </div>
            <div class="pod-seat-fields">
              <label class="pod-player">
                <div class="opponent-input-wrap">
                  <input type="text" class="player-input" name="player-${seat}" value="${escapeHtml(playerName(editing, seat))}" placeholder="Player name" autocomplete="off" />
                  <ul class="opponent-suggestions" hidden role="listbox"></ul>
                </div>
              </label>
              <label class="pod-commander">
                <div class="opponent-input-wrap">
                  <input type="text" class="opponent-input" name="opponent-${seat}" value="${escapeHtml(opponentName(editing, seat))}" placeholder="Commander name" autocomplete="off" />
                  <ul class="opponent-suggestions" hidden role="listbox"></ul>
                </div>
              </label>
            </div>
          </div>`;
}

function renderLogForm() {
  const { deckStats } = getStats();
  const editing = editingGameId ? data.games.find((g) => g.id === editingGameId) : null;
  const deckPool = editing ? deckStats : deckStats.filter((d) => !d.retired);
  const decks = sortDeckList(deckPool, "recent", "desc");
  const quickDecks = recentDecksPlayed(deckStats, 5);
  const today = todayISO();
  const dateVal = editing?.date || today;
  const timeVal = editing?.time ?? (editing ? "" : nowTime());
  const resultWin = !editing || editing.result === "Win";
  const resultLoss = editing?.result === "Loss";
  const bracketVal =
    editing?.bracket ?? (editing?.deck ? deckBracketValue(editing.deck) : "");
  const formMySeat = editing?.mySeat ? Number(editing.mySeat) : 0;

  return `
    <form id="add-game-form" class="game-form" data-prev-my-seat="${formMySeat}">
      ${editing ? `<input type="hidden" name="gameId" value="${escapeHtml(editing.id)}" />` : ""}
      <div class="game-form-row game-form-row-split">
        <label>Date<input type="date" name="date" value="${dateVal}" required /></label>
        <label>Time<input type="time" name="time" value="${escapeHtml(timeVal)}" /></label>
      </div>
      <div class="game-form-row game-form-row-split">
        <label class="game-form-deck-label">My deck
          <div class="game-deck-select">
            <select name="deck" class="game-deck-select-native" required><option value="">Select…</option>${decks
        .map(
          (d) =>
            `<option value="${escapeHtml(deckId(d))}" data-bracket="${d.bracket}" ${editing?.deck === deckId(d) ? "selected" : ""}>${escapeHtml(deckTitle(d))}</option>`
        )
        .join("")}</select>
            <button type="button" class="game-deck-select-trigger" aria-haspopup="listbox" aria-expanded="false">
              <span class="game-deck-select-value">Select…</span>
            </button>
            <ul class="game-deck-select-menu" role="listbox" hidden></ul>
          </div>
        </label>
        <label>My seat<select name="mySeat"><option value="">—</option>${seatOptions(editing?.mySeat)}</select></label>
      </div>
      <div class="game-form-row game-form-row-split">
        <label>Bracket<select name="bracket"><option value="" ${!bracketVal ? "selected" : ""}>—</option>${[
          1, 2, 3, 4, 5,
        ]
          .map(
            (b) =>
              `<option value="${b}" ${String(bracketVal) === String(b) ? "selected" : ""}>${b}</option>`
          )
          .join("")}</select></label>
        <label>Turn ended<input type="number" name="turn" min="0" step="1" placeholder="Optional (blank or 0 = none)" value="${editing?.turn ?? ""}" /></label>
      </div>
      <fieldset class="pod-fieldset">
        <legend>Pod</legend>
        ${[1, 2, 3, 4]
          .map((seat) => renderPodSeatRow(seat, formMySeat, editing))
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
        <button type="button" class="btn btn-primary btn-lg" id="save-game-btn">${editing ? "Save" : "Save Game"}</button>
      </div>
    </form>
    <div class="quick-log">
      <h3>Quick fill</h3>
      <div class="quick-grid">
        ${quickDecks
          .map(
            (d) => `
          <div class="quick-deck">
            <span class="quick-name">${colorBadge(getDeckColors(d))} ${escapeHtml(deckTitle(d))}</span>
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
  const bracket = gameBracket(g, new Map(data.decks.map((d) => [deckId(d), d])));
  return `<tr data-deck="${escapeHtml(g.deck)}" data-bracket="${bracket}" data-result="${g.result}" data-year="${gameYear(g.date)}">
    <td><button type="button" class="link-btn view-game" data-id="${g.id}">${formatDate(g.date)}</button></td><td class="deck-name">${deckLink}</td>
    <td>${bracket}</td><td>${g.mySeat || "—"}</td><td>${g.turn || "—"}</td>
    <td><span class="result-pill ${cls}">${g.result}</span></td>
    <td class="row-actions">
      <button type="button" class="btn-icon edit-game" data-id="${g.id}" title="Edit game">✎</button>
    </td></tr>`;
}

function parseGameForm(fd) {
  const mySeatRaw = fd.get("mySeat");
  const mySeat = mySeatRaw ? Number(mySeatRaw) : 0;
  const opponents = podFormSlots(mySeat).flatMap((slot) => {
    if (mySeat && slot === mySeat) return [];
    const name = String(fd.get(`opponent-${slot}`) || "").trim();
    const player = String(fd.get(`player-${slot}`) || "").trim();
    if (!name && !player) return [];
    if (mySeat) return [{ seat: slot, name, ...(player ? { player } : {}) }];
    return [{ name, ...(player ? { player } : {}) }];
  });
  const winnerPodSlotRaw = fd.get("winnerPodSlot");
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
    const myPlayer = String(fd.get(`player-${mySeat}`) || "").trim();
    if (myPlayer) game.myPlayer = myPlayer;
  }
  game.opponents = opponents;
  game.result = fd.get("result") === "Loss" ? "Loss" : "Win";
  if (game.result === "Loss" && winnerPodSlotRaw) {
    game.winnerPodSlot = String(winnerPodSlotRaw);
  }
  if (turnRaw !== null && String(turnRaw).trim() !== "") {
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

/** @param {ReturnType<typeof parseGameForm>} payload @param {string} gameId @param {object} [existing] */
function buildGameRecordFromPayload(payload, gameId, existing = null) {
  applyGameCommanderSnapshot(payload, existing);
  const record = {
    id: gameId,
    date: payload.date,
    deck: payload.deck,
    result: payload.result,
    source: "local",
  };
  if (payload.myCommander) record.myCommander = payload.myCommander;
  if (payload.mySeat) {
    record.mySeat = payload.mySeat;
    if (payload.myPlayer) record.myPlayer = payload.myPlayer;
  }
  if (payload.opponents !== undefined) record.opponents = payload.opponents;
  if (payload.winnerPodSlot) record.winnerPodSlot = payload.winnerPodSlot;
  if (payload.turn) record.turn = payload.turn;
  if (payload.time) record.time = payload.time;
  if (payload.bracket) record.bracket = payload.bracket;
  return record;
}

function saveGameFromForm(fd) {
  if (gameSaveInFlight) return;
  const payload = parseGameForm(fd);
  if (!payload.deck) return toast("Pick a deck", true);

  const gameId = String(fd.get("gameId") || editingGameId || "").trim();
  gameSaveInFlight = true;

  if (gameId) {
    const idx = data.games.findIndex((g) => g.id === gameId);
    if (idx < 0) {
      gameSaveInFlight = false;
      return toast("Game not found", true);
    }
    const record = buildGameRecordFromPayload(payload, gameId, data.games[idx]);
    linkGameOpponentsToDecks(record, ensureOpponentDecks(data));
    data.games[idx] = record;
  } else {
    const newId = nextGameId(data.games);
    const record = buildGameRecordFromPayload(payload, newId);
    linkGameOpponentsToDecks(record, ensureOpponentDecks(data));
    data.games.push(record);
  }

  syncOpponentDecksFromGames(data);

  if (!saveData(data)) {
    if (!gameId) data.games.pop();
    gameSaveInFlight = false;
    toast("Failed to save game — storage may be full", true);
    return;
  }

  editingGameId = null;
  gameModalOpen = false;
  if (!isDataFileConnected()) {
    downloadDataBackup(data);
  }
  toast(gameId ? "Game saved" : `${payload.result} logged`);
  render();
  gameSaveInFlight = false;
  void refreshCommanderColorCache();
}

function fillLogForm({ deck, result }) {
  editingGameId = null;
  const form = document.getElementById("add-game-form");
  if (!form) return;
  const deckSelect = form.querySelector('[name="deck"]');
  const resultInput = form.querySelector(`[name="result"][value="${result}"]`);
  if (deckSelect) deckSelect.value = deck;
  refreshGameDeckSelect(form);
  syncBracketFromDeck();
  if (resultInput) resultInput.checked = true;
  if (result === "Win") clearWinnerPodSlotToggles(form);
  form.querySelector('[name="date"]')?.focus();
  syncPodFormSeats();
}

function clearWinnerPodSlotToggles(form) {
  form.querySelectorAll('[name="winnerPodSlot"]').forEach((input) => {
    input.checked = false;
  });
}

function syncResultFromWinnerToggle() {
  const form = document.getElementById("add-game-form");
  if (!form) return;
  const checked = form.querySelector('[name="winnerPodSlot"]:checked');
  const lossInput = form.querySelector('[name="result"][value="Loss"]');
  const winInput = form.querySelector('[name="result"][value="Win"]');
  if (checked && lossInput) {
    lossInput.checked = true;
    if (winInput) winInput.checked = false;
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
  if (fieldset) fieldset.hidden = false;
  form.dataset.prevMySeat = String(mySeat);

  form.querySelectorAll("[data-opponent-seat]").forEach((row) => {
    const seat = Number(row.dataset.opponentSeat);
    const isMySeat = mySeat > 0 && seat === mySeat;
    const isExtraOpponentSlot = mySeat === 0 && seat === 4;
    row.hidden = isMySeat || isExtraOpponentSlot;
    const playerLabel = row.querySelector("[data-pod-player-label]");
    const commanderLabel = row.querySelector("[data-pod-commander-label]");
    if (playerLabel) playerLabel.textContent = podSlotPlayerLabel(seat, mySeat);
    if (commanderLabel) commanderLabel.textContent = podSlotCommanderLabel(seat, mySeat);
  });
}

function refreshGameDeckSelect(form) {
  const wrap = form?.querySelector(".game-deck-select");
  const select = wrap?.querySelector(".game-deck-select-native");
  const valueEl = wrap?.querySelector(".game-deck-select-value");
  if (!select || !valueEl) return;
  const opt = select.selectedOptions[0];
  valueEl.textContent = opt?.textContent?.trim() || "Select…";
}

function bindGameDeckSelect(form) {
  const wrap = form?.querySelector(".game-deck-select");
  if (!wrap || wrap.dataset.bound) return;
  wrap.dataset.bound = "1";

  const select = wrap.querySelector(".game-deck-select-native");
  const trigger = wrap.querySelector(".game-deck-select-trigger");
  const menu = wrap.querySelector(".game-deck-select-menu");
  if (!select || !trigger || !menu) return;

  function closeMenu() {
    menu.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
  }

  function openMenu() {
    menu.innerHTML = "";
    for (const opt of select.options) {
      const item = document.createElement("li");
      item.setAttribute("role", "option");
      item.dataset.value = opt.value;
      item.textContent = opt.textContent;
      if (opt.selected) item.setAttribute("aria-selected", "true");
      menu.appendChild(item);
    }
    menu.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
  }

  trigger.addEventListener("click", (e) => {
    e.preventDefault();
    if (menu.hidden) openMenu();
    else closeMenu();
  });

  menu.addEventListener("click", (e) => {
    const item = e.target.closest('[role="option"]');
    if (!item) return;
    select.value = item.dataset.value;
    refreshGameDeckSelect(form);
    closeMenu();
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });

  document.addEventListener("click", (e) => {
    if (!wrap.contains(e.target)) closeMenu();
  });

  refreshGameDeckSelect(form);
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
