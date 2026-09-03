import { normalizeDate } from "./dates.js";

/** @param {import('./store.js').Deck} deck */
export function deckId(deck) {
  return String(deck?.id || "").trim();
}

/** @param {import('./store.js').Deck} deck */
export function deckKey(deck) {
  return String(deck?.commander || deck?.name || "").trim();
}

/** @param {import('./store.js').Deck} deck */
export function deckCommander(deck) {
  return String(deck?.commander || deck?.name || "").trim();
}

/** Custom deck name for Overview and Decks tab; falls back to commander. */
export function deckTitle(deck) {
  const name = String(deck?.name || "").trim();
  return name || deckCommander(deck);
}

/** Commander label for stats, games, matchups, and everywhere else. */
export function deckLabel(deck) {
  return deckCommander(deck);
}

/** @param {import('./store.js').Deck} deck @param {string} date */
export function resolveDeckCommanderOnDate(deck, date) {
  const gameDate = normalizeDate(date) || String(date || "").trim();
  const history = [...(deck.history || [])].sort((a, b) =>
    String(a.changedAt).localeCompare(String(b.changedAt))
  );
  for (const entry of history) {
    const changedAt = normalizeDate(entry.changedAt) || String(entry.changedAt || "").trim();
    if (changedAt && gameDate < changedAt) {
      const commander = String(entry.commander || "").trim();
      if (commander) return commander;
    }
  }
  return deckCommander(deck);
}

/** @param {import('./store.js').Game} game @param {import('./store.js').Deck[]} decks */
export function resolveMyCommander(game, decks) {
  const deck = findDeck(decks, game.deck);
  if (deck?.history?.length) {
    return resolveDeckCommanderOnDate(deck, game.date);
  }
  const snapshot = String(game.myCommander || "").trim();
  if (snapshot) return snapshot;
  if (deck) return deckCommander(deck);
  return String(game.deck || "").trim();
}

/** @param {string} ref @param {import('./store.js').Deck[]} decks */
export function findDeck(decks, ref) {
  const trimmed = String(ref || "").trim();
  if (!trimmed) return null;
  return (
    decks.find((deck) => deckId(deck) === trimmed) ||
    decks.find((deck) => deckKey(deck) === trimmed) ||
    decks.find((deck) => String(deck.name || "").trim() === trimmed) ||
    null
  );
}

/** @param {import('./store.js').Deck[]} decks */
export function deckMapByKey(decks) {
  const map = new Map();
  for (const deck of decks) {
    const id = deckId(deck);
    if (id) map.set(id, deck);
    const key = deckKey(deck);
    if (key) map.set(key, deck);
    const name = String(deck.name || "").trim();
    if (name && name !== key) map.set(name, deck);
  }
  return map;
}

/** @param {string} key @param {import('./store.js').Deck[]} decks */
export function deckLabelForKey(key, decks) {
  const deck = findDeck(decks, key);
  return deck ? deckLabel(deck) : String(key || "").trim();
}

/** @param {string} key @param {import('./store.js').Deck[]} decks */
export function deckTitleForKey(key, decks) {
  const deck = findDeck(decks, key);
  return deck ? deckTitle(deck) : String(key || "").trim();
}
