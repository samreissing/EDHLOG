import { winRate, normalizedWinRate } from "./stats.js";
import { parseGameSeats } from "./matchups.js";
import { MY_PLAYER_NAME } from "./opponent-search.js";

/** @typedef {{ turn: number, games: number, wins: number, losses: number, winRate: number | null, normalizedWr: number | null }} TurnGridRow */

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

/** @param {import('./matchups.js').GameSeat} seat */
function isMyPlayer(seat) {
  return normalizeKey(seat.player) === normalizeKey(MY_PLAYER_NAME);
}

/** @param {import('./matchups.js').GameSeat} seat @param {import('./matchups.js').GameSeat[]} seats */
function seatOutcome(seat, seats) {
  if (seat.didWin) return "win";
  if (seats.some((s) => s !== seat && s.didWin)) return "loss";
  return "shared";
}

/**
 * @param {import('./store.js').Game[]} games
 * @param {{ allPlayers?: boolean, decks?: import('./store.js').Deck[], excludeMyPlayer?: boolean }} [options]
 */
export function computeTurnGridStats(games, options = {}) {
  const { allPlayers = false, decks = [], excludeMyPlayer = false } = options;
  /** @type {Array<{ game: import('./store.js').Game, endTurn: number }>} */
  const logged = [];

  for (const game of games) {
    const endTurn = Number(game.turn);
    if (!Number.isFinite(endTurn) || endTurn <= 0) continue;
    logged.push({ game, endTurn });
  }

  if (!logged.length) return [];

  const maxTurn = Math.max(...logged.map((entry) => entry.endTurn));
  /** @type {TurnGridRow[]} */
  const rows = [];

  for (let turn = 1; turn <= maxTurn; turn += 1) {
    let gamesReached = 0;
    let wins = 0;
    let losses = 0;

    for (const { game, endTurn } of logged) {
      if (endTurn >= turn) gamesReached += 1;

      if (endTurn !== turn) continue;

      if (allPlayers) {
        const seats = parseGameSeats(game, decks);
        for (const seat of seats) {
          if (excludeMyPlayer && isMyPlayer(seat)) continue;
          const outcome = seatOutcome(seat, seats);
          if (outcome === "win") wins += 1;
          else if (outcome === "loss") losses += 1;
        }
      } else if (game.result === "Win") {
        wins += 1;
      } else if (game.result === "Loss") {
        losses += 1;
      }
    }

    const ended = wins + losses;
    rows.push({
      turn,
      games: gamesReached,
      wins,
      losses,
      winRate: ended ? winRate(wins, ended) : null,
      normalizedWr: ended ? normalizedWinRate(wins, ended) : null,
    });
  }

  return rows;
}
