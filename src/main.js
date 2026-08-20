import {
  initData,
  saveData,
  exportData,
  importData,
  resetToSeed,
  nextGameId,
  getLastSeedSync,
} from "./store.js";
import {
  computeDeckStats,
  computeOverview,
  computeBracketStats,
  computeYearStats,
  computeRolling100Stats,
  computeRankings,
  colorBadge,
  sortDeckList,
} from "./stats.js";
import { formatDate, gameYear } from "./dates.js";
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

const VIEWS = [
  { id: "stats", label: "Stats" },
  { id: "decks", label: "Decks" },
  { id: "games", label: "Games" },
];

const STATS_TABS = [
  { id: "overview", label: "Overview" },
  { id: "colors", label: "Colors" },
  { id: "brackets", label: "Brackets" },
  { id: "rankings", label: "Rankings" },
  { id: "trends", label: "Trends" },
];

const DECKS_TABS = [
  { id: "active", label: "Active" },
  { id: "retired", label: "Retired" },
  { id: "all", label: "All" },
];

const GAMES_TABS = [
  { id: "history", label: "History" },
  { id: "log", label: "Log Game" },
];

let data = null;
let currentView = "stats";
let statsTab = "overview";
let decksTab = "active";
let gamesTab = "history";
let editingGameId = null;
let deckSort = "normWr";
let deckSortDir = "desc";
let deckBracketFilter = "";
let rankBracketFilter = "";
let rankShowRetired = true;
let logFilters = { deck: "", result: "", year: "" };
let colorView = "wubrgc";
let colorAgg = "inclusive";
let colorSortOrder = "wubrgc";
let pieAnimKey = 0;
let tableSort = {
  "top-decks": { col: "normWr", dir: "desc" },
  "color-stats": { col: "colorOrder", dir: "asc" },
  "bracket-stats": { col: "bracket", dir: "asc" },
  "rankings": { col: "normWr", dir: "desc" },
  "trends-windows": { col: "winRate", dir: "desc" },
  "trends-cumulative": { col: "winRate", dir: "desc" },
  "decks-main": { col: "normWr", dir: "desc" },
  "game-log": { col: "date", dir: "desc" },
};

async function boot() {
  data = await initData();
  const sync = getLastSeedSync();
  bindEvents();
  renderNav();
  render();
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

    if (e.target.id === "deck-sort-dir") {
      deckSortDir = deckSortDir === "asc" ? "desc" : "asc";
      tableSort["decks-main"] = { col: deckSort, dir: deckSortDir };
      render();
      return;
    }

    const statsBtn = e.target.closest("[data-stats-tab]");
    if (statsBtn) {
      statsTab = statsBtn.getAttribute("data-stats-tab");
      render();
      return;
    }

    const decksBtn = e.target.closest("[data-decks-tab]");
    if (decksBtn) {
      decksTab = decksBtn.getAttribute("data-decks-tab");
      render();
      return;
    }

    const gamesBtn = e.target.closest("[data-games-tab]");
    if (gamesBtn) {
      const nextTab = gamesBtn.getAttribute("data-games-tab");
      if (nextTab !== "log") editingGameId = null;
      gamesTab = nextTab;
      render();
      return;
    }

    if (e.target.id === "add-deck-btn") {
      document.getElementById("deck-modal")?.classList.remove("hidden");
      return;
    }
    if (e.target.id === "cancel-deck") {
      document.getElementById("deck-modal")?.classList.add("hidden");
      return;
    }

    const editBtn = e.target.closest(".edit-game");
    if (editBtn) {
      editingGameId = editBtn.dataset.id;
      gamesTab = "log";
      render();
      return;
    }

    const deleteBtn = e.target.closest(".delete-game");
    if (deleteBtn) {
      if (!confirm("Delete this game?")) return;
      data.games = data.games.filter((g) => g.id !== deleteBtn.dataset.id);
      if (editingGameId === deleteBtn.dataset.id) editingGameId = null;
      saveData(data);
      render();
      toast("Deleted");
      return;
    }

    if (e.target.id === "cancel-edit-game") {
      editingGameId = null;
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

    if (id === "rank-bracket") {
      rankBracketFilter = value;
      render();
    } else if (id === "rank-retired") {
      rankShowRetired = checked;
      render();
    } else if (id === "deck-bracket") {
      deckBracketFilter = value;
      render();
    } else if (id === "deck-sort") {
      deckSort = value;
      tableSort["decks-main"] = { col: value, dir: deckSortDir };
      render();
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
    } else if (e.target.id === "deck-form") {
      e.preventDefault();
      const fd = new FormData(e.target);
      const deck = {
        name: fd.get("name").trim(),
        bracket: Number(fd.get("bracket")),
        colors: fd.getAll("color"),
        retired: fd.get("retired") === "on",
        createdAt: fd.get("createdAt") || new Date().toISOString().slice(0, 10),
      };
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
      data = await importData(file);
      render();
      toast("Data imported");
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
    yearStats: computeYearStats(data.games),
    rolling: computeRolling100Stats(data.games),
    rankings: computeRankings(deckStats),
  };
}

function render() {
  const main = document.getElementById("main");
  if (currentView === "stats") main.innerHTML = renderStats();
  else if (currentView === "decks") main.innerHTML = renderDecks();
  else main.innerHTML = renderGames();

  if (currentView === "games" && gamesTab === "history") applyLogFilters();
  bindPieCharts();
  syncPodFormSeats();
  syncResultFromSeats();
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

function renderStats() {
  const s = getStats();
  let body = "";

  if (statsTab === "overview") {
    const topDecks = applySort(
      s.deckStats.filter((d) => !d.retired && d.games > 0),
      tableSort["top-decks"],
      {
        name: (d) => d.name,
        games: (d) => d.games,
        normWr: (d) => d.normalizedWr,
        winRate: (d) => d.winRate,
      }
    ).slice(0, 6);

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
      </div>
      <h3 class="section-sub">Top Decks</h3>
      ${miniDeckTable(topDecks)}`;
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
      </div>`;
  } else if (statsTab === "rankings") {
    let list = s.rankings;
    if (!rankShowRetired) list = list.filter((d) => !d.retired);
    if (rankBracketFilter) list = list.filter((d) => String(d.bracket) === rankBracketFilter);
    list = applySort(list, tableSort["rankings"], {
      name: (d) => d.name,
      bracket: (d) => d.bracket,
      games: (d) => d.games,
      normWr: (d) => d.normalizedWr,
      winRate: (d) => d.winRate,
    });

    body = `
      <div class="filters inline">
        <label>Bracket <select id="rank-bracket"><option value="">All</option>${[1, 2, 3, 4, 5].map((b) => `<option value="${b}" ${rankBracketFilter === String(b) ? "selected" : ""}>${b}</option>`).join("")}</select></label>
        <label class="checkbox"><input type="checkbox" id="rank-retired" ${rankShowRetired ? "checked" : ""} /> Show retired</label>
      </div>
      <table class="table sortable-table">
        <thead><tr>
          <th>#</th>
          ${sortHeader("rankings", "name", "Deck", tableSort["rankings"])}
          <th>CI</th>
          ${sortHeader("rankings", "bracket", "Brkt", tableSort["rankings"])}
          ${sortHeader("rankings", "games", "G", tableSort["rankings"])}
          ${sortHeader("rankings", "normWr", "Norm WR", tableSort["rankings"])}
          ${sortHeader("rankings", "winRate", "Real WR", tableSort["rankings"])}
        </tr></thead>
        <tbody>
          ${list
            .map(
              (d, i) => `
            <tr>
              <td>${i + 1}</td>
              <td class="deck-name">${escapeHtml(d.name)}${d.retired ? '<span class="tag retired">retired</span>' : ""}</td>
              <td>${colorBadge(d.colors)}</td>
              <td>${d.bracket}</td><td>${d.games}</td>
              <td>${pctCell(d.normalizedWr)}</td><td>${pctCell(d.winRate)}</td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>`;
  } else if (statsTab === "trends") {
    if (!s.rolling.windows.length) {
      body = "";
    } else {
      const windows = applySort(s.rolling.windows, tableSort["trends-windows"], {
        label: (w) => w.label,
        winRate: (w) => w.winRate,
      });
      const cumulative = applySort(s.rolling.cumulative, tableSort["trends-cumulative"], {
        label: (w) => w.label,
        winRate: (w) => w.winRate,
      });

      body = `
        <div class="two-col">
          <div>
            <h3 class="section-sub">Per 100 Games</h3>
            <table class="table compact sortable-table">
              <thead><tr>
                ${sortHeader("trends-windows", "label", "Games", tableSort["trends-windows"])}
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
                ${sortHeader("trends-cumulative", "label", "Games", tableSort["trends-cumulative"])}
                ${sortHeader("trends-cumulative", "winRate", "WR", tableSort["trends-cumulative"])}
              </tr></thead>
              <tbody>
                ${cumulative.map((w) => `<tr><td>${w.label}</td><td>${pctCell(w.winRate)}</td></tr>`).join("")}
              </tbody>
            </table>
          </div>
        </div>`;
    }
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

function miniDeckTable(decks) {
  const sort = tableSort["top-decks"];
  return `
    <table class="table compact sortable-table">
      <thead><tr>
        ${sortHeader("top-decks", "name", "Deck", sort)}
        <th>CI</th>
        ${sortHeader("top-decks", "games", "G", sort)}
        ${sortHeader("top-decks", "normWr", "Norm WR", sort)}
        ${sortHeader("top-decks", "winRate", "Real WR", sort)}
      </tr></thead>
      <tbody>
        ${decks
          .map(
            (d) => `
          <tr>
            <td class="deck-name">${escapeHtml(d.name)}</td>
            <td>${colorBadge(d.colors)}</td>
            <td>${d.games}</td>
            <td>${pctCell(d.normalizedWr)}</td>
            <td>${pctCell(d.winRate)}</td>
          </tr>`
          )
          .join("")}
      </tbody>
    </table>`;
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
  list = sortDeckList(list, deckSort, deckSortDir);

  const dirLabel = deckSortDir === "asc" ? "↑ Asc" : "↓ Desc";

  return `
    <section class="section">
      ${subTabs(DECKS_TABS, decksTab, "decks-tab")}
      <div class="section-header">
        <div class="filters inline">
          <label>Bracket <select id="deck-bracket"><option value="">All</option>${[1, 2, 3, 4, 5].map((b) => `<option value="${b}" ${deckBracketFilter === String(b) ? "selected" : ""}>${b}</option>`).join("")}</select></label>
          <label>Sort <select id="deck-sort">
            <option value="normWr" ${deckSort === "normWr" ? "selected" : ""}>Norm WR</option>
            <option value="games" ${deckSort === "games" ? "selected" : ""}>Most games</option>
            <option value="wr" ${deckSort === "wr" ? "selected" : ""}>Win rate</option>
            <option value="newest" ${deckSort === "newest" ? "selected" : ""}>Newest</option>
            <option value="recent" ${deckSort === "recent" ? "selected" : ""}>Most recent</option>
            <option value="name" ${deckSort === "name" ? "selected" : ""}>Name</option>
          </select></label>
          <button type="button" class="btn btn-ghost btn-sm" id="deck-sort-dir" title="Toggle sort direction">${dirLabel}</button>
        </div>
        <button type="button" class="btn btn-primary" id="add-deck-btn">+ Deck</button>
      </div>
      <table class="table sortable-table">
        <thead><tr>
          ${sortHeader("decks-main", "createdAt", "Added", sortState)}
          ${sortHeader("decks-main", "name", "Deck", sortState)}
          <th>CI</th>
          ${sortHeader("decks-main", "bracket", "Brkt", sortState)}
          ${sortHeader("decks-main", "games", "G", sortState)}
          ${sortHeader("decks-main", "wins", "W", sortState)}
          ${sortHeader("decks-main", "losses", "L", sortState)}
          ${sortHeader("decks-main", "normWr", "Norm WR", sortState)}
          ${sortHeader("decks-main", "winRate", "WR", sortState)}
        </tr></thead>
        <tbody>
          ${list.length ? list.map((d) => `<tr><td>${formatDate(d.createdAt)}</td><td class="deck-name">${escapeHtml(d.name)}</td><td>${colorBadge(d.colors)}</td><td>${d.bracket}</td><td>${d.games}</td><td>${d.wins}</td><td>${d.losses}</td><td>${d.games ? pctCell(d.normalizedWr) : "—"}</td><td>${d.games ? pctCell(d.winRate) : "—"}</td></tr>`).join("") : '<tr><td colspan="9"></td></tr>'}
        </tbody>
      </table>
    </section>
    <div id="deck-modal" class="modal hidden">
      <div class="modal-content">
        <h3>Add Deck</h3>
        <form id="deck-form">
          <label>Name<input name="name" required /></label>
          <label>Created<input type="date" name="createdAt" value="${new Date().toISOString().slice(0, 10)}" required /></label>
          <label>Bracket<select name="bracket">${[1, 2, 3, 4, 5].map((b) => `<option value="${b}" ${b === 4 ? "selected" : ""}>${b}</option>`).join("")}</select></label>
          <fieldset class="color-fieldset"><legend>Colors</legend>
            ${["W", "U", "B", "R", "G"].map((c) => `<label class="checkbox mana-check"><input type="checkbox" name="color" value="${c}" />${colorBadge([c])}</label>`).join("")}
          </fieldset>
          <label class="checkbox"><input type="checkbox" name="retired" /> Retired</label>
          <div class="form-actions">
            <button type="button" class="btn btn-ghost" id="cancel-deck">Cancel</button>
            <button type="submit" class="btn btn-primary">Save</button>
          </div>
        </form>
      </div>
    </div>`;
}

function renderGames() {
  if (gamesTab === "log") {
    return `<section class="section narrow">${subTabs(GAMES_TABS, gamesTab, "games-tab")}${renderLogForm()}</section>`;
  }

  let games = [...data.games];
  games = applySort(games, tableSort["game-log"], {
    date: (g) => g.date,
    deck: (g) => g.deck,
    result: (g) => (g.result === "Win" ? 1 : 0),
  });

  const decks = [...new Set(data.decks.map((d) => d.name))].sort();
  const years = [...new Set(data.games.map((g) => gameYear(g.date)))].sort();
  const sort = tableSort["game-log"];

  return `
    <section class="section">
      ${subTabs(GAMES_TABS, gamesTab, "games-tab")}
      <div class="filters">
        <label>Deck<select id="filter-deck"><option value="">All</option>${decks.map((d) => `<option value="${escapeHtml(d)}" ${logFilters.deck === d ? "selected" : ""}>${escapeHtml(d)}</option>`).join("")}</select></label>
        <label>Result<select id="filter-result"><option value="">All</option><option value="Win" ${logFilters.result === "Win" ? "selected" : ""}>Wins</option><option value="Loss" ${logFilters.result === "Loss" ? "selected" : ""}>Losses</option></select></label>
        <label>Year<select id="filter-year"><option value="">All</option>${years.map((y) => `<option value="${y}" ${logFilters.year === y ? "selected" : ""}>${y}</option>`).join("")}</select></label>
        <span class="filter-count" id="filter-count">${games.length} games</span>
      </div>
      <div class="table-wrap">
        <table class="table sortable-table" id="game-log-table">
          <thead><tr>
            ${sortHeader("game-log", "date", "Date", sort)}
            ${sortHeader("game-log", "deck", "Deck", sort)}
            ${sortHeader("game-log", "result", "Result", sort)}
            <th></th>
          </tr></thead>
          <tbody>${games.map((g) => gameRow(g)).join("")}</tbody>
        </table>
      </div>
    </section>`;
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

function renderLogForm() {
  const { deckStats } = getStats();
  const decks = sortDeckList(
    deckStats.filter((d) => !d.retired),
    "recent",
    "desc"
  );
  const editing = editingGameId ? data.games.find((g) => g.id === editingGameId) : null;
  const today = new Date().toISOString().slice(0, 10);
  const dateVal = editing?.date || today;
  const resultWin = !editing || editing.result === "Win";
  const resultLoss = editing?.result === "Loss";

  return `
    ${editing ? `<p class="edit-banner">Editing game</p>` : ""}
    <form id="add-game-form" class="game-form">
      ${editing ? `<input type="hidden" name="gameId" value="${escapeHtml(editing.id)}" />` : ""}
      <label>Date<input type="date" name="date" value="${dateVal}" required /></label>
      <label>My deck<select name="deck" required><option value="">Select…</option>${decks
        .map(
          (d) =>
            `<option value="${escapeHtml(d.name)}" ${editing?.deck === d.name ? "selected" : ""}>${escapeHtml(d.name)}</option>`
        )
        .join("")}</select></label>
      <label>My seat<select name="mySeat"><option value="">—</option>${seatOptions(editing?.mySeat)}</select></label>
      <label>Turn ended<input type="number" name="turn" min="1" placeholder="Optional" value="${editing?.turn ?? ""}" /></label>
      <label>Winner seat<select name="winnerSeat"><option value="">—</option>${seatOptions(editing?.winnerSeat)}</select></label>
      <fieldset class="pod-fieldset">
        <legend>Other commanders</legend>
        ${[1, 2, 3, 4]
          .map(
            (seat) => `
          <label class="opponent-seat" data-opponent-seat="${seat}">Seat ${seat}<input type="text" name="opponent-${seat}" value="${escapeHtml(opponentName(editing, seat))}" placeholder="Commander name" autocomplete="off" /></label>`
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
        ${editing ? `<button type="button" class="btn btn-ghost" id="cancel-edit-game">Cancel</button>` : ""}
        <button type="submit" class="btn btn-primary btn-lg">${editing ? "Save" : "Save Game"}</button>
      </div>
    </form>
    <div class="quick-log">
      <h3>Quick fill</h3>
      <div class="quick-grid">
        ${decks
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
    <td>${formatDate(g.date)}</td><td class="deck-name">${escapeHtml(g.deck)}</td>
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
    return name ? [{ seat, name }] : [];
  });
  const winnerSeatRaw = fd.get("winnerSeat");
  const turnRaw = fd.get("turn");

  const game = {
    date: fd.get("date"),
    deck: fd.get("deck"),
    result: fd.get("result"),
    source: "local",
  };

  if (mySeatRaw) game.mySeat = Number(mySeatRaw);
  if (winnerSeatRaw) game.winnerSeat = Number(winnerSeatRaw);
  if (winnerSeatRaw && mySeatRaw) {
    game.result = Number(winnerSeatRaw) === Number(mySeatRaw) ? "Win" : "Loss";
  }
  if (turnRaw) {
    const turn = Number(turnRaw);
    if (!Number.isNaN(turn) && turn > 0) game.turn = turn;
  }
  if (opponents.length) game.opponents = opponents;
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
      if (payload.mySeat) updated.mySeat = payload.mySeat;
      if (payload.winnerSeat) updated.winnerSeat = payload.winnerSeat;
      if (payload.turn) updated.turn = payload.turn;
      if (payload.opponents?.length) updated.opponents = payload.opponents;
      data.games[idx] = updated;
    }
    editingGameId = null;
    gamesTab = "history";
    saveData(data);
    toast("Game saved");
    render();
    return;
  }

  data.games.push({ id: nextGameId(data.games), ...payload });
  saveData(data);
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

function syncPodFormSeats() {
  const form = document.getElementById("add-game-form");
  if (!form) return;
  const mySeat = Number(form.querySelector('[name="mySeat"]')?.value) || 0;
  const fieldset = form.querySelector(".pod-fieldset");
  if (fieldset) fieldset.hidden = mySeat === 0;

  form.querySelectorAll("[data-opponent-seat]").forEach((label) => {
    const seat = Number(label.dataset.opponentSeat);
    const hidden = mySeat > 0 && seat === mySeat;
    label.hidden = hidden;
    if (hidden) {
      const input = label.querySelector("input");
      if (input) input.value = "";
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
