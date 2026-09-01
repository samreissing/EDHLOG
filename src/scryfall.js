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

function cardImage(card, crop = "normal") {
  if (!card) return null;
  const uris = card.image_uris || card.card_faces?.[0]?.image_uris;
  if (!uris) return null;
  if (crop === "art") return uris.art_crop || uris.normal || null;
  return uris.normal || uris.art_crop || null;
}

function imageCacheKey(name, crop = "normal") {
  const key = String(name || "").trim();
  return crop === "art" ? `${key}:art` : key;
}

/** @param {string} name @param {object} card */
function rememberCard(name, card) {
  const key = String(name || "").trim();
  if (!key || !card) return null;

  const image = cardImage(card, "normal");
  const art = cardImage(card, "art");
  if (image) {
    imageCache.set(imageCacheKey(key, "normal"), image);
    if (card.name && card.name !== key) imageCache.set(imageCacheKey(card.name, "normal"), image);
  }
  if (art) {
    imageCache.set(imageCacheKey(key, "art"), art);
    if (card.name && card.name !== key) imageCache.set(imageCacheKey(card.name, "art"), art);
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

/** @param {string} name @param {"normal" | "art"} [crop] */
export async function fetchCardByName(name, crop = "normal") {
  const cacheKey = imageCacheKey(name, crop);
  if (imageCache.has(cacheKey)) return imageCache.get(cacheKey);

  const cachedMeta = metadataCache.get(name);
  if (cachedMeta && imageCache.has(cacheKey)) return imageCache.get(cacheKey);

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
  const normalNames = new Set();
  const artNames = new Set();

  for (const img of imgs) {
    const name = img.dataset.cardName;
    if (!name) continue;
    if (img.dataset.cardImage === "art") artNames.add(name);
    else normalNames.add(name);
  }

  const [normalImages, artImages] = await Promise.all([
    normalNames.size ? fetchCardImages([...normalNames], "normal") : Promise.resolve(new Map()),
    artNames.size ? fetchCardImages([...artNames], "art") : Promise.resolve(new Map()),
  ]);

  for (const img of imgs) {
    const name = img.dataset.cardName;
    const images = img.dataset.cardImage === "art" ? artImages : normalImages;
    const url = images.get(name);
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
