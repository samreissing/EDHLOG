import { canonicalizeColors } from "./color-identity.js";

const imageCache = new Map();
const metadataCache = new Map();
let lastRequestAt = 0;

function parseColorIdentity(card) {
  if (!card) return [];
  const ids = (card.color_identity || []).filter((c) => "WUBRG".includes(c));
  return canonicalizeColors(ids);
}

async function throttle() {
  const wait = Math.max(0, 110 - (Date.now() - lastRequestAt));
  if (wait) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt = Date.now();
}

export function commanderNames(deckName) {
  return deckName.split(/\s*\/\/\s*/).map((s) => s.trim()).filter(Boolean);
}

function cardImage(card) {
  if (!card) return null;
  return card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.normal || null;
}

/** @param {string} name */
export async function fetchCardMetadata(name) {
  const key = String(name || "").trim();
  if (!key) return null;
  if (metadataCache.has(key)) return metadataCache.get(key);

  await throttle();
  const res = await fetch(
    `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(key)}`
  );
  if (!res.ok) {
    metadataCache.set(key, null);
    return null;
  }

  const card = await res.json();
  const meta = {
    layout: card.layout,
    faceNames: (card.card_faces || []).map((face) => face.name),
    colorIdentity: parseColorIdentity(card),
  };
  metadataCache.set(key, meta);
  return meta;
}

/** @param {string} name */
export async function fetchCardByName(name) {
  if (imageCache.has(name)) return imageCache.get(name);

  await throttle();
  const res = await fetch(
    `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(name)}`
  );
  if (!res.ok) {
    imageCache.set(name, null);
    return null;
  }

  const card = await res.json();
  const image = cardImage(card);
  imageCache.set(name, image);
  return image;
}

/** @param {string[]} names */
export async function fetchCardImages(names) {
  const unique = [...new Set(names.filter(Boolean))];
  const missing = unique.filter((n) => !imageCache.has(n));
  const out = new Map();

  for (const name of unique) {
    if (imageCache.has(name)) out.set(name, imageCache.get(name));
  }

  for (let i = 0; i < missing.length; i += 75) {
    const chunk = missing.slice(i, i + 75);
    await throttle();
    const res = await fetch("https://api.scryfall.com/cards/collection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifiers: chunk.map((name) => ({ name })),
      }),
    });

    if (!res.ok) {
      for (const name of chunk) {
        imageCache.set(name, null);
        out.set(name, null);
      }
      continue;
    }

    const body = await res.json();
    const found = new Set();
    for (const card of body.data || []) {
      const image = cardImage(card);
      imageCache.set(card.name, image);
      out.set(card.name, image);
      found.add(card.name);
    }

    for (const name of chunk) {
      if (!found.has(name)) {
        const image = await fetchCardByName(name);
        out.set(name, image);
      } else if (!out.has(name)) {
        out.set(name, imageCache.get(name) ?? null);
      }
    }
  }

  return out;
}

/** @param {ParentNode | Document} root */
export async function loadImagesIntoRoot(root) {
  if (!root) return;

  const imgs = root.querySelectorAll("img[data-card-name]");
  const names = [...new Set([...imgs].map((img) => img.dataset.cardName).filter(Boolean))];
  if (!names.length) return;

  const images = await fetchCardImages(names);
  for (const img of imgs) {
    const url = images.get(img.dataset.cardName);
    if (url) {
      img.src = url;
      img.classList.remove("loading");
    } else {
      img.classList.add("missing");
    }
  }
}

/** @param {string} deckName */
export async function loadImagesIntoDeckDetail(deckName) {
  const root = document.querySelector(`[data-deck-detail-root="${CSS.escape(deckName)}"]`);
  return loadImagesIntoRoot(root);
}

/** @param {string} reportKey */
export async function loadImagesIntoEntityReport(reportKey) {
  const root = document.querySelector(`[data-entity-report-root="${CSS.escape(reportKey)}"]`);
  return loadImagesIntoRoot(root);
}
