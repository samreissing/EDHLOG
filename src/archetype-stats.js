import { winRate, normalizedWinRate } from "./stats.js";
import { deckId, findDeck } from "./deck-identity.js";

/** @typedef {'unique' | 'combined' | 'exact'} ArchetypeView */

/** @param {string[]} archetypes */
function normalizeArchetypes(archetypes) {
  return (archetypes || []).map((value) => String(value || "").trim()).filter(Boolean);
}

/** @param {Map<string, string>} canonicalNames @param {string} name */
function canonicalArchetype(canonicalNames, name) {
  const key = name.toLowerCase();
  if (!canonicalNames.has(key)) canonicalNames.set(key, name);
  return canonicalNames.get(key) || name;
}

/** @param {string[]} archetypes @param {Map<string, string>} canonicalNames */
function archetypeRowKey(archetypes, canonicalNames) {
  return [...archetypes]
    .map((name) => canonicalArchetype(canonicalNames, name))
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
    .join(", ");
}

/** @param {string[]} archetypes */
function subsets(archetypes) {
  const out = [];
  const count = archetypes.length;
  for (let mask = 1; mask < 1 << count; mask++) {
    const subset = [];
    for (let index = 0; index < count; index++) {
      if (mask & (1 << index)) subset.push(archetypes[index]);
    }
    out.push(subset);
  }
  return out;
}

/**
 * @param {string[]} archetypes
 * @param {ArchetypeView} view
 * @param {Map<string, string>} canonicalNames
 */
function rowKeysForDeckArchetypes(archetypes, view, canonicalNames) {
  const list = normalizeArchetypes(archetypes);
  if (!list.length) return [];

  const canonical = list.map((name) => canonicalArchetype(canonicalNames, name));

  if (view === "unique") {
    return [...new Set(canonical.map((name) => name.toLowerCase()))].map(
      (key) => canonicalNames.get(key) || key
    );
  }

  if (view === "exact") {
    return [archetypeRowKey(canonical, canonicalNames)];
  }

  return subsets(canonical).map((subset) => archetypeRowKey(subset, canonicalNames));
}

/**
 * @param {string[]} deckArchetypes
 * @param {string} rowKey
 * @param {ArchetypeView} view
 * @param {Map<string, string>} canonicalNames
 */
function deckMatchesArchetypeRow(deckArchetypes, rowKey, view, canonicalNames) {
  const deckList = normalizeArchetypes(deckArchetypes).map((name) =>
    canonicalArchetype(canonicalNames, name)
  );
  if (!deckList.length) return false;

  if (view === "unique") {
    return deckList.some(
      (name) => name.toLowerCase() === String(rowKey || "").trim().toLowerCase()
    );
  }

  if (view === "exact") {
    return archetypeRowKey(deckList, canonicalNames) === rowKey;
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

/**
 * @param {import('./store.js').Game[]} games
 * @param {import('./store.js').Deck[]} decks
 * @param {{ view: ArchetypeView }} options
 */
export function computeArchetypeStats(games, decks, { view }) {
  /** @type {Map<string, string>} */
  const canonicalNames = new Map();
  /** @type {Set<string>} */
  const rowKeys = new Set();

  for (const deck of decks) {
    for (const key of rowKeysForDeckArchetypes(deck.archetypes, view, canonicalNames)) {
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
        const deck = findDeck(decks, game.deck);
        if (!deck) continue;
        if (!deckMatchesArchetypeRow(deck.archetypes, key, view, canonicalNames)) continue;
        gamesCount += 1;
        if (game.result === "Win") wins += 1;
        const id = deckId(deck);
        if (id) deckIds.add(id);
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
