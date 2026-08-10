import {
  initData,
  saveData,
  exportData,
  importData,
  resetToSeed,
  nextGameId,
} from "./store.js";
import {
  computeDeckStats,
  computeOverview,
  computeColorStats,
  computeBracketStats,
  computeYearStats,
  computeRolling100Stats,
  computeRankings,
  colorBadge,
  pct,
} from "./stats.js";
import { formatDate, gameYear } from "./dates.js";

const VIEWS = [
  { id: "stats", label: "Stats" },
  { id: "decks", label: "Decks" },
  { id: "games", label: "Games" },
];

const STATS_TABS = [
  { id: "overview", label: "Overview" },
  { id: "breakdown", label: "Colors & Brackets" },
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
let deckSort = "games";
let deckBracketFilter = "";
let rankBracketFilter = "";
let rankShowRetired = true;
let logFilters = { deck: "", result: "", year: "" };

async function boot() {
  data = await initData();
  bindEvents();
  renderNav();
  render();
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
      gamesTab = gamesBtn.getAttribute("data-games-tab");
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

    const deleteBtn = e.target.closest(".delete-game");
    if (deleteBtn) {
      if (!confirm("Delete this game?")) return;
      data.games = data.games.filter((g) => g.id !== deleteBtn.dataset.id);
      saveData(data);
      render();
      toast("Deleted");
      return;
    }

    const quickWin = e.target.closest(".quick-win");
    const quickLoss = e.target.closest(".quick-loss");
    if (quickWin || quickLoss) {
      addGame({
        date: new Date().toISOString().slice(0, 10),
        deck: (quickWin || quickLoss).dataset.deck,
        result: quickWin ? "Win" : "Loss",
      });
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
      render();
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
      const fd = new FormData(e.target);
      addGame({ date: fd.get("date"), deck: fd.get("deck"), result: fd.get("result") });
    } else if (e.target.id === "deck-form") {
      e.preventDefault();
      const fd = new FormData(e.target);
      const deck = {
        name: fd.get("name").trim(),
        bracket: Number(fd.get("bracket")),
        colors: fd.getAll("color"),
        retired: fd.get("retired") === "on",
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
    colorStats: computeColorStats(deckStats),
    bracketStats: computeBracketStats(data.games, deckStats),
    yearStats: computeYearStats(data.games),
    rolling: computeRolling100Stats(data.games),
    rankings: computeRankings(deckStats, overview.winRate),
  };
}

function render() {
  const main = document.getElementById("main");
  if (currentView === "stats") main.innerHTML = renderStats();
  else if (currentView === "decks") main.innerHTML = renderDecks();
  else main.innerHTML = renderGames();

  if (currentView === "games" && gamesTab === "history") applyLogFilters();
}

function applyLogFilters() {
  const deck = logFilters.deck;
  const result = logFilters.result;
  const year = logFilters.year;
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

function statCard(label, value) {
  return `<div class="stat-card"><span class="stat-label">${label}</span><span class="stat-value">${value}</span></div>`;
}

function renderStats() {
  const s = getStats();
  let body = "";

  if (statsTab === "overview") {
    body = `
      <div class="stat-grid">${statCard("Games", s.overview.games)}${statCard("Wins", s.overview.wins)}${statCard("Losses", s.overview.losses)}${statCard("Win Rate", pct(s.overview.winRate))}</div>
      <h3 class="section-sub">By Year</h3>
      <div class="year-row">
        ${s.yearStats
          .map(
            (y) => `
          <div class="year-chip">
            <strong>${y.year}</strong>
            <span>${y.games}g · ${y.wins}w · ${pct(y.winRate)}</span>
          </div>`
          )
          .join("")}
      </div>
      <h3 class="section-sub">Top Decks</h3>
      ${miniDeckTable(s.deckStats.filter((d) => !d.retired && d.games > 0).sort((a, b) => b.games - a.games).slice(0, 6))}`;
  } else if (statsTab === "breakdown") {
    body = `
      <div class="two-col">
        <div>
          <h3 class="section-sub">Color Identity</h3>
          <table class="table compact">
            <thead><tr><th></th><th>Decks</th><th>G</th><th>W</th><th>WR</th></tr></thead>
            <tbody>
              ${s.colorStats
                .map(
                  (c) => `
                <tr>
                  <td><span class="color-label">${colorBadge([c.color])} ${c.name}</span></td>
                  <td>${c.decks}</td><td>${c.games}</td><td>${c.wins}</td>
                  <td class="${c.winRate >= s.overview.winRate ? "positive" : "negative"}">${pct(c.winRate)}</td>
                </tr>`
                )
                .join("")}
            </tbody>
          </table>
        </div>
        <div>
          <h3 class="section-sub">By Bracket</h3>
          <table class="table compact">
            <thead><tr><th>Brkt</th><th>G</th><th>W</th><th>WR</th></tr></thead>
            <tbody>
              ${s.bracketStats
                .filter((b) => b.games > 0)
                .map((b) => `<tr><td>${b.bracket}</td><td>${b.games}</td><td>${b.wins}</td><td>${pct(b.winRate)}</td></tr>`)
                .join("")}
            </tbody>
          </table>
        </div>
      </div>`;
  } else if (statsTab === "rankings") {
    let list = s.rankings;
    if (!rankShowRetired) list = list.filter((d) => !d.retired);
    if (rankBracketFilter) list = list.filter((d) => String(d.bracket) === rankBracketFilter);

    body = `
      <div class="filters inline">
        <label>Bracket <select id="rank-bracket"><option value="">All</option>${[1, 2, 3, 4, 5].map((b) => `<option value="${b}" ${rankBracketFilter === String(b) ? "selected" : ""}>${b}</option>`).join("")}</select></label>
        <label class="checkbox"><input type="checkbox" id="rank-retired" ${rankShowRetired ? "checked" : ""} /> Show retired</label>
      </div>
      <table class="table">
        <thead><tr><th>#</th><th>Deck</th><th>CI</th><th>Brkt</th><th>G</th><th>Adj WR</th><th>Real WR</th></tr></thead>
        <tbody>
          ${list
            .map(
              (d, i) => `
            <tr>
              <td>${i + 1}</td>
              <td class="deck-name">${escapeHtml(d.name)}${d.retired ? '<span class="tag retired">retired</span>' : ""}</td>
              <td>${colorBadge(d.colors)}</td>
              <td>${d.bracket}</td><td>${d.games}</td>
              <td class="highlight">${pct(d.normalizedWr)}</td><td>${pct(d.winRate)}</td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>`;
  } else if (statsTab === "trends") {
    if (!s.rolling.windows.length) {
      body = '<p class="empty">Need 100+ games for trend data.</p>';
    } else {
      body = `
        <div class="two-col">
          <div>
            <h3 class="section-sub">Per 100 Games</h3>
            <table class="table compact"><thead><tr><th>Games</th><th>WR</th></tr></thead><tbody>
              ${s.rolling.windows.map((w) => `<tr><td>${w.label}</td><td>${pct(w.winRate)}</td></tr>`).join("")}
            </tbody></table>
          </div>
          <div>
            <h3 class="section-sub">Cumulative</h3>
            <table class="table compact"><thead><tr><th>Games</th><th>WR</th></tr></thead><tbody>
              ${s.rolling.cumulative.map((w) => `<tr><td>${w.label}</td><td>${pct(w.winRate)}</td></tr>`).join("")}
            </tbody></table>
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
  return `
    <table class="table compact">
      <thead><tr><th>Deck</th><th>CI</th><th>G</th><th>WR</th></tr></thead>
      <tbody>
        ${decks.map((d) => `<tr><td class="deck-name">${escapeHtml(d.name)}</td><td>${colorBadge(d.colors)}</td><td>${d.games}</td><td>${pct(d.winRate)}</td></tr>`).join("")}
      </tbody>
    </table>`;
}

function renderDecks() {
  const { deckStats } = getStats();
  let list = deckStats;
  if (decksTab === "active") list = list.filter((d) => !d.retired);
  else if (decksTab === "retired") list = list.filter((d) => d.retired);
  if (deckBracketFilter) list = list.filter((d) => String(d.bracket) === deckBracketFilter);

  list = [...list].sort((a, b) => {
    if (deckSort === "name") return a.name.localeCompare(b.name);
    if (deckSort === "wr") return b.winRate - a.winRate || b.games - a.games;
    return b.games - a.games;
  });

  return `
    <section class="section">
      ${subTabs(DECKS_TABS, decksTab, "decks-tab")}
      <div class="section-header">
        <div class="filters inline">
          <label>Bracket <select id="deck-bracket"><option value="">All</option>${[1, 2, 3, 4, 5].map((b) => `<option value="${b}" ${deckBracketFilter === String(b) ? "selected" : ""}>${b}</option>`).join("")}</select></label>
          <label>Sort <select id="deck-sort">
            <option value="games" ${deckSort === "games" ? "selected" : ""}>Most games</option>
            <option value="wr" ${deckSort === "wr" ? "selected" : ""}>Win rate</option>
            <option value="name" ${deckSort === "name" ? "selected" : ""}>Name</option>
          </select></label>
        </div>
        <button type="button" class="btn btn-primary" id="add-deck-btn">+ Deck</button>
      </div>
      <table class="table">
        <thead><tr><th>Deck</th><th>CI</th><th>Brkt</th><th>G</th><th>W</th><th>L</th><th>WR</th></tr></thead>
        <tbody>
          ${list.length ? list.map((d) => `<tr><td class="deck-name">${escapeHtml(d.name)}</td><td>${colorBadge(d.colors)}</td><td>${d.bracket}</td><td>${d.games}</td><td>${d.wins}</td><td>${d.losses}</td><td>${d.games ? pct(d.winRate) : "—"}</td></tr>`).join("") : '<tr><td colspan="7" class="empty">No decks match.</td></tr>'}
        </tbody>
      </table>
    </section>
    <div id="deck-modal" class="modal hidden">
      <div class="modal-content">
        <h3>Add Deck</h3>
        <form id="deck-form">
          <label>Name<input name="name" required /></label>
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

  const sorted = [...data.games].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  const decks = [...new Set(data.decks.map((d) => d.name))].sort();
  const years = [...new Set(sorted.map((g) => gameYear(g.date)))].sort();

  return `
    <section class="section">
      ${subTabs(GAMES_TABS, gamesTab, "games-tab")}
      <div class="filters">
        <label>Deck<select id="filter-deck"><option value="">All</option>${decks.map((d) => `<option value="${escapeHtml(d)}" ${logFilters.deck === d ? "selected" : ""}>${escapeHtml(d)}</option>`).join("")}</select></label>
        <label>Result<select id="filter-result"><option value="">All</option><option value="Win" ${logFilters.result === "Win" ? "selected" : ""}>Wins</option><option value="Loss" ${logFilters.result === "Loss" ? "selected" : ""}>Losses</option></select></label>
        <label>Year<select id="filter-year"><option value="">All</option>${years.map((y) => `<option value="${y}" ${logFilters.year === y ? "selected" : ""}>${y}</option>`).join("")}</select></label>
        <span class="filter-count" id="filter-count">${sorted.length} games</span>
      </div>
      <div class="table-wrap">
        <table class="table" id="game-log-table">
          <thead><tr><th>Date</th><th>Deck</th><th>Result</th><th></th></tr></thead>
          <tbody>${sorted.map((g) => gameRow(g)).join("")}</tbody>
        </table>
      </div>
    </section>`;
}

function renderLogForm() {
  const decks = data.decks.filter((d) => !d.retired).sort((a, b) => a.name.localeCompare(b.name));
  const today = new Date().toISOString().slice(0, 10);
  return `
    <form id="add-game-form" class="game-form">
      <label>Date<input type="date" name="date" value="${today}" required /></label>
      <label>Deck<select name="deck" required><option value="">Select…</option>${decks.map((d) => `<option value="${escapeHtml(d.name)}">${escapeHtml(d.name)}</option>`).join("")}</select></label>
      <label>Result
        <div class="result-toggle">
          <label class="radio-card"><input type="radio" name="result" value="Win" checked /><span>Win</span></label>
          <label class="radio-card loss"><input type="radio" name="result" value="Loss" /><span>Loss</span></label>
        </div>
      </label>
      <button type="submit" class="btn btn-primary btn-lg">Save Game</button>
    </form>
    <div class="quick-log">
      <h3>Quick log (today)</h3>
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
    <td><button type="button" class="btn-icon delete-game" data-id="${g.id}">×</button></td></tr>`;
}

function addGame({ date, deck, result }) {
  if (!deck) return toast("Pick a deck", true);
  data.games.push({ id: nextGameId(data.games), date, deck, result });
  saveData(data);
  toast(`${result} logged`);
  gamesTab = "history";
  render();
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
