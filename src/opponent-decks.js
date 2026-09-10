import { gameSortKey, normalizeDate } from "./dates.js";
import { getCommanderColorIdentity } from "./commander-colors.js";
import { parseGameSeats } from "./matchups.js";
import { winRate, normalizedWinRate } from "./stats.js";

/** @typedef {{
 *   id: string,
 *   player: string,
 *   commander: string,
 *   name?: string,
 *   bracket?: number,
 *   colors?: string[],
 *   archetypes?: string[],
 *   tribes?: string[],
 *   retired?: boolean,
 *   createdAt?: string,
 *   commanderAliases?: string[]
 * }} OpponentDeck */

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

/** @param {string} player @param {string} commander */
export function opponentDeckMatchKey(player, commander) {
  return `${normalizeKey(player)}|${normalizeKey(commander)}`;
}

/** @param {OpponentDeck} deck */
export function opponentDeckId(deck) {
  return String(deck?.id || "").trim();
}

/** @param {OpponentDeck} deck */
export function opponentDeckCommander(deck) {
  return String(deck?.commander || "").trim();
}

/** @param {OpponentDeck} deck */
export function opponentDeckTitle(deck) {
  const name = String(deck?.name || "").trim();
  return name || opponentDeckCommander(deck);
}

/** @param {OpponentDeck} deck */
export function opponentDeckLabel(deck) {
  return opponentDeckCommander(deck);
}

/** @param {OpponentDeck} deck @param {string} loggedCommander */
export function opponentDeckCommanderMatches(deck, loggedCommander) {
  const logged = String(loggedCommander || "").trim();
  if (!logged) return false;
  const key = normalizeKey(logged);
  if (normalizeKey(deck.commander) === key) return true;
  return (deck.commanderAliases || []).some((alias) => normalizeKey(alias) === key);
}

/** @param {OpponentDeck[]} decks @param {string} player @param {string} commander */
export function findOpponentDeckByPair(decks, player, commander) {
  const key = opponentDeckMatchKey(player, commander);
  return (
    decks.find((deck) => opponentDeckMatchKey(deck.player, deck.commander) === key) ||
    decks.find(
      (deck) =>
        normalizeKey(deck.player) === normalizeKey(player) &&
        opponentDeckCommanderMatches(deck, commander)
    ) ||
    null
  );
}

/** @param {OpponentDeck[]} decks @param {string} id */
export function findOpponentDeck(decks, id) {
  const trimmed = String(id || "").trim();
  if (!trimmed) return null;
  return decks.find((deck) => opponentDeckId(deck) === trimmed) || null;
}

/** @param {OpponentDeck[]} decks */
function nextOpponentDeckId(decks) {
  const nums = decks
    .map((deck) => opponentDeckId(deck))
    .map((id) => {
      const match = /^od-(\d+)$/.exec(id);
      return match ? Number(match[1]) : 0;
    });
  const max = nums.length ? Math.max(...nums) : 0;
  return `od-${max + 1}`;
}

/**
 * @param {OpponentDeck[]} decks
 * @param {string} player
 * @param {string} commander
 * @param {string} [createdAt]
 */
export function createOpponentDeck(decks, player, commander, createdAt) {
  const trimmedPlayer = String(player || "").trim();
  const trimmedCommander = String(commander || "").trim();
  const deck = {
    id: nextOpponentDeckId(decks),
    player: trimmedPlayer,
    commander: trimmedCommander,
    name: "",
    bracket: 4,
    colors: getCommanderColorIdentity(trimmedCommander),
    archetypes: [],
    tribes: [],
    retired: false,
    createdAt: normalizeDate(createdAt || "") || createdAt || "",
    commanderAliases: [],
  };
  decks.push(deck);
  return deck;
}

/** @param {import('./store.js').Game} game @param {{ seat: number, player?: string, name: string, opponentDeckId?: string }} opponent @param {OpponentDeck[]} decks */
export function opponentEntryMatchesDeck(game, opponent, deck) {
  if (opponent.opponentDeckId && opponent.opponentDeckId === deck.id) return true;
  const player = String(opponent.player || "").trim();
  const commander = String(opponent.name || "").trim();
  if (normalizeKey(player) !== normalizeKey(deck.player)) return false;
  return opponentDeckCommanderMatches(deck, commander);
}

/** @param {import('./store.js').Game} game @param {OpponentDeck} deck */
export function gameIncludesOpponentDeck(game, deck) {
  return (game.opponents || []).some((opp) => opponentEntryMatchesDeck(game, opp, deck));
}

/**
 * @param {import('./store.js').Game[]} games
 * @param {OpponentDeck} deck
 */
export function gamesForOpponentDeck(games, deck) {
  return games.filter((game) => gameIncludesOpponentDeck(game, deck));
}

/**
 * @param {import('./store.js').Game[]} games
 * @param {OpponentDeck[]} opponentDecks
 */
export function computeOpponentDeckStats(games, opponentDecks) {
  return opponentDecks.map((deck) => {
    let gamesCount = 0;
    let wins = 0;
    let losses = 0;
    /** @type {string | null} */
    let lastPlayed = null;
    let lastPlayedSortKey = "";

    for (const game of games) {
      if (!gameIncludesOpponentDeck(game, deck)) continue;

      const seats = parseGameSeats(game);
      let matched = false;
      for (const seat of seats) {
        if (normalizeKey(seat.player) !== normalizeKey(deck.player)) continue;
        const opp = (game.opponents || []).find((entry) => Number(entry.seat) === Number(seat.seat));
        if (!opp || !opponentEntryMatchesDeck(game, opp, deck)) continue;
        matched = true;
        gamesCount += 1;
        if (seat.didWin) wins += 1;
        else losses += 1;
        break;
      }

      if (matched) {
        const playedKey = gameSortKey(game);
        if (!lastPlayedSortKey || playedKey.localeCompare(lastPlayedSortKey) > 0) {
          lastPlayed = game.date;
          lastPlayedSortKey = playedKey;
        }
      }
    }

    return {
      ...deck,
      games: gamesCount,
      wins,
      losses,
      lastPlayed,
      lastPlayedSortKey,
      winRate: winRate(wins, gamesCount),
      normalizedWr: normalizedWinRate(wins, gamesCount),
    };
  });
}

/**
 * @param {import('./store.js').AppData} data
 */
export function ensureOpponentDecks(data) {
  if (!Array.isArray(data.opponentDecks)) data.opponentDecks = [];
  return data.opponentDecks;
}

/**
 * @param {import('./store.js').AppData} data
 */
export function syncOpponentDecksFromGames(data) {
  const opponentDecks = ensureOpponentDecks(data);
  let changed = false;

  for (const game of data.games) {
    for (const opp of game.opponents || []) {
      const commander = String(opp.name || "").trim();
      if (!commander) continue;
      const player = String(opp.player || "").trim();
      let deck = findOpponentDeckByPair(opponentDecks, player, commander);
      if (!deck) {
        deck = createOpponentDeck(opponentDecks, player, commander, game.date);
        changed = true;
      }
      if (!deck.createdAt) {
        deck.createdAt = normalizeDate(game.date) || game.date;
        changed = true;
      }
      if (!opp.opponentDeckId || opp.opponentDeckId !== deck.id) {
        opp.opponentDeckId = deck.id;
        changed = true;
      }
    }
  }

  return changed;
}

/**
 * @param {import('./store.js').Game} game
 * @param {OpponentDeck[]} opponentDecks
 */
export function linkGameOpponentsToDecks(game, opponentDecks) {
  let changed = false;
  for (const opp of game.opponents || []) {
    const commander = String(opp.name || "").trim();
    if (!commander) continue;
    const player = String(opp.player || "").trim();
    let deck = findOpponentDeckByPair(opponentDecks, player, commander);
    if (!deck) {
      deck = createOpponentDeck(opponentDecks, player, commander, game.date);
      changed = true;
    }
    if (opp.opponentDeckId !== deck.id) {
      opp.opponentDeckId = deck.id;
      changed = true;
    }
  }
  return changed;
}

/**
 * @param {OpponentDeck[]} opponentDecks
 * @param {string} id
 * @param {{ name?: string, commander?: string, bracket?: number, colors?: string[], archetypes?: string[], tribes?: string[], retired?: boolean, createdAt?: string }} payload
 */
export function updateOpponentDeckProfile(opponentDecks, id, payload) {
  const deck = findOpponentDeck(opponentDecks, id);
  if (!deck) return null;

  const nextCommander = String(payload.commander ?? deck.commander).trim();
  const prevCommander = opponentDeckCommander(deck);
  if (nextCommander && prevCommander && normalizeKey(nextCommander) !== normalizeKey(prevCommander)) {
    const aliases = [...(deck.commanderAliases || [])];
    if (!aliases.some((alias) => normalizeKey(alias) === normalizeKey(prevCommander))) {
      aliases.push(prevCommander);
    }
    deck.commanderAliases = aliases;
    deck.commander = nextCommander;
  } else if (payload.commander != null) {
    deck.commander = nextCommander;
  }

  if (payload.name != null) deck.name = String(payload.name || "").trim();
  if (payload.bracket != null) deck.bracket = Number(payload.bracket) || 4;
  if (payload.colors != null) deck.colors = [...payload.colors];
  if (payload.archetypes != null) deck.archetypes = [...payload.archetypes];
  if (payload.tribes != null) deck.tribes = [...payload.tribes];
  if (payload.retired != null) deck.retired = !!payload.retired;
  if (payload.createdAt != null) deck.createdAt = payload.createdAt;

  return deck;
}
