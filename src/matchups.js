import { MY_PLAYER_NAME } from "./opponent-search.js";
import { winRate } from "./stats.js";
import { getCommanderMatchupKeys } from "./commander-names.js";

/** Commander pod baseline (30CCSTAT). */
export const MATCHUP_BASELINE = 0.25;
export const MATCHUP_PRIOR_GAMES = 25;
export const MATCHUP_PRIOR_WINS = MATCHUP_PRIOR_GAMES * MATCHUP_BASELINE;

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

function isMySeat(seat) {
  return normalizeKey(seat.player) === normalizeKey(MY_PLAYER_NAME);
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
    const player = String(opp.player || "").trim();
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

/** @param {GameSeat} mySeat @param {GameSeat} opponentSeat @param {'players' | 'decks'} tabId */
function matchupPairs(mySeat, opponentSeat, tabId) {
  if (tabId === "players") {
    return [matchupPairKeys(mySeat, opponentSeat, tabId)];
  }

  const pairs = [];
  for (const subject of getCommanderMatchupKeys(mySeat.deck)) {
    for (const opponent of getCommanderMatchupKeys(opponentSeat.commander)) {
      pairs.push({
        subjectKey: `d:${normalizeKey(subject)}`,
        subjectLabel: subject,
        opponentKey: `dc:${normalizeKey(opponent)}`,
        opponentLabel: opponent,
      });
    }
  }
  return pairs;
}

/** @param {GameSeat} mySeat @param {GameSeat} opponentSeat @param {'players' | 'decks'} tabId */
function matchupPairKeys(mySeat, opponentSeat, tabId) {
  if (tabId === "players") {
    return {
      subjectKey: `p:${normalizeKey(mySeat.player)}`,
      subjectLabel: mySeat.player,
      opponentKey: `p:${normalizeKey(opponentSeat.player)}`,
      opponentLabel: opponentSeat.player,
    };
  }

  return {
    subjectKey: `d:${normalizeKey(mySeat.deck)}`,
    subjectLabel: mySeat.deck,
    opponentKey: `dc:${normalizeKey(opponentSeat.commander)}`,
    opponentLabel: opponentSeat.commander,
  };
}

export function calcMatchupImpact(wins, games) {
  if (!games) return 0;
  return winRate(wins, games) - MATCHUP_BASELINE;
}

export function calcNormalizedMatchupImpact(wins, games) {
  const normalizedWinRate = (wins + MATCHUP_PRIOR_WINS) / (games + MATCHUP_PRIOR_GAMES);
  return normalizedWinRate - MATCHUP_BASELINE;
}

function finalizeMatchupRow(row) {
  const winRateVal = row.games > 0 ? winRate(row.wins, row.games) : 0;
  const opponentWins = row.losses;
  const opponentWinRate = row.games > 0 ? winRate(opponentWins, row.games) : 0;
  const normalizedWinRate =
    (row.wins + MATCHUP_PRIOR_WINS) / (row.games + MATCHUP_PRIOR_GAMES);
  const normalizedOpponentWinRate =
    (opponentWins + MATCHUP_PRIOR_WINS) / (row.games + MATCHUP_PRIOR_GAMES);
  const opponentPlayerBreakdown = row.opponentPlayers
    ? [...row.opponentPlayers.entries()]
        .map(([player, games]) => ({ player, games }))
        .sort((a, b) => b.games - a.games || a.player.localeCompare(b.player))
    : [];

  return {
    ...row,
    winRate: winRateVal,
    normalizedWinRate,
    opponentWins,
    opponentWinRate,
    opponentPlayerBreakdown,
    opponentCount: opponentPlayerBreakdown.length,
    matchupImpact: calcMatchupImpact(row.wins, row.games),
    normalizedMatchupImpact: calcNormalizedMatchupImpact(row.wins, row.games),
    opponentMatchupImpact: calcMatchupImpact(opponentWins, row.games),
    opponentNormalizedMatchupImpact: calcNormalizedMatchupImpact(opponentWins, row.games),
  };
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
 * Matchups from Brass's perspective only: me vs players, or my deck vs opponent decks.
 * @param {import('./store.js').Game[]} games
 * @param {'players' | 'decks'} tabId
 */
export function buildMyMatchupRows(games, tabId) {
  const rows = new Map();

  for (const game of games) {
    const seats = parseGameSeats(game);
    if (seats.length < 2) continue;

    const mySeat = seats.find(isMySeat);
    if (!mySeat) continue;

    for (const opponentSeat of seats) {
      if (opponentSeat === mySeat) continue;
      if (tabId === "players" && !opponentSeat.player) continue;

      for (const { subjectKey, subjectLabel, opponentKey, opponentLabel } of matchupPairs(
        mySeat,
        opponentSeat,
        tabId
      )) {
        if (subjectKey === opponentKey) continue;

        const mapKey = `${subjectKey}__${opponentKey}`;
        const row =
          rows.get(mapKey) ??
          ({
            subjectKey,
            opponentKey,
            subject: subjectLabel,
            opponent: opponentLabel,
            games: 0,
            wins: 0,
            losses: 0,
            sharedLosses: 0,
            opponentPlayers: tabId === "decks" ? new Map() : undefined,
          });

        row.games += 1;
        if (mySeat.didWin) row.wins += 1;
        else if (opponentSeat.didWin) row.losses += 1;
        else row.sharedLosses += 1;

        if (tabId === "decks" && opponentSeat.player && row.opponentPlayers) {
          row.opponentPlayers.set(
            opponentSeat.player,
            (row.opponentPlayers.get(opponentSeat.player) || 0) + 1
          );
        }

        rows.set(mapKey, row);
      }
    }
  }

  const finalized = [...rows.values()].map(finalizeMatchupRow);

  return finalized.sort((a, b) => {
      if (b.normalizedMatchupImpact !== a.normalizedMatchupImpact) {
        return b.normalizedMatchupImpact - a.normalizedMatchupImpact;
      }
      if (b.games !== a.games) {
        return b.games - a.games;
      }
      if (b.matchupImpact !== a.matchupImpact) {
        return b.matchupImpact - a.matchupImpact;
      }
      if (tabId === "decks" && a.subject !== b.subject) {
        return a.subject.localeCompare(b.subject, undefined, { numeric: true });
      }
      return a.opponent.localeCompare(b.opponent, undefined, { numeric: true });
    });
}

/** @param {import('./store.js').Game[]} games */
export function computeAllMatchups(games) {
  return {
    players: buildMyMatchupRows(games, "players"),
    decks: buildMyMatchupRows(games, "decks"),
  };
}
