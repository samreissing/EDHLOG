const IDB_NAME = "edhlog-file-storage-v1";
const IDB_STORE = "meta";
const HANDLE_KEY = "data-file-handle";

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
/** @type {boolean} */
let permissionNeeded = false;
/** @type {number | null} */
let lastFileSavedAt = null;

const FILE_RELINK_MESSAGE =
  "Could not access your data file. Click Open data file and choose it again.";

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
  if (name === "NotFoundError" || name === "InvalidStateError") return true;
  const msg = fileErrorMessage(err).toLowerCase();
  return msg.includes("internal error") || msg.includes("not found") || msg.includes("no longer available");
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
  permissionNeeded = false;
  lastFileSavedAt = null;
  lastFileError = null;
}

/** @param {string | null | undefined} message */
export function humanizeFileError(message) {
  if (!message) return message;
  if (/^internal error\.?$/i.test(String(message).trim())) return FILE_RELINK_MESSAGE;
  return message;
}

export function isDataFileStorageSupported() {
  return typeof window !== "undefined" && "showOpenFilePicker" in window && "showSaveFilePicker" in window;
}

export function isDataFileConnected() {
  return !!activeHandle;
}

export function getDataFileStatus() {
  return {
    supported: isDataFileStorageSupported(),
    connected: !!activeHandle,
    fileName: activeFileName,
    permissionNeeded,
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
    lastFileError = String(err?.message || err);
    return false;
  }
}

async function canReadFile(handle) {
  return (await hasFilePermission(handle, "readwrite")) || (await hasFilePermission(handle, "read"));
}

async function canWriteFile(handle) {
  return hasFilePermission(handle, "readwrite");
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

/** @param {FileSystemFileHandle} handle @param {boolean} [persist] */
async function activateHandle(handle, persist = true) {
  activeHandle = handle;
  activeFileName = handle.name;
  lastFileError = null;
  if (persist) await idbSet(HANDLE_KEY, handle);
}

/** @param {FileSystemFileHandle} handle */
async function verifyHandleReadable(handle) {
  try {
    await handle.getFile();
    return true;
  } catch (err) {
    if (isStaleFileHandleError(err)) await releaseStaleHandle();
    else lastFileError = humanizeFileError(fileErrorMessage(err));
    return false;
  }
}

export async function restoreDataFileConnection() {
  if (!isDataFileStorageSupported()) return null;

  try {
    const handle = await idbGet(HANDLE_KEY);
    if (!handle) return null;

    await activateHandle(handle);
    if (!(await verifyHandleReadable(handle))) return null;

    permissionNeeded = !(await canReadFile(handle));
    if (permissionNeeded) lastFileError = null;
    return { handle, permissionNeeded };
  } catch (err) {
    if (isStaleFileHandleError(err)) await releaseStaleHandle();
    else lastFileError = humanizeFileError(fileErrorMessage(err));
    return null;
  }
}

/** @returns {Promise<import('./store.js').AppData | null>} */
export async function readConnectedDataFile() {
  if (!activeHandle) return null;

  try {
    if (!(await canReadFile(activeHandle))) {
      permissionNeeded = true;
      lastFileError = null;
      return null;
    }

    permissionNeeded = false;
    const file = await activeHandle.getFile();
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!isValidAppData(parsed)) throw new Error("Invalid EDHLOG data file (needs decks and games arrays)");
    if (!Array.isArray(parsed.opponentDecks)) parsed.opponentDecks = [];
    lastFileError = null;
    return parsed;
  } catch (err) {
    if (isStaleFileHandleError(err)) {
      await releaseStaleHandle();
      return null;
    }
    lastFileError = humanizeFileError(fileErrorMessage(err));
    return null;
  }
}

/** @param {import('./store.js').AppData} data */
export async function writeConnectedDataFile(data) {
  if (!activeHandle) return false;

  try {
    if (!(await canWriteFile(activeHandle))) {
      permissionNeeded = true;
      lastFileError = null;
      return false;
    }

    permissionNeeded = false;
    const writable = await activeHandle.createWritable();
    await writable.write(JSON.stringify(data, null, 2));
    await writable.close();
    lastFileSavedAt = Date.now();
    lastFileError = null;
    return true;
  } catch (err) {
    if (isStaleFileHandleError(err)) {
      await releaseStaleHandle();
      return false;
    }
    lastFileError = humanizeFileError(fileErrorMessage(err));
    return false;
  }
}

/** Call only from a click handler — requestPermission requires user activation. */
export async function reconnectDataFile() {
  if (!activeHandle) return false;

  const ok = await requestFilePermission(activeHandle, "readwrite");
  permissionNeeded = !ok;
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
      : (await window.showOpenFilePicker({ types: FILE_TYPES, multiple: false }))[0];

  await activateHandle(handle);
  permissionNeeded = false;
  lastFileError = null;

  const hasWrite = await requestFilePermission(handle, "readwrite");
  if (!hasWrite) {
    const hasRead = await requestFilePermission(handle, "read");
    permissionNeeded = !hasRead;
  }

  if (!(await verifyHandleReadable(handle))) {
    throw new Error(FILE_RELINK_MESSAGE);
  }

  return handle;
}

export async function disconnectDataFile() {
  await idbDelete(HANDLE_KEY);
  activeHandle = null;
  activeFileName = null;
  permissionNeeded = false;
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
