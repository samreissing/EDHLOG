import { normalizeDate } from "./dates.js";

const STORAGE_KEY = "edhlog-data-v1";

/** @typedef {{ name: string, bracket: number, colors: string[], retired: boolean }} Deck */
/** @typedef {{ id: string, date: string, deck: string, result: 'Win' | 'Loss' }} Game */
/** @typedef {{ decks: Deck[], games: Game[] }} AppData */

/** @type {AppData | null} */
let cache = null;

export async function loadSeed() {
  const res = await fetch("/data/seed.json");
  return /** @type {AppData} */ (await res.json());
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
  return changed;
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
  let data = loadData();
  if (!data) {
    data = await loadSeed();
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
