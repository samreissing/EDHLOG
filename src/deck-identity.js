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

/** @param {string} key @param {import('./store.js').Deck[]} decks */
export function findDeck(decks, key) {
  const trimmed = String(key || "").trim();
  if (!trimmed) return null;
  return (
    decks.find((deck) => deckKey(deck) === trimmed) ||
    decks.find((deck) => String(deck.name || "").trim() === trimmed) ||
    null
  );
}

/** @param {import('./store.js').Deck[]} decks */
export function deckMapByKey(decks) {
  const map = new Map();
  for (const deck of decks) {
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
