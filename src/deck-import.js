/**
 * @typedef {{ name: string, qty: number, board: string }} DeckCard
 * @typedef {{ source: 'moxfield' | 'deckstats', url: string, cards: DeckCard[] }} ImportResult
 */

const MOXFIELD_HEADERS = {
  Accept: "application/json",
  "Content-Type": "application/json",
};

/** @param {string} input */
export function parseDeckUrl(input) {
  const url = input.trim();
  if (!url) throw new Error("Paste a Moxfield or Deckstats link");

  let m = url.match(/moxfield\.com\/decks\/(?:private\/)?([A-Za-z0-9_-]+)/i);
  if (m) {
    return {
      source: "moxfield",
      id: m[1],
      url: `https://www.moxfield.com/decks/${m[1]}`,
    };
  }

  m = url.match(/deckstats\.net\/decks\/(\d+)\/(\d+)/i);
  if (m) {
    return {
      source: "deckstats",
      ownerId: m[1],
      id: m[2],
      url: url.split("?")[0],
    };
  }

  throw new Error("Unsupported link — use a public Moxfield or Deckstats deck URL");
}

/** @param {Record<string, { quantity?: number }>} board @param {string} boardName */
function cardsFromDict(board, boardName) {
  if (!board || typeof board !== "object") return [];
  return Object.entries(board).map(([name, card]) => ({
    name,
    qty: card?.quantity || 1,
    board: boardName,
  }));
}

/** @param {unknown} cardsObj @param {string} boardName */
function cardsFromMoxfieldBoard(cardsObj, boardName) {
  if (!cardsObj || typeof cardsObj !== "object") return [];
  return Object.values(cardsObj)
    .map((entry) => {
      const name = entry?.card?.name || entry?.name || entry?.cardName;
      if (!name) return null;
      return { name, qty: entry?.quantity || 1, board: boardName };
    })
    .filter(Boolean);
}

/** @param {object} deck */
function parseMoxfieldDeck(deck) {
  /** @type {DeckCard[]} */
  const cards = [];

  cards.push(...cardsFromDict(deck.commanders, "commander"));
  cards.push(...cardsFromDict(deck.mainboard, "main"));
  cards.push(...cardsFromDict(deck.sideboard, "sideboard"));
  cards.push(...cardsFromDict(deck.maybeboard, "maybeboard"));

  if (!cards.length && deck.boards) {
    cards.push(...cardsFromMoxfieldBoard(deck.boards?.commanders?.cards, "commander"));
    cards.push(...cardsFromMoxfieldBoard(deck.boards?.mainboard?.cards, "main"));
    cards.push(...cardsFromMoxfieldBoard(deck.boards?.sideboard?.cards, "sideboard"));
  }

  if (!cards.length) throw new Error("No cards found in Moxfield deck");
  return cards;
}

/** @param {object} json */
function parseDeckstatsDeck(json) {
  /** @type {DeckCard[]} */
  const cards = [];
  for (const section of json.sections || []) {
    const board = String(section.title || section.name || "main").toLowerCase();
    const boardName = board.includes("command") ? "commander" : board.includes("side") ? "sideboard" : "main";
    for (const card of section.cards || []) {
      if (!card?.name) continue;
      cards.push({
        name: card.name,
        qty: card.number || card.qty || 1,
        board: boardName,
      });
    }
  }
  if (!cards.length) throw new Error("No cards found in Deckstats deck (is it public?)");
  return cards;
}

/** @param {{ source: string, id: string, url: string, ownerId?: string }} parsed */
async function fetchMoxfieldDeck(parsed) {
  const res = await fetch(`https://api2.moxfield.com/v3/decks/all/${parsed.id}`, {
    headers: MOXFIELD_HEADERS,
  });
  if (!res.ok) throw new Error(`Moxfield fetch failed (${res.status}) — is the deck public?`);
  const deck = await res.json();
  return {
    source: /** @type {'moxfield'} */ ("moxfield"),
    url: parsed.url,
    cards: parseMoxfieldDeck(deck),
  };
}

/** @param {{ source: string, id: string, url: string, ownerId?: string }} parsed */
async function fetchDeckstatsDeck(parsed) {
  const params = new URLSearchParams({
    action: "get_deck",
    id_type: "saved",
    owner_id: parsed.ownerId,
    id: parsed.id,
    response_type: "json",
  });
  const res = await fetch(`https://deckstats.net/api.php?${params}`);
  if (!res.ok) throw new Error(`Deckstats fetch failed (${res.status})`);
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return {
    source: /** @type {'deckstats'} */ ("deckstats"),
    url: parsed.url,
    cards: parseDeckstatsDeck(json),
  };
}

/** @param {string} input */
export async function importDeckFromUrl(input) {
  const parsed = parseDeckUrl(input);
  if (parsed.source === "moxfield") return fetchMoxfieldDeck(parsed);
  return fetchDeckstatsDeck(parsed);
}
