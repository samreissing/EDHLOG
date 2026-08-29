import { parseGameSeats } from "./matchups.js";
import {
  calcMatchupImpact,
  calcNormalizedMatchupImpact,
  formatMatchupImpact,
  matchupImpactClass,
  matchupOutcomeTieRank,
} from "./matchups.js";
import { getCommanderInfo, getCommanderMatchupIdentities, commanderMatchesTarget } from "./commander-names.js";
import { resolveCommanderColors } from "./commander-colors.js";
import { deckKey, deckCommander, deckId, deckTitle, findDeck, deckLabelForKey, deckTitleForKey } from "./deck-identity.js";
import { winRate, normalizedWinRate, computeTurnAverages } from "./stats.js";
import { compareGamesChronologically, formatDate } from "./dates.js";
import { commanderNames } from "./scryfall.js";
import { computeWinRateSeries, renderWinRateLineChart } from "./trends-chart.js";
import { pctCell } from "./wr-color.js";
import { MY_PLAYER_NAME } from "./opponent-search.js";

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function normalizeEntityKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

/** @param {import('./store.js').Game[]} games @param {string} playerName */
export function gamesForPlayer(games, playerName) {
  const key = normalizeEntityKey(playerName);
  return games.filter((game) =>
    parseGameSeats(game).some((seat) => normalizeEntityKey(seat.player) === key)
  );
}

/**
 * @param {import('./store.js').Game[]} games
 * @param {string} commanderName
 * @param {{ playerScope?: string | null, splitPartners?: boolean }} [options]
 */
export function gamesForDeck(games, commanderName, options = {}) {
  const { playerScope = null, splitPartners = false } = options;
  const playerKey = playerScope ? normalizeEntityKey(playerScope) : null;

  return games.filter((game) =>
    parseGameSeats(game).some((seat) => {
      if (playerKey && normalizeEntityKey(seat.player) !== playerKey) return false;
      return commanderMatchesTarget(seat.commander, commanderName, { splitPartners });
    })
  );
}

/** @param {import('./matchups.js').GameSeat} seat @param {import('./matchups.js').GameSeat[]} seats */
function seatOutcome(seat, seats) {
  if (seat.didWin) return "win";
  if (seats.some((s) => s !== seat && s.didWin)) return "loss";
  return "shared";
}

/** @param {import('./store.js').Game[]} games @param {(seat: import('./matchups.js').GameSeat, seats: import('./matchups.js').GameSeat[], game: import('./store.js').Game) => boolean} seatFilter */
function computeSeatStats(games, seatFilter) {
  let gamesCount = 0;
  let wins = 0;
  let losses = 0;
  let sharedLosses = 0;
  /** @type {import('./store.js').Game | null} */
  let lastPlayed = null;

  for (const game of games) {
    const seats = parseGameSeats(game);
    for (const seat of seats) {
      if (!seatFilter(seat, seats, game)) continue;
      gamesCount += 1;
      const outcome = seatOutcome(seat, seats);
      if (outcome === "win") wins += 1;
      else if (outcome === "loss") losses += 1;
      else sharedLosses += 1;
      if (!lastPlayed || compareGamesChronologically(lastPlayed, game) < 0) {
        lastPlayed = game;
      }
    }
  }

  return {
    games: gamesCount,
    wins,
    losses,
    sharedLosses,
    lastPlayed: lastPlayed?.date ?? null,
    winRate: winRate(wins, gamesCount),
    normalizedWr: normalizedWinRate(wins, gamesCount),
    ...computeSeatTurnAverages(games, seatFilter),
  };
}

/** @param {import('./store.js').Game[]} games @param {(seat: import('./matchups.js').GameSeat, seats: import('./matchups.js').GameSeat[], game: import('./store.js').Game) => boolean} seatFilter */
function computeSeatTurnAverages(games, seatFilter) {
  const winTurns = [];
  const lossTurns = [];

  for (const game of games) {
    const turn = Number(game.turn);
    if (!(turn > 0)) continue;

    const seats = parseGameSeats(game);
    for (const seat of seats) {
      if (!seatFilter(seat, seats, game)) continue;
      const outcome = seatOutcome(seat, seats);
      if (outcome === "win") winTurns.push(turn);
      else if (outcome === "loss") lossTurns.push(turn);
    }
  }

  const avg = (nums) => (nums.length ? nums.reduce((sum, n) => sum + n, 0) / nums.length : null);

  return {
    avgTurnWin: avg(winTurns),
    avgTurnLoss: avg(lossTurns),
  };
}

/** @param {import('./store.js').Game[]} games @param {(seat: import('./matchups.js').GameSeat, seats: import('./matchups.js').GameSeat[], game: import('./store.js').Game) => boolean} seatFilter */
function appearanceGamesForChart(games, seatFilter) {
  /** @type {{ date: string, result: 'Win' | 'Loss' }[]} */
  const appearances = [];

  for (const game of games) {
    const seats = parseGameSeats(game);
    for (const seat of seats) {
      if (!seatFilter(seat, seats, game)) continue;
      appearances.push({
        date: game.date,
        result: seat.didWin ? "Win" : "Loss",
      });
    }
  }

  return appearances.sort((a, b) => compareGamesChronologically(
    { date: a.date, time: "" },
    { date: b.date, time: "" }
  ));
}

function finalizeEntityMatchupRow(row) {
  const opponentWins = row.losses;
  return {
    ...row,
    winRate: row.games > 0 ? winRate(row.wins, row.games) : 0,
    normalizedWinRate:
      (row.wins + 25 * 0.25) / (row.games + 25),
    opponentWins,
    opponentWinRate: row.games > 0 ? winRate(opponentWins, row.games) : 0,
    matchupImpact: calcMatchupImpact(row.wins, row.games),
    normalizedMatchupImpact: calcNormalizedMatchupImpact(row.wins, row.games),
    opponentMatchupImpact: calcMatchupImpact(opponentWins, row.games),
    opponentNormalizedMatchupImpact: calcNormalizedMatchupImpact(opponentWins, row.games),
  };
}

/**
 * @param {import('./store.js').Game[]} games
 * @param {'players' | 'decks'} tabId
 * @param {(seat: import('./matchups.js').GameSeat, seats: import('./matchups.js').GameSeat[], game: import('./store.js').Game) => boolean} entitySeatFilter
 * @param {{ splitPartners?: boolean }} [options]
 */
function buildEntityMatchupRows(games, tabId, entitySeatFilter, options = {}) {
  const { splitPartners = false } = options;
  const rows = new Map();

  for (const game of games) {
    const seats = parseGameSeats(game);
    if (seats.length < 2) continue;

    for (const entitySeat of seats) {
      if (!entitySeatFilter(entitySeat, seats, game)) continue;

      for (const opponentSeat of seats) {
        if (opponentSeat === entitySeat) continue;
        if (tabId === "players" && !opponentSeat.player) continue;

        const pairs =
          tabId === "players"
            ? [
                {
                  subject: entitySeat.player,
                  opponent: opponentSeat.player,
                },
              ]
            : buildDeckMatchupPairs(entitySeat, opponentSeat, { splitPartners });

        for (const { subject, opponent } of pairs) {
          if (!subject || !opponent) continue;
          const mapKey = `${normalizeEntityKey(subject)}__${normalizeEntityKey(opponent)}`;
          const row =
            rows.get(mapKey) ??
            ({
              subject,
              opponent,
              games: 0,
              wins: 0,
              losses: 0,
              sharedLosses: 0,
            });

          row.games += 1;
          if (entitySeat.didWin) row.wins += 1;
          else if (opponentSeat.didWin) row.losses += 1;
          else row.sharedLosses += 1;
          rows.set(mapKey, row);
        }
      }
    }
  }

  return [...rows.values()]
    .map(finalizeEntityMatchupRow)
    .sort((a, b) => {
      if (b.normalizedMatchupImpact !== a.normalizedMatchupImpact) {
        return b.normalizedMatchupImpact - a.normalizedMatchupImpact;
      }
      const outcomeA = matchupOutcomeTieRank(a);
      const outcomeB = matchupOutcomeTieRank(b);
      if (outcomeB !== outcomeA) return outcomeB - outcomeA;
      if (b.games !== a.games) return b.games - a.games;
      return a.opponent.localeCompare(b.opponent, undefined, { numeric: true });
    });
}

/** @param {import('./matchups.js').GameSeat} entitySeat @param {import('./matchups.js').GameSeat} opponentSeat @param {{ splitPartners?: boolean }} options */
function buildDeckMatchupPairs(entitySeat, opponentSeat, options) {
  const { splitPartners = false } = options;
  const pairs = [];
  for (const subject of getCommanderMatchupIdentities(entitySeat.commander, { splitPartners })) {
    for (const opponent of getCommanderMatchupIdentities(opponentSeat.commander, { splitPartners })) {
      pairs.push({ subject, opponent });
    }
  }
  return pairs;
}

/** @param {import('./store.js').Deck[]} decks @param {string} commander */
export function findOwnedDeckKey(commander, decks) {
  const target = getCommanderInfo(commander).canonicalName;
  for (const deck of decks) {
    if (getCommanderInfo(deckCommander(deck)).canonicalName === target) {
      return deckKey(deck);
    }
  }
  return null;
}

/** @param {string} playerName @param {string} [label] */
export function renderPlayerReportLink(playerName, label = playerName) {
  if (!playerName?.trim()) return escapeHtml(label || "");
  return `<button type="button" class="link-btn entity-link" data-entity-report="player" data-entity-key="${escapeHtml(playerName.trim())}">${escapeHtml(label || playerName)}</button>`;
}

/**
 * @param {string} commanderOrKey
 * @param {import('./store.js').Deck[]} decks
 * @param {{ label?: string, playerScope?: string | null, deckSlotId?: string | null }} [options]
 */
export function renderDeckReportLink(commanderOrKey, decks, options = {}) {
  const { label, playerScope = null, deckSlotId = null } = options;
  const trimmed = String(commanderOrKey || "").trim();
  if (!trimmed && !deckSlotId) return escapeHtml(label || "");
  const owned = deckSlotId ? null : findOwnedDeckKey(trimmed, decks);
  const key = deckSlotId || owned || trimmed;
  const scopeAttr = playerScope
    ? ` data-entity-player-scope="${escapeHtml(playerScope)}"`
    : "";
  const slotAttr = deckSlotId ? ` data-entity-deck-slot="${escapeHtml(deckSlotId)}"` : "";
  return `<button type="button" class="link-btn entity-link" data-entity-report="deck" data-entity-key="${escapeHtml(key)}"${scopeAttr}${slotAttr}>${escapeHtml(label || deckLabelForKey(key, decks))}</button>`;
}

function statBlock(label, value, isWr = false) {
  const rendered = isWr ? pctCell(value) : `<span class="stat-value">${value}</span>`;
  return `<div class="stat-card"><span class="stat-label">${label}</span>${rendered}</div>`;
}

function formatTurnAvg(value) {
  return value != null ? value.toFixed(1) : "—";
}

function turnStatBlocks(stats) {
  return `
    ${statBlock("Avg Turn (Win)", formatTurnAvg(stats.avgTurnWin))}
    ${statBlock("Avg Turn (Loss)", formatTurnAvg(stats.avgTurnLoss))}`;
}

function impactCell(value) {
  const cls = matchupImpactClass(value);
  return `<span class="impact-cell ${cls}">${formatMatchupImpact(value)}</span>`;
}

/** @param {{ opponent: string }} row @param {'player' | 'deck'} opponentKind @param {import('./store.js').Deck[]} decks @param {string | null | undefined} playerScope */
function renderMatchupOpponentCell(row, opponentKind, decks, playerScope) {
  if (opponentKind === "player") {
    return renderPlayerReportLink(row.opponent);
  }
  return renderDeckReportLink(row.opponent, decks, { playerScope: playerScope || null });
}

function computeMyDeckSlotStats(games, deckSlotId) {
  const deckGames = games.filter((game) => game.deck === deckSlotId);
  let wins = 0;
  /** @type {import('./store.js').Game | null} */
  let lastPlayed = null;

  for (const game of deckGames) {
    if (game.result === "Win") wins += 1;
    if (!lastPlayed || compareGamesChronologically(lastPlayed, game) < 0) {
      lastPlayed = game;
    }
  }

  const gamesCount = deckGames.length;
  return {
    games: gamesCount,
    wins,
    losses: gamesCount - wins,
    sharedLosses: 0,
    lastPlayed: lastPlayed?.date ?? null,
    winRate: winRate(wins, gamesCount),
    normalizedWr: normalizedWinRate(wins, gamesCount),
    ...computeTurnAverages(deckGames),
  };
}

/** @param {import('./store.js').Game[]} games @param {string} deckSlotId */
function chartGamesForDeckSlot(games, deckSlotId) {
  return games
    .filter((game) => game.deck === deckSlotId)
    .map((game) => ({ date: game.date, result: game.result }));
}

/**
 * @param {import('./store.js').Game[]} games
 * @param {string} commanderName
 * @param {{ splitPartners?: boolean }} [options]
 */
function computeDeckPilotStats(games, commanderName, options = {}) {
  const { splitPartners = false } = options;
  /** @type {Map<string, { player: string, games: number, wins: number }>} */
  const rows = new Map();

  for (const game of games) {
    const seats = parseGameSeats(game);
    for (const seat of seats) {
      if (!seat.player) continue;
      if (!commanderMatchesTarget(seat.commander, commanderName, { splitPartners })) continue;

      const playerKey = normalizeEntityKey(seat.player);
      const row =
        rows.get(playerKey) ??
        ({
          player: seat.player,
          games: 0,
          wins: 0,
        });

      row.games += 1;
      if (seat.didWin) row.wins += 1;
      rows.set(playerKey, row);
    }
  }

  return [...rows.values()]
    .map((row) => ({
      ...row,
      winRate: winRate(row.wins, row.games),
      normalizedWr: normalizedWinRate(row.wins, row.games),
    }))
    .sort((a, b) => {
      if (b.normalizedWr !== a.normalizedWr) return b.normalizedWr - a.normalizedWr;
      if (b.games !== a.games) return b.games - a.games;
      return a.player.localeCompare(b.player, undefined, { numeric: true });
    });
}

function renderPilotTable(pilots) {
  if (!pilots.length) return "";

  return `
    <table class="table compact entity-matchup-table entity-pilot-table">
      <thead><tr>
        <th>Player</th>
        <th>G</th>
        <th>W</th>
        <th>Norm WR</th>
      </tr></thead>
      <tbody>
        ${pilots
          .map(
            (row) => `
          <tr>
            <td>${renderPlayerReportLink(row.player)}</td>
            <td>${row.games}</td>
            <td>${row.wins}</td>
            <td>${pctCell(row.normalizedWr)}</td>
          </tr>`
          )
          .join("")}
      </tbody>
    </table>`;
}

/**
 * @param {import('./store.js').Game[]} games
 * @param {import('./store.js').Deck[]} decks
 * @param {{ kind: 'player' | 'deck', key: string, playerScope?: string | null, splitPartners?: boolean, deckSlotId?: string | null }} request
 */
export function buildEntityReport(games, decks, request) {
  const { kind, key, playerScope = null, splitPartners = false, deckSlotId = null } = request;

  if (kind === "player") {
    const playerName = key;
    const playerKey = normalizeEntityKey(playerName);
    const seatFilter = (seat) => normalizeEntityKey(seat.player) === playerKey;
    const stats = computeSeatStats(games, seatFilter);
    const chartGames = appearanceGamesForChart(games, seatFilter);
    /** @type {Map<string, { name: string, games: number, ownedKey: string | null }>} */
    const deckRows = new Map();

    for (const game of games) {
      const seats = parseGameSeats(game);
      for (const seat of seats) {
        if (normalizeEntityKey(seat.player) !== playerKey || !seat.commander) continue;
        const canonical = getCommanderInfo(seat.commander).canonicalName;
        const row =
          deckRows.get(canonical) ??
          ({
            name: seat.commander,
            games: 0,
            ownedKey: findOwnedDeckKey(seat.commander, decks),
          });
        row.games += 1;
        deckRows.set(canonical, row);
      }
    }

    const isMe = playerKey === normalizeEntityKey(MY_PLAYER_NAME);
    const ownedDecks = isMe
      ? decks.map((deck) => ({
          key: deckId(deck),
          name: deckTitle(deck),
          commander: deckCommander(deck),
          deckSlotId: deckId(deck),
          games: games.filter((g) => g.deck === deckId(deck)).length,
          owned: true,
        }))
      : [];

    const playedDecks = [...deckRows.values()]
      .sort((a, b) => b.games - a.games || a.name.localeCompare(b.name))
      .map((row) => ({
        key: row.ownedKey || row.name,
        name: row.name,
        games: row.games,
        owned: !!row.ownedKey,
      }));

    const deckList = mergeDeckLists(ownedDecks, playedDecks);

    return {
      kind,
      title: playerName,
      subtitle: null,
      colors: [],
      stats,
      chartGames,
      deckList,
      pilots: [],
      playerMatchups: buildEntityMatchupRows(games, "players", seatFilter),
      deckMatchups: buildEntityMatchupRows(games, "decks", seatFilter, { splitPartners }),
      playerScope: null,
    };
  }

  if (kind === "deck" && deckSlotId) {
    const deck = findDeck(decks, deckSlotId);
    const title = deck ? deckTitle(deck) : deckTitleForKey(deckSlotId, decks);
    const commanderName = deck ? deckCommander(deck) : deckLabelForKey(key, decks);
    const slotStats = computeMyDeckSlotStats(games, deckSlotId);
    const slotChartGames = chartGamesForDeckSlot(games, deckSlotId);
    const seatFilter = (seat, seats, game) => {
      if (game.deck !== deckSlotId) return false;
      if (playerScope && normalizeEntityKey(seat.player) !== normalizeEntityKey(playerScope)) {
        return false;
      }
      return normalizeEntityKey(seat.player) === normalizeEntityKey(MY_PLAYER_NAME);
    };
    const colors = resolveCommanderColors(commanderName, {
      splitPartners,
      ownedColors: deck?.colors,
    });

    return {
      kind,
      title,
      subtitle: playerScope ? null : null,
      colors,
      stats: slotStats,
      chartGames: slotChartGames,
      deckList: [],
      pilots: [],
      playerMatchups: buildEntityMatchupRows(games, "players", seatFilter),
      deckMatchups: buildEntityMatchupRows(games, "decks", seatFilter, { splitPartners }),
      playerScope,
      deckSlotId,
      displayCommander: commanderName,
    };
  }

  const commanderName = deckLabelForKey(key, decks);
  const seatFilter = (seat) => {
    if (playerScope && normalizeEntityKey(seat.player) !== normalizeEntityKey(playerScope)) {
      return false;
    }
    return commanderMatchesTarget(seat.commander, commanderName, { splitPartners });
  };

  const stats = computeSeatStats(games, seatFilter);
  const chartGames = appearanceGamesForChart(games, seatFilter);
  const owned = findDeck(decks, key);
  const colors = resolveCommanderColors(commanderName, {
    splitPartners,
    ownedColors: owned?.colors,
  });

  const pilotStats = playerScope
    ? []
    : computeDeckPilotStats(games, commanderName, { splitPartners });

  return {
    kind,
    title: commanderName,
    subtitle: playerScope ? null : null,
    colors,
    stats,
    chartGames,
    deckList: [],
    pilots: pilotStats,
    playerMatchups: buildEntityMatchupRows(games, "players", seatFilter),
    deckMatchups: buildEntityMatchupRows(games, "decks", seatFilter, { splitPartners }),
    playerScope,
    deckSlotId: null,
    displayCommander: commanderName,
  };
}

/** @param {{ key: string, name: string, games: number, owned: boolean }[]} ownedDecks @param {{ key: string, name: string, games: number, owned: boolean }[]} playedDecks */
function mergeDeckLists(ownedDecks, playedDecks) {
  const merged = new Map();
  for (const row of [...ownedDecks, ...playedDecks]) {
    const canonical = getCommanderInfo(row.name).canonicalName;
    const existing = merged.get(canonical);
    if (existing) {
      existing.games = Math.max(existing.games, row.games);
      existing.owned = existing.owned || row.owned;
    } else {
      merged.set(canonical, { ...row });
    }
  }
  return [...merged.values()].sort((a, b) => b.games - a.games || a.name.localeCompare(b.name));
}

/** @param {ReturnType<typeof buildEntityReport>} report @param {import('./store.js').Deck[]} decks @param {'players' | 'decks'} [activeMatchupTab] */
function renderEntityMatchupsSection(report, decks, activeMatchupTab = "players") {
  const tabs = [
    { id: "players", label: "Player Matchups" },
    { id: "decks", label: "Deck Matchups" },
  ];

  const tabButtons = tabs
    .map(
      (tab) =>
        `<button type="button" role="tab" aria-selected="${tab.id === activeMatchupTab}" class="sub-tab ${tab.id === activeMatchupTab ? "active" : ""}" data-entity-matchup-tab="${tab.id}">${tab.label}</button>`
    )
    .join("");

  const playerPanel = renderMatchupTableWithCells(report.playerMatchups, (row) =>
    renderMatchupOpponentCell(row, "player", decks, report.playerScope)
  );
  const deckPanel = renderMatchupTableWithCells(report.deckMatchups, (row) =>
    renderMatchupOpponentCell(row, "deck", decks, report.playerScope)
  );

  return `
    <div class="entity-report-section entity-report-matchups">
      <div class="sub-tabs entity-report-matchup-tabs" role="tablist">${tabButtons}</div>
      <div class="entity-report-matchup-panel" data-entity-matchup-panel="players" role="tabpanel" ${activeMatchupTab === "players" ? "" : "hidden"}>${playerPanel}</div>
      <div class="entity-report-matchup-panel" data-entity-matchup-panel="decks" role="tabpanel" ${activeMatchupTab === "decks" ? "" : "hidden"}>${deckPanel}</div>
    </div>`;
}

/**
 * @param {ReturnType<typeof buildEntityReport>} report
 * @param {import('./store.js').Deck[]} decks
 * @param {'players' | 'decks'} [activeMatchupTab]
 */
export function renderEntityReportModal(report, decks, activeMatchupTab = "players") {
  const rootKey = report.title;
  const statsHtml = `
    ${statBlock("Games", report.stats.games)}
    ${statBlock("Wins", report.stats.wins)}
    ${statBlock("Win rate", report.stats.games ? report.stats.winRate : 0, !!report.stats.games)}
    ${statBlock("Norm WR", report.stats.games ? report.stats.normalizedWr : 0, !!report.stats.games)}
    ${turnStatBlocks(report.stats)}
    ${statBlock("Last played", report.stats.lastPlayed ? formatDate(report.stats.lastPlayed) : "—")}`;

  const chart =
    report.chartGames.length > 0
      ? renderWinRateLineChart(computeWinRateSeries(report.chartGames), "")
      : `<p class="muted-text entity-report-empty">No games logged yet.</p>`;

  const matchupsSection = renderEntityMatchupsSection(report, decks, activeMatchupTab);

  if (report.kind === "deck") {
    const commanders = commanderNames(report.displayCommander || report.title);
    const commanderImgs = commanders
      .map(
        (name) =>
          `<img class="commander-img loading" data-card-name="${escapeHtml(name)}" alt="${escapeHtml(name)}" title="${escapeHtml(name)}" />`
      )
      .join("");

    const pilotSection =
      !report.playerScope && report.pilots.length
        ? `<div class="entity-report-section entity-report-pilots">
            <h4>Piloted by</h4>
            ${renderPilotTable(report.pilots)}
          </div>`
        : "";

    return `
      <div class="modal-content modal-content-wide modal-content-report entity-report-deck" data-entity-report-root="${escapeHtml(rootKey)}">
        <div class="entity-report-header">
          <button type="button" class="btn btn-ghost btn-sm" id="close-entity-report">Close</button>
          <div>
            <h3 class="entity-report-title">${escapeHtml(report.title)}</h3>
            ${
              report.playerScope
                ? `<p class="muted-text entity-report-subtitle">Scoped to this player&apos;s games</p>`
                : ""
            }
          </div>
        </div>

        <div class="entity-report-deck-hero">
          <div class="entity-report-deck-art">
            <div class="deck-commander-images entity-report-images">${commanderImgs}</div>
          </div>
          <div class="entity-report-deck-stats">
            <div class="stat-grid entity-report-stats">${statsHtml}</div>
          </div>
        </div>

        ${pilotSection}

        <div class="entity-report-section entity-report-chart-section">
          <h4>Performance over time</h4>
          <div class="entity-report-chart">${chart}</div>
        </div>

        ${matchupsSection}
      </div>`;
  }

  const deckSection = report.deckList.length
    ? `<div class="entity-report-section">
        <h4>Decks</h4>
        <ul class="entity-report-links">
          ${report.deckList
            .map(
                (row) =>
                  `<li>${renderDeckReportLink(row.commander || row.key, decks, {
                    label: row.name,
                    playerScope: report.title,
                    deckSlotId: row.deckSlotId || null,
                  })} · ${row.games} game${row.games === 1 ? "" : "s"}</li>`
            )
            .join("")}
        </ul>
      </div>`
    : "";

  return `
    <div class="modal-content modal-content-wide modal-content-report entity-report-player" data-entity-report-root="${escapeHtml(rootKey)}">
      <div class="entity-report-header">
        <button type="button" class="btn btn-ghost btn-sm" id="close-entity-report">Close</button>
        <h3 class="entity-report-title">${escapeHtml(report.title)}</h3>
      </div>

      <div class="stat-grid entity-report-stats">${statsHtml}</div>

      ${deckSection}

      <div class="entity-report-section entity-report-chart-section">
        <h4>Performance over time</h4>
        <div class="entity-report-chart">${chart}</div>
      </div>

      ${matchupsSection}
    </div>`;
}

/** @param {ReturnType<typeof finalizeEntityMatchupRow>[]} rows @param {(row: ReturnType<typeof finalizeEntityMatchupRow>) => string} opponentCell */
function renderMatchupTableWithCells(rows, opponentCell) {
  if (!rows.length) {
    return `<p class="muted-text entity-report-empty">No matchup data yet.</p>`;
  }

  return `
    <table class="table compact entity-matchup-table">
      <thead><tr>
        <th>Opponent</th>
        <th>G</th>
        <th>W</th>
        <th>WR</th>
        <th>MI</th>
        <th>NMI</th>
      </tr></thead>
      <tbody>
        ${rows
          .map(
            (row) => `
          <tr>
            <td>${opponentCell(row)}</td>
            <td>${row.games}</td>
            <td>${row.wins}</td>
            <td>${pctCell(row.winRate)}</td>
            <td>${impactCell(row.matchupImpact)}</td>
            <td>${impactCell(row.normalizedMatchupImpact)}</td>
          </tr>`
          )
          .join("")}
      </tbody>
    </table>`;
}
