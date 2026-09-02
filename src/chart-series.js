import { compareGamesChronologically, normalizeDate } from "./dates.js";
import { gameBracket } from "./stats.js";
import { mixManaColors, MANA_HEX } from "./mana-colors.js";
import { rowColorsFromKey, rowMatchesDeck } from "./color-stats.js";
import { deckMapByKey } from "./deck-identity.js";
import { getDeckColors } from "./commander-colors.js";

export function lineColorForColorKey(key) {
  const colors = rowColorsFromKey(key);
  if (!colors.length) return MANA_HEX.C;
  return mixManaColors(colors);
}

/** @param {import('./store.js').Game[]} games */
export function getChartDateBounds(games) {
  const sorted = [...games].sort(compareGamesChronologically);
  const dates = sorted.map((g) => normalizeDate(g.date) || g.date).filter(Boolean);
  if (!dates.length) {
    const today = new Date().toISOString().slice(0, 10);
    return { min: today, max: today };
  }
  return { min: dates[0], max: dates[dates.length - 1] };
}

/** @param {import('./store.js').Game[]} games @param {{ start: string|null, end: string|null, customized: boolean }} rangeState */
export function getEffectiveChartRange(games, rangeState) {
  const bounds = getChartDateBounds(games);
  if (!rangeState.customized) {
    return { start: bounds.min, end: bounds.max, bounds };
  }
  const start = rangeState.start || bounds.min;
  const end = rangeState.end || bounds.max;
  return {
    start: start < bounds.min ? bounds.min : start,
    end: end > bounds.max ? bounds.max : end,
    bounds,
  };
}

function gamesInDateRange(games, startDate, endDate) {
  const start = normalizeDate(startDate) || startDate;
  const end = normalizeDate(endDate) || endDate;
  return games.filter((game) => {
    const date = normalizeDate(game.date) || game.date;
    return date >= start && date <= end;
  });
}

/** @param {import('./store.js').Game[]} games @param {{ start: string, end: string }} range */
export function gamesInChartRange(games, range) {
  return gamesInDateRange(games, range.start, range.end);
}

/**
 * @param {import('./store.js').Game[]} games
 * @param {import('./store.js').Deck[]} decks
 * @param {string} colorKey
 * @param {"inclusive"|"exclusive"} agg
 * @param {string} startDate
 * @param {string} endDate
 */
export function gamesForColorSeries(games, decks, colorKey, agg, startDate, endDate) {
  const deckMap = deckMapByKey(decks);
  const rowColors = rowColorsFromKey(colorKey);
  const dated = gamesInDateRange(games, startDate, endDate);
  return dated.filter((game) => {
    const deck = deckMap.get(game.deck);
    if (!deck) return false;
    return rowMatchesDeck(rowColors, getDeckColors(deck), agg);
  });
}

/**
 * @param {import('./store.js').Game[]} games
 * @param {import('./store.js').Deck[]} decks
 * @param {number} bracket
 * @param {string} startDate
 * @param {string} endDate
 */
export function gamesForBracketSeries(games, decks, bracket, startDate, endDate) {
  const deckMap = deckMapByKey(decks);
  const dated = gamesInDateRange(games, startDate, endDate);
  return dated.filter((game) => gameBracket(game, deckMap) === bracket);
}

/**
 * @param {import('./store.js').Game[]} games
 * @param {number} rangeStart
 * @param {number} rangeEnd
 */
export function gamesForTrendsWindowSeries(games, rangeStart, rangeEnd) {
  const sorted = [...games].sort(compareGamesChronologically);
  return sorted.slice(rangeStart - 1, rangeEnd);
}
