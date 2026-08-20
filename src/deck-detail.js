import { pctCell } from "./wr-color.js";
import { colorBadge } from "./stats.js";
import { formatDate } from "./dates.js";
import { commanderNames } from "./scryfall.js";

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function statBlock(label, value, isWr = false) {
  const rendered = isWr ? pctCell(value) : `<span class="stat-value">${value}</span>`;
  return `<div class="stat-card"><span class="stat-label">${label}</span>${rendered}</div>`;
}

const BOARD_ORDER = ["commander", "main", "sideboard", "maybeboard"];
const BOARD_LABELS = {
  commander: "Commander",
  main: "Main deck",
  sideboard: "Sideboard",
  maybeboard: "Maybeboard",
};

/** @param {{ name: string, qty: number, board: string }} card */
function cardRow(card) {
  return `
    <div class="deck-card-row">
      <img class="deck-card-img loading" data-card-name="${escapeHtml(card.name)}" alt="" />
      <span class="deck-card-qty">${card.qty}×</span>
      <span class="deck-card-name">${escapeHtml(card.name)}</span>
    </div>`;
}

/** @param {import('./store.js').Deck} deck @param {object} stats */
export function renderDeckDetail(deck, stats) {
  const commanders = commanderNames(deck.name);
  const cards = deck.cards || [];
  const grouped = new Map();

  for (const card of cards) {
    const board = card.board || "main";
    if (!grouped.has(board)) grouped.set(board, []);
    grouped.get(board).push(card);
  }

  for (const [, list] of grouped) {
    list.sort((a, b) => a.name.localeCompare(b.name));
  }

  const cardSections = BOARD_ORDER.filter((b) => grouped.has(b))
    .map((board) => {
      const rows = grouped.get(board).map(cardRow).join("");
      return `
        <div class="deck-card-section">
          <h4>${BOARD_LABELS[board] || board}</h4>
          <div class="deck-card-list">${rows}</div>
        </div>`;
    })
    .join("");

  const commanderImgs = commanders
    .map(
      (name) =>
        `<img class="commander-img loading" data-card-name="${escapeHtml(name)}" alt="${escapeHtml(name)}" title="${escapeHtml(name)}" />`
    )
    .join("");

  return `
    <section class="section deck-detail" data-deck-detail-root="${escapeHtml(deck.name)}">
      <div class="deck-detail-nav">
        <button type="button" class="btn btn-ghost btn-sm" id="deck-detail-back">← Back to decks</button>
      </div>

      <div class="deck-detail-hero">
        <div class="deck-commander-images">${commanderImgs}</div>
        <div class="deck-detail-main">
          <div class="deck-detail-header">
            <h2 class="deck-detail-title">${colorBadge(deck.colors)} ${escapeHtml(deck.name)}</h2>
            ${deck.retired ? '<span class="badge muted">Retired</span>' : ""}
          </div>
          <div class="stat-grid deck-detail-stats">
            ${statBlock("Games", stats?.games ?? 0)}
            ${statBlock("Wins", stats?.wins ?? 0)}
            ${statBlock("Losses", stats?.losses ?? 0)}
            ${statBlock("Norm WR", stats?.games ? stats.normalizedWr : 0, !!stats?.games)}
            ${statBlock("Win rate", stats?.games ? stats.winRate : 0, !!stats?.games)}
            ${statBlock("Bracket", deck.bracket)}
            ${statBlock("Added", formatDate(deck.createdAt))}
            ${statBlock("Last played", stats?.lastPlayed ? formatDate(stats.lastPlayed) : "—")}
          </div>
        </div>
      </div>

      <div class="deck-link-section">
        <h3>Deck list</h3>
        <p class="muted-text">Paste a public Moxfield or Deckstats link to import card names.</p>
        <form id="deck-list-form" class="deck-link-form">
          <input
            type="url"
            name="listUrl"
            placeholder="https://www.moxfield.com/decks/… or https://deckstats.net/decks/…"
            value="${escapeHtml(deck.listUrl || "")}"
          />
          <button type="submit" class="btn btn-primary">${deck.cards?.length ? "Refresh list" : "Import list"}</button>
        </form>
        ${
          deck.listUrl
            ? `<p class="deck-link-meta"><a href="${escapeHtml(deck.listUrl)}" target="_blank" rel="noopener">${escapeHtml(deck.listSource || "link")}</a>${deck.listSyncedAt ? ` · synced ${formatDate(deck.listSyncedAt)}` : ""}${deck.cards?.length ? ` · ${deck.cards.length} cards` : ""}</p>`
            : ""
        }
      </div>

      ${
        cards.length
          ? `<div class="deck-card-sections">${cardSections}</div>`
          : `<p class="muted-text deck-empty-list">No deck list imported yet.</p>`
      }
    </section>`;
}
