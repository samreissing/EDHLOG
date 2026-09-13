import { appBaseUrl } from "./base-url.js";
import { normalizeDate, todayISO, backupFileStamp } from "./dates.js";
import { deckKey, deckCommander, findDeck, resolveDeckCommanderOnDate } from "./deck-identity.js";
import {
  readConnectedDataFile,
  restoreDataFileConnection,
  writeConnectedDataFile,
} from "./file-storage.js";
import { syncOpponentDecksFromGames } from "./opponent-decks.js";

const STORAGE_KEY = "edhlog-data-v1";

/** @typedef {{ name: string, qty: number, board: string }} DeckCard */
/** @typedef {{ commander: string, name?: string, bracket: number, colors?: string[], changedAt: string }} DeckHistoryEntry */
/** @typedef {{ id?: string, name: string, commander: string, bracket: number, colors: string[], retired: boolean, archetypes?: string[], tribes?: string[], createdAt?: string, history?: DeckHistoryEntry[], listUrl?: string, listSource?: 'moxfield' | 'deckstats', listSyncedAt?: string, cards?: DeckCard[] }} Deck */
/** @typedef {{ id: string, player: string, commander: string, name?: string, bracket?: number, colors?: string[], archetypes?: string[], tribes?: string[], retired?: boolean, createdAt?: string, commanderAliases?: string[] }} OpponentDeck */
/** @typedef {{ id: string, date: string, time?: string, deck: string, myCommander?: string, result: 'Win' | 'Loss', source?: 'local', bracket?: number, mySeat?: number, myPlayer?: string, winnerSeat?: number, turn?: number, opponents?: { seat: number, name: string, player?: string, opponentDeckId?: string }[] }} Game */
/** @typedef {{ seedHash?: string, seedGames?: number, removedSeedDeckKeys?: string[], deckSeedKeyById?: Record<string, string> }} DataMeta */
/** @typedef {{ meta?: DataMeta, decks: Deck[], opponentDecks?: OpponentDeck[], games: Game[] }} AppData */

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
  const res = await fetch(`${appBaseUrl()}data/seed.json`, { cache: "no-store" });
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
    const seedKey = data.meta?.deckSeedKeyById?.[id];
    if (seedKey) refToId.set(seedKey, id);
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
  if (migrateGameCommanderSnapshots(data)) changed = true;
  return changed;
}

function migrateGameCommanderSnapshots(data) {
  let changed = false;
  for (const game of data.games) {
    const deck = findDeck(data.decks, game.deck);
    if (!deck?.history?.length) continue;
    const commander = resolveDeckCommanderOnDate(deck, game.date);
    if (commander && game.myCommander !== commander) {
      game.myCommander = commander;
      changed = true;
    }
  }
  return changed;
}

/** @param {Deck} deck */
function deckMergeKey(deck) {
  return String(deck.commander || deck.name || "").trim();
}

/** @param {AppData} data @param {string} deckId @param {string} seedKey */
export function linkDeckSeedKey(data, deckId, seedKey) {
  if (!deckId || !seedKey) return;
  if (!data.meta) data.meta = {};
  if (!data.meta.deckSeedKeyById) data.meta.deckSeedKeyById = {};
  data.meta.deckSeedKeyById[deckId] = seedKey;
}

/** @param {AppData} data @param {string} deckId @param {string} seedKey */
function trackDeckSeedKey(data, deckId, seedKey) {
  linkDeckSeedKey(data, deckId, seedKey);
}

/** @param {AppData} data @param {Deck} deck */
export function recordRemovedSeedDeck(data, deck) {
  const key = deckMergeKey(deck);
  if (!key) return;
  if (!data.meta) data.meta = {};
  if (!data.meta.removedSeedDeckKeys) data.meta.removedSeedDeckKeys = [];
  if (!data.meta.removedSeedDeckKeys.includes(key)) {
    data.meta.removedSeedDeckKeys.push(key);
  }
}

function purgeRemovedSeedDecks(data) {
  const removed = new Set(data.meta?.removedSeedDeckKeys || []);
  if (!removed.size) return false;
  const before = data.decks.length;
  data.decks = data.decks.filter((deck) => !removed.has(deckMergeKey(deck)));
  return data.decks.length !== before;
}

function collapseRenamedSeedDeckDuplicates(data) {
  let changed = false;
  /** @type {Set<Deck>} */
  const toRemove = new Set();

  for (const deck of data.decks) {
    for (const entry of deck.history || []) {
      const oldKey = String(entry.commander || "").trim();
      if (!oldKey) continue;
      for (const other of data.decks) {
        if (other === deck || toRemove.has(other)) continue;
        if (deckMergeKey(other) !== oldKey) continue;
        toRemove.add(other);
        recordRemovedSeedDeck(data, other);
        if (deck.id) trackDeckSeedKey(data, deck.id, oldKey);
        changed = true;
      }
    }
  }

  if (!toRemove.size) return changed;
  data.decks = data.decks.filter((deck) => !toRemove.has(deck));
  return true;
}

function mergeSeedDeck(local, seedDeck, localDeck) {
  return {
    ...seedDeck,
    id: localDeck.id,
    name: localDeck.name ?? seedDeck.name ?? "",
    commander: localDeck.commander || seedDeck.commander || seedDeck.name || "",
    bracket: localDeck.bracket ?? seedDeck.bracket ?? 4,
    colors: [...(localDeck.colors?.length ? localDeck.colors : seedDeck.colors || [])],
    retired: localDeck.retired ?? seedDeck.retired ?? false,
    createdAt: localDeck.createdAt ?? seedDeck.createdAt,
    history: localDeck.history ?? seedDeck.history,
    listUrl: localDeck.listUrl ?? seedDeck.listUrl,
    listSource: localDeck.listSource ?? seedDeck.listSource,
    listSyncedAt: localDeck.listSyncedAt ?? seedDeck.listSyncedAt,
    cards: localDeck.cards ?? seedDeck.cards,
    archetypes: localDeck.archetypes ?? seedDeck.archetypes,
    tribes: localDeck.tribes ?? seedDeck.tribes,
  };
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
  if (purgeRemovedSeedDecks(data)) changed = true;
  if (collapseRenamedSeedDeckDuplicates(data)) changed = true;
  if (migrateDecks(data)) changed = true;
  if (syncOpponentDecksFromGames(data)) changed = true;
  return changed;
}

/** @param {AppData} local @param {AppData} seed */
export function syncFromSeed(local, seed) {
  const seedIds = new Set(seed.games.map((game) => game.id));
  const beforeCount = local.games.length;

  const localEditsById = new Map();
  for (const game of local.games) {
    if (seedIds.has(game.id)) {
      localEditsById.set(game.id, game);
    }
  }

  // Games logged in the app that are not in the seed spreadsheet.
  const localOnlyGames = local.games.filter((game) => !seedIds.has(game.id));

  local.games = seed.games.map((game) => {
    const edit = localEditsById.get(game.id);
    return edit ? { ...game, ...edit, source: "local" } : { ...game };
  });
  let nextNum = local.games.length + 1;
  for (const game of localOnlyGames) {
    local.games.push({ ...game, id: `game-${nextNum++}`, source: "local" });
  }

  /** @type {Map<string, Deck>} */
  const localDeckByKey = new Map();
  /** @type {Map<string, Deck>} */
  const localDeckByTrackedSeedKey = new Map();
  for (const deck of local.decks) {
    const key = deckMergeKey(deck);
    if (key) localDeckByKey.set(key, deck);
    const id = deck.id;
    const tracked = id && local.meta?.deckSeedKeyById?.[id];
    if (tracked) localDeckByTrackedSeedKey.set(tracked, deck);
  }

  const removedSeedDeckKeys = new Set(local.meta?.removedSeedDeckKeys || []);
  /** @type {Set<string>} */
  const matchedLocalIds = new Set();
  /** @type {Deck[]} */
  const mergedDecks = [];

  for (const seedDeck of seed.decks) {
    const key = deckMergeKey(seedDeck);
    if (!key || removedSeedDeckKeys.has(key)) continue;

    const localDeck = localDeckByKey.get(key) || localDeckByTrackedSeedKey.get(key);
    if (localDeck?.id) matchedLocalIds.add(localDeck.id);

    const merged = localDeck
      ? mergeSeedDeck(local, seedDeck, localDeck)
      : { ...seedDeck, colors: [...(seedDeck.colors || [])] };

    if (localDeck?.id) trackDeckSeedKey(local, localDeck.id, key);
    mergedDecks.push(merged);
  }

  for (const deck of local.decks) {
    if (deck.id && matchedLocalIds.has(deck.id)) continue;
    const key = deckMergeKey(deck);
    if (key && removedSeedDeckKeys.has(key)) continue;
    mergedDecks.push({ ...deck, colors: [...(deck.colors || [])] });
  }

  local.decks = mergedDecks;

  local.meta = {
    ...local.meta,
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

/** @param {AppData} data */
function appDataScore(data) {
  return (data.games?.length || 0) * 1000 + (data.decks?.length || 0);
}

/** @param {AppData | null | undefined} local @param {AppData | null | undefined} fileData */
function preferAppDataSource(local, fileData) {
  if (!fileData) return local;
  if (!local) return fileData;
  return appDataScore(fileData) >= appDataScore(local) ? fileData : local;
}

export async function initData() {
  lastSeedSync = null;
  await restoreDataFileConnection();
  const seed = await loadSeed();
  const localData = loadData();
  const fileData = await readConnectedDataFile();
  let data = preferAppDataSource(localData, fileData);

  if (!data) {
    saveData(seed);
    return seed;
  }

  if (fileData && data === fileData && localData && data !== localData) {
    cache = data;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } else if (localData && data === localData && fileData && appDataScore(localData) > appDataScore(fileData)) {
    void writeConnectedDataFile(localData);
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
    void writeConnectedDataFile(data);
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

/** @param {AppData} data @param {string} filename */
function downloadJsonFile(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportData() {
  const data = loadData();
  if (!data) return;
  downloadJsonFile(data, `edhlog-${todayISO()}.json`);
}

/** @param {AppData} [data] */
export function downloadDataBackup(data) {
  const payload = data || loadData();
  if (!payload) return;
  downloadJsonFile(payload, `edhlog-${backupFileStamp()}.json`);
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
