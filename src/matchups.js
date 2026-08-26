import { MY_PLAYER_NAME } from "./opponent-search.js";
import { winRate } from "./stats.js";
import { getCommanderMatchupIdentities } from "./commander-names.js";
import { colorKeyLabel, colorKeysForIdentity, rowColorsFromKey } from "./color-stats.js";

/** Commander pod baseline (30CCSTAT). */
export const MATCHUP_BASELINE = 0.25;
export const MATCHUP_PRIOR_GAMES = 25;
export const MATCHUP_PRIOR_WINS = MATCHUP_PRIOR_GAMES * MATCHUP_BASELINE;

export const MATCHUP_TABS = [
  { id: "players", label: "Player Matchups" },
  { id: "decks", label: "Deck Matchups" },
  { id: "colors", label: "Color Matchups" },
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

/** @param {GameSeat} mySeat @param {GameSeat} opponentSeat @param {'players' | 'decks'} tabId @param {{ splitPartners?: boolean }} [options] */
function matchupPairs(mySeat, opponentSeat, tabId, options = {}) {
  if (tabId === "players") {
    return [matchupPairKeys(mySeat, opponentSeat, tabId)];
  }

  const { splitPartners = false } = options;
  const pairs = [];
  for (const subject of getCommanderMatchupIdentities(mySeat.deck, { splitPartners })) {
    for (const opponent of getCommanderMatchupIdentities(opponentSeat.commander, { splitPartners })) {
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

/** Higher = better when NMI ties: shared losses beat losses-to. */
export function matchupOutcomeTieRank(row) {
  return (row.sharedLosses ?? 0) - (row.losses ?? 0);
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
 * @param {{ splitPartners?: boolean }} [options]
 */
export function buildMyMatchupRows(games, tabId, options = {}) {
  const { splitPartners = false } = options;
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
        tabId,
        { splitPartners }
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
      const outcomeA = matchupOutcomeTieRank(a);
      const outcomeB = matchupOutcomeTieRank(b);
      if (outcomeB !== outcomeA) {
        return outcomeB - outcomeA;
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

/** @param {import('./store.js').Game[]} games @param {import('./store.js').Deck[]} decks @param {"all" | "active" | "retired"} deckFilter @param {string} bracketFilter */
function filterGamesForColorMatchups(games, decks, deckFilter, bracketFilter) {
  const deckMap = new Map(decks.map((d) => [d.name, d]));
  return games.filter((game) => {
    const deck = deckMap.get(game.deck);
    if (deckFilter === "active" && deck?.retired) return false;
    if (deckFilter === "retired" && !deck?.retired) return false;
    if (bracketFilter) {
      const bracket = deck?.bracket ?? game.bracket;
      if (String(bracket) !== bracketFilter) return false;
    }
    return true;
  });
}

/**
 * @param {import('./store.js').Game[]} games
 * @param {{ decks: import('./store.js').Deck[], deckFilter: 'all'|'active'|'retired', bracketFilter: string, view: 'wubrgc'|'all'|'exact', agg: 'inclusive'|'exclusive', getOpponentColors: (name: string) => string[], splitPartners?: boolean }} options
 */
export function buildColorMatchupRows(games, options) {
  const { decks, deckFilter, bracketFilter, view, agg, getOpponentColors, splitPartners = false } =
    options;
  const deckMap = new Map(decks.map((d) => [d.name, d]));
  const filteredGames = filterGamesForColorMatchups(games, decks, deckFilter, bracketFilter);
  const rows = new Map();

  for (const game of filteredGames) {
    const seats = parseGameSeats(game);
    if (seats.length < 2) continue;

    const mySeat = seats.find(isMySeat);
    if (!mySeat) continue;

    const myColors = deckMap.get(game.deck)?.colors ?? [];

    for (const opponentSeat of seats) {
      if (opponentSeat === mySeat) continue;

      const oppIdentities = getCommanderMatchupIdentities(opponentSeat.commander, { splitPartners });
      const subjectKeys = colorKeysForIdentity(myColors, view, agg);

      for (const subjectKey of subjectKeys) {
        for (const oppIdentity of oppIdentities) {
          const oppColors = getOpponentColors(oppIdentity);
          const opponentKeys = colorKeysForIdentity(oppColors, view, agg);

          for (const opponentKey of opponentKeys) {
            const mapKey = `ci:${subjectKey}__oci:${opponentKey}`;
            const row =
              rows.get(mapKey) ??
              ({
                subjectKey: `ci:${subjectKey}`,
                opponentKey: `oci:${opponentKey}`,
                subject: colorKeyLabel(subjectKey, view),
                opponent: colorKeyLabel(opponentKey, view),
                subjectColors: rowColorsFromKey(subjectKey),
                opponentColors: rowColorsFromKey(opponentKey),
                games: 0,
                wins: 0,
                losses: 0,
                sharedLosses: 0,
              });

            row.games += 1;
            if (mySeat.didWin) row.wins += 1;
            else if (opponentSeat.didWin) row.losses += 1;
            else row.sharedLosses += 1;

            rows.set(mapKey, row);
          }
        }
      }
    }
  }

  const finalized = [...rows.values()].map(finalizeMatchupRow);

  return finalized.sort((a, b) => {
    if (b.normalizedMatchupImpact !== a.normalizedMatchupImpact) {
      return b.normalizedMatchupImpact - a.normalizedMatchupImpact;
    }
    const outcomeA = matchupOutcomeTieRank(a);
    const outcomeB = matchupOutcomeTieRank(b);
    if (outcomeB !== outcomeA) {
      return outcomeB - outcomeA;
    }
    if (b.games !== a.games) {
      return b.games - a.games;
    }
    if (a.subject !== b.subject) {
      return a.subject.localeCompare(b.subject, undefined, { numeric: true });
    }
    return a.opponent.localeCompare(b.opponent, undefined, { numeric: true });
  });
}

/** @param {import('./store.js').Game[]} games @param {{ splitPartners?: boolean, colorOptions?: object }} [options] */
export function computeAllMatchups(games, options = {}) {
  const splitPartners = options.splitPartners ?? false;
  return {
    players: buildMyMatchupRows(games, "players", { splitPartners }),
    decks: buildMyMatchupRows(games, "decks", { splitPartners }),
    colors: options.colorOptions
      ? buildColorMatchupRows(games, { ...options.colorOptions, splitPartners })
      : [],
  };
}
