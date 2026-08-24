import { compareGamesChronologically, normalizeDate } from "./dates.js";
import { winRate } from "./stats.js";

export const SEAT_COLORS = {
  1: "#e6a756",
  2: "#5b9bd5",
  3: "#c75b5b",
  4: "#7bc96f",
};

export const SEAT_VIEW_MODES = ["mine", "opponents", "total"];

export const SEAT_VIEW_LABELS = {
  mine: "Mine",
  opponents: "Opps",
  total: "Total",
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

/** @param {import('./store.js').Game} game @param {number} seat */
export function opponentOccupiedSeat(game, seat) {
  if (mySeatForGame(game) === seat) return false;
  return (game.opponents || []).some((opp) => Number(opp.seat) === seat);
}

/** @param {import('./store.js').Game} game @param {number} seat */
export function anyOccupiedSeat(game, seat) {
  return mySeatForGame(game) === seat || opponentOccupiedSeat(game, seat);
}

/**
 * @param {import('./store.js').Game} game
 * @param {number} seat
 * @returns {'win' | 'loss' | null}
 */
export function seatOutcomeForSeat(game, seat) {
  if (!anyOccupiedSeat(game, seat)) return null;

  const winner = explicitWinnerSeat(game);
  if (winner) return winner === seat ? "win" : "loss";

  if (mySeatForGame(game) === seat) {
    if (game.result === "Win") return "win";
    if (game.result === "Loss") return "loss";
  }

  if (opponentOccupiedSeat(game, seat) && mySeatForGame(game) && game.result === "Win") {
    return "loss";
  }

  return null;
}

/** @param {import('./store.js').Game} game @param {number} seat @param {'mine' | 'opponents' | 'total'} mode */
function seatAppliesToMode(game, seat, mode) {
  if (mode === "mine") return mySeatForGame(game) === seat;
  if (mode === "opponents") return opponentOccupiedSeat(game, seat);
  return anyOccupiedSeat(game, seat);
}

/** @param {import('./store.js').Game[]} games @param {'mine' | 'opponents' | 'total'} mode */
export function getSeatDateBounds(games, mode = "mine") {
  const sorted = [...games]
    .filter((game) => gameHasSeatData(game, mode))
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

/** @param {import('./store.js').Game} game @param {'mine' | 'opponents' | 'total'} mode */
function gameHasSeatData(game, mode) {
  if (mode === "mine") return Boolean(mySeatForGame(game));
  if (mode === "opponents") {
    return (game.opponents || []).some((opp) => {
      const seat = Number(opp.seat);
      return seat >= 1 && seat <= 4 && mySeatForGame(game) !== seat;
    });
  }
  if (mySeatForGame(game)) return true;
  return (game.opponents || []).some((opp) => Number(opp.seat) >= 1 && Number(opp.seat) <= 4);
}

/** @param {import('./store.js').Game[]} games @param {'mine' | 'opponents' | 'total'} mode */
export function computeSeatStats(games, mode = "mine") {
  const seats = [1, 2, 3, 4].map((seat) => ({ seat, games: 0, wins: 0 }));

  for (const game of games) {
    for (let seat = 1; seat <= 4; seat += 1) {
      if (!seatAppliesToMode(game, seat, mode)) continue;
      const result = seatOutcomeForSeat(game, seat);
      if (!result) continue;
      const slot = seats[seat - 1];
      slot.games += 1;
      if (result === "win") slot.wins += 1;
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
 * @param {'mine' | 'opponents' | 'total'} mode
 */
export function gamesForSeatSeries(games, seat, startDate, endDate, mode = "mine") {
  const start = normalizeDate(startDate) || startDate;
  const end = normalizeDate(endDate) || endDate;

  return [...games]
    .sort(compareGamesChronologically)
    .filter((game) => {
      if (!seatAppliesToMode(game, seat, mode)) return false;
      const date = normalizeDate(game.date) || game.date;
      if (date < start || date > end) return false;
      return seatOutcomeForSeat(game, seat) !== null;
    })
    .map((game) => ({
      date: game.date,
      deck: "",
      result: seatOutcomeForSeat(game, seat) === "win" ? "Win" : "Loss",
    }));
}
