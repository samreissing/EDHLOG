/**
 * Colorless (C) is treated differently from WUBRG: only WR vs the 25% Commander
 * baseline matters for C. Usage/volume stats for C are not compared to peers.
 */
import {
  colorOrderIndex,
  winRate,
  normalizedWinRate,
  COLOR_NAMES,
} from "./stats.js";

const ORDER_FORWARD = ["W", "U", "B", "R", "G", "C"];
const ORDER_REVERSE = ["C", "G", "R", "B", "U", "W"];

export function rowColorsFromKey(key) {
  if (key === "C") return [];
  return key.split("");
}

function rowLabel(key) {
  if (key === "C") return "Colorless";
  return [...key].map((c) => COLOR_NAMES[c] || c).join(" ");
}

export function colorKeyLabel(key, view) {
  if (view === "wubrgc" && key !== "C" && key.length === 1) {
    return COLOR_NAMES[key] || key;
  }
  return rowLabel(key);
}

const COLOR_SEARCH_ALIASES = {
  white: "W",
  blue: "U",
  black: "B",
  red: "R",
  green: "G",
  colorless: "C",
};

function normalizeColorIdentityKey(key) {
  if (!key || key === "C") return "C";
  return [...key.toUpperCase().replace(/[^WUBRGC]/g, "")]
    .filter((c, index, chars) => chars.indexOf(c) === index)
    .sort((a, b) => colorOrderIndex(a) - colorOrderIndex(b))
    .join("");
}

function parseColorSearchLetters(query) {
  const text = String(query || "").trim().toLowerCase();
  if (!text) return "";

  const found = new Set();
  for (const [name, letter] of Object.entries(COLOR_SEARCH_ALIASES)) {
    if (text.includes(name)) found.add(letter);
  }
  for (const char of text.toUpperCase()) {
    if ("WUBRGC".includes(char)) found.add(char);
  }
  return normalizeColorIdentityKey([...found].join(""));
}

/** @param {string} identityKey @param {string} query */
export function colorIdentityKeyMatchesSearch(identityKey, query) {
  const searchLetters = parseColorSearchLetters(query);
  const text = String(query || "").trim().toLowerCase();
  if (!searchLetters && !text) return true;

  const key = normalizeColorIdentityKey(String(identityKey || ""));

  if (searchLetters) {
    if (key === searchLetters) return true;
    if ([...searchLetters].every((color) => key.includes(color))) return true;
    if (key.length === 1 && searchLetters.includes(key)) return true;
  }

  if (text) {
    const label = rowLabel(key).toLowerCase();
    if (label.includes(text)) return true;
    if (key === "C" && text.includes("colorless")) return true;
  }

  return false;
}

/** @param {{ subjectKey?: string, opponentKey?: string }} row @param {string} query */
export function colorMatchupRowMatchesSearch(row, query) {
  if (!String(query || "").trim()) return true;
  const subjectKey = String(row.subjectKey || "").replace(/^ci:/, "");
  const opponentKey = String(row.opponentKey || "").replace(/^oci:/, "");
  return (
    colorIdentityKeyMatchesSearch(subjectKey, query) ||
    colorIdentityKeyMatchesSearch(opponentKey, query)
  );
}

/** @param {string[]} rowColors @param {string[]} deckColors @param {'inclusive'|'exclusive'} mode */
export function rowMatchesDeck(rowColors, deckColors, mode) {
  const deck = deckColors || [];
  const row = rowColors || [];

  if (!row.length) {
    return deck.length === 0;
  }
  if (!deck.length) {
    return false;
  }

  if (mode === "exclusive") {
    if (row.length !== deck.length) return false;
    const a = [...row].sort().join("");
    const b = [...deck].sort().join("");
    return a === b;
  }
  return row.every((c) => deck.includes(c));
}

/** @param {string[]} colors @param {'wubrgc'|'all'|'exact'} view @param {'inclusive'|'exclusive'} agg */
export function colorKeysForIdentity(colors, view, agg) {
  if (view === "exact") {
    return [identityKey(colors || [])];
  }
  if (view === "wubrgc") {
    const order = ["W", "U", "B", "R", "G", "C"];
    return order.filter((key) => {
      const rowColors = key === "C" ? [] : [key];
      return rowMatchesDeck(rowColors, colors || [], agg);
    });
  }
  if (agg === "exclusive") {
    return [identityKey(colors || [])];
  }
  if (!colors?.length) return ["C"];
  return subsets(colors).map((sub) => identityKey(sub));
}

function identityKey(colors) {
  if (!colors.length) return "C";
  return [...colors]
    .sort((a, b) => colorOrderIndex(a) - colorOrderIndex(b))
    .join("");
}

function subsets(colors) {
  const out = [];
  const n = colors.length;
  for (let mask = 1; mask < 1 << n; mask++) {
    const sub = [];
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) sub.push(colors[i]);
    }
    out.push(sub);
  }
  return out;
}

function rowSortIndex(key, sortOrder) {
  const order = sortOrder === "cgrbuw" ? ORDER_REVERSE : ORDER_FORWARD;
  if (key === "C") return order.indexOf("C");

  const chars = [...key].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  let idx = 0;
  for (const c of chars) {
    idx = idx * 10 + (order.indexOf(c) + 1);
  }
  return idx;
}

function buildRowKeys(deckStats, view, agg, sortOrder) {
  if (view === "wubrgc") {
    const order = sortOrder === "cgrbuw" ? ORDER_REVERSE : ORDER_FORWARD;
    return [...order];
  }

  if (view === "exact") {
    const keys = new Set();
    for (const deck of deckStats) {
      keys.add(identityKey(deck.colors || []));
    }
    return [...keys];
  }

  const keys = new Set();
  for (const deck of deckStats) {
    const colors = deck.colors || [];
    if (agg === "exclusive") {
      keys.add(identityKey(colors));
      continue;
    }
    if (!colors.length) {
      keys.add("C");
      continue;
    }
    for (const sub of subsets(colors)) {
      keys.add(identityKey(sub));
    }
  }
  return [...keys];
}

/**
 * @param {import('./stats.js').DeckStat[]} deckStats
 * @param {{ view: 'wubrgc'|'all'|'exact', agg: 'inclusive'|'exclusive', sortOrder: 'wubrgc'|'cgrbuw' }} opts
 */
export function computeColorStatsAdvanced(deckStats, { view, agg, sortOrder }) {
  const rowKeys = buildRowKeys(deckStats, view, agg, sortOrder);
  const matchMode = view === "exact" ? "exclusive" : agg;

  const rows = rowKeys.map((key) => {
    const rowColors = rowColorsFromKey(key);
    const matchingDecks = deckStats.filter((d) => rowMatchesDeck(rowColors, d.colors || [], matchMode));
    const activeDecks = matchingDecks.filter((d) => d.games > 0);
    const games = activeDecks.reduce((s, d) => s + d.games, 0);
    const wins = activeDecks.reduce((s, d) => s + d.wins, 0);
    return {
      key,
      colors: rowColors,
      name: view === "wubrgc" && key !== "C" ? COLOR_NAMES[key] : rowLabel(key),
      displayColors: rowColors,
      decks: activeDecks.length,
      games,
      wins,
      winRate: winRate(wins, games),
      normalizedWr: normalizedWinRate(wins, games),
      colorOrder: rowSortIndex(key, sortOrder),
    };
  });

  return rows.sort((a, b) => a.colorOrder - b.colorOrder);
}

export function colorColumnSortLabel(sortOrder) {
  return sortOrder === "cgrbuw" ? "CGRBUW" : "WUBRGC";
}

export function colorViewLabel(view) {
  if (view === "all") return "All Colors";
  if (view === "exact") return "Exact Colors";
  return "WUBRGC";
}

/** @param {'wubrgc'|'all'|'exact'} view */
export function cycleColorView(view) {
  if (view === "wubrgc") return "all";
  if (view === "all") return "exact";
  return "wubrgc";
}
