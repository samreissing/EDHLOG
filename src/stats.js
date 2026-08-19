const COLORS = ["W", "U", "B", "R", "G"];
export const COLOR_ORDER = ["W", "U", "B", "R", "G", "C"];
export const COLOR_NAMES = {
  W: "White",
  U: "Blue",
  B: "Black",
  R: "Red",
  G: "Green",
  C: "Colorless",
};

export const NORM_PRIOR_WINS = 5;
export const NORM_PRIOR_GAMES = 20;

export function colorOrderIndex(color) {
  const idx = COLOR_ORDER.indexOf(color);
  return idx === -1 ? 99 : idx;
}

export function winRate(wins, games) {
  if (!games) return 0;
  return wins / games;
}

export function pct(n, digits = 1) {
  return `${(n * 100).toFixed(digits)}%`;
}

/** Add 20 games (5W / 15L) to every deck before calculating win rate. */
export function normalizedWinRate(wins, games) {
  return (wins + NORM_PRIOR_WINS) / (games + NORM_PRIOR_GAMES);
}

export function computeDeckStats(decks, games) {
  const map = new Map();
  for (const deck of decks) {
    map.set(deck.name, {
      ...deck,
      games: 0,
      wins: 0,
      losses: 0,
      lastPlayed: null,
    });
  }
  for (const game of games) {
    if (!map.has(game.deck)) {
      map.set(game.deck, {
        name: game.deck,
        bracket: 4,
        colors: [],
        retired: false,
        createdAt: game.date,
        games: 0,
        wins: 0,
        losses: 0,
        lastPlayed: null,
      });
    }
    const d = map.get(game.deck);
    d.games += 1;
    if (game.result === "Win") d.wins += 1;
    else d.losses += 1;
    if (!d.lastPlayed || game.date > d.lastPlayed) d.lastPlayed = game.date;
    if (!d.createdAt || game.date < d.createdAt) d.createdAt = game.date;
  }
  return [...map.values()].map((d) => ({
    ...d,
    winRate: winRate(d.wins, d.games),
    normalizedWr: normalizedWinRate(d.wins, d.games),
  }));
}

export function computeOverview(games) {
  const wins = games.filter((g) => g.result === "Win").length;
  const total = games.length;
  return {
    games: total,
    wins,
    losses: total - wins,
    winRate: winRate(wins, total),
  };
}

export function computeColorStats(deckStats) {
  return COLOR_ORDER.map((color) => {
    const withColor =
      color === "C"
        ? deckStats.filter((d) => !d.colors.length)
        : deckStats.filter((d) => d.colors.includes(color));
    const games = withColor.reduce((s, d) => s + d.games, 0);
    const wins = withColor.reduce((s, d) => s + d.wins, 0);
    const deckCount = withColor.length;
    return {
      color,
      name: COLOR_NAMES[color],
      decks: deckCount,
      games,
      wins,
      winRate: winRate(wins, games),
      normalizedWr: normalizedWinRate(wins, games),
      colorOrder: colorOrderIndex(color),
    };
  });
}

export function computeBracketStats(games, deckStats) {
  const deckMap = new Map(deckStats.map((d) => [d.name, d]));
  const brackets = [1, 2, 3, 4, 5].map((b) => ({ bracket: b, games: 0, wins: 0 }));
  for (const game of games) {
    const deck = deckMap.get(game.deck);
    const b = deck?.bracket ?? 4;
    const slot = brackets.find((x) => x.bracket === b) ?? brackets[3];
    slot.games += 1;
    if (game.result === "Win") slot.wins += 1;
  }
  return brackets.map((b) => ({
    ...b,
    winRate: winRate(b.wins, b.games),
    normalizedWr: normalizedWinRate(b.wins, b.games),
  }));
}

import { gameYear } from "./dates.js";

export function computeYearStats(games) {
  const byYear = new Map();
  for (const game of games) {
    const year = gameYear(game.date);
    if (!byYear.has(year)) byYear.set(year, { year, games: 0, wins: 0 });
    const y = byYear.get(year);
    y.games += 1;
    if (game.result === "Win") y.wins += 1;
  }
  return [...byYear.values()]
    .sort((a, b) => a.year.localeCompare(b.year))
    .map((y) => ({
      ...y,
      winRate: winRate(y.wins, y.games),
      normalizedWr: normalizedWinRate(y.wins, y.games),
    }));
}

export function computeRolling100Stats(games) {
  const sorted = [...games].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const windows = [];
  for (let end = 100; end <= sorted.length; end += 100) {
    const slice = sorted.slice(end - 100, end);
    const wins = slice.filter((g) => g.result === "Win").length;
    windows.push({
      label: `${end - 99}-${end}`,
      cumulativeLabel: `1-${end}`,
      games: 100,
      wins,
      winRate: winRate(wins, 100),
    });
  }
  const cumulative = [];
  for (let end = 100; end <= sorted.length; end += 100) {
    const slice = sorted.slice(0, end);
    const wins = slice.filter((g) => g.result === "Win").length;
    cumulative.push({
      label: `1-${end}`,
      games: end,
      wins,
      winRate: winRate(wins, end),
    });
  }
  return { windows, cumulative };
}

export function computeRankings(deckStats) {
  const played = deckStats.filter((d) => d.games > 0);
  return [...played].sort(
    (a, b) => b.normalizedWr - a.normalizedWr || b.games - a.games
  );
}

const MANA_BASE = `${import.meta.env.BASE_URL}mana`;

export function colorBadge(colors) {
  if (!colors.length) {
    return `<img class="mana-img" src="${MANA_BASE}/C.svg" alt="C" />`;
  }
  return colors
    .map((c) => `<img class="mana-img" src="${MANA_BASE}/${c}.svg" alt="${c}" />`)
    .join("");
}

export function sortDeckList(list, sortKey, dir) {
  const mul = dir === "asc" ? 1 : -1;
  return [...list].sort((a, b) => {
    if (sortKey === "name") return mul * a.name.localeCompare(b.name);
    if (sortKey === "games") return mul * (a.games - b.games) || a.name.localeCompare(b.name);
    if (sortKey === "wr") return mul * (a.winRate - b.winRate) || b.games - a.games;
    if (sortKey === "normWr") return mul * (a.normalizedWr - b.normalizedWr) || b.games - a.games;
    if (sortKey === "bracket") return mul * (a.bracket - b.bracket) || a.name.localeCompare(b.name);
    if (sortKey === "wins") return mul * (a.wins - b.wins) || a.name.localeCompare(b.name);
    if (sortKey === "losses") return mul * (a.losses - b.losses) || a.name.localeCompare(b.name);
    if (sortKey === "newest") {
      const ad = a.createdAt || "";
      const bd = b.createdAt || "";
      return mul * ad.localeCompare(bd) || a.name.localeCompare(b.name);
    }
    if (sortKey === "recent") {
      const ad = a.lastPlayed || "";
      const bd = b.lastPlayed || "";
      return mul * ad.localeCompare(bd) || a.name.localeCompare(b.name);
    }
    return 0;
  });
}
