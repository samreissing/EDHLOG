import { fetchCardMetadata, getCachedCardMetadata } from "./scryfall.js";

const CACHE_KEY = "edhlog:commander-matchup-keys:v3";
const DFC_LAYOUTS = new Set([
  "transform",
  "modal_dfc",
  "double_faced_token",
  "reversible_card",
  "meld",
  "art_series",
]);
/** Cards with // in the name but one shared front print (no per-face image URIs). */
const SINGLE_FRONT_LAYOUTS = new Set(["adventure", "split"]);

/** @typedef {{ kind: "single" | "dfc" | "partner" | "singleFront", canonicalName: string, parts: string[] }} CommanderInfo */

/** @type {Map<string, CommanderInfo>} */
const matchupCache = loadCache();

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
  localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(matchupCache)));
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
  if (SINGLE_FRONT_LAYOUTS.has(meta.layout)) return false;
  if (DFC_LAYOUTS.has(meta.layout)) return true;
  if (meta.faceNames?.length >= 2 && parts.length === 2) {
    const faces = meta.faceNames.map((face) => face.toLowerCase());
    return faces.includes(parts[0].toLowerCase()) && faces.includes(parts[1].toLowerCase());
  }
  return false;
}

function isSingleFrontMetadata(meta) {
  return !!meta && SINGLE_FRONT_LAYOUTS.has(meta.layout);
}

/** @param {string[]} parts */
export function canonicalPartnerName(parts) {
  return [...parts]
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
    .join(" // ");
}

/** @param {string} name */
function singleInfo(name) {
  const trimmed = name.trim();
  return { kind: "single", canonicalName: trimmed, parts: [trimmed] };
}

/** @param {string} name */
function dfcInfo(name) {
  const trimmed = name.trim();
  return { kind: "dfc", canonicalName: trimmed, parts: [trimmed] };
}

/** @param {string} name @param {string[]} parts */
function singleFrontInfo(name, parts) {
  const trimmed = name.trim();
  return { kind: "singleFront", canonicalName: trimmed, parts };
}

/** @param {string[]} parts */
function partnerInfo(parts) {
  const sortedParts = [...parts].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" })
  );
  return {
    kind: "partner",
    canonicalName: sortedParts.join(" // "),
    parts: sortedParts,
  };
}

/** @param {string} originalName @param {CommanderInfo} info */
function storeCommanderInfo(originalName, info) {
  const aliases = new Set([originalName, info.canonicalName]);
  if (info.kind === "partner") {
    for (const part of info.parts) aliases.add(part);
    aliases.add([...info.parts].reverse().join(" // "));
  }
  if (info.kind === "singleFront") {
    for (const part of info.parts) aliases.add(part);
  }
  for (const alias of aliases) {
    if (alias) matchupCache.set(cacheKey(alias), info);
  }
  saveCache();
}

/** @param {string} name */
function lookupCommanderInfo(name) {
  const trimmed = String(name || "").trim();
  if (!trimmed) return null;
  return matchupCache.get(cacheKey(trimmed)) ?? null;
}

/** Sync commander classification with cache + heuristics. */
export function getCommanderInfo(name) {
  const trimmed = String(name || "").trim();
  if (!trimmed) return singleInfo("");

  const cached = lookupCommanderInfo(trimmed);
  if (cached) return cached;

  const parts = splitCommanderName(trimmed);
  if (parts.length < 2) return singleInfo(trimmed);
  if (sameCardNameHeuristic(parts)) return dfcInfo(trimmed);

  return partnerInfo(parts);
}

/** @returns {{ name: string, face: number }[]} */
export function commanderImageSlots(name) {
  const info = getCommanderInfo(name);
  const meta =
    getCachedCardMetadata(name) ||
    getCachedCardMetadata(info.canonicalName) ||
    info.parts?.map((part) => getCachedCardMetadata(part)).find(Boolean);

  if (info.kind === "singleFront" || info.kind === "single" || isSingleFrontMetadata(meta)) {
    return [{ name: info.canonicalName, face: 0 }];
  }
  if (info.kind === "dfc") {
    return [
      { name: info.canonicalName, face: 0 },
      { name: info.canonicalName, face: 1 },
    ];
  }
  if (info.kind === "partner") {
    return info.parts.map((part) => ({ name: part, face: 0 }));
  }
  return [{ name: info.canonicalName, face: 0 }];
}

/** @deprecated Use commanderImageSlots for card images */
export function commanderNamesFromLabel(name) {
  return commanderImageSlots(name).map((slot) => slot.name);
}

/** True when name refers to one card in a partner pair, not the combined pair. */
export function isPartnerPartName(name) {
  const info = getCommanderInfo(name);
  if (info.kind !== "partner") return false;
  const key = cacheKey(name);
  if (key === cacheKey(info.canonicalName)) return false;
  return info.parts.some((part) => cacheKey(part) === key);
}

/** @param {string} name @param {{ splitPartners?: boolean }} [options] */
export function getCommanderMatchupIdentities(name, options = {}) {
  const { splitPartners = false } = options;
  const info = getCommanderInfo(name);
  if (info.kind === "partner" && splitPartners) {
    return [...info.parts];
  }
  return [info.canonicalName];
}

/** @param {string} commanderName @param {string} targetName @param {{ splitPartners?: boolean }} [options] */
export function commanderMatchesTarget(commanderName, targetName, options = {}) {
  const { splitPartners = false } = options;
  const commander = String(commanderName || "").trim();
  const target = String(targetName || "").trim();
  if (!commander || !target) return false;
  if (cacheKey(commander) === cacheKey(target)) return true;

  const commanderInfo = getCommanderInfo(commander);
  const targetInfo = getCommanderInfo(target);

  if (!splitPartners) {
    return commanderInfo.canonicalName === targetInfo.canonicalName;
  }

  if (targetInfo.kind === "partner") {
    return commanderInfo.canonicalName === targetInfo.canonicalName;
  }

  if (commanderInfo.kind === "partner") {
    return commanderInfo.parts.some((part) => cacheKey(part) === cacheKey(target));
  }

  return commanderInfo.canonicalName === targetInfo.canonicalName;
}

/** @param {string} fullName */
async function resolveCommanderInfo(fullName) {
  const trimmed = fullName.trim();
  const existing = lookupCommanderInfo(trimmed);
  if (existing) return existing;

  const parts = splitCommanderName(trimmed);
  if (parts.length < 2) {
    const info = singleInfo(trimmed);
    storeCommanderInfo(trimmed, info);
    return info;
  }

  if (sameCardNameHeuristic(parts)) {
    const info = dfcInfo(trimmed);
    storeCommanderInfo(trimmed, info);
    return info;
  }

  let meta = await fetchCardMetadata(trimmed);
  if (isSingleFrontMetadata(meta)) {
    const info = singleFrontInfo(trimmed, parts);
    storeCommanderInfo(trimmed, info);
    return info;
  }

  if (isDoubleFacedMetadata(meta, parts)) {
    const info = dfcInfo(trimmed);
    storeCommanderInfo(trimmed, info);
    return info;
  }

  meta = await fetchCardMetadata(parts[0]);
  if (isDoubleFacedMetadata(meta, parts)) {
    const info = dfcInfo(trimmed);
    storeCommanderInfo(trimmed, info);
    return info;
  }

  const info = partnerInfo(parts);
  storeCommanderInfo(trimmed, info);
  return info;
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
  const pending = names.filter((name) => !lookupCommanderInfo(name));
  for (const name of pending) {
    await resolveCommanderInfo(name);
  }
}
