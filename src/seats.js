import { compareGamesChronologically, normalizeDate } from "./dates.js";
import { winRate } from "./stats.js";

/** @param {import('./store.js').Game} game */
export function winnerSeatForGame(game) {
  if (game.winnerSeat) return Number(game.winnerSeat);
  if (game.mySeat && game.result === "Win") return Number(game.mySeat);
  if (game.mySeat && game.result === "Loss") {
    const occupied = getOccupiedSeats(game);
    if (occupied.length === 1) return 0;
  }
  return 0;
}

/** @param {import('./store.js').Game} game */
export function getOccupiedSeats(game) {
  const seats = new Set();
  if (game.mySeat) seats.add(Number(game.mySeat));
  for (const opp of game.opponents || []) {
    if (opp.seat) seats.add(Number(opp.seat));
  }
  return [...seats].sort((a, b) => a - b);
}

/** @param {import('./store.js').Game} game @param {number} seat */
export function seatWasOccupied(game, seat) {
  return getOccupiedSeats(game).includes(seat);
}

/** @param {import('./store.js').Game[]} games */
export function getGameDateBounds(games) {
  const sorted = [...games].sort(compareGamesChronologically);
  const dates = sorted
    .map((g) => normalizeDate(g.date) || g.date)
    .filter(Boolean);
  if (!dates.length) {
    const today = new Date().toISOString().slice(0, 10);
    return { min: today, max: today };
  }
  return { min: dates[0], max: dates[dates.length - 1] };
}

/** @param {import('./store.js').Game[]} games */
export function computeSeatStats(games) {
  const seats = [1, 2, 3, 4].map((seat) => ({ seat, games: 0, wins: 0 }));

  for (const game of games) {
    const winner = winnerSeatForGame(game);
    if (!winner) continue;

    for (const seat of getOccupiedSeats(game)) {
      const slot = seats[seat - 1];
      slot.games += 1;
      if (winner === seat) slot.wins += 1;
    }
  }

  return seats.map((s) => ({
    ...s,
    label: `Seat ${s.seat}`,
    winRate: winRate(s.wins, s.games),
  }));
}

/**
 * @param {import('./store.js').Game[]} games
 * @param {number} seat
 * @param {string} startDate
 * @param {string} endDate
 */
export function gamesForSeatSeries(games, seat, startDate, endDate) {
  const start = normalizeDate(startDate) || startDate;
  const end = normalizeDate(endDate) || endDate;

  return [...games]
    .sort(compareGamesChronologically)
    .filter((game) => {
      const date = normalizeDate(game.date) || game.date;
      if (date < start || date > end) return false;
      if (!seatWasOccupied(game, seat)) return false;
      return Boolean(winnerSeatForGame(game));
    })
    .map((game) => ({
      date: game.date,
      deck: "",
      result: winnerSeatForGame(game) === seat ? "Win" : "Loss",
    }));
}
