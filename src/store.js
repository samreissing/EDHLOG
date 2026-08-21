import { normalizeDate, todayISO } from "./dates.js";

const STORAGE_KEY = "edhlog-data-v1";

/** @typedef {{ name: string, qty: number, board: string }} DeckCard */
/** @typedef {{ name: string, bracket: number, colors: string[], retired: boolean, createdAt?: string, listUrl?: string, listSource?: 'moxfield' | 'deckstats', listSyncedAt?: string, cards?: DeckCard[] }} Deck */
/** @typedef {{ id: string, date: string, time?: string, deck: string, result: 'Win' | 'Loss', source?: 'local', bracket?: number, mySeat?: number, myPlayer?: string, winnerSeat?: number, turn?: number, opponents?: { seat: number, name: string, player?: string }[] }} Game */
/** @typedef {{ seedHash?: string, seedGames?: number }} DataMeta */
/** @typedef {{ meta?: DataMeta, decks: Deck[], games: Game[] }} AppData */

/** @type {AppData | null} */
let cache = null;

/** @type {{ games: number, keptLocal: number, removed: number } | null} */
let lastSeedSync = null;

export function getLastSeedSync() {
  return lastSeedSync;
}

export function gameFingerprint(game) {
  return `${normalizeDate(game.date)}|${game.deck}|${game.result}`;
}

export async function loadSeed() {
  const res = await fetch(`${import.meta.env.BASE_URL}data/seed.json`, { cache: "no-store" });
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

function hasExtraGameFields(game) {
  return !!(
    game.mySeat ||
    game.myPlayer ||
    game.winnerSeat ||
    game.turn ||
    game.time ||
    game.bracket ||
    game.opponents?.length
  );
}

function maxSeedGameNum(games) {
  return games.reduce((max, game) => {
    const num = parseInt(String(game.id).replace("game-", ""), 10);
    return Number.isNaN(num) ? max : Math.max(max, num);
  }, 0);
}

function isLocalEdit(game) {
  return game.source === "local" || hasExtraGameFields(game);
}

function isLocalOnlyGame(game, seedIds, maxSeedNum) {
  if (seedIds.has(game.id)) return false;
  if (game.source === "local") return true;
  const num = parseInt(String(game.id).replace("game-", ""), 10);
  return !Number.isNaN(num) && num > maxSeedNum;
}

/** @param {AppData} base @param {AppData} incoming */
export function mergeAppData(base, incoming) {
  const merged = {
    meta: base.meta ? { ...base.meta } : undefined,
    decks: base.decks.map((deck) => ({ ...deck, colors: [...(deck.colors || [])] })),
    games: base.games.map((game) => ({ ...game })),
  };

  const deckNames = new Set(merged.decks.map((deck) => deck.name));
  for (const deck of incoming.decks || []) {
    if (deckNames.has(deck.name)) continue;
    merged.decks.push({ ...deck, colors: [...(deck.colors || [])] });
    deckNames.add(deck.name);
  }

  const byId = new Map(merged.games.map((game) => [game.id, game]));
  let added = 0;
  let updated = 0;

  for (const game of incoming.games || []) {
    const existing = byId.get(game.id);
    if (!existing) {
      const copy = { ...game, source: game.source || "local" };
      merged.games.push(copy);
      byId.set(game.id, copy);
      added += 1;
      continue;
    }
    if (game.source === "local" || hasExtraGameFields(game)) {
      const idx = merged.games.findIndex((g) => g.id === game.id);
      merged.games[idx] = { ...existing, ...game, source: "local" };
      updated += 1;
    }
  }

  return { data: merged, added, updated };
}

/** @param {AppData} local @param {AppData} seed */
export function syncFromSeed(local, seed) {
  const seedIds = new Set(seed.games.map((game) => game.id));
  const maxSeedNum = maxSeedGameNum(seed.games);
  const beforeCount = local.games.length;

  const localEditsById = new Map();
  for (const game of local.games) {
    if (!seedIds.has(game.id)) continue;
    if (isLocalEdit(game)) {
      localEditsById.set(game.id, game);
    }
  }

  // Games logged in the app that are not in the seed spreadsheet.
  const localOnlyGames = local.games.filter((game) =>
    isLocalOnlyGame(game, seedIds, maxSeedNum)
  );

  local.games = seed.games.map((game) => {
    const edit = localEditsById.get(game.id);
    return edit ? { ...game, ...edit, source: "local" } : { ...game };
  });
  let nextNum = local.games.length + 1;
  for (const game of localOnlyGames) {
    local.games.push({ ...game, id: `game-${nextNum++}`, source: "local" });
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
    removed: Math.max(0, beforeCount - local.games.length),
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
  if (seedHash) {
    const beforeCount = data.games.length;
    const beforeMetaHash = data.meta?.seedHash;
    const result = syncFromSeed(data, seed);
    if (beforeCount !== data.games.length || beforeMetaHash !== seedHash) {
      saveData(data);
      if (result.removed > 0 || beforeMetaHash !== seedHash) {
        lastSeedSync = result;
      }
    }
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
  a.download = `edhlog-${todayISO()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** @param {File} file @param {{ merge?: boolean }} [opts] */
export async function importData(file, opts = {}) {
  const text = await file.text();
  const incoming = JSON.parse(text);
  if (!incoming.decks || !incoming.games) throw new Error("Invalid EDHLOG data file");

  if (opts.merge) {
    const base = loadData() || (await loadSeed());
    const result = mergeAppData(base, incoming);
    saveData(result.data);
    return { data: result.data, added: result.added, updated: result.updated };
  }

  saveData(incoming);
  return { data: incoming, added: incoming.games.length, updated: 0 };
}

export function nextGameId(games) {
  const nums = games
    .map((g) => parseInt(g.id.replace("game-", ""), 10))
    .filter((n) => !Number.isNaN(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return `game-${max + 1}`;
}

/** True when the user has logged games in the app beyond the spreadsheet seed. */
export function hasLocalOnlyGames(data) {
  const seedGames = data.meta?.seedGames;
  if (!seedGames) return false;
  return data.games.some((game) => {
    if (game.source === "local") return true;
    const num = parseInt(String(game.id).replace("game-", ""), 10);
    return !Number.isNaN(num) && num > seedGames;
  });
}

const RECOVERY_DISMISS_KEY = "edhlog-recovery-dismissed";

export function shouldShowRecoveryBanner() {
  if (typeof window === "undefined") return false;
  if (!window.location.hostname.includes("github.io")) return false;
  if (localStorage.getItem(RECOVERY_DISMISS_KEY)) return false;
  const data = loadData();
  if (!data) return false;
  return !hasLocalOnlyGames(data);
}

export function dismissRecoveryBanner() {
  localStorage.setItem(RECOVERY_DISMISS_KEY, "1");
}
