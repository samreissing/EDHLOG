import { COLOR_ORDER } from "./stats.js";

/** Canonical color identity symbol order (Young Mage / MTG guild chart). */
export const COMBO_CANONICAL = [
  [], // colorless
  ["W"],
  ["U"],
  ["B"],
  ["R"],
  ["G"],
  ["W", "U"], // Azorius
  ["R", "W"], // Boros
  ["U", "B"], // Dimir
  ["B", "G"], // Golgari
  ["R", "G"], // Gruul
  ["U", "R"], // Izzet
  ["W", "B"], // Orzhov
  ["B", "R"], // Rakdos
  ["W", "G"], // Selesnya
  ["U", "G"], // Simic
  ["W", "B", "G"], // Abzan
  ["W", "U", "G"], // Bant
  ["W", "U", "B"], // Esper
  ["U", "B", "R"], // Grixis
  ["W", "U", "R"], // Jeskai
  ["B", "R", "G"], // Jund
  ["W", "B", "R"], // Mardu
  ["W", "R", "G"], // Naya
  ["U", "B", "G"], // Sultai
  ["U", "R", "G"], // Temur
  ["U", "B", "R", "G"], // Glint
  ["W", "B", "R", "G"], // Dune
  ["W", "U", "R", "G"], // Ink
  ["W", "B", "U", "G"], // Witch
  ["W", "B", "U", "R"], // Yore
  ["W", "U", "B", "R", "G"],
];

function wubrgFallback(colors) {
  return [...colors].sort((a, b) => COLOR_ORDER.indexOf(a) - COLOR_ORDER.indexOf(b));
}

function colorSet(colors) {
  return new Set((colors || []).filter((c) => COLOR_ORDER.includes(c)));
}

function comboMatches(combo, set) {
  if (!combo.length) return set.size === 0;
  return combo.length === set.size && combo.every((c) => set.has(c));
}

/** Display order for mana symbols (RW not WR for Boros, etc.). */
export function canonicalizeColors(colors) {
  const set = colorSet(colors);
  if (!set.size) return [];

  for (const combo of COMBO_CANONICAL) {
    if (combo.length && comboMatches(combo, set)) return [...combo];
  }

  return wubrgFallback(set);
}

/** Sort index: colorless, mono WUBRGC, then 2/3/4/5-color combos in chart order. */
export function colorIdentitySortIndex(colors) {
  const set = colorSet(colors);

  for (let i = 0; i < COMBO_CANONICAL.length; i++) {
    if (comboMatches(COMBO_CANONICAL[i], set)) return i;
  }

  const fallback = wubrgFallback(set).join("");
  return 10000 + set.size * 1000 + fallback.split("").reduce((n, c) => n * 10 + COLOR_ORDER.indexOf(c), 0);
}

export function canonicalColorKey(colors) {
  const canon = canonicalizeColors(colors);
  return canon.length ? canon.join("") : "C";
}

/** Normalized identity key (WUBRG sort) for search matching. */
export function identityKeyFromCombo(colors) {
  if (!colors?.length) return "C";
  return [...colors]
    .filter((c) => COLOR_ORDER.includes(c))
    .sort((a, b) => COLOR_ORDER.indexOf(a) - COLOR_ORDER.indexOf(b))
    .join("");
}

/**
 * Young Mage / community nicknames for color identities (search terms → normalized key).
 * @type {Array<{ key: string, names: string[] }>}
 */
export const COLOR_IDENTITY_SEARCH_ALIASES = [
  { key: "C", names: ["colorless"] },
  { key: "W", names: ["white"] },
  { key: "U", names: ["blue"] },
  { key: "B", names: ["black"] },
  { key: "R", names: ["red"] },
  { key: "G", names: ["green"] },
  { key: "WU", names: ["azorius"] },
  { key: "RW", names: ["boros"] },
  { key: "UB", names: ["dimir"] },
  { key: "BG", names: ["golgari"] },
  { key: "RG", names: ["gruul"] },
  { key: "UR", names: ["izzet"] },
  { key: "WB", names: ["orzhov"] },
  { key: "BR", names: ["rakdos"] },
  { key: "WG", names: ["selesnya"] },
  { key: "UG", names: ["simic"] },
  { key: "WBG", names: ["abzan"] },
  { key: "WUG", names: ["bant"] },
  { key: "WUB", names: ["esper"] },
  { key: "UBR", names: ["grixis"] },
  { key: "WUR", names: ["jeskai"] },
  { key: "BRG", names: ["jund"] },
  { key: "WBR", names: ["mardu"] },
  { key: "WRG", names: ["naya"] },
  { key: "UBG", names: ["sultai"] },
  { key: "URG", names: ["temur"] },
  { key: "UBRG", names: ["glint"] },
  { key: "WBRG", names: ["dune"] },
  { key: "WURG", names: ["ink"] },
  { key: "WUBG", names: ["witch"] },
  { key: "WUBR", names: ["yore"] },
  {
    key: "WUBRG",
    names: ["wubrg", "five color", "five-color", "fivecolor", "5 color", "5-color", "5c"],
  },
];
