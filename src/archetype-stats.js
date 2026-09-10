import { winRate, normalizedWinRate } from "./stats.js";
import { deckId, deckKey, findDeck, deckMapByKey } from "./deck-identity.js";
import { parseGameSeats } from "./matchups.js";
import { MY_PLAYER_NAME } from "./opponent-search.js";
import {
  findOpponentDeck,
  findOpponentDeckByPair,
  opponentDeckMatchKey,
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

  const keys = [];
  const count = canonical.length;
  for (let mask = 1; mask < 1 << count; mask++) {
    const subset = [];
    for (let index = 0; index < count; index++) {
      if (mask & (1 << index)) subset.push(canonical[index]);
    }
    keys.push(tagRowKey(subset, canonicalNames));
  }
  return keys;
}

/**
 * @param {string[]} tags
 * @param {ArchetypeView} view
 * @param {Map<string, string>} canonicalNames
 * @param {Map<string, string[]>} cache
 */
function cachedRowKeys(tags, view, canonicalNames, cache) {
  const normalized = normalizeTags(tags);
  if (!normalized.length) return [];
  const cacheKey = `${view}:${normalized
    .map((tag) => tag.toLowerCase())
    .sort()
    .join("\0")}`;
  const hit = cache.get(cacheKey);
  if (hit) return hit;
  const keys = rowKeysForDeckTags(normalized, view, canonicalNames);
  cache.set(cacheKey, keys);
  return keys;
}

/** @param {Map<string, { key: string, label: string, games: number, wins: number, deckKeys: Set<string> }>} rows */
function finalizeTagRows(rows) {
  return [...rows.values()]
    .map(({ key, label, games, wins, deckKeys }) => ({
      key,
      label,
      decks: deckKeys.size,
      games,
      wins,
      winRate: winRate(wins, games),
      normalizedWr: normalizedWinRate(wins, games),
    }))
    .filter((row) => row.games > 0);
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
 * @param {Map<string, { key: string, label: string, games: number, wins: number, deckKeys: Set<string> }>} rows
 * @param {string[]} keys
 * @param {string} deckKey
 * @param {boolean} didWin
 */
function accumulateTagRows(rows, keys, deckKey, didWin) {
  for (const key of keys) {
    const mapKey = key.toLowerCase();
    let row = rows.get(mapKey);
    if (!row) {
      row = { key, label: key, games: 0, wins: 0, deckKeys: new Set() };
      rows.set(mapKey, row);
    }
    row.games += 1;
    if (didWin) row.wins += 1;
    if (deckKey) row.deckKeys.add(deckKey);
  }
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

export function deckMatchesArchetypeKey(tags, rowKey, view) {
  /** @type {Map<string, string>} */
  const canonicalNames = new Map();
  return deckMatchesTagRow(tags, rowKey, view, canonicalNames);
}

/**
 * @param {import('./store.js').Game[]} games
 * @param {import('./store.js').Deck[]} decks
 * @param {{ view: ArchetypeView, tagKind?: 'archetype' | 'tribe' }} options
 */
export function computeArchetypeStats(games, decks, { view, tagKind = "archetype" }) {
  /** @type {Map<string, string>} */
  const canonicalNames = new Map();
  /** @type {Map<string, string[]>} */
  const rowKeyCache = new Map();
  /** @type {Map<string, { key: string, label: string, games: number, wins: number, deckKeys: Set<string> }>} */
  const rows = new Map();
  const deckMap = deckMapByKey(decks);

  for (const game of games) {
    const deck = deckMap.get(String(game.deck || "").trim()) || findDeck(decks, game.deck);
    if (!deck) continue;

    const keys = cachedRowKeys(deckTags(deck, tagKind), view, canonicalNames, rowKeyCache);
    if (!keys.length) continue;

    accumulateTagRows(rows, keys, deckId(deck) || deckKey(deck), game.result === "Win");
  }

  return finalizeTagRows(rows);
}

/** @param {import('./opponent-decks.js').OpponentDeck[]} opponentDecks */
function buildOpponentDeckMaps(opponentDecks) {
  /** @type {Map<string, import('./opponent-decks.js').OpponentDeck>} */
  const byId = new Map();
  /** @type {Map<string, import('./opponent-decks.js').OpponentDeck>} */
  const byPair = new Map();

  for (const deck of opponentDecks) {
    if (deck.id) byId.set(deck.id, deck);
    byPair.set(opponentDeckMatchKey(deck.player, deck.commander), deck);
  }

  return { byId, byPair };
}

/**
 * @param {{ byId: Map<string, import('./opponent-decks.js').OpponentDeck>, byPair: Map<string, import('./opponent-decks.js').OpponentDeck> }} maps
 * @param {import('./store.js').Game} game
 * @param {{ seat: number, player?: string, name: string, opponentDeckId?: string }} opp
 * @param {string} player
 * @param {import('./opponent-decks.js').OpponentDeck[]} opponentDecks
 */
function resolveOpponentDeckForSeat(maps, game, opp, player, opponentDecks) {
  if (opp.opponentDeckId) {
    const byId = maps.byId.get(opp.opponentDeckId);
    if (byId && opponentEntryMatchesDeck(game, opp, byId)) return byId;
  }

  const byPair = maps.byPair.get(opponentDeckMatchKey(player, opp.name));
  if (byPair && opponentEntryMatchesDeck(game, opp, byPair)) return byPair;

  return findOpponentDeckByPair(opponentDecks, player, opp.name);
}

/**
 * @param {import('./store.js').Game[]} games
 * @param {import('./opponent-decks.js').OpponentDeck[]} opponentDecks
 * @param {{ view: ArchetypeView, tagKind?: 'archetype' | 'tribe', excludeMyPlayer?: boolean }} options
 */
export function computePodTagStats(games, opponentDecks, { view, tagKind = "archetype", excludeMyPlayer = false }) {
  /** @type {Map<string, string>} */
  const canonicalNames = new Map();
  /** @type {Map<string, string[]>} */
  const rowKeyCache = new Map();
  /** @type {Map<string, { key: string, label: string, games: number, wins: number, deckKeys: Set<string> }>} */
  const rows = new Map();
  const deckMaps = buildOpponentDeckMaps(opponentDecks);

  for (const game of games) {
    const seats = parseGameSeats(game);
    for (const seat of seats) {
      if (excludeMyPlayer && isMyPlayer(seat)) continue;

      const opp = (game.opponents || []).find((entry) => Number(entry.seat) === Number(seat.seat));
      if (!opp) continue;

      const deck = resolveOpponentDeckForSeat(
        deckMaps,
        game,
        opp,
        seat.player || "",
        opponentDecks
      );
      if (!deck) continue;

      const keys = cachedRowKeys(deckTags(deck, tagKind), view, canonicalNames, rowKeyCache);
      if (!keys.length) continue;

      accumulateTagRows(rows, keys, deck.id || "", !!seat.didWin);
    }
  }

  return finalizeTagRows(rows);
}
