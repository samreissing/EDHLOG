import { normalizeDate } from "./dates.js";

const STORAGE_KEY = "edhlog-data-v1";

/** @typedef {{ name: string, bracket: number, colors: string[], retired: boolean, createdAt?: string }} Deck */
/** @typedef {{ id: string, date: string, deck: string, result: 'Win' | 'Loss' }} Game */
/** @typedef {{ seedHash?: string, seedGames?: number }} DataMeta */
/** @typedef {{ meta?: DataMeta, decks: Deck[], games: Game[] }} AppData */

/** @type {AppData | null} */
let cache = null;

/** @type {{ games: number, keptLocal: number } | null} */
let lastSeedSync = null;

export function getLastSeedSync() {
  return lastSeedSync;
}

export function gameFingerprint(game) {
  return `${normalizeDate(game.date)}|${game.deck}|${game.result}`;
}

export async function loadSeed() {
  const res = await fetch("/data/seed.json", { cache: "no-store" });
  return /** @type {AppData} */ (await res.json());
}

function migrateDecks(data) {
  let changed = false;
  const firstGameByDeck = new Map();
  for (const game of data.games) {
    const existing = firstGameByDeck.get(game.deck);
    if (!existing || game.date < existing) firstGameByDeck.set(game.deck, game.date);
  }
  for (const deck of data.decks) {
    if (!deck.createdAt) {
      deck.createdAt = firstGameByDeck.get(deck.name) || "2024-04-15";
      changed = true;
    }
  }
  return changed;
}

function sanitizeData(data) {
  let changed = false;
  for (const game of data.games) {
    const fixed = normalizeDate(game.date);
    if (fixed !== game.date) {
      game.date = fixed;
      changed = true;
    }
  }
  if (migrateDecks(data)) changed = true;
  return changed;
}

/** @param {AppData} local @param {AppData} seed */
export function syncFromSeed(local, seed) {
  const seedFingerprints = new Set(seed.games.map(gameFingerprint));
  const localOnlyGames = local.games.filter((game) => !seedFingerprints.has(gameFingerprint(game)));

  local.games = seed.games.map((game) => ({ ...game }));
  let nextNum = local.games.length + 1;
  for (const game of localOnlyGames) {
    local.games.push({ ...game, id: `game-${nextNum++}` });
  }

  const seedDeckNames = new Set(seed.decks.map((deck) => deck.name));
  const localOnlyDecks = local.decks.filter((deck) => !seedDeckNames.has(deck.name));
  local.decks = seed.decks.map((deck) => ({ ...deck, colors: [...(deck.colors || [])] }));
  for (const deck of localOnlyDecks) {
    local.decks.push({ ...deck, colors: [...(deck.colors || [])] });
  }

  local.meta = {
    seedHash: seed.meta?.seedHash,
    seedGames: seed.meta?.seedGames ?? seed.games.length,
  };

  return {
    games: seed.games.length,
    keptLocal: localOnlyGames.length,
  };
}

export function loadData() {
  if (cache) return cache;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    cache = JSON.parse(raw);
    if (sanitizeData(cache)) saveData(cache);
    return cache;
  }
  return null;
}

export async function initData() {
  lastSeedSync = null;
  const seed = await loadSeed();
  let data = loadData();

  if (!data) {
    saveData(seed);
    return seed;
  }

  const seedHash = seed.meta?.seedHash;
  const localHash = data.meta?.seedHash;
  if (seedHash && seedHash !== localHash) {
    lastSeedSync = syncFromSeed(data, seed);
    saveData(data);
  }

  return data;
}

/** @param {AppData} data */
export function saveData(data) {
  cache = data;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export async function resetToSeed() {
  const data = await loadSeed();
  saveData(data);
  lastSeedSync = null;
  return data;
}

export function exportData() {
  const data = loadData();
  if (!data) return;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `edhlog-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** @param {File} file */
export async function importData(file) {
  const text = await file.text();
  const data = JSON.parse(text);
  if (!data.decks || !data.games) throw new Error("Invalid EDHLOG data file");
  saveData(data);
  return data;
}

export function nextGameId(games) {
  const nums = games
    .map((g) => parseInt(g.id.replace("game-", ""), 10))
    .filter((n) => !Number.isNaN(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return `game-${max + 1}`;
}
