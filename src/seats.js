import { compareGamesChronologically, normalizeDate } from "./dates.js";
import { winRate } from "./stats.js";

export const SEAT_COLORS = {
  1: "#e6a756",
  2: "#5b9bd5",
  3: "#c75b5b",
  4: "#7bc96f",
};

/** @param {import('./store.js').Game} game */
export function explicitWinnerSeat(game) {
  if (game.winnerSeat) return Number(game.winnerSeat);
  if (game.mySeat && game.result === "Win") return Number(game.mySeat);
  return 0;
}

/** @param {import('./store.js').Game} game */
export function mySeatForGame(game) {
  const seat = Number(game.mySeat) || 0;
  return seat >= 1 && seat <= 4 ? seat : 0;
}

/**
 * Result for the logged-in player in a specific seat (only when they sat there).
 * @param {import('./store.js').Game} game
 * @param {number} seat
 * @returns {'win' | 'loss' | null}
 */
export function myResultInSeat(game, seat) {
  if (mySeatForGame(game) !== seat) return null;

  const winner = explicitWinnerSeat(game);
  if (winner) return winner === seat ? "win" : "loss";
  if (game.result === "Win") return "win";
  if (game.result === "Loss") return "loss";
  return null;
}

/** @param {import('./store.js').Game[]} games */
export function getSeatDateBounds(games) {
  const sorted = [...games]
    .filter((game) => mySeatForGame(game))
    .sort(compareGamesChronologically);
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
    const mySeat = mySeatForGame(game);
    if (!mySeat) continue;

    const result = myResultInSeat(game, mySeat);
    if (!result) continue;

    const slot = seats[mySeat - 1];
    slot.games += 1;
    if (result === "win") slot.wins += 1;
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
      if (mySeatForGame(game) !== seat) return false;
      const date = normalizeDate(game.date) || game.date;
      if (date < start || date > end) return false;
      return myResultInSeat(game, seat) !== null;
    })
    .map((game) => ({
      date: game.date,
      deck: "",
      result: myResultInSeat(game, seat) === "win" ? "Win" : "Loss",
    }));
}
