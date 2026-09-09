import { winRate, normalizedWinRate } from "./stats.js";

/**
 * @param {import('./store.js').Game[]} games
 */
export function computeTurnGridStats(games) {
  /** @type {Map<number, { turn: number, games: number, wins: number }>} */
  const byTurn = new Map();
  let maxTurn = 0;

  for (const game of games) {
    const turn = Number(game.turn);
    if (!Number.isFinite(turn) || turn <= 0) continue;

    maxTurn = Math.max(maxTurn, turn);
    if (!byTurn.has(turn)) {
      byTurn.set(turn, { turn, games: 0, wins: 0 });
    }

    const row = byTurn.get(turn);
    row.games += 1;
    if (game.result === "Win") row.wins += 1;
  }

  if (maxTurn <= 0) return [];

  /** @type {ReturnType<typeof computeTurnGridStats>} */
  const rows = [];
  for (let turn = 1; turn <= maxTurn; turn += 1) {
    const data = byTurn.get(turn) || { turn, games: 0, wins: 0 };
    rows.push({
      turn: data.turn,
      games: data.games,
      wins: data.wins,
      winRate: data.games ? winRate(data.wins, data.games) : null,
      normalizedWr: data.games ? normalizedWinRate(data.wins, data.games) : null,
    });
  }

  return rows;
}
