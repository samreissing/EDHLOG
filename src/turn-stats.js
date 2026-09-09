import { winRate, normalizedWinRate } from "./stats.js";

/**
 * @param {import('./store.js').Game[]} games
 */
export function computeTurnGridStats(games) {
  /** @type {Map<number, { turn: number, games: number, wins: number }>} */
  const byTurn = new Map();

  for (const game of games) {
    const turn = Number(game.turn);
    if (!Number.isFinite(turn) || turn <= 0) continue;

    if (!byTurn.has(turn)) {
      byTurn.set(turn, { turn, games: 0, wins: 0 });
    }

    const row = byTurn.get(turn);
    row.games += 1;
    if (game.result === "Win") row.wins += 1;
  }

  return [...byTurn.values()]
    .sort((a, b) => a.turn - b.turn)
    .map((row) => ({
      ...row,
      winRate: winRate(row.wins, row.games),
      normalizedWr: normalizedWinRate(row.wins, row.games),
    }));
}
