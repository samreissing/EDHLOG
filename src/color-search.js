import { COLOR_NAMES, colorOrderIndex } from "./stats.js";
import { COLOR_IDENTITY_SEARCH_ALIASES } from "./color-identity.js";

const MONO_COLOR_NAMES = {
  white: "W",
  blue: "U",
  black: "B",
  red: "R",
  green: "G",
  colorless: "C",
};

/** Longest nicknames first so "rakdos" wins over substring false positives. */
const NICKNAME_ENTRIES = COLOR_IDENTITY_SEARCH_ALIASES.flatMap(({ key, names }) =>
  names.map((name) => ({ key, name: name.toLowerCase() }))
).sort((a, b) => b.name.length - a.name.length);

function normalizeColorIdentityKey(key) {
  if (!key || key === "C") return "C";
  return [...key.toUpperCase().replace(/[^WUBRGC]/g, "")]
    .filter((c, index, chars) => chars.indexOf(c) === index)
    .sort((a, b) => colorOrderIndex(a) - colorOrderIndex(b))
    .join("");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** @param {string} text @param {string} name */
function textHasWholeTerm(text, name) {
  const trimmed = name.trim().toLowerCase();
  if (!trimmed) return false;
  if (trimmed.length === 1) {
    return text.toUpperCase().includes(trimmed.toUpperCase());
  }
  const re = new RegExp(`(?:^|[^a-z])${escapeRegExp(trimmed)}(?:[^a-z]|$)`, "i");
  return re.test(text);
}

/**
 * Exact identity key from a guild/shard nickname in the query, if any.
 * @param {string} query
 */
export function exactColorSearchKeyFromNicknames(query) {
  const text = String(query || "").trim().toLowerCase();
  if (!text) return null;
  const compact = text.replace(/[^a-z0-9]/g, "");

  for (const { key, name } of NICKNAME_ENTRIES) {
    if (name.length <= 1) continue;
    if (MONO_COLOR_NAMES[name]) continue;
    if (text === name || compact === name.replace(/\s+/g, "") || textHasWholeTerm(text, name)) {
      return normalizeColorIdentityKey(key);
    }
  }
  return null;
}

/**
 * Letters implied by color names + WUBRGC characters in the query (subset search).
 * @param {string} query
 */
export function parseColorSearchLetters(query) {
  let text = String(query || "").trim().toLowerCase();
  if (!text) return "";

  const found = new Set();
  for (const [name, letter] of Object.entries(MONO_COLOR_NAMES)) {
    if (textHasWholeTerm(text, name)) {
      found.add(letter);
      text = text.replace(
        new RegExp(`(?:^|[^a-z])${escapeRegExp(name)}(?=[^a-z]|$)`, "gi"),
        " "
      );
    }
  }

  for (const token of text.toUpperCase().split(/[^A-Z]+/)) {
    if (!token || !/^[WUBRGC]+$/.test(token)) continue;
    for (const char of token) found.add(char);
  }
  return normalizeColorIdentityKey([...found].join(""));
}

function rowLabel(key) {
  if (key === "C") return "Colorless";
  return [...key].map((c) => COLOR_NAMES[c] || c).join(" ");
}

/** @param {string} identityKey @param {string} query */
export function colorIdentityKeyMatchesSearch(identityKey, query) {
  const text = String(query || "").trim();
  if (!text) return true;

  const key = normalizeColorIdentityKey(String(identityKey || ""));

  const exactNicknameKey = exactColorSearchKeyFromNicknames(text);
  if (exactNicknameKey) {
    return key === exactNicknameKey;
  }

  const searchLetters = parseColorSearchLetters(text);
  if (searchLetters) {
    if (key === searchLetters) return true;
    if ([...searchLetters].every((color) => key.includes(color))) return true;
    if (key.length === 1 && searchLetters.includes(key)) return true;
  }

  const lowered = text.toLowerCase();
  const label = rowLabel(key).toLowerCase();
  if (label.includes(lowered)) return true;
  if (key === "C" && lowered.includes("colorless")) return true;

  return false;
}

/** @param {{ subjectKey?: string, opponentKey?: string }} row @param {"subject" | "opponent"} side @param {string} query */
export function colorMatchupSideMatchesSearch(row, side, query) {
  if (!String(query || "").trim()) return true;
  const rawKey = side === "subject" ? row.subjectKey : row.opponentKey;
  const identityKey = String(rawKey || "").replace(/^(ci|oci):/, "");
  return colorIdentityKeyMatchesSearch(identityKey, query);
}

/** @param {{ subjectKey?: string, opponentKey?: string }} row @param {string} query */
export function colorMatchupRowMatchesSearch(row, query) {
  if (!String(query || "").trim()) return true;
  return (
    colorMatchupSideMatchesSearch(row, "subject", query) ||
    colorMatchupSideMatchesSearch(row, "opponent", query)
  );
}
