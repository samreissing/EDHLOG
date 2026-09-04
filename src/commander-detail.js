import { pctCell } from "./wr-color.js";
import { colorBadge, winRate, normalizedWinRate } from "./stats.js";
import { formatDate, compareGamesChronologically } from "./dates.js";
import { renderCommanderImageTags } from "./scryfall.js";
import { parseGameSeats } from "./matchups.js";
import { commanderMatchesTarget } from "./commander-names.js";
import { MY_PLAYER_NAME } from "./opponent-search.js";

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function isMySeat(seat) {
  return normalizeKey(seat.player) === normalizeKey(MY_PLAYER_NAME);
}

function statBlock(label, value, isWr = false) {
  const rendered = isWr ? pctCell(value) : `<span class="stat-value">${value}</span>`;
  return `<div class="stat-card"><span class="stat-label">${label}</span>${rendered}</div>`;
}

/** @param {import('./store.js').Game[]} games @param {string} commanderName @param {{ splitPartners?: boolean }} [options] */
export function computeOpponentCommanderStats(games, commanderName, options = {}) {
  const { splitPartners = false } = options;
  let gamesCount = 0;
  let wins = 0;
  let losses = 0;
  let sharedLosses = 0;
  /** @type {import('./store.js').Game | null} */
  let latestGame = null;
  /** @type {Map<string, number>} */
  const players = new Map();

  for (const game of games) {
    const seats = parseGameSeats(game);
    const mySeat = seats.find(isMySeat);
    if (!mySeat) continue;

    let opponentSeat = null;
    for (const seat of seats) {
      if (seat === mySeat) continue;
      if (commanderMatchesTarget(seat.commander, commanderName, { splitPartners })) {
        opponentSeat = seat;
        break;
      }
    }
    if (!opponentSeat) continue;

    gamesCount += 1;
    if (mySeat.didWin) wins += 1;
    else if (opponentSeat.didWin) losses += 1;
    else sharedLosses += 1;

    if (opponentSeat.player) {
      players.set(
        opponentSeat.player,
        (players.get(opponentSeat.player) || 0) + 1
      );
    }

    if (!latestGame || compareGamesChronologically(latestGame, game) < 0) {
      latestGame = game;
    }
  }

  return {
    name: commanderName,
    games: gamesCount,
    wins,
    losses,
    sharedLosses,
    lastPlayed: latestGame?.date ?? null,
    winRate: winRate(wins, gamesCount),
    normalizedWr: normalizedWinRate(wins, gamesCount),
    players: [...players.entries()]
      .map(([player, count]) => ({ player, games: count }))
      .sort((a, b) => b.games - a.games || a.player.localeCompare(b.player)),
  };
}

/**
 * @param {{ name: string, colors: string[], games: number, wins: number, losses: number, sharedLosses: number, lastPlayed?: string | null, winRate: number, normalizedWr: number, players: { player: string, games: number }[] }} profile
 * @param {{ backLabel?: string }} [options]
 */
export function renderCommanderDetail(profile, options = {}) {
  const backLabel = options.backLabel ?? "← Back to matchups";
  const commanderImgs = renderCommanderImageTags(profile.name, { escapeHtml });

  const playerRows = profile.players.length
    ? `<div class="commander-players-section">
        <h3>Piloted by</h3>
        <ul class="commander-players-list">
          ${profile.players
            .map(
              (row) =>
                `<li><strong>${escapeHtml(row.player)}</strong> · ${row.games} game${row.games === 1 ? "" : "s"}</li>`
            )
            .join("")}
        </ul>
      </div>`
    : "";

  return `
    <section class="section deck-detail" data-deck-detail-root="${escapeHtml(profile.name)}">
      <div class="deck-detail-nav">
        <button type="button" class="btn btn-ghost btn-sm" id="deck-detail-back">${backLabel}</button>
      </div>

      <div class="deck-detail-hero">
        <div class="deck-commander-images">${commanderImgs}</div>
        <div class="deck-detail-main">
          <div class="deck-detail-header">
            <h2 class="deck-detail-title">${colorBadge(profile.colors)} ${escapeHtml(profile.name)}</h2>
            <span class="badge muted">Opponent commander</span>
          </div>
          <div class="stat-grid deck-detail-stats">
            ${statBlock("Games vs me", profile.games)}
            ${statBlock("My wins", profile.wins)}
            ${statBlock("Losses to", profile.losses)}
            ${statBlock("Shared losses", profile.sharedLosses)}
            ${statBlock("Norm WR", profile.games ? profile.normalizedWr : 0, !!profile.games)}
            ${statBlock("My win rate", profile.games ? profile.winRate : 0, !!profile.games)}
            ${statBlock("Last seen", profile.lastPlayed ? formatDate(profile.lastPlayed) : "—")}
          </div>
        </div>
      </div>

      ${playerRows}
    </section>`;
}
