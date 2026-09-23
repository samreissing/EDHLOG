import { winRate } from "./stats.js";
import { gameHasSeatData } from "./seats.js";

const POD_BASELINE_WR = 0.25;

/** @param {import('./store.js').Game} game */
export function gameHasTurnRecorded(game) {
  const turn = Number(game.turn);
  return Number.isFinite(turn) && turn > 0;
}

/**
 * Win-rate baseline for games missing seat/turn detail.
 * @param {import('./store.js').Game[]} games
 * @param {'mine' | 'opponents' | 'total'} seatMode
 * @param {'player' | 'pod'} perspective
 * @param {{ excludeMySeat?: boolean }} [seatOptions]
 */
export function recordingBaselineWinRate(games, seatMode, perspective, seatOptions = {}) {
  if (perspective === "pod") return POD_BASELINE_WR;

  const unrecorded = games.filter((game) => !gameHasSeatData(game, seatMode, seatOptions));
  if (!unrecorded.length) return POD_BASELINE_WR;

  const wins = unrecorded.filter((game) => game.result === "Win").length;
  return winRate(wins, unrecorded.length);
}

/**
 * @param {import('./store.js').Game[]} games
 * @param {'mine' | 'opponents' | 'total'} seatMode
 * @param {{ excludeMySeat?: boolean }} [options]
 */
export function countGamesMissingSeatRecording(games, seatMode, options = {}) {
  return games.filter((game) => !gameHasSeatData(game, seatMode, options)).length;
}

/** @param {import('./store.js').Game[]} games */
export function countGamesMissingTurnRecording(games) {
  return games.filter((game) => !gameHasTurnRecorded(game)).length;
}

/**
 * Pad each seat with (missingGames / 4) at baseline win rate.
 * @param {Array<{ seat: number, games: number, wins: number, winRate: number }>} seats
 * @param {number} missingGames
 * @param {number} baselineWr
 */
export function applySeatRecordingNormalization(seats, missingGames, baselineWr) {
  if (!missingGames) {
    return seats.map((seat) => ({ ...seat, recordingNormWr: seat.winRate }));
  }

  const padGames = missingGames / 4;
  const padWins = padGames * baselineWr;

  return seats.map((seat) => ({
    ...seat,
    recordingNormWr: winRate(seat.wins + padWins, seat.games + padGames),
  }));
}

/**
 * Player turn grid: distribute missing games by reach % at each turn.
 * @param {Array<{ turn: number, wins: number, losses: number, winRate: number | null, reachedPct: number }>} rows
 * @param {number} missingGames
 * @param {number} baselineWr
 */
export function applyTurnGridRecordingNormalization(rows, missingGames, baselineWr) {
  if (!missingGames || !rows.length) {
    return rows.map((row) => ({
      ...row,
      recordingNormWr: row.winRate,
    }));
  }

  return rows.map((row) => {
    const syntheticGames = missingGames * row.reachedPct;
    if (!syntheticGames) {
      return { ...row, recordingNormWr: row.winRate };
    }

    const wins = row.wins + syntheticGames * baselineWr;
    const losses = row.losses + syntheticGames * (1 - baselineWr);
    const total = wins + losses;
    return {
      ...row,
      recordingNormWr: total ? winRate(wins, total) : null,
    };
  });
}

/**
 * Totals turn distribution: spread missing games using reach %, adjust end-turn share.
 * @param {Array<{ turn: number, games: number, gamesReached: number, reachedPct: number, winRate: number | null }>} rows
 * @param {number} missingGames
 * @param {number} loggedGames
 */
export function applyTurnDistributionRecordingNormalization(rows, missingGames, loggedGames) {
  if (!missingGames || !loggedGames || !rows.length) {
    return rows.map((row) => ({ ...row, recordingNormWr: row.winRate }));
  }

  return rows.map((row) => {
    const ended = row.games;
    const reachWeight = row.gamesReached ? ended / row.gamesReached : 0;
    const syntheticEnded = missingGames * row.reachedPct * reachWeight;
    const adjustedTotal = loggedGames + missingGames;
    const adjustedEnded = ended + syntheticEnded;
    return {
      ...row,
      recordingNormWr: adjustedTotal ? adjustedEnded / adjustedTotal : null,
    };
  });
}

/** @param {import('./store.js').Game[]} games */
export function turnRecordingBaselineWinRate(games, perspective) {
  if (perspective === "pod") return POD_BASELINE_WR;
  const unrecorded = games.filter((game) => !gameHasTurnRecorded(game));
  if (!unrecorded.length) return POD_BASELINE_WR;
  const wins = unrecorded.filter((game) => game.result === "Win").length;
  return winRate(wins, unrecorded.length);
}
