import { fetchCardMetadata } from "./scryfall.js";
import { getCommanderInfo, isPartnerPartName, splitCommanderName } from "./commander-names.js";
import { canonicalizeColors } from "./color-identity.js";
import { deckCommander } from "./deck-identity.js";

const CACHE_KEY = "edhlog:commander-colors:v3";
const LEGACY_CACHE_KEY = "edhlog:commander-colors:v2";

/** @type {Map<string, string[]>} */
const colorCache = loadCache();

function loadCache() {
  try {
    let raw = localStorage.getItem(CACHE_KEY);
    if (!raw) {
      raw = localStorage.getItem(LEGACY_CACHE_KEY);
      if (raw) localStorage.setItem(CACHE_KEY, raw);
    }
    if (!raw) return new Map();
    const parsed = JSON.parse(raw);
    return new Map(Object.entries(parsed).map(([key, value]) => [key, value]));
  } catch {
    return new Map();
  }
}

function saveCache() {
  localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(colorCache)));
}

function cacheKey(name) {
  return String(name || "")
    .trim()
    .toLowerCase();
}

function storeColors(name, colors) {
  if (!name) return;
  colorCache.set(cacheKey(name), colors);
}

/** @param {string} fullName */
async function resolveCommanderColorIdentity(fullName) {
  const trimmed = fullName.trim();
  if (!trimmed) return [];

  const cached = colorCache.get(cacheKey(trimmed));
  if (cached?.length) return cached;

  const info = getCommanderInfo(trimmed);
  const parts = splitCommanderName(trimmed);

  if (info.kind === "partner" && parts.length === 1) {
    const meta = await fetchCardMetadata(trimmed);
    if (!meta) return [];
    const colors = meta.colorIdentity ?? [];
    storeColors(trimmed, colors);
    saveCache();
    return colors;
  }

  if (info.kind === "partner") {
    const union = new Set();
    for (const part of info.parts) {
      let partColors = colorCache.get(cacheKey(part));
      if (!partColors?.length) {
        const meta = await fetchCardMetadata(part);
        if (!meta) continue;
        partColors = meta.colorIdentity ?? [];
        storeColors(part, partColors);
      }
      for (const color of partColors) union.add(color);
    }
    const colors = canonicalizeColors([...union]);
    storeColors(info.canonicalName, colors);
    storeColors(trimmed, colors);
    saveCache();
    return colors;
  }

  const meta = await fetchCardMetadata(info.canonicalName);
  if (!meta) return [];
  const colors = meta.colorIdentity ?? [];
  storeColors(info.canonicalName, colors);
  storeColors(trimmed, colors);
  saveCache();
  return colors;
}

/** @param {string} name */
export function getCommanderColorIdentity(name) {
  const trimmed = String(name || "").trim();
  if (!trimmed) return [];

  const trimmedKey = cacheKey(trimmed);
  const info = getCommanderInfo(trimmed);

  if (isPartnerPartName(trimmed)) {
    const matchedPart = info.parts.find((part) => cacheKey(part) === trimmedKey);
    if (matchedPart) {
      const partColors = colorCache.get(cacheKey(matchedPart));
      if (partColors?.length) return partColors;
    }
  }

  const direct = colorCache.get(trimmedKey);
  if (direct?.length) return direct;

  const canonical = colorCache.get(cacheKey(info.canonicalName));
  if (canonical?.length) return canonical;

  return [];
}

/** @param {import('./store.js').Deck | null | undefined} deck */
export function getDeckColors(deck) {
  if (!deck) return [];
  if (deck.colors?.length) return deck.colors;
  return getCommanderColorIdentity(deckCommander(deck));
}

/**
 * Prefer owned deck colors unless split-partner mode needs a single card's identity.
 * @param {string} name
 * @param {{ splitPartners?: boolean, ownedColors?: string[] | null, ownedDeck?: import('./store.js').Deck | null }} [options]
 */
export function resolveCommanderColors(name, options = {}) {
  const { splitPartners = false, ownedColors = null, ownedDeck = null } = options;
  const deckColors = ownedDeck ? getDeckColors(ownedDeck) : ownedColors;
  if (deckColors?.length && !(splitPartners && isPartnerPartName(name))) {
    return deckColors;
  }
  return getCommanderColorIdentity(name);
}

/** @param {import('./store.js').Game[]} games */
export function collectOpponentCommanderNames(games) {
  const names = new Set();
  for (const game of games) {
    for (const opp of game.opponents || []) {
      const name = String(opp.name || "").trim();
      if (name) names.add(name);
    }
  }
  return [...names];
}

/** @param {import('./store.js').Deck[]} decks */
export function collectOwnedDeckCommanderNames(decks) {
  const names = new Set();
  for (const deck of decks) {
    if (deck.colors?.length) continue;
    const commander = deckCommander(deck);
    if (commander) names.add(commander);
  }
  return [...names];
}

/** @param {import('./store.js').Deck[]} decks */
export function backfillDeckColorIdentities(decks) {
  let changed = false;
  for (const deck of decks) {
    if (deck.colors?.length) continue;
    const colors = getCommanderColorIdentity(deckCommander(deck));
    if (!colors.length) continue;
    deck.colors = [...colors];
    changed = true;
  }
  return changed;
}

/** @param {string[]} names */
export async function warmCommanderColorCache(names) {
  const pending = new Set(names.filter(Boolean));
  for (const name of names) {
    const info = getCommanderInfo(name);
    if (info.kind === "partner") {
      for (const part of info.parts) pending.add(part);
      pending.add(info.canonicalName);
    }
  }
  for (const name of pending) {
    const key = cacheKey(name);
    const cached = colorCache.get(key);
    if (cached?.length) continue;
    await resolveCommanderColorIdentity(name);
  }
}
