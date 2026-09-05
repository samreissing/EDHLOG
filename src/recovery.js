import { compareGamesChronologically, formatDate, normalizeDate } from "./dates.js";
import { deckCommander } from "./deck-identity.js";
import { gameFingerprint } from "./store.js";

export const EDHLOG_STORAGE_KEY = "edhlog-data-v1";

const DATA_STORAGE_KEY = /^edhlog[-_]data(?:[-_]v\d+)?$/i;

/** Keys that contain "edhlog" but are not game/deck data (commander caches, etc.). */
const IGNORED_STORAGE_KEY = /^edhlog:/i;

/** @param {string} key */
function isDataStorageKey(key) {
  if (IGNORED_STORAGE_KEY.test(key)) return false;
  return DATA_STORAGE_KEY.test(key);
}

/** @param {unknown} value */
export function isAppData(value) {
  return (
    !!value &&
    typeof value === "object" &&
    Array.isArray(/** @type {{ games?: unknown, decks?: unknown }} */ (value).games) &&
    Array.isArray(/** @type {{ games?: unknown, decks?: unknown }} */ (value).decks)
  );
}

/** @param {string} raw */
export function tryParseAppData(raw) {
  if (!raw || typeof raw !== "string") return null;
  try {
    const parsed = JSON.parse(raw);
    if (isAppData(parsed)) return parsed;
  } catch {
    /* salvage below */
  }
  return salvageAppDataJson(raw);
}

/** @param {string} raw */
function salvageAppDataJson(raw) {
  const start = raw.indexOf('{"');
  if (start < 0) return null;
  const trimmed = raw.slice(start);
  for (let end = trimmed.length; end > trimmed.length / 2; end -= 1) {
    if (trimmed[end - 1] !== "}") continue;
    try {
      const parsed = JSON.parse(trimmed.slice(0, end));
      if (isAppData(parsed)) return parsed;
    } catch {
      /* keep trimming */
    }
  }
  return null;
}

/** @param {import('./store.js').AppData} data */
function summarizeAppData(data) {
  const sorted = [...data.games].sort(compareGamesChronologically);
  const dates = sorted
    .map((game) => normalizeDate(game.date) || game.date)
    .filter(Boolean);
  return {
    games: data.games.length,
    decks: data.decks.length,
    oldest: dates[0] ? formatDate(dates[0]) : "—",
    newest: dates.length ? formatDate(dates[dates.length - 1]) : "—",
  };
}

/** @param {import('./store.js').AppData} current @param {import('./store.js').AppData} candidate */
export function diffRecovery(current, candidate) {
  const currentIds = new Set(current.games.map((game) => game.id));
  const currentPrints = new Set(current.games.map((game) => gameFingerprint(game)));
  const missingGames = candidate.games.filter(
    (game) => !currentIds.has(game.id) && !currentPrints.has(gameFingerprint(game))
  );

  const deckKeys = new Set(
    current.decks.map((deck) => String(deckCommander(deck) || deck.name || deck.id || "").trim())
  );
  const missingDecks = candidate.decks.filter((deck) => {
    const key = String(deckCommander(deck) || deck.name || deck.id || "").trim();
    return key && !deckKeys.has(key);
  });

  return { missingGames, missingDecks };
}

/** @param {import('./store.js').AppData} current @param {import('./store.js').AppData} candidate */
export function mergeRecovery(current, candidate) {
  const { missingGames, missingDecks } = diffRecovery(current, candidate);
  const merged = {
    meta: { ...(current.meta || {}) },
    decks: [...current.decks, ...missingDecks.map((deck) => ({ ...deck }))],
    games: [...current.games, ...missingGames.map((game) => ({ ...game, source: game.source || "local" }))],
  };
  return { merged, missingGames, missingDecks };
}

/**
 * @typedef {{ id: string, label: string, detail: string, source: string, data: import('./store.js').AppData | null, stats: ReturnType<typeof summarizeAppData> | null, error?: string, isActive?: boolean }} RecoveryFinding
 */

/** @returns {Promise<RecoveryFinding[]>} */
async function scanStorageArea(storage, sourceLabel) {
  /** @type {RecoveryFinding[]} */
  const findings = [];
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (!key) continue;
    const raw = storage.getItem(key);
    if (!raw) continue;

    const parsed = tryParseAppData(raw);
    if (parsed) {
      findings.push({
        id: `${sourceLabel}:${key}`,
        label: key,
        detail: `${sourceLabel} key`,
        source: sourceLabel,
        data: parsed,
        stats: summarizeAppData(parsed),
        isActive: sourceLabel === "localStorage" && key === EDHLOG_STORAGE_KEY,
      });
      continue;
    }

    if (isDataStorageKey(key)) {
      findings.push({
        id: `${sourceLabel}:${key}`,
        label: key,
        detail: `${sourceLabel} key (unreadable)`,
        source: sourceLabel,
        data: null,
        stats: null,
        error: "Found EDHLOG storage data but could not parse JSON. Try a backup file instead.",
      });
    }
  }
  return findings;
}

/** @param {string} dbName */
function readIndexedDbValues(dbName) {
  return new Promise((resolve) => {
    /** @type {unknown[]} */
    const values = [];
    const request = indexedDB.open(dbName);
    request.onerror = () => resolve([]);
    request.onsuccess = () => {
      const db = request.result;
      const storeNames = [...db.objectStoreNames];
      if (!storeNames.length) {
        db.close();
        resolve([]);
        return;
      }

      let pending = storeNames.length;
      const finish = () => {
        pending -= 1;
        if (pending <= 0) {
          db.close();
          resolve(values);
        }
      };

      for (const storeName of storeNames) {
        try {
          const tx = db.transaction(storeName, "readonly");
          const store = tx.objectStore(storeName);
          const cursorReq = store.openCursor();
          let count = 0;
          cursorReq.onerror = finish;
          cursorReq.onsuccess = () => {
            const cursor = cursorReq.result;
            if (!cursor || count >= 200) {
              finish();
              return;
            }
            values.push(cursor.value);
            count += 1;
            cursor.continue();
          };
        } catch {
          finish();
        }
      }
    };
  });
}

/** @returns {Promise<RecoveryFinding[]>} */
async function scanIndexedDB() {
  /** @type {RecoveryFinding[]} */
  const findings = [];
  if (!indexedDB.databases) return findings;

  try {
    const databases = await indexedDB.databases();
    for (const dbInfo of databases) {
      if (!dbInfo.name) continue;
      const values = await readIndexedDbValues(dbInfo.name);
      values.forEach((value, index) => {
        const parsed =
          typeof value === "string"
            ? tryParseAppData(value)
            : isAppData(value)
              ? value
              : null;
        if (!parsed) return;
        findings.push({
          id: `indexeddb:${dbInfo.name}:${index}`,
          label: dbInfo.name,
          detail: "IndexedDB database",
          source: "IndexedDB",
          data: parsed,
          stats: summarizeAppData(parsed),
        });
      });
    }
  } catch {
    /* ignore */
  }
  return findings;
}

/** @param {File[]} files */
export async function scanBackupFiles(files) {
  /** @type {RecoveryFinding[]} */
  const findings = [];
  for (const file of files) {
    try {
      const text = await file.text();
      const parsed = tryParseAppData(text);
      if (parsed) {
        findings.push({
          id: `file:${file.name}:${file.lastModified}`,
          label: file.name,
          detail: "Backup file",
          source: "File",
          data: parsed,
          stats: summarizeAppData(parsed),
        });
      } else {
        findings.push({
          id: `file:${file.name}:${file.lastModified}`,
          label: file.name,
          detail: "Backup file (unreadable)",
          source: "File",
          data: null,
          stats: null,
          error: "Could not parse this JSON file as EDHLOG data.",
        });
      }
    } catch {
      findings.push({
        id: `file:${file.name}:${file.lastModified}`,
        label: file.name,
        detail: "Backup file (unreadable)",
        source: "File",
        data: null,
        stats: null,
        error: "Could not read this file.",
      });
    }
  }
  return findings;
}

/** @returns {Promise<RecoveryFinding[]>} */
export async function scanForRecoverableData() {
  const findings = [
    ...(await scanStorageArea(localStorage, "localStorage")),
    ...(await scanStorageArea(sessionStorage, "sessionStorage")),
    ...(await scanIndexedDB()),
  ];

  const seen = new Set();
  return findings.filter((finding) => {
    if (!finding.data) return true;
    const signature = `${finding.stats?.games}:${finding.stats?.decks}:${finding.stats?.newest}`;
    const key = `${finding.label}:${signature}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** @param {RecoveryFinding[]} findings @param {{ currentGames: number, currentDecks: number, origin: string }} context */
export function renderRecoveryModal(findings, context) {
  const usable = findings.filter((finding) => finding.data);
  const unreadable = findings.filter((finding) => !finding.data);

  return `
    <div id="recovery-modal" class="modal">
      <div class="modal-content modal-content-wide recovery-modal">
        <h3>Recover data</h3>
        <p class="recovery-lead">
          Scans this browser profile for EDHLOG data on <strong>${escapeHtml(context.origin)}</strong>.
          Data logged on a different URL (localhost vs GitHub Pages) or another browser lives in a separate storage bucket.
        </p>
        <p class="recovery-meta">
          Current site data: <strong>${context.currentGames}</strong> games · <strong>${context.currentDecks}</strong> decks
        </p>
        <div class="recovery-actions-row">
          <button type="button" class="btn btn-ghost btn-sm" id="recovery-rescan-btn">Scan again</button>
          <label class="btn btn-ghost btn-sm recovery-file-btn">
            Add backup file
            <input type="file" id="recovery-file-input" accept=".json,application/json" multiple hidden />
          </label>
        </div>
        ${
          usable.length
            ? `<div class="recovery-section">
          <h4>Recoverable snapshots</h4>
          <div class="recovery-list">
            ${usable
              .map(
                (finding) => `
              <article class="recovery-card${finding.isActive ? " recovery-card--active" : ""}">
                <div class="recovery-card-head">
                  <strong>${escapeHtml(finding.label)}</strong>
                  <span class="recovery-source">${escapeHtml(finding.source)}</span>
                </div>
                <p class="recovery-detail">${escapeHtml(finding.detail)}${finding.isActive ? " · currently loaded" : ""}</p>
                <p class="recovery-stats">${finding.stats.games} games · ${finding.stats.decks} decks · ${escapeHtml(finding.stats.oldest)} → ${escapeHtml(finding.stats.newest)}</p>
                <div class="recovery-card-actions">
                  <button type="button" class="btn btn-sm" data-recovery-merge="${escapeHtml(finding.id)}">Merge missing</button>
                  <button type="button" class="btn btn-ghost btn-sm" data-recovery-replace="${escapeHtml(finding.id)}">Replace all</button>
                </div>
              </article>`
              )
              .join("")}
          </div>
        </div>`
            : `<p class="recovery-empty">No readable EDHLOG snapshots were found in this browser profile yet. Try adding backup JSON files from Downloads.</p>`
        }
        ${
          unreadable.length
            ? `<div class="recovery-section">
          <h4>Unreadable candidates</h4>
          <ul class="recovery-errors">
            ${unreadable
              .map(
                (finding) =>
                  `<li><strong>${escapeHtml(finding.label)}</strong> (${escapeHtml(finding.source)}): ${escapeHtml(finding.error || "Unreadable")}</li>`
              )
              .join("")}
          </ul>
        </div>`
            : ""
        }
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" id="recovery-close-btn">Close</button>
        </div>
      </div>
    </div>`;
}

/** @param {RecoveryFinding[]} findings @param {string} id */
export function getRecoveryFinding(findings, id) {
  return findings.find((finding) => finding.id === id) || null;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}
