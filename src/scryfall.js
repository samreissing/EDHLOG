import { canonicalizeColors } from "./color-identity.js";
import { commanderImageSlots } from "./commander-names.js";

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

/** @deprecated Prefer commanderImageSlots from commander-names.js */
export function commanderNames(deckName) {
  return commanderImageSlots(deckName).map((slot) => slot.name);
}

function cardImage(card, crop = "normal", faceIndex = 0) {
  if (!card) return null;
  let uris;
  if (card.card_faces?.length) {
    const face = card.card_faces[faceIndex] ?? card.card_faces[0];
    uris = face.image_uris;
  } else {
    uris = card.image_uris;
  }
  if (!uris) return null;
  if (crop === "art") return uris.art_crop || uris.normal || null;
  return uris.normal || uris.art_crop || null;
}

function imageCacheKey(name, crop = "normal", faceIndex = 0) {
  const key = String(name || "").trim();
  const faceSuffix = faceIndex ? `:face${faceIndex}` : "";
  return crop === "art" ? `${key}:art${faceSuffix}` : `${key}${faceSuffix}`;
}

/** @param {string} name @param {object} card */
function rememberCard(name, card) {
  const key = String(name || "").trim();
  if (!key || !card) return null;

  const faceCount = card.card_faces?.length || 1;
  for (let faceIndex = 0; faceIndex < faceCount; faceIndex++) {
    const image = cardImage(card, "normal", faceIndex);
    const art = cardImage(card, "art", faceIndex);
    const faceName = card.card_faces?.[faceIndex]?.name || card.name || key;

    if (image) {
      imageCache.set(imageCacheKey(key, "normal", faceIndex), image);
      if (faceName !== key) imageCache.set(imageCacheKey(faceName, "normal", faceIndex), image);
    }
    if (art) {
      imageCache.set(imageCacheKey(key, "art", faceIndex), art);
      if (faceName !== key) imageCache.set(imageCacheKey(faceName, "art", faceIndex), art);
    }
  }

  const meta = {
    layout: card.layout,
    faceNames: (card.card_faces || []).map((face) => face.name),
    colorIdentity: parseColorIdentity(card),
  };
  metadataCache.set(key, meta);
  if (card.name && card.name !== key) metadataCache.set(card.name, meta);
  return meta;
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
  return rememberCard(key, card);
}

/** @param {string} name @param {"normal" | "art"} [crop] @param {number} [faceIndex] */
export async function fetchCardByName(name, crop = "normal", faceIndex = 0) {
  const cacheKey = imageCacheKey(name, crop, faceIndex);
  if (imageCache.has(cacheKey)) return imageCache.get(cacheKey);

  await throttle();
  const res = await fetch(
    `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(name)}`
  );
  if (!res.ok) {
    imageCache.set(cacheKey, null);
    return null;
  }

  const card = await res.json();
  rememberCard(name, card);
  return imageCache.get(cacheKey) ?? null;
}

/**
 * @param {string} name
 * @param {{ className?: string, art?: boolean, escapeHtml: (value: string) => string }} options
 */
export function renderCommanderImageTags(name, options) {
  const { className = "commander-img loading", art = false, escapeHtml } = options;
  return commanderImageSlots(name)
    .map((slot) => {
      const artAttr = art ? ' data-card-image="art"' : "";
      const faceAttr = slot.face ? ` data-card-face="${slot.face}"` : "";
      const label = slot.name;
      return `<img class="${className}" data-card-name="${escapeHtml(label)}"${faceAttr}${artAttr} alt="${escapeHtml(label)}" title="${escapeHtml(label)}" />`;
    })
    .join("");
}

/** @param {string[]} names @param {"normal" | "art"} [crop] */
export async function fetchCardImages(names, crop = "normal") {
  const unique = [...new Set(names.filter(Boolean))];
  const missing = unique.filter((n) => !imageCache.has(imageCacheKey(n, crop)));
  const out = new Map();

  for (const name of unique) {
    const cacheKey = imageCacheKey(name, crop);
    if (imageCache.has(cacheKey)) out.set(name, imageCache.get(cacheKey));
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
        imageCache.set(imageCacheKey(name, crop), null);
        out.set(name, null);
      }
      continue;
    }

    const body = await res.json();
    for (const name of chunk) {
      const card = (body.data || []).find(
        (entry) => entry.name?.toLowerCase() === name.toLowerCase()
      );
      if (card) rememberCard(name, card);
    }

    for (const name of chunk) {
      const cacheKey = imageCacheKey(name, crop);
      if (imageCache.has(cacheKey)) {
        out.set(name, imageCache.get(cacheKey));
        continue;
      }
      const image = await fetchCardByName(name, crop);
      out.set(name, image);
    }
  }

  return out;
}

/** @param {ParentNode | Document} root */
export async function loadImagesIntoRoot(root) {
  if (!root) return;

  const imgs = root.querySelectorAll("img[data-card-name]");
  /** @type {Map<string, { crop: "normal" | "art", face: number }[]>} */
  const requests = new Map();

  for (const img of imgs) {
    const name = img.dataset.cardName;
    if (!name) continue;
    const crop = img.dataset.cardImage === "art" ? "art" : "normal";
    const face = Number(img.dataset.cardFace) || 0;
    const list = requests.get(name) ?? [];
    if (!list.some((entry) => entry.crop === crop && entry.face === face)) {
      list.push({ crop, face });
    }
    requests.set(name, list);
  }

  const imageMaps = new Map();
  for (const [name, entries] of requests) {
    for (const { crop, face } of entries) {
      const cacheKey = imageCacheKey(name, crop, face);
      if (imageCache.has(cacheKey)) continue;
      await fetchCardByName(name, crop, face);
    }
  }

  for (const img of imgs) {
    const name = img.dataset.cardName;
    const crop = img.dataset.cardImage === "art" ? "art" : "normal";
    const face = Number(img.dataset.cardFace) || 0;
    const url = imageCache.get(imageCacheKey(name, crop, face));
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
