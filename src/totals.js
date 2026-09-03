import { parseGameSeats } from "./matchups.js";
import { MY_PLAYER_NAME } from "./opponent-search.js";
import { getCommanderInfo, getCommanderMatchupIdentities } from "./commander-names.js";
import { resolveCommanderColors } from "./commander-colors.js";
import { deckKey, deckCommander, findDeck } from "./deck-identity.js";
import { winRate, normalizedWinRate, filterGamesByBracket } from "./stats.js";
import {
  colorKeysForIdentity,
  rowColorsFromKey,
  colorKeyLabel,
} from "./color-stats.js";

export const TOTALS_TABS = [
  { id: "decks", label: "Decks" },
  { id: "players", label: "Players" },
  { id: "colors", label: "Colors" },
];

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

/** @param {import('./matchups.js').GameSeat} seat */
function isMyPlayer(seat) {
  return normalizeKey(seat.player) === normalizeKey(MY_PLAYER_NAME);
}

/** @param {import('./store.js').Deck[]} decks @param {string} commander */
function findOwnedDeck(commander, decks) {
  const target = getCommanderInfo(commander).canonicalName;
  for (const deck of decks) {
    if (getCommanderInfo(deckCommander(deck)).canonicalName === target) {
      return deck;
    }
    for (const entry of deck.history || []) {
      if (getCommanderInfo(entry.commander).canonicalName === target) {
        return deck;
      }
    }
  }
  return null;
}

/** @param {import('./matchups.js').GameSeat} seat @param {import('./matchups.js').GameSeat[]} seats */
function seatOutcome(seat, seats) {
  if (seat.didWin) return "win";
  if (seats.some((s) => s !== seat && s.didWin)) return "loss";
  return "shared";
}

function finalizePodRow(row) {
  return {
    ...row,
    winRate: winRate(row.wins, row.games),
    normalizedWr: normalizedWinRate(row.wins, row.games),
  };
}

function sortRankings(rows) {
  return rows.sort((a, b) => {
    if (b.normalizedWr !== a.normalizedWr) return b.normalizedWr - a.normalizedWr;
    if (b.games !== a.games) return b.games - a.games;
    return a.name.localeCompare(b.name, undefined, { numeric: true });
  });
}

/**
 * @param {import('./store.js').Game[]} games
 * @param {import('./store.js').Deck[]} decks
 * @param {{ splitPartners?: boolean, excludeMyPlayer?: boolean }} [options]
 */
export function buildPodDeckRankings(games, decks, options = {}) {
  const { splitPartners = false, excludeMyPlayer = false } = options;
  const rows = new Map();

  for (const game of games) {
    const seats = parseGameSeats(game, decks);
    for (const seat of seats) {
      if (excludeMyPlayer && isMyPlayer(seat)) continue;
      if (!seat.commander) continue;

      for (const commander of getCommanderMatchupIdentities(seat.commander, { splitPartners })) {
        const key = normalizeKey(commander);
        const row =
          rows.get(key) ??
          ({
            key,
            name: commander,
            games: 0,
            wins: 0,
            losses: 0,
            sharedLosses: 0,
            pilots: new Map(),
            lastPlayed: null,
          });

        row.games += 1;
        const outcome = seatOutcome(seat, seats);
        if (outcome === "win") row.wins += 1;
        else if (outcome === "loss") row.losses += 1;
        else row.sharedLosses += 1;

        if (seat.player) {
          row.pilots.set(seat.player, (row.pilots.get(seat.player) || 0) + 1);
        }
        if (!row.lastPlayed || game.date > row.lastPlayed) row.lastPlayed = game.date;
        rows.set(key, row);
      }
    }
  }

  return sortRankings(
    [...rows.values()].map((row) => {
      const owned = findOwnedDeck(row.name, decks);
      const pilots = [...row.pilots.entries()]
        .map(([player, count]) => ({ player, games: count }))
        .sort((a, b) => b.games - a.games || a.player.localeCompare(b.player));

      return finalizePodRow({
        ...row,
        colors: resolveCommanderColors(row.name, {
          splitPartners,
          ownedDeck: owned,
        }),
        bracket: owned?.bracket,
        isOwned: !!owned,
        pilots,
        pilotCount: pilots.length,
      });
    })
  );
}

/**
 * @param {import('./store.js').Game[]} games
 * @param {import('./store.js').Deck[]} decks
 * @param {{ excludeMyPlayer?: boolean }} [options]
 */
export function buildPodPlayerRankings(games, decks, options = {}) {
  const { excludeMyPlayer = false } = options;
  const rows = new Map();

  for (const game of games) {
    const seats = parseGameSeats(game, decks);
    for (const seat of seats) {
      if (excludeMyPlayer && isMyPlayer(seat)) continue;
      const player = seat.player?.trim();
      if (!player) continue;

      const key = normalizeKey(player);
      const row =
        rows.get(key) ??
        ({
          key,
          name: player,
          games: 0,
          wins: 0,
          losses: 0,
          sharedLosses: 0,
          commanders: new Map(),
          lastPlayed: null,
        });

      row.games += 1;
      const outcome = seatOutcome(seat, seats);
      if (outcome === "win") row.wins += 1;
      else if (outcome === "loss") row.losses += 1;
      else row.sharedLosses += 1;

      const commander = getCommanderInfo(seat.commander).canonicalName;
      row.commanders.set(commander, (row.commanders.get(commander) || 0) + 1);
      if (!row.lastPlayed || game.date > row.lastPlayed) row.lastPlayed = game.date;
      rows.set(key, row);
    }
  }

  return sortRankings(
    [...rows.values()].map((row) => {
      const commanders = [...row.commanders.entries()]
        .map(([name, count]) => ({ name, games: count }))
        .sort((a, b) => b.games - a.games || a.name.localeCompare(b.name));

      return finalizePodRow({
        ...row,
        commanders,
        commanderCount: commanders.length,
      });
    })
  );
}

/**
 * @param {import('./store.js').Game[]} games
 * @param {import('./store.js').Deck[]} decks
 * @param {{ splitPartners?: boolean, excludeMyPlayer?: boolean, view?: 'wubrgc'|'all'|'exact', agg?: 'inclusive'|'exclusive' }} options
 */
export function buildPodColorRankings(games, decks, options = {}) {
  const {
    splitPartners = false,
    excludeMyPlayer = false,
    view = "exact",
    agg = "exclusive",
  } = options;
  const rows = new Map();

  for (const game of games) {
    const seats = parseGameSeats(game, decks);
    for (const seat of seats) {
      if (excludeMyPlayer && isMyPlayer(seat)) continue;
      if (!seat.commander) continue;

      for (const commander of getCommanderMatchupIdentities(seat.commander, { splitPartners })) {
        const owned = findOwnedDeck(commander, decks);
        const colors = resolveCommanderColors(commander, {
          splitPartners,
          ownedDeck: owned,
        });
        const colorKeys = colorKeysForIdentity(colors, view, agg);

        for (const colorKey of colorKeys) {
          const row =
            rows.get(colorKey) ??
            ({
              key: colorKey,
              name: colorKeyLabel(colorKey, view),
              displayColors: rowColorsFromKey(colorKey),
              games: 0,
              wins: 0,
              losses: 0,
              sharedLosses: 0,
              commanders: new Set(),
              players: new Set(),
            });

          row.games += 1;
          const outcome = seatOutcome(seat, seats);
          if (outcome === "win") row.wins += 1;
          else if (outcome === "loss") row.losses += 1;
          else row.sharedLosses += 1;

          row.commanders.add(getCommanderInfo(commander).canonicalName);
          if (seat.player) row.players.add(seat.player);
          rows.set(colorKey, row);
        }
      }
    }
  }

  return sortRankings(
    [...rows.values()].map((row) =>
      finalizePodRow({
        ...row,
        commanderCount: row.commanders.size,
        playerCount: row.players.size,
        commanders: undefined,
        players: undefined,
      })
    )
  );
}

/**
 * @param {import('./store.js').Game[]} games
 * @param {import('./store.js').Deck[]} decks
 * @param {object} [options]
 */
export function computeAllTotals(games, decks, options = {}) {
  const { bracketFilter = "", ...rankingOptions } = options;
  const filteredGames = filterGamesByBracket(games, decks, bracketFilter);

  return {
    decks: buildPodDeckRankings(filteredGames, decks, rankingOptions),
    players: buildPodPlayerRankings(filteredGames, decks, rankingOptions),
    colors: buildPodColorRankings(filteredGames, decks, rankingOptions),
  };
}
