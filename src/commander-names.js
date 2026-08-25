import { fetchCardMetadata } from "./scryfall.js";

const CACHE_KEY = "edhlog:commander-matchup-keys:v1";
const DFC_LAYOUTS = new Set([
  "transform",
  "modal_dfc",
  "double_faced_token",
  "reversible_card",
  "meld",
  "art_series",
]);

/** @type {Map<string, string[]>} */
const matchupKeysCache = loadCache();

function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return new Map();
    const parsed = JSON.parse(raw);
    return new Map(Object.entries(parsed).map(([key, value]) => [key, value]));
  } catch {
    return new Map();
  }
}

function saveCache() {
  localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(matchupKeysCache)));
}

export function splitCommanderName(name) {
  return String(name || "")
    .split(/\s*\/\/\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function cacheKey(name) {
  return String(name || "")
    .trim()
    .toLowerCase();
}

function sameCardNameHeuristic(parts) {
  if (parts.length !== 2) return false;
  const leftBase = parts[0].split(",")[0].trim().toLowerCase();
  const rightBase = parts[1].split(",")[0].trim().toLowerCase();
  return leftBase.length > 0 && leftBase === rightBase;
}

function isDoubleFacedMetadata(meta, parts) {
  if (!meta) return false;
  if (DFC_LAYOUTS.has(meta.layout)) return true;
  if (meta.faceNames?.length >= 2 && parts.length === 2) {
    const faces = meta.faceNames.map((face) => face.toLowerCase());
    return faces.includes(parts[0].toLowerCase()) && faces.includes(parts[1].toLowerCase());
  }
  return false;
}

function partnerKeys(fullName, parts) {
  return [parts[0], parts[1], fullName.trim()];
}

async function resolveCommanderMatchupKeys(fullName) {
  const trimmed = fullName.trim();
  const key = cacheKey(trimmed);
  if (matchupKeysCache.has(key)) return matchupKeysCache.get(key);

  const parts = splitCommanderName(trimmed);
  if (parts.length < 2) {
    const single = [trimmed];
    matchupKeysCache.set(key, single);
    saveCache();
    return single;
  }

  if (sameCardNameHeuristic(parts)) {
    const single = [trimmed];
    matchupKeysCache.set(key, single);
    saveCache();
    return single;
  }

  let meta = await fetchCardMetadata(trimmed);
  if (isDoubleFacedMetadata(meta, parts)) {
    const single = [trimmed];
    matchupKeysCache.set(key, single);
    saveCache();
    return single;
  }

  meta = await fetchCardMetadata(parts[0]);
  if (isDoubleFacedMetadata(meta, parts)) {
    const single = [trimmed];
    matchupKeysCache.set(key, single);
    saveCache();
    return single;
  }

  const keys = partnerKeys(trimmed, parts);
  matchupKeysCache.set(key, keys);
  saveCache();
  return keys;
}

/** @param {string} name */
export function getCommanderMatchupKeys(name) {
  const trimmed = String(name || "").trim();
  if (!trimmed) return [];
  const cached = matchupKeysCache.get(cacheKey(trimmed));
  if (cached) return cached;

  const parts = splitCommanderName(trimmed);
  if (parts.length < 2) return [trimmed];
  if (sameCardNameHeuristic(parts)) return [trimmed];

  return partnerKeys(trimmed, parts);
}

/** @param {import('./store.js').Game[]} games */
export function collectPartnerCommanderNames(games) {
  const names = new Set();
  for (const game of games) {
    if (game.deck?.includes("//")) names.add(game.deck.trim());
    for (const opp of game.opponents || []) {
      if (opp.name?.includes("//")) names.add(String(opp.name).trim());
    }
  }
  return [...names];
}

/** @param {string[]} names */
export async function warmCommanderMatchupCache(names) {
  const pending = names.filter((name) => !matchupKeysCache.has(cacheKey(name)));
  for (const name of pending) {
    await resolveCommanderMatchupKeys(name);
  }
}
