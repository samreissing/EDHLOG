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
  formatDate,
  pct,
} from "./stats.js";

const VIEWS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "decks", label: "Decks" },
  { id: "rankings", label: "Rankings" },
  { id: "years", label: "By Year" },
  { id: "rolling", label: "100-Game" },
  { id: "log", label: "Game Log" },
  { id: "add", label: "+ Log Game" },
];

let data = null;
let currentView = "dashboard";

async function boot() {
  data = await initData();
  renderNav();
  render();
  bindGlobalActions();
}

function bindGlobalActions() {
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
      toast("Data imported successfully");
    } catch {
      toast("Failed to import — check the JSON file", true);
    }
    e.target.value = "";
  });
  document.getElementById("reset-btn").addEventListener("click", async () => {
    if (confirm("Reset all data to the original spreadsheet seed? This cannot be undone.")) {
      data = await resetToSeed();
      render();
      toast("Reset to seed data");
    }
  });
}

function renderNav() {
  const nav = document.getElementById("nav");
  nav.innerHTML = VIEWS.map(
    (v) =>
      `<button type="button" class="nav-btn ${v.id === currentView ? "active" : ""}" data-view="${v.id}">${v.label}</button>`
  ).join("");
  nav.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentView = btn.dataset.view;
      renderNav();
      render();
    });
  });
}

function getStats() {
  const deckStats = computeDeckStats(data.decks, data.games);
  const overview = computeOverview(data.games);
  const colorStats = computeColorStats(deckStats);
  const bracketStats = computeBracketStats(data.games, deckStats);
  const yearStats = computeYearStats(data.games);
  const rolling = computeRolling100Stats(data.games);
  const rankings = computeRankings(deckStats, overview.winRate);
  return { deckStats, overview, colorStats, bracketStats, yearStats, rolling, rankings };
}

function render() {
  const main = document.getElementById("main");
  const stats = getStats();

  switch (currentView) {
    case "dashboard":
      main.innerHTML = renderDashboard(stats);
      break;
    case "decks":
      main.innerHTML = renderDecks(stats);
      break;
    case "rankings":
      main.innerHTML = renderRankings(stats);
      break;
    case "years":
      main.innerHTML = renderYears(stats);
      break;
    case "rolling":
      main.innerHTML = renderRolling(stats);
      break;
    case "log":
      main.innerHTML = renderGameLog();
      bindLogFilters();
      break;
    case "add":
      main.innerHTML = renderAddGame();
      bindAddGame();
      break;
  }
}

function statCard(label, value, sub) {
  return `<div class="stat-card"><span class="stat-label">${label}</span><span class="stat-value">${value}</span>${sub ? `<span class="stat-sub">${sub}</span>` : ""}</div>`;
}

function renderDashboard({ overview, colorStats, bracketStats, deckStats }) {
  const active = deckStats.filter((d) => !d.retired && d.games > 0);
  const retired = deckStats.filter((d) => d.retired && d.games > 0);

  return `
    <section class="section">
      <h2>Overview</h2>
      <div class="stat-grid">
        ${statCard("Total Games", overview.games)}
        ${statCard("Wins", overview.wins)}
        ${statCard("Losses", overview.losses)}
        ${statCard("Win Rate", pct(overview.winRate))}
      </div>
    </section>

    <div class="two-col">
      <section class="section">
        <h2>Color Identity Stats</h2>
        <table class="table">
          <thead><tr><th>Color</th><th>Decks</th><th>Games</th><th>Wins</th><th>WR</th></tr></thead>
          <tbody>
            ${colorStats
              .map(
                (c) => `
              <tr>
                <td><span class="color-label">${colorBadge([c.color])} ${c.name}</span></td>
                <td>${c.decks}</td>
                <td>${c.games}</td>
                <td>${c.wins}</td>
                <td class="${c.winRate >= overview.winRate ? "positive" : "negative"}">${pct(c.winRate)}</td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </section>

      <section class="section">
        <h2>Bracket Stats</h2>
        <table class="table">
          <thead><tr><th>Bracket</th><th>Games</th><th>Wins</th><th>WR</th></tr></thead>
          <tbody>
            ${bracketStats
              .filter((b) => b.games > 0)
              .map(
                (b) => `
              <tr>
                <td>Bracket ${b.bracket}</td>
                <td>${b.games}</td>
                <td>${b.wins}</td>
                <td>${pct(b.winRate)}</td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </section>
    </div>

    <div class="two-col">
      <section class="section">
        <h2>Active Decks <span class="badge">${active.length}</span></h2>
        ${deckTable(active.slice(0, 8), true)}
        ${active.length > 8 ? `<p class="hint"><button type="button" class="link-btn" data-goto="decks">View all decks →</button></p>` : ""}
      </section>
      <section class="section">
        <h2>Retired Decks <span class="badge muted">${retired.length}</span></h2>
        ${deckTable(retired.slice(0, 5), false)}
      </section>
    </div>
  `;
}

function deckTable(decks, showColors) {
  if (!decks.length) return '<p class="empty">No games logged yet.</p>';
  return `
    <table class="table compact">
      <thead><tr><th>Deck</th>${showColors ? "<th>CI</th>" : ""}<th>Brkt</th><th>G</th><th>W</th><th>WR</th></tr></thead>
      <tbody>
        ${decks
          .sort((a, b) => b.games - a.games)
          .map(
            (d) => `
          <tr>
            <td class="deck-name">${d.name}</td>
            ${showColors ? `<td>${colorBadge(d.colors)}</td>` : ""}
            <td>${d.bracket}</td>
            <td>${d.games}</td>
            <td>${d.wins}</td>
            <td>${pct(d.winRate)}</td>
          </tr>`
          )
          .join("")}
      </tbody>
    </table>`;
}

function renderDecks({ deckStats }) {
  const active = deckStats.filter((d) => !d.retired).sort((a, b) => b.games - a.games);
  const retired = deckStats.filter((d) => d.retired).sort((a, b) => b.games - a.games);

  return `
    <section class="section">
      <div class="section-header">
        <h2>Active Decks</h2>
        <button type="button" class="btn btn-primary" id="add-deck-btn">+ Add Deck</button>
      </div>
      ${fullDeckTable(active)}
    </section>
    <section class="section">
      <h2>Retired Decks</h2>
      ${fullDeckTable(retired)}
    </section>
    <div id="deck-modal" class="modal hidden">
      <div class="modal-content">
        <h3>Add Deck</h3>
        <form id="deck-form">
          <label>Name<input name="name" required placeholder="Commander name" /></label>
          <label>Bracket<select name="bracket">${[1, 2, 3, 4, 5].map((b) => `<option value="${b}" ${b === 4 ? "selected" : ""}>${b}</option>`).join("")}</select></label>
          <fieldset class="color-fieldset">
            <legend>Color Identity</legend>
            ${["W", "U", "B", "R", "G"]
              .map((c) => `<label class="checkbox"><input type="checkbox" name="color" value="${c}" /> ${c}</label>`)
              .join("")}
          </fieldset>
          <label class="checkbox"><input type="checkbox" name="retired" /> Retired</label>
          <div class="form-actions">
            <button type="button" class="btn btn-ghost" id="cancel-deck">Cancel</button>
            <button type="submit" class="btn btn-primary">Save Deck</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function fullDeckTable(decks) {
  if (!decks.length) return '<p class="empty">None</p>';
  return `
    <table class="table">
      <thead><tr><th>Deck</th><th>CI</th><th>Brkt</th><th>Games</th><th>Wins</th><th>Losses</th><th>WR</th></tr></thead>
      <tbody>
        ${decks
          .map(
            (d) => `
          <tr>
            <td class="deck-name">${d.name}</td>
            <td>${colorBadge(d.colors)}</td>
            <td>${d.bracket}</td>
            <td>${d.games}</td>
            <td>${d.wins}</td>
            <td>${d.losses}</td>
            <td>${d.games ? pct(d.winRate) : "—"}</td>
          </tr>`
          )
          .join("")}
      </tbody>
    </table>`;
}

function renderRankings({ rankings }) {
  const byBracket = {};
  for (const d of rankings) {
    if (!byBracket[d.bracket]) byBracket[d.bracket] = [];
    byBracket[d.bracket].push(d);
  }

  return `
    <section class="section">
      <h2>All Decks Ranked</h2>
      <p class="hint">Sorted by adjusted win rate (shrunk toward your overall average). Real WR shown for comparison.</p>
      <table class="table">
        <thead><tr><th>#</th><th>Deck</th><th>Brkt</th><th>G</th><th>Adj WR</th><th>Real WR</th></tr></thead>
        <tbody>
          ${rankings
            .map(
              (d, i) => `
            <tr>
              <td>${i + 1}</td>
              <td class="deck-name">${d.name}${d.retired ? ' <span class="tag retired">retired</span>' : ""}</td>
              <td>${d.bracket}</td>
              <td>${d.games}</td>
              <td class="highlight">${pct(d.normalizedWr)}</td>
              <td>${pct(d.winRate)}</td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>
    </section>

    <div class="bracket-rankings">
      ${[1, 2, 3, 4, 5]
        .filter((b) => byBracket[b]?.length)
        .map(
          (b) => `
        <section class="section">
          <h2>Bracket ${b}</h2>
          <table class="table compact">
            <thead><tr><th>#</th><th>Deck</th><th>Adj WR</th><th>Real WR</th></tr></thead>
            <tbody>
              ${byBracket[b]
                .slice(0, 10)
                .map(
                  (d, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td class="deck-name">${d.name}</td>
                  <td>${pct(d.normalizedWr)}</td>
                  <td>${pct(d.winRate)}</td>
                </tr>`
                )
                .join("")}
            </tbody>
          </table>
        </section>`
        )
        .join("")}
    </div>
  `;
}

function renderYears({ yearStats }) {
  return `
    <section class="section">
      <h2>Stats by Year</h2>
      <div class="year-cards">
        ${yearStats
          .map(
            (y) => `
          <div class="year-card">
            <h3>${y.year}</h3>
            <div class="year-stats">
              <div><span class="mini-label">Games</span><span>${y.games}</span></div>
              <div><span class="mini-label">Wins</span><span>${y.wins}</span></div>
              <div><span class="mini-label">Win Rate</span><span class="highlight">${pct(y.winRate)}</span></div>
            </div>
          </div>`
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderRolling({ rolling }) {
  if (!rolling.windows.length) {
    return '<section class="section"><p class="empty">Need at least 100 games for rolling stats. Keep playing!</p></section>';
  }

  return `
    <div class="two-col">
      <section class="section">
        <h2>Per 100 Games</h2>
        <table class="table">
          <thead><tr><th>Games</th><th>Win Rate</th></tr></thead>
          <tbody>
            ${rolling.windows.map((w) => `<tr><td>${w.label}</td><td>${pct(w.winRate)}</td></tr>`).join("")}
          </tbody>
        </table>
      </section>
      <section class="section">
        <h2>Cumulative</h2>
        <table class="table">
          <thead><tr><th>Games</th><th>Win Rate</th></tr></thead>
          <tbody>
            ${rolling.cumulative.map((w) => `<tr><td>${w.label}</td><td>${pct(w.winRate)}</td></tr>`).join("")}
          </tbody>
        </table>
      </section>
    </div>
  `;
}

function renderGameLog() {
  const sorted = [...data.games].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  const decks = [...new Set(data.decks.map((d) => d.name))].sort();

  return `
    <section class="section">
      <div class="filters">
        <label>Deck<select id="filter-deck"><option value="">All decks</option>${decks.map((d) => `<option value="${d}">${d}</option>`).join("")}</select></label>
        <label>Result<select id="filter-result"><option value="">All</option><option value="Win">Wins</option><option value="Loss">Losses</option></select></label>
        <label>Year<select id="filter-year"><option value="">All years</option>${[...new Set(sorted.map((g) => g.date.slice(0, 4)))].map((y) => `<option value="${y}">${y}</option>`).join("")}</select></label>
        <span class="filter-count" id="filter-count">${sorted.length} games</span>
      </div>
      <div class="table-wrap">
        <table class="table" id="game-log-table">
          <thead><tr><th>Date</th><th>Deck</th><th>Result</th><th></th></tr></thead>
          <tbody>
            ${sorted.map((g) => gameRow(g)).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function gameRow(g) {
  const resultClass = g.result === "Win" ? "win" : "loss";
  return `
    <tr data-deck="${g.deck}" data-result="${g.result}" data-year="${g.date.slice(0, 4)}">
      <td>${formatDate(g.date)}</td>
      <td class="deck-name">${g.deck}</td>
      <td><span class="result-pill ${resultClass}">${g.result}</span></td>
      <td><button type="button" class="btn-icon delete-game" data-id="${g.id}" title="Delete">×</button></td>
    </tr>`;
}

function bindLogFilters() {
  const deck = document.getElementById("filter-deck");
  const result = document.getElementById("filter-result");
  const year = document.getElementById("filter-year");
  const count = document.getElementById("filter-count");

  function apply() {
    const rows = document.querySelectorAll("#game-log-table tbody tr");
    let visible = 0;
    rows.forEach((row) => {
      const show =
        (!deck.value || row.dataset.deck === deck.value) &&
        (!result.value || row.dataset.result === result.value) &&
        (!year.value || row.dataset.year === year.value);
      row.hidden = !show;
      if (show) visible++;
    });
    count.textContent = `${visible} games`;
  }

  deck.addEventListener("change", apply);
  result.addEventListener("change", apply);
  year.addEventListener("change", apply);

  document.querySelectorAll(".delete-game").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!confirm("Delete this game?")) return;
      data.games = data.games.filter((g) => g.id !== btn.dataset.id);
      saveData(data);
      render();
      toast("Game deleted");
    });
  });
}

function renderAddGame() {
  const decks = data.decks.filter((d) => !d.retired).sort((a, b) => a.name.localeCompare(b.name));
  const today = new Date().toISOString().slice(0, 10);

  return `
    <section class="section narrow">
      <h2>Log a Game</h2>
      <form id="add-game-form" class="game-form">
        <label>
          Date
          <input type="date" name="date" value="${today}" required />
        </label>
        <label>
          Deck
          <select name="deck" required>
            <option value="">Select deck…</option>
            ${decks.map((d) => `<option value="${d.name}">${d.name}</option>`).join("")}
          </select>
        </label>
        <label>
          Result
          <div class="result-toggle">
            <label class="radio-card"><input type="radio" name="result" value="Win" checked /><span>Win</span></label>
            <label class="radio-card loss"><input type="radio" name="result" value="Loss" /><span>Loss</span></label>
          </div>
        </label>
        <button type="submit" class="btn btn-primary btn-lg">Save Game</button>
      </form>

      <div class="quick-log">
        <h3>Quick log (same deck, today)</h3>
        <div class="quick-grid">
          ${decks
            .slice(0, 6)
            .map(
              (d) => `
            <div class="quick-deck">
              <span class="quick-name">${d.name}</span>
              <button type="button" class="btn btn-sm win quick-win" data-deck="${d.name}">W</button>
              <button type="button" class="btn btn-sm loss quick-loss" data-deck="${d.name}">L</button>
            </div>`
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function bindAddGame() {
  const form = document.getElementById("add-game-form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    addGame({
      date: fd.get("date"),
      deck: fd.get("deck"),
      result: fd.get("result"),
    });
  });

  document.querySelectorAll(".quick-win, .quick-loss").forEach((btn) => {
    btn.addEventListener("click", () => {
      addGame({
        date: new Date().toISOString().slice(0, 10),
        deck: btn.dataset.deck,
        result: btn.classList.contains("quick-win") ? "Win" : "Loss",
      });
    });
  });
}

function addGame({ date, deck, result }) {
  if (!deck) {
    toast("Pick a deck", true);
    return;
  }
  const game = {
    id: nextGameId(data.games),
    date,
    deck,
    result,
  };
  data.games.push(game);
  saveData(data);
  toast(`${result} logged for ${deck}`);
  currentView = "log";
  renderNav();
  render();
}

// Deck modal handlers (delegated after decks view render)
document.addEventListener("click", (e) => {
  if (e.target.id === "add-deck-btn") {
    document.getElementById("deck-modal").classList.remove("hidden");
  }
  if (e.target.id === "cancel-deck") {
    document.getElementById("deck-modal").classList.add("hidden");
  }
  if (e.target.dataset?.goto) {
    currentView = e.target.dataset.goto;
    renderNav();
    render();
  }
});

document.addEventListener("submit", (e) => {
  if (e.target.id === "deck-form") {
    e.preventDefault();
    const fd = new FormData(e.target);
    const colors = fd.getAll("color");
    const deck = {
      name: fd.get("name").trim(),
      bracket: Number(fd.get("bracket")),
      colors,
      retired: fd.get("retired") === "on",
    };
    if (data.decks.some((d) => d.name === deck.name)) {
      toast("Deck already exists", true);
      return;
    }
    data.decks.push(deck);
    saveData(data);
    document.getElementById("deck-modal").classList.add("hidden");
    e.target.reset();
    render();
    toast(`Added ${deck.name}`);
  }
});

function toast(msg, isError = false) {
  const el = document.createElement("div");
  el.className = `toast ${isError ? "error" : ""}`;
  el.textContent = msg;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add("show"));
  setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => el.remove(), 300);
  }, 2500);
}

boot();
