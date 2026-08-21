import { MY_PLAYER_NAME } from "./opponent-search.js";
import { winRate } from "./stats.js";

/** Commander pod baseline (30CCSTAT). */
export const MATCHUP_BASELINE = 0.25;
export const MATCHUP_PRIOR_GAMES = 25;
export const MATCHUP_PRIOR_WINS = MATCHUP_PRIOR_GAMES * MATCHUP_BASELINE;
export const MATCHUP_SHARED_LOSS_WEIGHT = 0.2;

export const MATCHUP_TABS = [
  { id: "players", label: "Player Matchups" },
  { id: "decks", label: "Deck Matchups" },
];

/** @typedef {{ seat: number, player: string, deck: string, commander: string, didWin: boolean }} GameSeat */

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

/** @param {import('./store.js').Game} game */
export function parseGameSeats(game) {
  /** @type {GameSeat[]} */
  const seats = [];

  if (game.mySeat || game.deck) {
    const player = game.myPlayer?.trim() || MY_PLAYER_NAME;
    const deck = game.deck;
    const seat = Number(game.mySeat) || 0;
    const winnerSeat = winnerSeatForGame(game);
    seats.push({
      seat,
      player,
      deck,
      commander: deck,
      didWin: winnerSeat ? winnerSeat === seat : game.result === "Win",
    });
  }

  for (const opp of game.opponents || []) {
    const commander = String(opp.name || "").trim();
    if (!commander) continue;
    const player = String(opp.player || "").trim() || "Unknown";
    const seat = Number(opp.seat) || 0;
    const winnerSeat = winnerSeatForGame(game);
    seats.push({
      seat,
      player,
      deck: commander,
      commander,
      didWin: winnerSeat ? winnerSeat === seat : false,
    });
  }

  return seats;
}

/** @param {import('./store.js').Game} game */
function winnerSeatForGame(game) {
  if (game.winnerSeat) return Number(game.winnerSeat);
  if (game.mySeat && game.result === "Win") return Number(game.mySeat);
  return 0;
}

/** @param {GameSeat} seat @param {'players' | 'decks'} tabId */
function entityKeys(seat, tabId) {
  if (tabId === "players") {
    return [{ key: `p:${normalizeKey(seat.player)}`, label: seat.player }];
  }
  const commander = seat.commander || seat.deck;
  return [{ key: `dc:${normalizeKey(commander)}`, label: commander }];
}

export function calcMatchupImpact(wins, losses, sharedLosses) {
  const denom = wins + losses + sharedLosses * MATCHUP_SHARED_LOSS_WEIGHT;
  return denom > 0 ? wins / denom - MATCHUP_BASELINE : 0;
}

export function calcNormalizedMatchupImpact(wins, games) {
  const normalizedWinRate = (wins + MATCHUP_PRIOR_WINS) / (games + MATCHUP_PRIOR_GAMES);
  return normalizedWinRate - MATCHUP_BASELINE;
}

export function formatMatchupImpact(value) {
  const pct = value * 100;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

export function matchupImpactClass(value) {
  if (value > 1e-9) return "positive";
  if (value < -1e-9) return "negative";
  return "neutral";
}

/**
 * Build matchup rows the same way 30CCSTAT does: every ordered pair of entities
 * in the same pod counts one game (subject win / opponent win / shared loss).
 * @param {import('./store.js').Game[]} games
 * @param {'players' | 'decks'} tabId
 */
export function buildMatchupRows(games, tabId) {
  const rows = new Map();

  for (const game of games) {
    const seats = parseGameSeats(game);
    if (seats.length < 2) continue;

    for (const subjectSeat of seats) {
      for (const opponentSeat of seats) {
        if (subjectSeat === opponentSeat) continue;

        const subjectKeys = entityKeys(subjectSeat, tabId);
        const opponentKeys = entityKeys(opponentSeat, tabId);

        for (const subject of subjectKeys) {
          for (const opponent of opponentKeys) {
            if (subject.key === opponent.key) continue;

            const mapKey = `${subject.key}__${opponent.key}`;
            const row =
              rows.get(mapKey) ??
              ({
                subjectKey: subject.key,
                opponentKey: opponent.key,
                subject: subject.label,
                opponent: opponent.label,
                games: 0,
                wins: 0,
                losses: 0,
                sharedLosses: 0,
              });

            row.games += 1;
            if (subjectSeat.didWin) row.wins += 1;
            else if (opponentSeat.didWin) row.losses += 1;
            else row.sharedLosses += 1;

            rows.set(mapKey, row);
          }
        }
      }
    }
  }

  return [...rows.values()]
    .map((row) => {
      const winRateVal = row.games > 0 ? winRate(row.wins, row.games) : 0;
      const normalizedWinRate =
        (row.wins + MATCHUP_PRIOR_WINS) / (row.games + MATCHUP_PRIOR_GAMES);
      const matchupImpact = calcMatchupImpact(row.wins, row.losses, row.sharedLosses);
      const normalizedMatchupImpact = calcNormalizedMatchupImpact(row.wins, row.games);

      return {
        ...row,
        winRate: winRateVal,
        normalizedWinRate,
        matchupImpact,
        normalizedMatchupImpact,
      };
    })
    .sort((a, b) => {
      if (b.normalizedMatchupImpact !== a.normalizedMatchupImpact) {
        return b.normalizedMatchupImpact - a.normalizedMatchupImpact;
      }
      if (b.matchupImpact !== a.matchupImpact) {
        return b.matchupImpact - a.matchupImpact;
      }
      if (a.subject !== b.subject) {
        return a.subject.localeCompare(b.subject, undefined, { numeric: true });
      }
      return a.opponent.localeCompare(b.opponent, undefined, { numeric: true });
    });
}

/** @param {import('./store.js').Game[]} games */
export function computeAllMatchups(games) {
  return {
    players: buildMatchupRows(games, "players"),
    decks: buildMatchupRows(games, "decks"),
  };
}
