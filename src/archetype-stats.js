import { winRate, normalizedWinRate } from "./stats.js";
import { deckId, findDeck } from "./deck-identity.js";
import { parseGameSeats } from "./matchups.js";
import { MY_PLAYER_NAME } from "./opponent-search.js";
import {
  findOpponentDeck,
  findOpponentDeckByPair,
  opponentEntryMatchesDeck,
} from "./opponent-decks.js";

/** @typedef {'unique' | 'combined' | 'exact'} ArchetypeView */
/** @typedef {'archetype' | 'tribe'} ArchetypeLabelMode */

/** @param {string[]} tags */
function normalizeTags(tags) {
  return (tags || []).map((value) => String(value || "").trim()).filter(Boolean);
}

/** @param {Map<string, string>} canonicalNames @param {string} name */
function canonicalTag(canonicalNames, name) {
  const key = name.toLowerCase();
  if (!canonicalNames.has(key)) canonicalNames.set(key, name);
  return canonicalNames.get(key) || name;
}

/** @param {string[]} tags @param {Map<string, string>} canonicalNames */
function tagRowKey(tags, canonicalNames) {
  return [...tags]
    .map((name) => canonicalTag(canonicalNames, name))
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
    .join(", ");
}

/** @param {string[]} tags */
function subsets(tags) {
  const out = [];
  const count = tags.length;
  for (let mask = 1; mask < 1 << count; mask++) {
    const subset = [];
    for (let index = 0; index < count; index++) {
      if (mask & (1 << index)) subset.push(tags[index]);
    }
    out.push(subset);
  }
  return out;
}

/**
 * @param {string[]} tags
 * @param {ArchetypeView} view
 * @param {Map<string, string>} canonicalNames
 */
function rowKeysForDeckTags(tags, view, canonicalNames) {
  const list = normalizeTags(tags);
  if (!list.length) return [];

  const canonical = list.map((name) => canonicalTag(canonicalNames, name));

  if (view === "unique") {
    return [...new Set(canonical.map((name) => name.toLowerCase()))].map(
      (key) => canonicalNames.get(key) || key
    );
  }

  if (view === "exact") {
    return [tagRowKey(canonical, canonicalNames)];
  }

  return subsets(canonical).map((subset) => tagRowKey(subset, canonicalNames));
}

/**
 * @param {string[]} deckTags
 * @param {string} rowKey
 * @param {ArchetypeView} view
 * @param {Map<string, string>} canonicalNames
 */
function deckMatchesTagRow(deckTags, rowKey, view, canonicalNames) {
  const deckList = normalizeTags(deckTags).map((name) => canonicalTag(canonicalNames, name));
  if (!deckList.length) return false;

  if (view === "unique") {
    return deckList.some(
      (name) => name.toLowerCase() === String(rowKey || "").trim().toLowerCase()
    );
  }

  if (view === "exact") {
    return tagRowKey(deckList, canonicalNames) === rowKey;
  }

  const rowParts = String(rowKey || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (!rowParts.length) return false;

  return rowParts.every((part) =>
    deckList.some((name) => name.localeCompare(part, undefined, { sensitivity: "base" }) === 0)
  );
}

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

/** @param {import('./matchups.js').GameSeat} seat */
function isMyPlayer(seat) {
  return normalizeKey(seat.player) === normalizeKey(MY_PLAYER_NAME);
}

/** @param {import('./store.js').Deck | import('./opponent-decks.js').OpponentDeck} deck @param {'archetype' | 'tribe'} tagKind */
function deckTags(deck, tagKind) {
  return tagKind === "tribe" ? deck.tribes : deck.archetypes;
}

/**
 * @param {import('./store.js').Game[]} games
 * @param {Array<{ archetypes?: string[], tribes?: string[] }>} decks
 * @param {ArchetypeView} view
 * @param {Map<string, string>} canonicalNames
 * @param {'archetype' | 'tribe'} tagKind
 * @param {(game: import('./store.js').Game) => { tags: string[], deckKey: string, didWin: boolean } | null} matchGame
 */
function computeTagStats(games, decks, view, canonicalNames, tagKind, matchGame) {
  /** @type {Set<string>} */
  const rowKeys = new Set();

  for (const deck of decks) {
    for (const key of rowKeysForDeckTags(deckTags(deck, tagKind), view, canonicalNames)) {
      rowKeys.add(key);
    }
  }

  return [...rowKeys]
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
    .map((key) => {
      let gamesCount = 0;
      let wins = 0;
      /** @type {Set<string>} */
      const deckIds = new Set();

      for (const game of games) {
        const match = matchGame(game);
        if (!match) continue;
        if (!deckMatchesTagRow(match.tags, key, view, canonicalNames)) continue;
        gamesCount += 1;
        if (match.didWin) wins += 1;
        if (match.deckKey) deckIds.add(match.deckKey);
      }

      return {
        key,
        label: key,
        decks: deckIds.size,
        games: gamesCount,
        wins,
        winRate: winRate(wins, gamesCount),
        normalizedWr: normalizedWinRate(wins, gamesCount),
      };
    })
    .filter((row) => row.games > 0);
}

/** @param {ArchetypeView} view */
export function archetypeViewLabel(view) {
  if (view === "combined") return "Combined";
  if (view === "exact") return "Exact";
  return "Unique";
}

/** @param {ArchetypeView} view */
export function cycleArchetypeView(view) {
  if (view === "unique") return "combined";
  if (view === "combined") return "exact";
  return "unique";
}

/** @param {import('./table.js').SortState & { labelMode?: ArchetypeLabelMode }} [state] */
export function archetypeLabelHeaderLabel(state) {
  const mode = state?.labelMode || "archetype";
  return mode === "tribe" ? "Tribe" : "Archetype";
}

/** @param {import('./table.js').SortState & { labelMode?: ArchetypeLabelMode }} [state] */
export function toggleArchetypeLabelSort(state) {
  if (state?.col !== "label") {
    return { col: "label", dir: "asc", labelMode: "archetype" };
  }

  const mode = state.labelMode || "archetype";
  if (mode === "archetype" && state.dir === "asc") {
    return { col: "label", dir: "desc", labelMode: "archetype" };
  }
  if (mode === "archetype" && state.dir === "desc") {
    return { col: "label", dir: "asc", labelMode: "tribe" };
  }
  if (mode === "tribe" && state.dir === "asc") {
    return { col: "label", dir: "desc", labelMode: "tribe" };
  }
  return { col: "label", dir: "asc", labelMode: "archetype" };
}

/** @param {Array<{ key: string, label: string, decks: number, games: number, wins: number, winRate: number, normalizedWr: number }>} rowsA @param {typeof rowsA} rowsB */
export function mergeArchetypeStatsRows(rowsA, rowsB) {
  /** @type {Map<string, { key: string, label: string, decks: number, games: number, wins: number }>} */
  const merged = new Map();

  for (const row of [...rowsA, ...rowsB]) {
    const mapKey = row.key.toLowerCase();
    const existing = merged.get(mapKey);
    if (!existing) {
      merged.set(mapKey, {
        key: row.key,
        label: row.label,
        decks: row.decks,
        games: row.games,
        wins: row.wins,
      });
      continue;
    }
    existing.games += row.games;
    existing.wins += row.wins;
    existing.decks += row.decks;
  }

  return [...merged.values()]
    .map(({ key, label, decks, games, wins }) => ({
      key,
      label,
      decks,
      games,
      wins,
      winRate: winRate(wins, games),
      normalizedWr: normalizedWinRate(wins, games),
    }))
    .filter((row) => row.games > 0);
}

/**
 * @param {import('./store.js').Game[]} games
 * @param {import('./store.js').Deck[]} decks
 * @param {{ view: ArchetypeView, tagKind?: 'archetype' | 'tribe' }} options
 */
export function computeArchetypeStats(games, decks, { view, tagKind = "archetype" }) {
  /** @type {Map<string, string>} */
  const canonicalNames = new Map();

  return computeTagStats(games, decks, view, canonicalNames, tagKind, (game) => {
    const deck = findDeck(decks, game.deck);
    if (!deck) return null;
    return {
      tags: deckTags(deck, tagKind),
      deckKey: deckId(deck) || "",
      didWin: game.result === "Win",
    };
  });
}

/**
 * @param {import('./store.js').Game[]} games
 * @param {import('./opponent-decks.js').OpponentDeck[]} opponentDecks
 * @param {{ view: ArchetypeView, tagKind?: 'archetype' | 'tribe', excludeMyPlayer?: boolean }} options
 */
export function computePodTagStats(games, opponentDecks, { view, tagKind = "archetype", excludeMyPlayer = false }) {
  /** @type {Map<string, string>} */
  const canonicalNames = new Map();
  /** @type {Set<string>} */
  const rowKeys = new Set();

  for (const deck of opponentDecks) {
    for (const key of rowKeysForDeckTags(deckTags(deck, tagKind), view, canonicalNames)) {
      rowKeys.add(key);
    }
  }

  return [...rowKeys]
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
    .map((key) => {
      let gamesCount = 0;
      let wins = 0;
      /** @type {Set<string>} */
      const deckIds = new Set();

      for (const game of games) {
        const seats = parseGameSeats(game);
        for (const seat of seats) {
          if (excludeMyPlayer && isMyPlayer(seat)) continue;

          const opp = (game.opponents || []).find((entry) => Number(entry.seat) === Number(seat.seat));
          if (!opp) continue;

          const deck =
            (opp.opponentDeckId && findOpponentDeck(opponentDecks, opp.opponentDeckId)) ||
            findOpponentDeckByPair(opponentDecks, seat.player || "", opp.name);
          if (!deck || !opponentEntryMatchesDeck(game, opp, deck)) continue;
          if (!deckMatchesTagRow(deckTags(deck, tagKind), key, view, canonicalNames)) continue;

          gamesCount += 1;
          if (seat.didWin) wins += 1;
          if (deck.id) deckIds.add(deck.id);
        }
      }

      return {
        key,
        label: key,
        decks: deckIds.size,
        games: gamesCount,
        wins,
        winRate: winRate(wins, gamesCount),
        normalizedWr: normalizedWinRate(wins, gamesCount),
      };
    })
    .filter((row) => row.games > 0);
}
