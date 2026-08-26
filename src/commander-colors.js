import { fetchCardMetadata } from "./scryfall.js";
import { splitCommanderName } from "./commander-names.js";
import { canonicalizeColors } from "./color-identity.js";

const CACHE_KEY = "edhlog:commander-colors:v1";

/** @type {Map<string, string[]>} */
const colorCache = loadCache();

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
  localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(colorCache)));
}

function cacheKey(name) {
  return String(name || "")
    .trim()
    .toLowerCase();
}

async function resolveCommanderColorIdentity(fullName) {
  const trimmed = fullName.trim();
  const key = cacheKey(trimmed);
  if (colorCache.has(key)) return colorCache.get(key);

  const parts = splitCommanderName(trimmed);
  const union = new Set();

  if (parts.length < 2) {
    const meta = await fetchCardMetadata(trimmed);
    const colors = meta?.colorIdentity ?? [];
    colorCache.set(key, colors);
    saveCache();
    return colors;
  }

  for (const part of parts) {
    const meta = await fetchCardMetadata(part);
    for (const color of meta?.colorIdentity ?? []) {
      union.add(color);
    }
  }

  const colors = canonicalizeColors([...union]);
  colorCache.set(key, colors);
  saveCache();
  return colors;
}

/** @param {string} name */
export function getCommanderColorIdentity(name) {
  const trimmed = String(name || "").trim();
  if (!trimmed) return [];
  return colorCache.get(cacheKey(trimmed)) ?? [];
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

/** @param {string[]} names */
export async function warmCommanderColorCache(names) {
  const pending = names.filter((name) => !colorCache.has(cacheKey(name)));
  for (const name of pending) {
    await resolveCommanderColorIdentity(name);
  }
}
