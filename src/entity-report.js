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
import { deckKey, deckCommander, deckId, deckTitle, findDeck, deckLabelForKey, deckTitleForKey, deckMapByKey } from "./deck-identity.js";
import { winRate, normalizedWinRate, computeTurnAverages, gameBracket } from "./stats.js";
import { compareGamesChronologically, formatDate, gameSortKey, normalizeDate } from "./dates.js";
import { commanderImageSlots } from "./commander-names.js";
import { renderCommanderImageTags } from "./scryfall.js";
import { getChartDateBounds, getEffectiveChartRange } from "./chart-series.js";
import {
  clampTrendsGameRange,
  computeWinRateSeries,
  renderTrendsGameRangeControls,
  renderWinRateLineChart,
} from "./trends-chart.js";
import { pctCell } from "./wr-color.js";
import { MY_PLAYER_NAME } from "./opponent-search.js";
import {
  findOpponentDeck,
  findOpponentDeckByPair,
  gamesForOpponentDeck,
  opponentDeckCommander,
  opponentDeckLabel,
  opponentDeckTitle,
  opponentEntryMatchesDeck,
} from "./opponent-decks.js";
import { deckMatchesArchetypeKey } from "./archetype-stats.js";
import { sortHeader, applySort, WINS_SORT_TIE_BREAKERS } from "./table.js";

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

/** @param {import('./store.js').Game} game */
export function gameHasPodDetail(game) {
  if (!game.mySeat) return false;
  const opponents = game.opponents || [];
  if (!opponents.length) return false;
  return opponents.some(
    (o) => String(o.name || "").trim() || String(o.player || "").trim()
  );
}

/** @param {import('./store.js').Game[]} games */
function sortEntityGames(games) {
  return [...games].sort((a, b) => compareGamesChronologically(b, a));
}

/** @param {import('./store.js').Game[]} games @param {string} playerName @param {import('./store.js').Deck[]} decks */
export function gamesForPlayer(games, playerName, decks) {
  const key = normalizeEntityKey(playerName);
  return games.filter((game) =>
    parseGameSeats(game, decks).some((seat) => normalizeEntityKey(seat.player) === key)
  );
}

/**
 * @param {import('./store.js').Game[]} games
 * @param {string} commanderName
 * @param {{ playerScope?: string | null, splitPartners?: boolean }} [options]
 * @param {import('./store.js').Deck[]} decks
 */
export function gamesForDeck(games, commanderName, options = {}, decks) {
  const { playerScope = null, splitPartners = false } = options;
  const playerKey = playerScope ? normalizeEntityKey(playerScope) : null;

  return games.filter((game) =>
    parseGameSeats(game, decks).some((seat) => {
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

/** @param {number | string | null | undefined} seat */
function isRecordedSeat(seat) {
  const seatNum = Number(seat);
  return Number.isInteger(seatNum) && seatNum >= 1 && seatNum <= 4;
}

/** @param {import('./store.js').Game[]} games @param {(seat: import('./matchups.js').GameSeat, seats: import('./matchups.js').GameSeat[], game: import('./store.js').Game) => boolean} seatFilter @param {import('./store.js').Deck[]} decks */
function computeSeatStats(games, seatFilter, decks) {
  let gamesCount = 0;
  let wins = 0;
  let losses = 0;
  let sharedLosses = 0;
  /** @type {import('./store.js').Game | null} */
  let lastPlayed = null;

  for (const game of games) {
    const seats = parseGameSeats(game, decks);
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
    ...computeSeatTurnAverages(games, seatFilter, decks),
  };
}

/** @param {import('./store.js').Game[]} games @param {(seat: import('./matchups.js').GameSeat, seats: import('./matchups.js').GameSeat[], game: import('./store.js').Game) => boolean} seatFilter @param {import('./store.js').Deck[]} decks */
function computeSeatTurnAverages(games, seatFilter, decks) {
  const winTurns = [];
  const lossTurns = [];

  for (const game of games) {
    const turn = Number(game.turn);
    if (!(turn > 0)) continue;

    const seats = parseGameSeats(game, decks);
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

/** @param {import('./store.js').Game[]} games @param {(seat: import('./matchups.js').GameSeat, seats: import('./matchups.js').GameSeat[], game: import('./store.js').Game) => boolean} seatFilter @param {import('./store.js').Deck[]} decks */
function appearanceGamesForChart(games, seatFilter, decks) {
  /** @type {{ date: string, result: 'Win' | 'Loss', turn?: number, seat?: number }[]} */
  const appearances = [];

  for (const game of games) {
    const seats = parseGameSeats(game, decks);
    for (const seat of seats) {
      if (!seatFilter(seat, seats, game)) continue;
      appearances.push({
        date: game.date,
        result: seat.didWin ? "Win" : "Loss",
        turn: game.turn,
        seat: seat.seat,
      });
    }
  }

  return appearances.sort((a, b) => compareGamesChronologically(
    { date: a.date, time: "" },
    { date: b.date, time: "" }
  ));
}

/** @param {{ date: string, result: 'Win' | 'Loss' }[]} chartGames @param {string} start @param {string} end */
function chartGamesInDateRange(chartGames, start, end) {
  const startDate = normalizeDate(start) || start;
  const endDate = normalizeDate(end) || end;
  return chartGames.filter((game) => {
    const date = normalizeDate(game.date) || game.date;
    return date >= startDate && date <= endDate;
  });
}

/** @param {import('./store.js').Game[]} games @param {(seat: import('./matchups.js').GameSeat, seats: import('./matchups.js').GameSeat[], game: import('./store.js').Game) => boolean} seatFilter @param {import('./store.js').Deck[]} decks */
function computeEntitySeatRankings(games, seatFilter, decks) {
  /** @type {Array<{ seat: number, games: number, wins: number, winRate: number, normalizedWr: number }>} */
  const rankings = [];

  for (let seatNum = 1; seatNum <= 4; seatNum += 1) {
    const stats = computeSeatStats(
      games,
      (seat, seats, game) =>
        seatFilter(seat, seats, game) && isRecordedSeat(seat.seat) && seat.seat === seatNum,
      decks
    );
    if (stats.games > 0) {
      rankings.push({ seat: seatNum, ...stats });
    }
  }

  return rankings.sort((a, b) => {
    if (b.winRate !== a.winRate) return b.winRate - a.winRate;
    if (b.games !== a.games) return b.games - a.games;
    return a.seat - b.seat;
  });
}

/**
 * @param {{ date: string, result: 'Win' | 'Loss' }[]} chartGames
 * @param {{ start: string|null, end: string|null, customized: boolean }} chartRangeState
 * @param {{ min: number, max: number|null, customized: boolean }} gameRangeState
 */
export function getEntityChartContext(chartGames, chartRangeState, gameRangeState) {
  const sorted = [...chartGames];
  const total = sorted.length;
  const datedGames = sorted.map((game) => ({ date: game.date }));
  const filterBounds = getChartDateBounds(datedGames);

  let poolGames = sorted;
  if (chartRangeState.customized) {
    const dateRange = getEffectiveChartRange(datedGames, chartRangeState);
    poolGames = chartGamesInDateRange(sorted, dateRange.start, dateRange.end);
  }

  const poolSet = new Set(poolGames);
  const indices = [];
  sorted.forEach((game, index) => {
    if (poolSet.has(game)) indices.push(index + 1);
  });
  const boundsMin = indices.length ? Math.min(...indices) : 1;
  const boundsMax = indices.length ? Math.max(...indices) : Math.max(1, total);
  const min = gameRangeState.customized ? gameRangeState.min ?? boundsMin : boundsMin;
  const max = gameRangeState.customized ? gameRangeState.max ?? boundsMax : boundsMax;
  const gameRange = clampTrendsGameRange(min, max, boundsMin, boundsMax);
  const rangeGames = sorted.slice(gameRange.min - 1, gameRange.max);
  const chartSource = rangeGames.length ? rangeGames : poolGames.length ? poolGames : sorted;
  const chartRange = getEffectiveChartRange(
    chartSource.map((game) => ({ date: game.date })),
    chartRangeState
  );
  const rangeWins = rangeGames.filter((game) => game.result === "Win").length;
  const headerWinRate = rangeGames.length ? winRate(rangeWins, rangeGames.length) : null;
  const filteredStats = computeStatsFromChartAppearances(rangeGames);
  const filteredSeatRankings = computeSeatRankingsFromChartAppearances(rangeGames);

  return {
    sorted,
    poolGames,
    filterBounds,
    boundsMin,
    boundsMax,
    gameRange,
    rangeGames,
    chartRange,
    headerWinRate,
    filteredStats,
    filteredSeatRankings,
  };
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
 * @param {{ splitPartners?: boolean, groupByOpponent?: boolean }} [options]
 * @param {import('./store.js').Deck[]} decks
 */
function buildEntityMatchupRows(games, tabId, entitySeatFilter, options = {}, decks) {
  const { splitPartners = false, groupByOpponent = false } = options;
  const rows = new Map();

  for (const game of games) {
    const seats = parseGameSeats(game, decks);
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
          const mapKey = groupByOpponent
            ? normalizeEntityKey(opponent)
            : `${normalizeEntityKey(subject)}__${normalizeEntityKey(opponent)}`;
          const row =
            rows.get(mapKey) ??
            ({
              subject: groupByOpponent ? "" : subject,
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
export function renderArchetypeReportLink(
  archetypeKey,
  label = archetypeKey,
  { view = "unique", tagKind = "archetype", scope = "mine" } = {}
) {
  const trimmed = String(archetypeKey || "").trim();
  if (!trimmed) return escapeHtml(label || "");
  return `<button type="button" class="link-btn entity-link" data-entity-report="archetype" data-entity-key="${escapeHtml(trimmed)}" data-entity-archetype-view="${escapeHtml(view)}" data-entity-archetype-tag-kind="${escapeHtml(tagKind)}" data-entity-archetype-scope="${escapeHtml(scope)}">${escapeHtml(label || trimmed)}</button>`;
}

export function renderPlayerReportLink(playerName, label = playerName) {
  if (!playerName?.trim()) return escapeHtml(label || "");
  return `<button type="button" class="link-btn entity-link" data-entity-report="player" data-entity-key="${escapeHtml(playerName.trim())}">${escapeHtml(label || playerName)}</button>`;
}

/**
 * @param {string} commanderOrKey
 * @param {import('./store.js').Deck[]} decks
 * @param {{ label?: string, playerScope?: string | null, deckSlotId?: string | null, opponentDeckId?: string | null }} [options]
 */
export function renderDeckReportLink(commanderOrKey, decks, options = {}) {
  const { label, playerScope = null, deckSlotId = null, opponentDeckId = null } = options;
  const trimmed = String(commanderOrKey || "").trim();
  if (!trimmed && !deckSlotId && !opponentDeckId) return escapeHtml(label || "");
  const owned = deckSlotId || opponentDeckId ? null : findOwnedDeckKey(trimmed, decks);
  const key = deckSlotId || owned || trimmed;
  const scopeAttr = playerScope
    ? ` data-entity-player-scope="${escapeHtml(playerScope)}"`
    : "";
  const slotAttr = deckSlotId ? ` data-entity-deck-slot="${escapeHtml(deckSlotId)}"` : "";
  const opponentAttr = opponentDeckId
    ? ` data-entity-opponent-deck="${escapeHtml(opponentDeckId)}"`
    : "";
  return `<button type="button" class="link-btn entity-link" data-entity-report="deck" data-entity-key="${escapeHtml(key)}"${scopeAttr}${slotAttr}${opponentAttr}>${escapeHtml(label || deckLabelForKey(key, decks))}</button>`;
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
    .map((game) => ({
      date: game.date,
      result: game.result,
      turn: game.turn,
      seat: game.mySeat,
    }))
    .sort((a, b) => compareGamesChronologically({ date: a.date, time: "" }, { date: b.date, time: "" }));
}

/** @param {{ date: string, result: 'Win' | 'Loss', turn?: number, seat?: number }[]} appearances */
function computeStatsFromChartAppearances(appearances) {
  const gamesCount = appearances.length;
  const wins = appearances.filter((game) => game.result === "Win").length;
  const winTurns = [];
  const lossTurns = [];

  for (const game of appearances) {
    const turn = Number(game.turn);
    if (!(turn > 0)) continue;
    if (game.result === "Win") winTurns.push(turn);
    else lossTurns.push(turn);
  }

  const avg = (nums) => (nums.length ? nums.reduce((sum, n) => sum + n, 0) / nums.length : null);

  return {
    games: gamesCount,
    wins,
    losses: gamesCount - wins,
    sharedLosses: 0,
    lastPlayed: gamesCount ? appearances[gamesCount - 1].date : null,
    winRate: winRate(wins, gamesCount),
    normalizedWr: normalizedWinRate(wins, gamesCount),
    avgTurnWin: avg(winTurns),
    avgTurnLoss: avg(lossTurns),
  };
}

/** @param {{ date: string, result: 'Win' | 'Loss', turn?: number, seat?: number }[]} appearances */
function computeSeatRankingsFromChartAppearances(appearances) {
  /** @type {Map<number, { seat: number, games: number, wins: number }>} */
  const bySeat = new Map();

  for (const game of appearances) {
    if (!isRecordedSeat(game.seat)) continue;
    const seatNum = Number(game.seat);
    const row = bySeat.get(seatNum) ?? { seat: seatNum, games: 0, wins: 0 };
    row.games += 1;
    if (game.result === "Win") row.wins += 1;
    bySeat.set(seatNum, row);
  }

  return [...bySeat.values()]
    .map((row) => ({
      ...row,
      winRate: winRate(row.wins, row.games),
    }))
    .sort((a, b) => {
      if (b.winRate !== a.winRate) return b.winRate - a.winRate;
      if (b.games !== a.games) return b.games - a.games;
      return a.seat - b.seat;
    });
}

/**
 * @param {import('./store.js').Game[]} games
 * @param {string} commanderName
 * @param {{ splitPartners?: boolean }} [options]
 * @param {import('./store.js').Deck[]} decks
 */
function computeDeckPilotStats(games, commanderName, options = {}, decks) {
  const { splitPartners = false } = options;
  /** @type {Map<string, { player: string, games: number, wins: number }>} */
  const rows = new Map();

  for (const game of games) {
    const seats = parseGameSeats(game, decks);
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

/** @param {import('./store.js').Deck | import('./opponent-decks.js').OpponentDeck | null | undefined} deck @param {'archetype' | 'tribe'} tagKind */
function entityDeckTags(deck, tagKind) {
  if (!deck) return [];
  return tagKind === "tribe" ? deck.tribes : deck.archetypes;
}

/** @param {import('./opponent-decks.js').OpponentDeck[]} opponentDecks @param {import('./store.js').Game} game @param {import('./matchups.js').GameSeat} seat */
function resolveOpponentDeckForEntitySeat(opponentDecks, game, seat) {
  const opp = (game.opponents || []).find((entry) => Number(entry.seat) === Number(seat.seat));
  if (!opp) return null;

  if (opp.opponentDeckId) {
    const byId = findOpponentDeck(opponentDecks, opp.opponentDeckId);
    if (byId && opponentEntryMatchesDeck(game, opp, byId)) return byId;
  }

  return findOpponentDeckByPair(opponentDecks, seat.player || "", opp.name);
}

/**
 * @param {import('./matchups.js').GameSeat} seat
 * @param {import('./matchups.js').GameSeat[]} seats
 * @param {import('./store.js').Game} game
 * @param {string} archetypeKey
 * @param {'unique' | 'combined' | 'exact'} archetypeView
 * @param {'archetype' | 'tribe'} tagKind
 * @param {'mine' | 'all' | 'opponents'} archetypeScope
 * @param {import('./store.js').Deck[]} decks
 * @param {import('./opponent-decks.js').OpponentDeck[]} opponentDecks
 */
function seatMatchesArchetype(
  seat,
  seats,
  game,
  archetypeKey,
  archetypeView,
  tagKind,
  archetypeScope,
  decks,
  opponentDecks
) {
  const isMe = normalizeEntityKey(seat.player) === normalizeEntityKey(MY_PLAYER_NAME);

  if (archetypeScope === "opponents" && isMe) return false;

  if (isMe) {
    if (archetypeScope === "opponents") return false;
    const deck = findDeck(decks, game.deck);
    return deckMatchesArchetypeKey(entityDeckTags(deck, tagKind), archetypeKey, archetypeView);
  }

  if (archetypeScope === "mine") return false;

  const oppDeck = resolveOpponentDeckForEntitySeat(opponentDecks, game, seat);
  return deckMatchesArchetypeKey(entityDeckTags(oppDeck, tagKind), archetypeKey, archetypeView);
}

/** @param {import('./store.js').Game[]} games @param {(seat: import('./matchups.js').GameSeat, seats: import('./matchups.js').GameSeat[], game: import('./store.js').Game) => boolean} seatFilter @param {import('./store.js').Deck[]} decks */
function gamesForArchetypeSeatFilter(games, seatFilter, decks) {
  return games.filter((game) => {
    const seats = parseGameSeats(game, decks);
    return seats.some((seat) => seatFilter(seat, seats, game));
  });
}

/**
 * @param {import('./store.js').Game[]} games
 * @param {import('./store.js').Deck[]} decks
 * @param {import('./opponent-decks.js').OpponentDeck[]} opponentDecks
 * @param {string} archetypeKey
 * @param {'unique' | 'combined' | 'exact'} archetypeView
 * @param {'archetype' | 'tribe'} tagKind
 * @param {'mine' | 'all' | 'opponents'} archetypeScope
 */
function buildArchetypeDeckList(games, decks, opponentDecks, archetypeKey, archetypeView, tagKind, archetypeScope) {
  /** @type {{ key: string, name: string, commander: string, games: number, wins: number, winRate: number, owned: boolean, deckSlotId?: string | null, opponentDeckId?: string | null, playerScope?: string | null }[]} */
  const deckList = [];

  if (archetypeScope !== "opponents") {
    for (const deck of decks) {
      if (!deckMatchesArchetypeKey(entityDeckTags(deck, tagKind), archetypeKey, archetypeView)) continue;
      const slotId = deckId(deck);
      const deckGames = games.filter((game) => game.deck === slotId);
      const wins = deckGames.filter((game) => game.result === "Win").length;
      const gamesCount = deckGames.length;
      deckList.push({
        key: slotId,
        name: deckTitle(deck),
        commander: deckCommander(deck),
        deckSlotId: slotId,
        games: gamesCount,
        wins,
        winRate: winRate(wins, gamesCount),
        owned: true,
      });
    }
  }

  if (archetypeScope !== "mine") {
    for (const oppDeck of opponentDecks) {
      if (!deckMatchesArchetypeKey(entityDeckTags(oppDeck, tagKind), archetypeKey, archetypeView)) {
        continue;
      }

      let gamesCount = 0;
      let wins = 0;
      for (const game of games) {
        const seats = parseGameSeats(game, decks);
        for (const seat of seats) {
          if (normalizeEntityKey(seat.player) === normalizeEntityKey(MY_PLAYER_NAME)) continue;
          const opp = (game.opponents || []).find((entry) => Number(entry.seat) === Number(seat.seat));
          if (!opp || !opponentEntryMatchesDeck(game, opp, oppDeck)) continue;
          if (normalizeEntityKey(seat.player) !== normalizeEntityKey(oppDeck.player)) continue;
          gamesCount += 1;
          if (seat.didWin) wins += 1;
        }
      }

      deckList.push({
        key: oppDeck.id,
        name: opponentDeckTitle(oppDeck),
        commander: opponentDeckCommander(oppDeck),
        opponentDeckId: oppDeck.id,
        playerScope: oppDeck.player || null,
        games: gamesCount,
        wins,
        winRate: winRate(wins, gamesCount),
        owned: false,
      });
    }
  }

  return deckList.sort((a, b) => b.games - a.games || a.name.localeCompare(b.name));
}

/**
 * @param {import('./store.js').Game[]} games
 * @param {import('./store.js').Deck[]} decks
 * @param {{ kind: 'player' | 'deck' | 'archetype', key: string, playerScope?: string | null, splitPartners?: boolean, deckSlotId?: string | null, opponentDeckId?: string | null, opponentDecks?: import('./store.js').OpponentDeck[], archetypeView?: 'unique' | 'combined' | 'exact', tagKind?: 'archetype' | 'tribe', archetypeScope?: 'mine' | 'all' | 'opponents' }} request
 */
export function buildEntityReport(games, decks, request) {
  const {
    kind,
    key,
    playerScope = null,
    splitPartners = false,
    deckSlotId = null,
    opponentDeckId = null,
    opponentDecks = [],
    archetypeView = "unique",
    tagKind = "archetype",
    archetypeScope = "mine",
  } = request;

  if (kind === "archetype") {
    const archetypeKey = key;
    const seatFilter = (seat, seats, game) =>
      seatMatchesArchetype(
        seat,
        seats,
        game,
        archetypeKey,
        archetypeView,
        tagKind,
        archetypeScope,
        decks,
        opponentDecks
      );
    const stats = computeSeatStats(games, seatFilter, decks);
    const chartGames = appearanceGamesForChart(games, seatFilter, decks);
    const deckList = buildArchetypeDeckList(
      games,
      decks,
      opponentDecks,
      archetypeKey,
      archetypeView,
      tagKind,
      archetypeScope
    );
    const entityGames = sortEntityGames(gamesForArchetypeSeatFilter(games, seatFilter, decks));

    return {
      kind,
      title: archetypeKey,
      subtitle: null,
      colors: [],
      stats,
      chartGames,
      deckList,
      entityGames,
      pilots: [],
      playerMatchups: buildEntityMatchupRows(games, "players", seatFilter, { splitPartners }, decks),
      deckMatchups: buildEntityMatchupRows(games, "decks", seatFilter, { splitPartners }, decks),
      playerScope: null,
      seatRankings: computeEntitySeatRankings(games, seatFilter, decks),
      archetypeKey,
      archetypeView,
      tagKind,
      archetypeScope,
    };
  }

  if (kind === "player") {
    const playerName = key;
    const playerKey = normalizeEntityKey(playerName);
    const seatFilter = (seat) => normalizeEntityKey(seat.player) === playerKey;
    const stats = computeSeatStats(games, seatFilter, decks);
    const chartGames = appearanceGamesForChart(games, seatFilter, decks);
    /** @type {Map<string, { name: string, games: number, wins: number, ownedKey: string | null }>} */
    const deckRows = new Map();

    for (const game of games) {
      const seats = parseGameSeats(game, decks);
      for (const seat of seats) {
        if (normalizeEntityKey(seat.player) !== playerKey || !seat.commander) continue;
        const canonical = getCommanderInfo(seat.commander).canonicalName;
        const row =
          deckRows.get(canonical) ??
          ({
            name: seat.commander,
            games: 0,
            wins: 0,
            ownedKey: findOwnedDeckKey(seat.commander, decks),
          });
        row.games += 1;
        if (seat.didWin) row.wins += 1;
        deckRows.set(canonical, row);
      }
    }

    const isMe = playerKey === normalizeEntityKey(MY_PLAYER_NAME);
    const ownedDecks = isMe
      ? decks.map((deck) => {
          const slotId = deckId(deck);
          const deckGames = games.filter((g) => g.deck === slotId);
          const wins = deckGames.filter((g) => g.result === "Win").length;
          const gamesCount = deckGames.length;
          return {
            key: slotId,
            name: deckTitle(deck),
            commander: deckCommander(deck),
            deckSlotId: slotId,
            games: gamesCount,
            wins,
            winRate: winRate(wins, gamesCount),
            owned: true,
          };
        })
      : [];

    const playedDecks = [...deckRows.values()]
      .sort((a, b) => b.games - a.games || a.name.localeCompare(b.name))
      .map((row) => ({
        key: row.ownedKey || row.name,
        name: row.name,
        commander: row.name,
        games: row.games,
        wins: row.wins,
        winRate: winRate(row.wins, row.games),
        owned: !!row.ownedKey,
      }));

    const deckList = mergeDeckLists(ownedDecks, playedDecks);
    const entityGames = sortEntityGames(gamesForPlayer(games, playerName, decks));

    return {
      kind,
      title: playerName,
      subtitle: null,
      colors: [],
      stats,
      chartGames,
      deckList,
      entityGames,
      pilots: [],
      playerMatchups: buildEntityMatchupRows(games, "players", seatFilter, {}, decks),
      deckMatchups: buildEntityMatchupRows(games, "decks", seatFilter, { splitPartners }, decks),
      playerScope: null,
      seatRankings: computeEntitySeatRankings(games, seatFilter, decks),
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
      ownedDeck: deck,
    });

    return {
      kind,
      title,
      subtitle: playerScope ? null : null,
      colors,
      stats: slotStats,
      chartGames: slotChartGames,
      deckList: [],
      entityGames: sortEntityGames(games.filter((game) => game.deck === deckSlotId)),
      pilots: [],
      playerMatchups: buildEntityMatchupRows(games, "players", seatFilter, {}, decks),
      deckMatchups: buildEntityMatchupRows(games, "decks", seatFilter, { splitPartners }, decks),
      playerScope,
      deckSlotId,
      displayCommander: commanderName,
      seatRankings: computeEntitySeatRankings(games, seatFilter, decks),
      archetypes: deckArchetypeList(deck),
    };
  }

  if (kind === "deck" && opponentDeckId) {
    const oppDeck = findOpponentDeck(opponentDecks, opponentDeckId);
    const commanderName = oppDeck ? opponentDeckLabel(oppDeck) : deckLabelForKey(key, decks);
    const scope = oppDeck?.player || playerScope || null;
    const scopedGames = oppDeck ? gamesForOpponentDeck(games, oppDeck) : [];
    const seatFilter = (seat, _seats, game) => {
      if (scope && normalizeEntityKey(seat.player) !== normalizeEntityKey(scope)) return false;
      const opp = (game.opponents || []).find((entry) => Number(entry.seat) === Number(seat.seat));
      if (!opp) return false;
      return oppDeck ? opponentEntryMatchesDeck(game, opp, oppDeck) : commanderMatchesTarget(seat.commander, commanderName, { splitPartners });
    };
    const colors = oppDeck?.colors?.length
      ? oppDeck.colors
      : resolveCommanderColors(commanderName, { splitPartners });

    return {
      kind,
      title: oppDeck ? opponentDeckTitle(oppDeck) : commanderName,
      subtitle: null,
      colors,
      stats: computeSeatStats(scopedGames.length ? scopedGames : games, seatFilter, decks),
      chartGames: appearanceGamesForChart(scopedGames.length ? scopedGames : games, seatFilter, decks),
      deckList: [],
      entityGames: sortEntityGames(scopedGames),
      pilots: [],
      playerMatchups: buildEntityMatchupRows(scopedGames.length ? scopedGames : games, "players", seatFilter, { splitPartners }, decks),
      deckMatchups: buildEntityMatchupRows(scopedGames.length ? scopedGames : games, "decks", seatFilter, { splitPartners }, decks),
      playerScope: scope,
      deckSlotId: null,
      opponentDeckId,
      displayCommander: commanderName,
      seatRankings: computeEntitySeatRankings(scopedGames.length ? scopedGames : games, seatFilter, decks),
      archetypes: oppDeck ? deckArchetypeList(/** @type {import('./store.js').Deck} */ (oppDeck)) : [],
    };
  }

  const commanderName = deckLabelForKey(key, decks);
  const seatFilter = (seat) => {
    if (playerScope && normalizeEntityKey(seat.player) !== normalizeEntityKey(playerScope)) {
      return false;
    }
    return commanderMatchesTarget(seat.commander, commanderName, { splitPartners });
  };

  const stats = computeSeatStats(games, seatFilter, decks);
  const chartGames = appearanceGamesForChart(games, seatFilter, decks);
  const owned = findDeck(decks, key);
  const colors = resolveCommanderColors(commanderName, {
    splitPartners,
    ownedDeck: owned,
  });

  const pilotStats = playerScope
    ? []
    : computeDeckPilotStats(games, commanderName, { splitPartners }, decks);

  return {
    kind,
    title: commanderName,
    subtitle: playerScope ? null : null,
    colors,
    stats,
    chartGames,
    deckList: [],
    entityGames: sortEntityGames(
      gamesForDeck(games, commanderName, { playerScope, splitPartners }, decks)
    ),
    pilots: pilotStats,
    playerMatchups: buildEntityMatchupRows(games, "players", seatFilter, {
      splitPartners,
      groupByOpponent: true,
    }, decks),
    deckMatchups: buildEntityMatchupRows(games, "decks", seatFilter, {
      splitPartners,
      groupByOpponent: true,
    }, decks),
    playerScope,
    deckSlotId: null,
    displayCommander: commanderName,
    seatRankings: computeEntitySeatRankings(games, seatFilter, decks),
    archetypes: deckArchetypeList(owned),
  };
}

/** @param {{ key: string, name: string, commander?: string, games: number, wins?: number, winRate?: number, owned: boolean, deckSlotId?: string | null }[]} ownedDecks @param {{ key: string, name: string, commander?: string, games: number, wins?: number, winRate?: number, owned: boolean }[]} playedDecks */
function mergeDeckLists(ownedDecks, playedDecks) {
  const merged = new Map();
  for (const row of [...ownedDecks, ...playedDecks]) {
    const canonical = getCommanderInfo(row.commander || row.name).canonicalName;
    const existing = merged.get(canonical);
    if (existing) {
      if (row.games >= existing.games) {
        existing.games = row.games;
        existing.wins = row.wins ?? 0;
        existing.winRate = row.winRate ?? winRate(existing.wins, existing.games);
      }
      existing.owned = existing.owned || row.owned;
      if (row.deckSlotId) existing.deckSlotId = row.deckSlotId;
      if (row.commander) existing.commander = row.commander;
    } else {
      merged.set(canonical, {
        ...row,
        wins: row.wins ?? 0,
        winRate: row.winRate ?? winRate(row.wins ?? 0, row.games),
      });
    }
  }
  return [...merged.values()].sort((a, b) => b.games - a.games || a.name.localeCompare(b.name));
}

/** @param {import('./store.js').Game} game @param {import('./store.js').Deck[]} decks @param {ReturnType<typeof buildEntityReport>} report @param {import('./opponent-decks.js').OpponentDeck[]} [opponentDecks] */
function entityGameResultClass(game, decks, report, opponentDecks = []) {
  if (report.kind === "archetype") {
    const seat = entityGameSeat(game, decks, report, opponentDecks);
    if (!seat) return "";
    return seat.didWin ? "win" : "loss";
  }
  if (report.kind === "player") {
    const playerKey = normalizeEntityKey(report.title);
    const seat = parseGameSeats(game, decks).find((s) => normalizeEntityKey(s.player) === playerKey);
    if (!seat) return "";
    return seat.didWin ? "win" : "loss";
  }
  if (report.deckSlotId) {
    return game.result === "Win" ? "win" : "loss";
  }
  if (report.opponentDeckId && report.playerScope) {
    const seat = parseGameSeats(game, decks).find(
      (entry) => normalizeEntityKey(entry.player) === normalizeEntityKey(report.playerScope)
    );
    if (!seat) return "";
    return seat.didWin ? "win" : "loss";
  }
  const commanderName = report.displayCommander || report.title;
  const seat = parseGameSeats(game, decks).find((s) =>
    commanderMatchesTarget(s.commander, commanderName, { splitPartners: false })
  );
  if (!seat) return game.result === "Win" ? "win" : "loss";
  return seat.didWin ? "win" : "loss";
}

/** @param {import('./store.js').Game} game @param {import('./store.js').Deck[]} decks @param {ReturnType<typeof buildEntityReport>} report @param {import('./opponent-decks.js').OpponentDeck[]} [opponentDecks] */
function renderEntityGamePodCard(game, decks, report, opponentDecks = []) {
  const seatsByNumber = new Map(parseGameSeats(game, decks).map((seat) => [seat.seat, seat]));
  const seatBoxes = [1, 2, 3, 4]
    .map((seatNum) => {
      const seat = seatsByNumber.get(seatNum);
      const outcomeClass = seat ? (seat.didWin ? "entity-game-seat-win" : "entity-game-seat-loss") : "";
      const playerLabel = seat?.player ? renderPlayerReportLink(seat.player) : "—";
      const commanderLabel = seat?.commander
        ? escapeHtml(seat.commander)
        : "—";
      return `
        <div class="entity-game-seat-box ${outcomeClass}">
          <span class="entity-game-seat-num">Seat ${seatNum}</span>
          <span class="entity-game-seat-player">${playerLabel}</span>
          <span class="entity-game-seat-commander">${commanderLabel}</span>
        </div>`;
    })
    .join("");

  const deckMap = deckMapByKey(decks);
  const resultCls = entityGameResultClass(game, decks, report, opponentDecks);

  return `
    <article class="entity-game-pod-card">
      <div class="entity-game-pod-header">
        <span>${formatDate(game.date)}</span>
        <span>Turn ${game.turn || "—"}</span>
        <span>Bracket ${gameBracket(game, deckMap)}</span>
        <span class="result-pill ${resultCls}">${resultCls === "win" ? "Win" : "Loss"}</span>
      </div>
      <div class="entity-game-pod-seats">${seatBoxes}</div>
    </article>`;
}

/** @param {import('./store.js').Game} game @param {import('./store.js').Deck[]} decks @param {ReturnType<typeof buildEntityReport>} report @param {import('./opponent-decks.js').OpponentDeck[]} [opponentDecks] */
function entityGameSeat(game, decks, report, opponentDecks = []) {
  if (report.kind === "archetype") {
    const seats = parseGameSeats(game, decks);
    return seats.find((seat) =>
      seatMatchesArchetype(
        seat,
        seats,
        game,
        report.archetypeKey || report.title,
        report.archetypeView || "unique",
        report.tagKind || "archetype",
        report.archetypeScope || "mine",
        decks,
        opponentDecks
      )
    );
  }
  if (report.kind === "player") {
    const playerKey = normalizeEntityKey(report.title);
    return parseGameSeats(game, decks).find((s) => normalizeEntityKey(s.player) === playerKey);
  }
  return parseGameSeats(game, decks).find((s) =>
    commanderMatchesTarget(s.commander, report.displayCommander || report.title, { splitPartners: false })
  );
}

/** @param {import('./store.js').Deck[]} decks @param {ReturnType<typeof buildEntityReport>} report @param {import('./opponent-decks.js').OpponentDeck[]} [opponentDecks] */
function entityGamesSortGetters(decks, report, opponentDecks = []) {
  const deckMap = deckMapByKey(decks);
  return {
    date: (game) => gameSortKey(game),
    deck: (game) => deckLabelForKey(game.deck, decks),
    player: (game) => entityGameSeat(game, decks, report, opponentDecks)?.player || "",
    seat: (game) => entityGameSeat(game, decks, report, opponentDecks)?.seat || game.mySeat || 0,
    turn: (game) => (Number(game.turn) > 0 ? Number(game.turn) : null),
    bracket: (game) => gameBracket(game, deckMap),
    result: (game) => (game.result === "Win" ? 1 : 0),
  };
}

/** @param {import('./store.js').Game[]} games @param {import('./store.js').Deck[]} decks @param {ReturnType<typeof buildEntityReport>} report @param {import('./table.js').SortState} sort @param {import('./opponent-decks.js').OpponentDeck[]} [opponentDecks] */
function renderEntityGamesTable(games, decks, report, sort, opponentDecks = []) {
  if (!games.length) return "";
  const deckMap = deckMapByKey(decks);
  const showDeckCol = report.kind === "player" || report.kind === "archetype";
  const showPlayerCol = report.kind === "deck";
  const tableId = "entity-games";
  const sortState = sort ?? { col: "date", dir: "desc" };
  const sortedGames = applySort(games, sortState, entityGamesSortGetters(decks, report, opponentDecks), {
    ...WINS_SORT_TIE_BREAKERS,
    result: "date",
  });

  return `
    <table class="table compact entity-games-table sortable-table">
      <thead><tr>
        ${sortHeader(tableId, "date", "Date", sortState)}
        ${showDeckCol ? sortHeader(tableId, "deck", "Deck", sortState) : ""}
        ${showPlayerCol ? sortHeader(tableId, "player", "Player", sortState) : ""}
        ${sortHeader(tableId, "seat", "Seat", sortState)}
        ${sortHeader(tableId, "turn", "Turn", sortState)}
        ${sortHeader(tableId, "bracket", "Bracket", sortState)}
        ${sortHeader(tableId, "result", "Result", sortState)}
      </tr></thead>
      <tbody>
        ${sortedGames
          .map((game) => {
            const resultCls = entityGameResultClass(game, decks, report, opponentDecks);
            const seat = entityGameSeat(game, decks, report, opponentDecks);
            const deckCell = showDeckCol
              ? `<td>${renderDeckReportLink(
                  seat?.commander || game.deck,
                  decks,
                  {
                    label: seat?.commander || deckTitleForKey(game.deck, decks),
                    playerScope: report.kind === "player" ? report.title : seat?.player || null,
                    deckSlotId:
                      report.kind === "archetype" && seat && normalizeEntityKey(seat.player) === normalizeEntityKey(MY_PLAYER_NAME)
                        ? game.deck || null
                        : report.kind === "player"
                          ? seat?.deckSlotId || game.deck || null
                          : null,
                    opponentDeckId:
                      report.kind === "archetype" && seat
                        ? resolveOpponentDeckForEntitySeat(opponentDecks, game, seat)?.id || null
                        : null,
                  }
                )}</td>`
              : "";
            const playerCell = showPlayerCol
              ? `<td>${seat?.player ? renderPlayerReportLink(seat.player) : "—"}</td>`
              : "";
            const seatNum =
              report.kind === "player" || report.kind === "archetype"
                ? seat?.seat || game.mySeat || "—"
                : seat?.seat || "—";

            return `
            <tr>
              <td>${formatDate(game.date)}</td>
              ${deckCell}
              ${playerCell}
              <td>${seatNum}</td>
              <td>${game.turn || "—"}</td>
              <td>${gameBracket(game, deckMap)}</td>
              <td><span class="result-pill ${resultCls}">${resultCls === "win" ? "Win" : "Loss"}</span></td>
            </tr>`;
          })
          .join("")}
      </tbody>
    </table>`;
}

/** @param {ReturnType<typeof buildEntityReport>} report @param {import('./store.js').Deck[]} decks @param {import('./table.js').SortState} [gamesSort] @param {import('./opponent-decks.js').OpponentDeck[]} [opponentDecks] */
function renderEntityGamesSection(report, decks, gamesSort, opponentDecks = []) {
  const games = report.entityGames || [];
  if (!games.length) {
    return `<p class="muted-text entity-report-empty">No games logged yet.</p>`;
  }

  const podGames = games.filter(gameHasPodDetail);
  const simpleGames = games.filter((game) => !gameHasPodDetail(game));
  const podCards = podGames.map((game) => renderEntityGamePodCard(game, decks, report, opponentDecks)).join("");
  const tableGames = simpleGames.length ? simpleGames : podGames.length ? [] : games;
  const tableHtml = tableGames.length
    ? renderEntityGamesTable(tableGames, decks, report, gamesSort, opponentDecks)
    : "";

  return `
    ${podGames.length ? `<div class="entity-game-pod-list">${podCards}</div>` : ""}
    ${tableHtml}`;
}

/** @param {ReturnType<typeof buildEntityReport>} report @param {import('./store.js').Deck[]} decks @param {'games' | 'decks' | 'players'} [activeTab] @param {{ players: import('./table.js').SortState, decks: import('./table.js').SortState }} [matchupSort] @param {import('./table.js').SortState} [gamesSort] @param {import('./opponent-decks.js').OpponentDeck[]} [opponentDecks] */
function renderEntityTabsSection(report, decks, activeTab = "games", matchupSort, gamesSort, opponentDecks = []) {
  const tabs = [
    { id: "games", label: "Games" },
    { id: "decks", label: "Deck Matchups" },
    { id: "players", label: "Player Matchups" },
  ];

  const tabButtons = tabs
    .map(
      (tab) =>
        `<button type="button" role="tab" aria-selected="${tab.id === activeTab}" class="sub-tab ${tab.id === activeTab ? "active" : ""}" data-entity-report-tab="${tab.id}">${tab.label}</button>`
    )
    .join("");

  const gamesPanel = renderEntityGamesSection(report, decks, gamesSort, opponentDecks);
  const playerSort = matchupSort?.players ?? { col: "normalizedMatchupImpact", dir: "desc" };
  const deckSort = matchupSort?.decks ?? { col: "normalizedMatchupImpact", dir: "desc" };
  const playerPanel = renderMatchupTableWithCells(
    report.playerMatchups,
    (row) => renderMatchupOpponentCell(row, "player", decks, report.playerScope),
    "entity-matchups-players",
    playerSort
  );
  const deckPanel = renderMatchupTableWithCells(
    report.deckMatchups,
    (row) => renderMatchupOpponentCell(row, "deck", decks, report.playerScope),
    "entity-matchups-decks",
    deckSort
  );

  return `
    <div class="entity-report-section entity-report-tabs-section">
      <div class="sub-tabs entity-report-tablist" role="tablist">${tabButtons}</div>
      <div class="entity-report-tab-panel" data-entity-report-panel="games" role="tabpanel" ${activeTab === "games" ? "" : "hidden"}>${gamesPanel}</div>
      <div class="entity-report-tab-panel" data-entity-report-panel="decks" role="tabpanel" ${activeTab === "decks" ? "" : "hidden"}>${deckPanel}</div>
      <div class="entity-report-tab-panel" data-entity-report-panel="players" role="tabpanel" ${activeTab === "players" ? "" : "hidden"}>${playerPanel}</div>
    </div>`;
}

/** @param {{ key: string, name: string, commander?: string, games: number, wins?: number, winRate?: number, owned: boolean, deckSlotId?: string | null, opponentDeckId?: string | null, playerScope?: string | null }[]} deckList @param {import('./store.js').Deck[]} decks @param {string | null} playerScope */
function renderPlayerDeckGrid(deckList, decks, playerScope) {
  if (!deckList.length) return "";

  return `
    <div class="entity-deck-grid">
      ${deckList
        .map((row) => {
          const commander = row.commander || row.name;
          const artSlot = commanderImageSlots(commander)[0];
          const artImg = artSlot
            ? `<img class="commander-img commander-art-img loading" data-card-name="${escapeHtml(artSlot.name)}"${artSlot.face ? ` data-card-face="${artSlot.face}"` : ""} data-card-image="art" alt="${escapeHtml(commander)}" />`
            : "";
          return `
        <div class="entity-deck-card">
          <div class="entity-deck-card-art">
            ${artImg}
          </div>
          <div class="entity-deck-card-body">
            <div class="entity-deck-card-name">${renderDeckReportLink(commander, decks, {
              label: row.name,
              playerScope: row.opponentDeckId ? row.playerScope || null : playerScope,
              deckSlotId: row.deckSlotId || null,
              opponentDeckId: row.opponentDeckId || null,
            })}</div>
            <div class="entity-deck-card-stats">
              <span>${row.games}G</span>
              <span>${row.wins ?? 0}W</span>
              <span>${row.games ? pctCell(row.winRate ?? winRate(row.wins ?? 0, row.games)) : "—"}</span>
            </div>
          </div>
        </div>`;
        })
        .join("")}
    </div>`;
}

const ENTITY_HERO_TABS = [
  { id: "overview", label: "Overview" },
  { id: "archetypes", label: "Archetypes", deckOnly: true },
  { id: "seats", label: "Seats" },
];

/** @param {import('./store.js').Deck | null | undefined} deck */
function deckArchetypeList(deck) {
  return (deck?.archetypes || []).map((value) => String(value || "").trim()).filter(Boolean);
}

/** @param {string[] | undefined} archetypes @param {{ view?: 'unique' | 'combined' | 'exact', tagKind?: 'archetype' | 'tribe', scope?: 'mine' | 'all' | 'opponents' }} [options] */
function renderEntityArchetypeList(archetypes, options = {}) {
  const list = (archetypes || []).filter(Boolean);
  if (!list.length) {
    return `<p class="muted-text entity-report-empty">No archetypes tagged.</p>`;
  }

  return `
    <ul class="entity-archetype-list">
      ${list
        .map(
          (name) =>
            `<li class="entity-archetype-item">${renderArchetypeReportLink(name, name, options)}</li>`
        )
        .join("")}
    </ul>`;
}

/** @param {ReturnType<typeof computeStatsFromChartAppearances>} stats */
function renderEntityOverviewStats(stats) {
  return `
    ${statBlock("Games", stats.games)}
    ${statBlock("Wins", stats.wins)}
    ${statBlock("Win rate", stats.games ? stats.winRate : 0, !!stats.games)}
    ${statBlock("Norm WR", stats.games ? stats.normalizedWr : 0, !!stats.games)}
    ${turnStatBlocks(stats)}
    ${statBlock("Last played", stats.lastPlayed ? formatDate(stats.lastPlayed) : "—")}`;
}

/** @param {ReturnType<typeof buildEntityReport>['seatRankings']} rankings */
function renderEntitySeatRankings(rankings) {
  if (!rankings?.length) {
    return `<p class="muted-text entity-report-empty">No seat data yet.</p>`;
  }

  return `
    <ol class="entity-seat-rankings">
      ${rankings
        .map(
          (row, index) => `
        <li class="entity-seat-ranking-row">
          <span class="entity-seat-rank">#${index + 1}</span>
          <span class="entity-seat-name">Seat ${row.seat}</span>
          <span class="entity-seat-stats">
            <span>${row.games}G</span>
            <span>${row.wins}W</span>
            <span>${pctCell(row.winRate)}</span>
          </span>
        </li>`
        )
        .join("")}
    </ol>`;
}

/** @param {ReturnType<typeof buildEntityReport>} report @param {'overview' | 'archetypes' | 'seats'} [heroTab] @param {ReturnType<typeof getEntityChartContext>} chartContext */
function renderEntityHeroTabsSection(report, heroTab = "overview", chartContext) {
  const tabs = ENTITY_HERO_TABS.filter((tab) => !tab.deckOnly || report.kind === "deck");
  const activeTab =
    heroTab === "archetypes" && report.kind !== "deck"
      ? "overview"
      : tabs.some((tab) => tab.id === heroTab)
        ? heroTab
        : "overview";
  const overviewHtml = `<div class="stat-grid entity-report-stats">${renderEntityOverviewStats(chartContext.filteredStats)}</div>`;
  const archetypesHtml = renderEntityArchetypeList(report.archetypes, {
    view: "unique",
    tagKind: "archetype",
    scope: "mine",
  });
  const seatsHtml = renderEntitySeatRankings(chartContext.filteredSeatRankings);
  const tabButtons = tabs
    .map(
      (tab) =>
        `<button type="button" role="tab" aria-selected="${tab.id === activeTab}" class="sub-tab entity-report-hero-tab ${tab.id === activeTab ? "active" : ""}" data-entity-hero-tab="${tab.id}">${tab.label}</button>`
    )
    .join("");

  const archetypesPanel =
    report.kind === "deck"
      ? `<div class="entity-report-hero-panel" data-entity-hero-panel="archetypes" role="tabpanel" ${activeTab === "archetypes" ? "" : "hidden"}>${archetypesHtml}</div>`
      : "";

  return `
    <div class="entity-report-hero-tabs">
      <div class="sub-tabs entity-report-hero-tablist" role="tablist">${tabButtons}</div>
      <div class="entity-report-hero-panel" data-entity-hero-panel="overview" role="tabpanel" ${activeTab === "overview" ? "" : "hidden"}>${overviewHtml}</div>
      ${archetypesPanel}
      <div class="entity-report-hero-panel" data-entity-hero-panel="seats" role="tabpanel" ${activeTab === "seats" ? "" : "hidden"}>${seatsHtml}</div>
    </div>`;
}

/** @param {{ start: string, end: string, bounds: { min: string, max: string } }} chartRange */
function renderEntityChartDateRange(chartRange) {
  const { bounds, start, end } = chartRange;
  return `
    <div class="entity-report-chart-dates stats-range-dates">
      <label>From <input type="date" id="entity-report-range-start" min="${bounds.min}" max="${bounds.max}" value="${start}" /></label>
      <label>To <input type="date" id="entity-report-range-end" min="${bounds.min}" max="${bounds.max}" value="${end}" /></label>
    </div>`;
}

/** @param {ReturnType<typeof buildEntityReport>} report @param {ReturnType<typeof getEntityChartContext>} chartContext */
function renderEntityChartSection(report, chartContext) {
  const { chartRange, gameRange, boundsMin, boundsMax, rangeGames } = chartContext;
  const chartGames = rangeGames.length ? rangeGames : report.chartGames;
  const chart =
    report.chartGames.length > 0
      ? renderWinRateLineChart(computeWinRateSeries(chartGames), "", chartRange)
      : `<p class="muted-text entity-report-empty">No games logged yet.</p>`;
  const sliderHtml = renderTrendsGameRangeControls({
    min: gameRange.min,
    max: gameRange.max,
    boundsMin,
    boundsMax,
    idPrefix: "entity-report",
  });

  return `
    <div class="entity-report-section entity-report-chart-section">
      <h4>Performance over time</h4>
      <div class="entity-report-chart-controls">
        <div class="entity-report-chart-controls-dates">${renderEntityChartDateRange(chartRange)}</div>
        <div class="entity-report-chart-controls-range">${sliderHtml}</div>
      </div>
      <div class="entity-report-chart">${chart}</div>
    </div>`;
}

/** @param {string} title @param {boolean} canGoBack */
function renderEntityReportHeader(title, canGoBack) {
  return `
        <div class="entity-report-header">
          ${
            canGoBack
              ? `<button type="button" class="entity-report-back" id="entity-report-back" aria-label="Back">←</button>`
              : ""
          }
          <h3 class="entity-report-title">${escapeHtml(title)}</h3>
        </div>`;
}

/**
 * @param {ReturnType<typeof buildEntityReport>} report
 * @param {import('./store.js').Deck[]} decks
 * @param {'games' | 'decks' | 'players'} [activeTab]
 * @param {{ players: import('./table.js').SortState, decks: import('./table.js').SortState }} [matchupSort]
 * @param {import('./table.js').SortState} [gamesSort]
 * @param {{ heroTab?: 'overview' | 'archetypes' | 'seats', chartContext?: ReturnType<typeof getEntityChartContext>, canGoBack?: boolean, opponentDecks?: import('./opponent-decks.js').OpponentDeck[] }} [options]
 */
export function renderEntityReportModal(report, decks, activeTab = "games", matchupSort, gamesSort, options = {}) {
  const { heroTab = "overview", chartContext, canGoBack = false, opponentDecks = [] } = options;
  const rootKey = report.title;
  const resolvedChartContext =
    chartContext ??
    getEntityChartContext(report.chartGames, { start: null, end: null, customized: false }, {
      min: 1,
      max: null,
      customized: false,
    });
  const heroTabsSection = renderEntityHeroTabsSection(report, heroTab, resolvedChartContext);
  const chartSection = renderEntityChartSection(report, resolvedChartContext);
  const tabsSection = renderEntityTabsSection(report, decks, activeTab, matchupSort, gamesSort, opponentDecks);
  const header = renderEntityReportHeader(report.title, canGoBack);

  if (report.kind === "deck") {
    const commanderImgs = renderCommanderImageTags(report.displayCommander || report.title, {
      escapeHtml,
    });

    const pilotSection =
      !report.playerScope && report.pilots.length
        ? `<div class="entity-report-section entity-report-pilots">
            <h4>Piloted by</h4>
            ${renderPilotTable(report.pilots)}
          </div>`
        : "";

    return `
      <div class="modal-content modal-content-wide modal-content-report entity-report-deck" data-entity-report-root="${escapeHtml(rootKey)}">
        ${header}
        <div class="entity-report-body">
          <div class="entity-report-deck-hero">
            <div class="entity-report-deck-art">
              <div class="deck-commander-images entity-report-images">${commanderImgs}</div>
            </div>
            <div class="entity-report-deck-stats">${heroTabsSection}</div>
          </div>

          ${pilotSection}
          ${chartSection}
          ${tabsSection}
        </div>
      </div>`;
  }

  const deckSection = report.deckList.length
    ? `<div class="entity-report-section">
        <h4>Decks</h4>
        ${renderPlayerDeckGrid(report.deckList, decks, report.kind === "player" ? report.title : null)}
      </div>`
    : "";

  return `
    <div class="modal-content modal-content-wide modal-content-report entity-report-player" data-entity-report-root="${escapeHtml(rootKey)}">
      ${header}
      <div class="entity-report-body">
        ${heroTabsSection}
        ${deckSection}
        ${chartSection}
        ${tabsSection}
      </div>
    </div>`;
}

const ENTITY_MATCHUP_SORT_GETTERS = {
  opponent: (row) => row.opponent,
  games: (row) => row.games,
  wins: (row) => row.wins,
  winRate: (row) => row.winRate,
  matchupImpact: (row) => row.matchupImpact,
  normalizedMatchupImpact: (row) => row.normalizedMatchupImpact,
};

/** @param {ReturnType<typeof finalizeEntityMatchupRow>[]} rows @param {(row: ReturnType<typeof finalizeEntityMatchupRow>) => string} opponentCell @param {string} tableId @param {import('./table.js').SortState} sort */
function renderMatchupTableWithCells(rows, opponentCell, tableId, sort) {
  if (!rows.length) {
    return `<p class="muted-text entity-report-empty">No matchup data yet.</p>`;
  }

  const sortedRows = applySort(rows, sort, ENTITY_MATCHUP_SORT_GETTERS, WINS_SORT_TIE_BREAKERS);

  return `
    <table class="table compact entity-matchup-table sortable-table">
      <thead><tr>
        ${sortHeader(tableId, "opponent", "Opponent", sort)}
        ${sortHeader(tableId, "games", "G", sort)}
        ${sortHeader(tableId, "wins", "W", sort)}
        ${sortHeader(tableId, "winRate", "WR", sort)}
        ${sortHeader(tableId, "matchupImpact", "MI", sort)}
        ${sortHeader(tableId, "normalizedMatchupImpact", "NMI", sort)}
      </tr></thead>
      <tbody>
        ${sortedRows
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

/** Scale deck grid stat rows so they stay on one line without overflowing. */
export function fitEntityDeckCardStats(root = document) {
  const maxPx = 14;
  const minPx = 9.5;
  for (const el of root.querySelectorAll(".entity-deck-card-stats")) {
    el.style.fontSize = `${maxPx}px`;
    let size = maxPx;
    while (el.scrollWidth > el.clientWidth && size > minPx) {
      size -= 0.5;
      el.style.fontSize = `${size}px`;
    }
  }
}
