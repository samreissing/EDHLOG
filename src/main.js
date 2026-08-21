import {
  initData,
  saveData,
  exportData,
  importData,
  resetToSeed,
  nextGameId,
  getLastSeedSync,
  shouldShowRecoveryBanner,
  dismissRecoveryBanner,
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
import { formatDate, gameSortKey, gameYear, normalizeTime, nowTime, todayISO, compareGamesChronologically } from "./dates.js";
import { pctCell, valueCell, colorStatAverage } from "./wr-color.js";
import { sortHeader, applySort, toggleSort } from "./table.js";
import {
  getBracketColor,
  renderPieChart,
  pieSlicesFromRows,
  bindPieCharts,
} from "./pie-chart.js";
import {
  computeColorStatsAdvanced,
  colorColumnSortLabel,
  colorViewLabel,
} from "./color-stats.js";
import { renderDeckDetail } from "./deck-detail.js";
import { importDeckFromUrl } from "./deck-import.js";
import { loadImagesIntoDeckDetail } from "./scryfall.js";
import { bindPodAutocomplete, MY_PLAYER_NAME } from "./opponent-search.js";
import { bindModalBackdropDismiss } from "./modals.js";
import {
  computeAllMatchups,
  formatMatchupImpact,
  matchupImpactClass,
  MATCHUP_TABS,
} from "./matchups.js";

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
  { id: "matchups", label: "Matchups" },
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
let matchupTab = "players";
let decksTab = "active";
let gameModalOpen = false;
let viewingGameId = null;
let editingGameId = null;
let editingDeckName = null;
let selectedDeckName = null;
let deckSort = "normWr";
let deckSortDir = "desc";
let deckBracketFilter = "";
let logFilters = { deck: "", result: "", year: "" };
let colorView = "wubrgc";
let colorAgg = "inclusive";
let colorSortOrder = "wubrgc";
let pieAnimKey = 0;
let tableSort = {
  "color-stats": { col: "colorOrder", dir: "asc" },
  "bracket-stats": { col: "bracket", dir: "asc" },
  "trends-windows": { col: "rangeStart", dir: "asc" },
  "trends-cumulative": { col: "games", dir: "asc" },
  "decks-main": { col: "normWr", dir: "desc" },
  "game-log": { col: "date", dir: "desc" },
  matchups: { col: "normalizedMatchupImpact", dir: "desc" },
};

async function boot() {
  data = await initData();
  const sync = getLastSeedSync();
  bindEvents();
  bindModalBackdropDismiss({
    deck: () => {
      editingDeckName = null;
      document.getElementById("deck-modal")?.classList.add("hidden");
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
  });
  renderNav();
  render();
  renderRecoveryBanner();
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
  document.getElementById("nav").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-view]");
    if (!btn) return;
    currentView = btn.dataset.view;
    if (currentView === "games") {
      gameModalOpen = false;
      editingGameId = null;
      viewingGameId = null;
    }
    if (currentView !== "decks") {
      selectedDeckName = null;
      editingDeckName = null;
    }
    renderNav();
    render();
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
      if (tableId === "color-stats" || tableId === "bracket-stats") pieAnimKey++;
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
      colorView = colorView === "wubrgc" ? "all" : "wubrgc";
      pieAnimKey++;
      render();
      return;
    }

    if (e.target.id === "color-agg-toggle") {
      colorAgg = colorAgg === "inclusive" ? "exclusive" : "inclusive";
      pieAnimKey++;
      render();
      return;
    }

    const bracketFilterBtn = e.target.closest("[data-bracket-filter]");
    if (bracketFilterBtn) {
      statsBracketFilter = bracketFilterBtn.getAttribute("data-bracket-filter") || "";
      render();
      return;
    }

    const matchupBtn = e.target.closest("[data-matchup-tab]");
    if (matchupBtn) {
      matchupTab = matchupBtn.getAttribute("data-matchup-tab");
      render();
      return;
    }

    const statsBtn = e.target.closest("[data-stats-tab]");
    if (statsBtn) {
      statsTab = statsBtn.getAttribute("data-stats-tab");
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

    if (e.target.id === "cancel-game") {
      editingGameId = null;
      gameModalOpen = false;
      render();
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

    const deckDetailBtn = e.target.closest("[data-deck-detail]");
    if (deckDetailBtn) {
      selectedDeckName = deckDetailBtn.dataset.deckDetail;
      currentView = "decks";
      renderNav();
      render();
      return;
    }

    if (e.target.id === "deck-detail-back") {
      selectedDeckName = null;
      render();
      return;
    }

    if (e.target.id === "add-deck-btn") {
      editingDeckName = null;
      render();
      document.getElementById("deck-modal")?.classList.remove("hidden");
      return;
    }
    if (e.target.id === "cancel-deck") {
      editingDeckName = null;
      document.getElementById("deck-modal")?.classList.add("hidden");
      return;
    }

    const editDeckBtn = e.target.closest(".edit-deck");
    if (editDeckBtn) {
      editingDeckName = editDeckBtn.dataset.name;
      render();
      document.getElementById("deck-modal")?.classList.remove("hidden");
      return;
    }

    const deleteDeckBtn = e.target.closest(".delete-deck");
    if (deleteDeckBtn) {
      if (!confirm("Delete this deck?")) return;
      const name = deleteDeckBtn.dataset.name;
      data.decks = data.decks.filter((d) => d.name !== name);
      if (editingDeckName === name) editingDeckName = null;
      if (selectedDeckName === name) selectedDeckName = null;
      saveData(data);
      render();
      toast("Deleted");
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

    const deleteBtn = e.target.closest(".delete-game");
    if (deleteBtn) {
      if (!confirm("Delete this game?")) return;
      data.games = data.games.filter((g) => g.id !== deleteBtn.dataset.id);
      if (editingGameId === deleteBtn.dataset.id) {
        editingGameId = null;
        gameModalOpen = false;
      }
      if (viewingGameId === deleteBtn.dataset.id) {
        viewingGameId = null;
      }
      saveData(data);
      render();
      toast("Deleted");
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
    } else if (e.target.id === "deck-list-form") {
      e.preventDefault();
      importDeckListForSelected(new FormData(e.target).get("listUrl"));
    } else if (e.target.id === "deck-form") {
      e.preventDefault();
      const fd = new FormData(e.target);
      const deck = {
        name: fd.get("name").trim(),
        bracket: Number(fd.get("bracket")),
        colors: fd.getAll("color"),
        retired: fd.get("retired") === "on",
        createdAt: fd.get("createdAt") || todayISO(),
      };
      const originalName = fd.get("originalName");

      if (originalName) {
        const idx = data.decks.findIndex((d) => d.name === originalName);
        if (idx < 0) return toast("Deck not found", true);
        if (deck.name !== originalName && data.decks.some((d) => d.name === deck.name)) {
          return toast("Deck exists", true);
        }
        const existing = data.decks[idx];
        data.decks[idx] = { ...existing, ...deck };
        if (deck.name !== originalName) {
          for (const game of data.games) {
            if (game.deck === originalName) game.deck = deck.name;
          }
          if (selectedDeckName === originalName) selectedDeckName = deck.name;
        }
        editingDeckName = null;
        saveData(data);
        document.getElementById("deck-modal")?.classList.add("hidden");
        e.target.reset();
        render();
        toast("Deck saved");
        return;
      }

      if (data.decks.some((d) => d.name === deck.name)) return toast("Deck exists", true);
      data.decks.push(deck);
      saveData(data);
      document.getElementById("deck-modal")?.classList.add("hidden");
      e.target.reset();
      render();
      toast(`Added ${deck.name}`);
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
      const result = await importData(file, { merge: true });
      data = result.data;
      render();
      const parts = [];
      if (result.added) parts.push(`${result.added} game${result.added === 1 ? "" : "s"} added`);
      if (result.updated) parts.push(`${result.updated} updated`);
      toast(parts.length ? `Import merged — ${parts.join(", ")}` : "Import merged — no new games");
      document.getElementById("recovery-banner")?.remove();
      dismissRecoveryBanner();
    } catch {
      toast("Import failed — check the JSON file", true);
    }
    e.target.value = "";
  });
  document.getElementById("reset-btn").addEventListener("click", async () => {
    if (!confirm("Reset to original spreadsheet data?")) return;
    data = await resetToSeed();
    render();
    toast("Reset to seed");
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

function getStats() {
  const deckStats = computeDeckStats(data.decks, data.games);
  const overview = computeOverview(data.games);
  return {
    deckStats,
    overview,
    colorStats: computeColorStatsAdvanced(deckStats, {
      view: colorView,
      agg: colorAgg,
      sortOrder: colorSortOrder,
    }),
    bracketStats: computeBracketStats(data.games, deckStats),
    bracketDetail: computeBracketDetail(data.games, data.decks, statsBracketFilter),
    yearStats: computeYearStats(data.games),
    rolling: computeRolling100Stats(data.games),
    matchups: computeAllMatchups(data.games),
  };
}

function render() {
  const main = document.getElementById("main");
  if (currentView === "stats") main.innerHTML = renderStats();
  else if (currentView === "decks") main.innerHTML = renderDecks();
  else main.innerHTML = renderGames();

  if (currentView === "games") applyLogFilters();
  bindPieCharts();
  if (gameModalOpen) {
    syncPodFormSeats();
    syncResultFromSeats();
    syncBracketFromDeck();
    bindPodAutocomplete(document.getElementById("add-game-form"), data.games);
  }
  if (selectedDeckName) loadImagesIntoDeckDetail(selectedDeckName);
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

function impactCell(value) {
  const cls = matchupImpactClass(value);
  return `<span class="impact-cell ${cls}">${formatMatchupImpact(value)}</span>`;
}

function renderPodium(podium) {
  if (!podium.length) {
    return `<p class="hint">No deck results in this bracket yet.</p>`;
  }

  const labels = ["1st", "2nd", "3rd"];
  return `<div class="podium">${podium
    .map(
      (deck, index) => `
      <div class="podium-slot podium-${index + 1}">
        <span class="podium-rank">${labels[index]}</span>
        <strong class="podium-name">${escapeHtml(deck.name)}</strong>
        <span class="podium-meta">${deck.wins}W · ${deck.games}G · ${pct(deck.winRate)}</span>
      </div>`
    )
    .join("")}</div>`;
}

function renderBracketDetail(detail) {
  const turnWin =
    detail.avgTurnWin != null ? detail.avgTurnWin.toFixed(1) : "—";
  const turnLoss =
    detail.avgTurnLoss != null ? detail.avgTurnLoss.toFixed(1) : "—";

  return `
    <div class="bracket-detail">
      <div class="stat-grid">
        ${statCard("Games", detail.overview.games)}
        ${statCard("Wins", detail.overview.wins)}
        ${statCard("Losses", detail.overview.losses)}
        ${statCard("Win Rate", detail.overview.winRate, true)}
      </div>
      <h3 class="section-sub">Top Decks</h3>
      ${renderPodium(detail.podium)}
      <div class="stat-grid stat-grid-compact">
        ${statCard("Avg Turn (Win)", turnWin)}
        ${statCard("Avg Turn (Loss)", turnLoss)}
      </div>
    </div>`;
}

function renderStats() {
  const s = getStats();
  let body = "";

  if (statsTab === "overview") {
    body = `
      <div class="stat-grid">
        ${statCard("Games", s.overview.games)}
        ${statCard("Wins", s.overview.wins)}
        ${statCard("Losses", s.overview.losses)}
        ${statCard("Win Rate", s.overview.winRate, true)}
      </div>
      <h3 class="section-sub">By Year</h3>
      <div class="year-row">
        ${s.yearStats
          .map(
            (y) => `
          <div class="year-chip">
            <strong>${y.year}</strong>
            <span>${y.games}g · ${y.wins}w · ${pctCell(y.winRate)}</span>
          </div>`
          )
          .join("")}
      </div>`;
  } else if (statsTab === "colors") {
    const sortCol = tableSort["color-stats"]?.col || "colorOrder";
    const colors = applySort(s.colorStats, tableSort["color-stats"], {
      colorOrder: (c) => c.colorOrder,
      name: (c) => c.name,
      decks: (c) => c.decks,
      games: (c) => c.games,
      wins: (c) => c.wins,
      winRate: (c) => c.winRate,
    });
    const pieSlices = pieSlicesFromRows(colors, sortCol, (c) => ({
      colors: c.displayColors,
      color: c.key !== "C" && c.displayColors.length === 1 ? c.displayColors[0] : undefined,
      key: c.key,
    }));

    const avgGames = colorStatAverage(colors, "games");
    const avgWins = colorStatAverage(colors, "wins");
    const avgDecks = colorStatAverage(colors, "decks");

    body = `
      <div class="filters inline color-mode-filters">
        <button type="button" class="btn btn-ghost btn-sm" id="color-view-toggle">${colorViewLabel(colorView)}</button>
        <button type="button" class="btn btn-ghost btn-sm" id="color-agg-toggle">${colorAgg === "inclusive" ? "Inclusive" : "Exclusive"}</button>
      </div>
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
                .map(
                  (c) => `
                <tr>
                  <td><span class="color-label">${colorBadge(c.displayColors)}</span></td>
                  <td>${c.key === "C" ? c.decks : valueCell(c.decks, avgDecks)}</td>
                  <td>${c.key === "C" ? c.games : valueCell(c.games, avgGames)}</td>
                  <td>${c.key === "C" ? c.wins : valueCell(c.wins, avgWins)}</td>
                  <td>${c.games ? pctCell(c.winRate) : "—"}</td>
                </tr>`
                )
                .join("")}
            </tbody>
          </table>
        </div>
        ${renderPieChart(pieSlices, pieAnimKey)}
      </div>`;
  } else if (statsTab === "brackets") {
    const sortCol = tableSort["bracket-stats"]?.col || "bracket";
    const brackets = applySort(
      s.bracketStats.filter((b) => b.games > 0),
      tableSort["bracket-stats"],
      {
        bracket: (b) => b.bracket,
        games: (b) => b.games,
        wins: (b) => b.wins,
        winRate: (b) => b.winRate,
      }
    );
    const pieSlices = pieSlicesFromRows(brackets, sortCol, (b) => ({
      bracket: b.bracket,
    }));

    body = `
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
                .map(
                  (b) => `
                <tr>
                  <td><span class="bracket-pill" style="background:${getBracketColor(b.bracket)}">${b.bracket}</span></td><td>${b.games}</td><td>${b.wins}</td>
                  <td>${pctCell(b.winRate)}</td>
                </tr>`
                )
                .join("")}
            </tbody>
          </table>
        </div>
        ${renderPieChart(pieSlices, pieAnimKey)}
      </div>
      <div class="bracket-filter-row">
        ${["", "1", "2", "3", "4", "5"]
          .map(
            (b) => `
          <button type="button" class="btn btn-ghost btn-sm bracket-filter-btn ${statsBracketFilter === b ? "active" : ""}" data-bracket-filter="${b}">
            ${b ? `Bracket ${b}` : "All"}
          </button>`
          )
          .join("")}
      </div>
      ${renderBracketDetail(s.bracketDetail)}`;
  } else if (statsTab === "trends") {
    if (!s.rolling.windows.length) {
      body = "";
    } else {
      const windows = applySort(s.rolling.windows, tableSort["trends-windows"], {
        label: (w) => w.label,
        rangeStart: (w) => w.rangeStart,
        games: (w) => w.games,
        winRate: (w) => w.winRate,
      });
      const cumulative = applySort(s.rolling.cumulative, tableSort["trends-cumulative"], {
        label: (w) => w.label,
        games: (w) => w.games,
        winRate: (w) => w.winRate,
      });

      body = `
        <div class="two-col">
          <div>
            <h3 class="section-sub">Per 100 Games</h3>
            <table class="table compact sortable-table">
              <thead><tr>
                ${sortHeader("trends-windows", "rangeStart", "Games", tableSort["trends-windows"])}
                ${sortHeader("trends-windows", "winRate", "WR", tableSort["trends-windows"])}
              </tr></thead>
              <tbody>
                ${windows.map((w) => `<tr><td>${w.label}</td><td>${pctCell(w.winRate)}</td></tr>`).join("")}
              </tbody>
            </table>
          </div>
          <div>
            <h3 class="section-sub">Cumulative</h3>
            <table class="table compact sortable-table">
              <thead><tr>
                ${sortHeader("trends-cumulative", "games", "Games", tableSort["trends-cumulative"])}
                ${sortHeader("trends-cumulative", "winRate", "WR", tableSort["trends-cumulative"])}
              </tr></thead>
              <tbody>
                ${cumulative.map((w) => `<tr><td>${w.label}</td><td>${pctCell(w.winRate)}</td></tr>`).join("")}
              </tbody>
            </table>
          </div>
        </div>`;
    }
  } else if (statsTab === "matchups") {
    const rows = applySort(s.matchups[matchupTab] || [], tableSort.matchups, {
      subject: (r) => r.subject,
      opponent: (r) => r.opponent,
      games: (r) => r.games,
      wins: (r) => r.wins,
      winRate: (r) => r.winRate,
      matchupImpact: (r) => r.matchupImpact,
      normalizedMatchupImpact: (r) => r.normalizedMatchupImpact,
    });

    body = `
      ${subTabs(MATCHUP_TABS, matchupTab, "matchup-tab")}
      ${
        rows.length
          ? `
      <table class="table compact sortable-table matchup-table">
        <thead><tr>
          ${sortHeader("matchups", "subject", "Subject", tableSort.matchups)}
          ${sortHeader("matchups", "opponent", "Opponent", tableSort.matchups)}
          ${sortHeader("matchups", "games", "G", tableSort.matchups)}
          ${sortHeader("matchups", "wins", "W", tableSort.matchups)}
          ${sortHeader("matchups", "winRate", "WR", tableSort.matchups)}
          ${sortHeader("matchups", "matchupImpact", "MI", tableSort.matchups)}
          ${sortHeader("matchups", "normalizedMatchupImpact", "NMI", tableSort.matchups)}
        </tr></thead>
        <tbody>
          ${rows
            .map(
              (row) => `
            <tr>
              <td>${escapeHtml(row.subject)}</td>
              <td>${escapeHtml(row.opponent)}</td>
              <td>${row.games}</td>
              <td>${row.wins}</td>
              <td>${pctCell(row.winRate)}</td>
              <td>${impactCell(row.matchupImpact)}</td>
              <td>${impactCell(row.normalizedMatchupImpact)}</td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>
      <p class="hint matchup-hint">MI and NMI use 30CCSTAT formulas: pod baseline 25%, prior 6.25 wins / 25 games, shared losses weighted at 20%.</p>`
          : `<p class="hint">Log games with pod players (and ideally winning seat) to build matchup stats.</p>`
      }`;
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
  if (selectedDeckName) {
    const deck = data.decks.find((d) => d.name === selectedDeckName);
    if (!deck) {
      selectedDeckName = null;
    } else {
      const stats = getStats().deckStats.find((d) => d.name === selectedDeckName);
      return renderDeckDetail(deck, stats);
    }
  }

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
  const dateColLabel = showLastPlayed ? "Last Played" : "Added";
  const dateCell = (d) =>
    showLastPlayed ? (d.lastPlayed ? formatDate(d.lastPlayed) : "—") : formatDate(d.createdAt);

  const editingDeck = editingDeckName
    ? data.decks.find((d) => d.name === editingDeckName)
    : null;

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
      <table class="table sortable-table">
        <thead><tr>
          ${sortHeader("decks-main", dateSortCol, dateColLabel, sortState)}
          ${sortHeader("decks-main", "name", "Deck", sortState)}
          ${sortHeader("decks-main", "colors", "Color Identity", sortState)}
          ${sortHeader("decks-main", "bracket", "Bracket", sortState)}
          ${sortHeader("decks-main", "games", "Games", sortState)}
          ${sortHeader("decks-main", "wins", "Wins", sortState)}
          ${sortHeader("decks-main", "normWr", "Normalized Win Rate", sortState)}
          ${sortHeader("decks-main", "winRate", "Win Rate", sortState)}
          <th></th>
        </tr></thead>
        <tbody>
          ${list.length ? list.map((d) => `<tr><td>${dateCell(d)}</td><td class="deck-name"><button type="button" class="link-btn deck-link" data-deck-detail="${escapeHtml(d.name)}">${escapeHtml(d.name)}</button></td><td>${colorBadge(d.colors)}</td><td>${d.bracket}</td><td>${d.games}</td><td>${d.wins}</td><td>${d.games ? pctCell(d.normalizedWr) : "—"}</td><td>${d.games ? pctCell(d.winRate) : "—"}</td><td class="row-actions"><button type="button" class="btn-icon edit-deck" data-name="${escapeHtml(d.name)}" title="Edit deck">✎</button><button type="button" class="btn-icon delete-deck" data-name="${escapeHtml(d.name)}" title="Delete deck">×</button></td></tr>`).join("") : '<tr><td colspan="9"></td></tr>'}
        </tbody>
      </table>
    </section>
    <div id="deck-modal" class="modal hidden">
      <div class="modal-content">
        <h3>${editingDeck ? "Edit Deck" : "Add Deck"}</h3>
        <form id="deck-form">
          ${editingDeck ? `<input type="hidden" name="originalName" value="${escapeHtml(editingDeck.name)}" />` : ""}
          <label>Name<input name="name" required value="${editingDeck ? escapeHtml(editingDeck.name) : ""}" /></label>
          <label>Created<input type="date" name="createdAt" value="${editingDeck?.createdAt || todayISO()}" required /></label>
          <label>Bracket<select name="bracket">${[1, 2, 3, 4, 5].map((b) => `<option value="${b}" ${(editingDeck ? editingDeck.bracket : 4) === b ? "selected" : ""}>${b}</option>`).join("")}</select></label>
          <fieldset class="color-fieldset"><legend>Colors</legend>
            ${["W", "U", "B", "R", "G"].map((c) => `<label class="checkbox mana-check"><input type="checkbox" name="color" value="${c}" ${editingDeck?.colors?.includes(c) ? "checked" : ""} />${colorBadge([c])}</label>`).join("")}
          </fieldset>
          <label class="checkbox"><input type="checkbox" name="retired" ${editingDeck?.retired ? "checked" : ""} /> Retired</label>
          <div class="form-actions${editingDeck ? " form-actions--split" : ""}">
            <button type="button" class="btn btn-ghost" id="cancel-deck">Cancel</button>
            <button type="submit" class="btn btn-primary">${editingDeck ? "Save" : "Add Deck"}</button>
          </div>
        </form>
      </div>
    </div>`;
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

  const decks = [...new Set(data.decks.map((d) => d.name))].sort();
  const years = [...new Set(data.games.map((g) => gameYear(g.date)))].sort();
  const sort = tableSort["game-log"];
  const editing = editingGameId ? data.games.find((g) => g.id === editingGameId) : null;
  const viewing = viewingGameId ? data.games.find((g) => g.id === viewingGameId) : null;

  return `
    <section class="section">
      <div class="section-header">
        <div class="filters inline">
          <label>Deck<select id="filter-deck"><option value="">All</option>${decks.map((d) => `<option value="${escapeHtml(d)}" ${logFilters.deck === d ? "selected" : ""}>${escapeHtml(d)}</option>`).join("")}</select></label>
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

function podPlayerName(game, seat) {
  if (Number(game.mySeat) === seat) return MY_PLAYER_NAME;
  return playerName(game, seat);
}

function podCommanderName(game, seat) {
  if (Number(game.mySeat) === seat) return game.deck || "";
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
            <label class="pod-player">Player ${seat}${fieldValue(podPlayerName(game, seat))}</label>
            <label class="pod-commander">Commander${fieldValue(podCommanderName(game, seat))}</label>
          </div>`
          )
          .join("")}
      </fieldset>
    </div>`;
}

function deckBracketValue(deckName) {
  return data.decks.find((d) => d.name === deckName)?.bracket ?? 4;
}

function recentDecksPlayed(deckStats, limit = 5) {
  const sorted = [...data.games].sort((a, b) => compareGamesChronologically(b, a));
  const seen = new Set();
  /** @type {typeof deckStats} */
  const recent = [];

  for (const game of sorted) {
    if (!game.deck || seen.has(game.deck)) continue;
    const deck = deckStats.find((d) => d.name === game.deck && !d.retired);
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
            `<option value="${escapeHtml(d.name)}" data-bracket="${d.bracket}" ${editing?.deck === d.name ? "selected" : ""}>${escapeHtml(d.name)}</option>`
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
      <div class="form-actions form-actions--split">
        <button type="button" class="btn btn-ghost" id="cancel-game">Cancel</button>
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
            <span class="quick-name">${colorBadge(d.colors)} ${escapeHtml(d.name)}</span>
            <button type="button" class="btn btn-sm win quick-win" data-deck="${escapeHtml(d.name)}">W</button>
            <button type="button" class="btn btn-sm loss quick-loss" data-deck="${escapeHtml(d.name)}">L</button>
          </div>`
          )
          .join("")}
      </div>
    </div>`;
}

function gameRow(g) {
  const cls = g.result === "Win" ? "win" : "loss";
  return `<tr data-deck="${escapeHtml(g.deck)}" data-result="${g.result}" data-year="${gameYear(g.date)}">
    <td><button type="button" class="link-btn view-game" data-id="${g.id}">${formatDate(g.date)}</button></td><td class="deck-name"><button type="button" class="link-btn deck-link" data-deck-detail="${escapeHtml(g.deck)}">${escapeHtml(g.deck)}</button></td>
    <td>${g.mySeat || "—"}</td><td>${g.turn || "—"}</td>
    <td><span class="result-pill ${cls}">${g.result}</span></td>
    <td class="row-actions">
      <button type="button" class="btn-icon edit-game" data-id="${g.id}" title="Edit game">✎</button>
      <button type="button" class="btn-icon delete-game" data-id="${g.id}" title="Delete game">×</button>
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

function saveGameFromForm(fd) {
  const payload = parseGameForm(fd);
  if (!payload.deck) return toast("Pick a deck", true);

  if (editingGameId) {
    const idx = data.games.findIndex((g) => g.id === editingGameId);
    if (idx >= 0) {
      const updated = {
        id: editingGameId,
        date: payload.date,
        deck: payload.deck,
        result: payload.result,
        source: "local",
      };
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
    render();
    return;
  }

  data.games.push({ id: nextGameId(data.games), ...payload });
  saveData(data);
  gameModalOpen = false;
  toast(`${payload.result} logged`);
  render();
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

async function importDeckListForSelected(url) {
  if (!selectedDeckName) return;
  const deck = data.decks.find((d) => d.name === selectedDeckName);
  if (!deck) return;

  const trimmed = String(url || "").trim();
  if (!trimmed) return toast("Paste a deck link", true);

  try {
    const result = await importDeckFromUrl(trimmed);
    deck.listUrl = result.url;
    deck.listSource = result.source;
    deck.cards = result.cards;
    deck.listSyncedAt = todayISO();
    saveData(data);
    toast(`Imported ${result.cards.length} cards`);
    render();
  } catch (err) {
    toast(err.message || "Import failed", true);
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

function renderRecoveryBanner() {
  const existing = document.getElementById("recovery-banner");
  if (!shouldShowRecoveryBanner()) {
    existing?.remove();
    return;
  }
  if (existing) return;

  const banner = document.createElement("aside");
  banner.id = "recovery-banner";
  banner.className = "recovery-banner";
  banner.innerHTML = `
    <div class="recovery-banner-body">
      <strong>Missing games from localhost?</strong>
      <p>
        Games logged on <code>http://localhost:5173</code> stay in that browser only.
        Open your old dev site, click <strong>Export JSON</strong>, then use
        <strong>Import JSON</strong> here (merges without overwriting spreadsheet games).
      </p>
      <ol>
        <li>On your computer: <code>npm run dev</code> → open localhost → Export JSON</li>
        <li>On this site: Import JSON and pick that file</li>
      </ol>
      <p class="hint">
        Or paste in the localhost browser console:
        <code>copy(localStorage.getItem('edhlog-data-v1'))</code>
        then save the clipboard to a <code>.json</code> file and import it here.
      </p>
    </div>
    <button type="button" class="btn btn-ghost" id="recovery-dismiss">Got it</button>
  `;
  document.getElementById("app").prepend(banner);
  document.getElementById("recovery-dismiss").addEventListener("click", () => {
    dismissRecoveryBanner();
    banner.remove();
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
