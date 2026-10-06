const IDB_NAME = "edhlog-file-storage-v1";
const IDB_STORE = "meta";
const HANDLE_KEY = "data-file-handle";
const LINK_META_KEY = "data-file-link-meta";
const LINK_META_LS_KEY = "edhlog-linked-file-v1";

const FILE_TYPES = [
  {
    description: "EDHLOG data",
    accept: { "application/json": [".json"] },
  },
];

/** @type {FileSystemFileHandle | null} */
let activeHandle = null;
/** @type {string | null} */
let activeFileName = null;
/** @type {string | null} */
let lastFileError = null;
/** @type {number | null} */
let lastFileSavedAt = null;
/** @type {string | null} */
let rememberedFileName = null;

const FILE_RELINK_MESSAGE =
  "Could not access your data file. Click Open data file and choose it again.";

const FILE_ALLOW_MESSAGE =
  "Browser needs permission to use your data file. Click Save Game or Reconnect file and choose Allow (same file — you should not need to pick it again).";

/** @param {unknown} err */
function isBenignFileAccessError(err) {
  const name = String(err?.name || "");
  if (name === "NotAllowedError" || name === "SecurityError") return true;
  const msg = fileErrorMessage(err).toLowerCase();
  return msg.includes("internal error") || msg.includes("permission") || msg.includes("not allowed");
}

/** @param {unknown} err */
function fileErrorMessage(err) {
  if (err instanceof SyntaxError) {
    return "Invalid JSON — check that the file is a complete EDHLOG export";
  }
  return String(err?.message || err);
}

/** @param {unknown} err */
function isStaleFileHandleError(err) {
  const name = String(err?.name || "");
  return name === "NotFoundError" || name === "InvalidStateError";
}

function setLastFileError(err) {
  if (isBenignFileAccessError(err)) {
    lastFileError = null;
    return;
  }
  lastFileError = humanizeFileError(fileErrorMessage(err));
}

/** Clears a broken IndexedDB handle without surfacing a sticky API error. */
async function releaseStaleHandle() {
  try {
    await idbDelete(HANDLE_KEY);
  } catch {
    /* ignore */
  }
  activeHandle = null;
  activeFileName = null;
  lastFileSavedAt = null;
  lastFileError = null;
}

/** @param {string} fileName */
async function saveLinkMeta(fileName) {
  const name = String(fileName || "").trim();
  if (!name) return;
  rememberedFileName = name;
  try {
    localStorage.setItem(LINK_META_LS_KEY, name);
  } catch {
    /* ignore */
  }
  try {
    await idbSet(LINK_META_KEY, { fileName: name, linkedAt: Date.now() });
  } catch {
    /* ignore */
  }
}

async function loadLinkMeta() {
  if (rememberedFileName) return rememberedFileName;
  try {
    const fromIdb = await idbGet(LINK_META_KEY);
    if (fromIdb && typeof fromIdb === "object" && fromIdb.fileName) {
      rememberedFileName = String(fromIdb.fileName);
      return rememberedFileName;
    }
  } catch {
    /* ignore */
  }
  try {
    const fromLs = localStorage.getItem(LINK_META_LS_KEY);
    if (fromLs) {
      rememberedFileName = fromLs;
      return rememberedFileName;
    }
  } catch {
    /* ignore */
  }
  return null;
}

async function clearLinkMeta() {
  rememberedFileName = null;
  try {
    localStorage.removeItem(LINK_META_LS_KEY);
  } catch {
    /* ignore */
  }
  try {
    await idbDelete(LINK_META_KEY);
  } catch {
    /* ignore */
  }
}

/** @param {string | null | undefined} message */
export function humanizeFileError(message) {
  if (!message) return message;
  const s = String(message).trim();
  if (/internal error/i.test(s)) {
    return activeHandle ? FILE_ALLOW_MESSAGE : FILE_RELINK_MESSAGE;
  }
  return message;
}

export function isDataFileStorageSupported() {
  return typeof window !== "undefined" && "showOpenFilePicker" in window && "showSaveFilePicker" in window;
}

export function isDataFileConnected() {
  return !!activeHandle;
}

/** Linked file handle is restored — auto-save runs on the next save click (browser may prompt Allow once). */
export function isDataFileAutoSaveReady() {
  return !!activeHandle;
}

/** @deprecated Kept for callers; no longer probes permission on load. */
export async function refreshFilePermissionState() {
  await loadLinkMeta();
  return getDataFileStatus();
}

export function isDataFileLinkConfigured() {
  return !!activeHandle || !!rememberedFileName;
}

export function getDataFileStatus() {
  const displayName = activeFileName || rememberedFileName;
  return {
    supported: isDataFileStorageSupported(),
    connected: !!activeHandle,
    linkConfigured: !!activeHandle || !!rememberedFileName,
    fileName: displayName,
    rememberedFileName,
    permissionNeeded: false,
    lastSavedAt: lastFileSavedAt,
    lastError: lastFileError,
  };
}

function openIdb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** @param {string} key */
async function idbGet(key) {
  const db = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const req = tx.objectStore(IDB_STORE).get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

/** @param {string} key @param {unknown} value */
async function idbSet(key, value) {
  const db = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** @param {string} key */
async function idbDelete(key) {
  const db = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** @param {FileSystemFileHandle} handle @param {"read" | "readwrite"} mode */
async function hasFilePermission(handle, mode) {
  try {
    return (await handle.queryPermission({ mode })) === "granted";
  } catch {
    return false;
  }
}

/** @param {FileSystemFileHandle} handle @param {"read" | "readwrite"} mode */
async function requestFilePermission(handle, mode) {
  try {
    if (await hasFilePermission(handle, mode)) return true;
    return (await handle.requestPermission({ mode })) === "granted";
  } catch (err) {
    setLastFileError(err);
    return false;
  }
}

/** @param {unknown} value */
function isValidAppData(value) {
  return (
    !!value &&
    typeof value === "object" &&
    Array.isArray(/** @type {{ games?: unknown, decks?: unknown }} */ (value).games) &&
    Array.isArray(/** @type {{ games?: unknown, decks?: unknown }} */ (value).decks)
  );
}

/** @param {string} text */
function parseAppDataText(text) {
  const parsed = JSON.parse(text);
  if (!isValidAppData(parsed)) throw new Error("Invalid EDHLOG data file (needs decks and games arrays)");
  if (!Array.isArray(parsed.opponentDecks)) parsed.opponentDecks = [];
  return /** @type {import('./store.js').AppData} */ (parsed);
}

/** Read JSON from a handle (call in the same user gesture as the file picker when possible). */
export async function readAppDataFromHandle(handle, options = {}) {
  const { requestPermission = false } = options;
  if (requestPermission) {
    let ok = await hasFilePermission(handle, "readwrite");
    if (!ok) ok = await hasFilePermission(handle, "read");
    if (!ok) ok = await requestFilePermission(handle, "readwrite");
    if (!ok) ok = await requestFilePermission(handle, "read");
    if (!ok) throw new DOMException("File read permission was not granted", "NotAllowedError");
  }
  const file = await handle.getFile();
  const text = await file.text();
  return parseAppDataText(text);
}

/** @param {FileSystemFileHandle} handle */
async function activateHandle(handle) {
  activeHandle = handle;
  activeFileName = handle.name;
  lastFileError = null;
  await saveLinkMeta(handle.name);
  try {
    await idbSet(HANDLE_KEY, handle);
  } catch {
    /* handle stays in memory for this session */
  }
}

/** Save the current handle to IndexedDB after data is loaded into the browser. */
export async function persistDataFileHandle() {
  if (!activeHandle) return;
  await saveLinkMeta(activeHandle.name);
  await idbSet(HANDLE_KEY, activeHandle);
}

export async function restoreDataFileConnection() {
  if (!isDataFileStorageSupported()) return null;

  await loadLinkMeta();

  try {
    const handle = await idbGet(HANDLE_KEY);
    if (!handle) return null;

    activeHandle = handle;
    activeFileName = handle.name;
    lastFileError = null;
    await saveLinkMeta(handle.name);
    return { handle, permissionNeeded: false };
  } catch (err) {
    if (isStaleFileHandleError(err)) await releaseStaleHandle();
    else setLastFileError(err);
    return null;
  }
}

/** @returns {Promise<import('./store.js').AppData | null>} */
export async function readConnectedDataFile(options = {}) {
  const { ifPermitted = false, requestPermission = false } = options;
  if (!activeHandle) return null;

  if (ifPermitted) {
    const canRead =
      (await hasFilePermission(activeHandle, "readwrite")) || (await hasFilePermission(activeHandle, "read"));
    if (!canRead) return null;
  }

  try {
    return await readAppDataFromHandle(activeHandle, { requestPermission });
  } catch (err) {
    if (isStaleFileHandleError(err)) await releaseStaleHandle();
    else if (!isBenignFileAccessError(err)) setLastFileError(err);
    return null;
  }
}

/**
 * @param {import('./store.js').AppData} data
 * @param {{ requestPermission?: boolean }} [options]
 * Pass requestPermission: true from a click handler (save game) so the browser can prompt Allow after refresh.
 */
export async function writeConnectedDataFile(data, options = {}) {
  const { requestPermission = false } = options;
  if (!activeHandle) return false;

  try {
    let allowed = await hasFilePermission(activeHandle, "readwrite");
    if (!allowed && requestPermission) {
      allowed = await requestFilePermission(activeHandle, "readwrite");
    }
    if (!allowed) return false;

    const writable = await activeHandle.createWritable();
    await writable.write(JSON.stringify(data, null, 2));
    await writable.close();
    lastFileSavedAt = Date.now();
    lastFileError = null;
    return true;
  } catch (err) {
    if (isStaleFileHandleError(err)) await releaseStaleHandle();
    else if (!isBenignFileAccessError(err)) setLastFileError(err);
    return false;
  }
}

/** Call only from a click handler — requestPermission requires user activation. */
export async function reconnectDataFile() {
  if (!activeHandle) return false;
  const ok = await requestFilePermission(activeHandle, "readwrite");
  if (ok) lastFileError = null;
  return ok;
}

/** @param {"create" | "open"} mode */
export async function chooseDataFile(mode) {
  if (!isDataFileStorageSupported()) {
    throw new Error("File saving is not supported in this browser. Use Chrome or Edge, or export JSON backups.");
  }

  const handle =
    mode === "create"
      ? await window.showSaveFilePicker({
          suggestedName: "edhlog-data.json",
          types: FILE_TYPES,
        })
      : (
          await window.showOpenFilePicker({
            types: FILE_TYPES,
            multiple: false,
            mode: "readwrite",
          })
        )[0];

  if (mode === "create") {
    await activateHandle(handle);
    lastFileError = null;
    return handle;
  }

  await activateHandle(handle);
  return handle;
}

export async function disconnectDataFile() {
  await idbDelete(HANDLE_KEY);
  await clearLinkMeta();
  activeHandle = null;
  activeFileName = null;
  lastFileError = null;
  lastFileSavedAt = null;
}

export async function requestPersistentBrowserStorage() {
  if (!navigator.storage?.persist) return false;
  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
