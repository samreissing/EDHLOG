import { normalizeDate, todayISO } from "./dates.js";
import { deckKey, deckCommander } from "./deck-identity.js";

const STORAGE_KEY = "edhlog-data-v1";

/** @typedef {{ name: string, qty: number, board: string }} DeckCard */
/** @typedef {{ commander: string, name?: string, bracket: number, colors?: string[], changedAt: string }} DeckHistoryEntry */
/** @typedef {{ id?: string, name: string, commander: string, bracket: number, colors: string[], retired: boolean, createdAt?: string, history?: DeckHistoryEntry[], listUrl?: string, listSource?: 'moxfield' | 'deckstats', listSyncedAt?: string, cards?: DeckCard[] }} Deck */
/** @typedef {{ id: string, date: string, time?: string, deck: string, myCommander?: string, result: 'Win' | 'Loss', source?: 'local', bracket?: number, mySeat?: number, myPlayer?: string, winnerSeat?: number, turn?: number, opponents?: { seat: number, name: string, player?: string }[] }} Game */
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

function migrateDeckCommanders(data) {
  let changed = false;
  for (const deck of data.decks) {
    if (deck.commander) continue;
    deck.commander = deck.name || "";
    deck.name = "";
    changed = true;
  }
  return changed;
}

function migrateDeckIds(data) {
  let changed = false;

  /** @param {import('./store.js').AppData} appData */
  function allocDeckId(appData) {
    const nums = appData.decks
      .map((deck) => deck.id)
      .filter(Boolean)
      .map((id) => {
        const match = /^d-(\d+)$/.exec(id);
        return match ? Number(match[1]) : 0;
      });
    const max = nums.length ? Math.max(...nums) : 0;
    return `d-${max + 1}`;
  }

  for (const deck of data.decks) {
    if (!deck.id) {
      deck.id = allocDeckId(data);
      changed = true;
    }
  }

  /** @type {Map<string, string>} */
  const refToId = new Map();
  for (const deck of data.decks) {
    const id = deck.id;
    if (!id) continue;
    refToId.set(id, id);
    refToId.set(deckKey(deck), id);
    refToId.set(deckCommander(deck), id);
    const name = String(deck.name || "").trim();
    if (name) refToId.set(name, id);
  }

  for (const game of data.games) {
    const oldRef = game.deck;
    const resolved = refToId.get(oldRef) || (data.decks.some((deck) => deck.id === oldRef) ? oldRef : null);
    if (!resolved) continue;

    if (!game.myCommander) {
      if (oldRef !== resolved && !/^d-\d+$/.test(oldRef)) {
        game.myCommander = oldRef;
      } else {
        const deck = data.decks.find((entry) => entry.id === resolved);
        if (deck) game.myCommander = deckCommander(deck);
      }
      changed = true;
    }

    if (game.deck !== resolved) {
      game.deck = resolved;
      changed = true;
    }
  }

  return changed;
}

function migrateDecks(data) {
  let changed = migrateDeckCommanders(data);
  const firstGameByDeck = new Map();
  for (const game of data.games) {
    const existing = firstGameByDeck.get(game.deck);
    if (!existing || game.date < existing) firstGameByDeck.set(game.deck, game.date);
  }
  for (const deck of data.decks) {
    if (!deck.createdAt) {
      deck.createdAt = firstGameByDeck.get(deck.id) || firstGameByDeck.get(deck.commander) || firstGameByDeck.get(deck.name) || "2024-04-15";
      changed = true;
    }
  }
  if (migrateDeckIds(data)) changed = true;
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
  const seedIds = new Set(seed.games.map((game) => game.id));
  const beforeCount = local.games.length;

  const localEditsById = new Map();
  for (const game of local.games) {
    if (game.source === "local" && seedIds.has(game.id)) {
      localEditsById.set(game.id, game);
    }
  }

  // Games logged in the app that are not in the seed spreadsheet.
  const localOnlyGames = local.games.filter(
    (game) => game.source === "local" && !seedIds.has(game.id)
  );

  local.games = seed.games.map((game) => {
    const edit = localEditsById.get(game.id);
    return edit ? { ...game, ...edit, source: "local" } : { ...game };
  });
  let nextNum = local.games.length + 1;
  for (const game of localOnlyGames) {
    local.games.push({ ...game, id: `game-${nextNum++}`, source: "local" });
  }

  /** @param {Deck} deck */
  const deckMergeKey = (deck) => String(deck.commander || deck.name || "").trim();

  /** @type {Map<string, Deck>} */
  const localDeckByKey = new Map();
  for (const deck of local.decks) {
    const key = deckMergeKey(deck);
    if (key) localDeckByKey.set(key, deck);
  }

  const seedDeckKeys = new Set(seed.decks.map((deck) => deckMergeKey(deck)));
  const localOnlyDecks = local.decks.filter((deck) => !seedDeckKeys.has(deckMergeKey(deck)));

  local.decks = seed.decks.map((seedDeck) => {
    const key = deckMergeKey(seedDeck);
    const localDeck = localDeckByKey.get(key);
    if (!localDeck) {
      return { ...seedDeck, colors: [...(seedDeck.colors || [])] };
    }
    return {
      ...seedDeck,
      id: localDeck.id,
      name: localDeck.name ?? seedDeck.name ?? "",
      commander: seedDeck.commander || localDeck.commander,
      bracket: localDeck.bracket ?? seedDeck.bracket ?? 4,
      colors: [...(localDeck.colors?.length ? localDeck.colors : seedDeck.colors || [])],
      retired: localDeck.retired ?? seedDeck.retired ?? false,
      createdAt: localDeck.createdAt ?? seedDeck.createdAt,
      history: localDeck.history ?? seedDeck.history,
      listUrl: localDeck.listUrl ?? seedDeck.listUrl,
      listSource: localDeck.listSource ?? seedDeck.listSource,
      listSyncedAt: localDeck.listSyncedAt ?? seedDeck.listSyncedAt,
      cards: localDeck.cards ?? seedDeck.cards,
    };
  });
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
    const beforeDecksJson = JSON.stringify(data.decks);
    const result = syncFromSeed(data, seed);
    const sanitized = sanitizeData(data);
    const decksChanged = JSON.stringify(data.decks) !== beforeDecksJson;
    if (beforeCount !== data.games.length || beforeMetaHash !== seedHash || decksChanged || sanitized) {
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
  try {
    cache = data;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (err) {
    console.error("EDHLOG save failed", err);
    return false;
  }
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

/** @param {import('./store.js').AppData} data */
export function nextDeckId(data) {
  const nums = data.decks
    .map((deck) => deck.id)
    .filter(Boolean)
    .map((id) => {
      const match = /^d-(\d+)$/.exec(id);
      return match ? Number(match[1]) : 0;
    });
  const max = nums.length ? Math.max(...nums) : 0;
  return `d-${max + 1}`;
}
