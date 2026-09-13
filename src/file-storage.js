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
async function ensurePermission(handle, mode) {
  const opts = { mode };
  if ((await handle.queryPermission(opts)) === "granted") return true;
  return (await handle.requestPermission(opts)) === "granted";
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

/** @param {FileSystemFileHandle} handle */
async function activateHandle(handle) {
  activeHandle = handle;
  activeFileName = handle.name;
  lastFileError = null;
  await idbSet(HANDLE_KEY, handle);
}

export async function restoreDataFileConnection() {
  if (!isDataFileStorageSupported()) return null;

  try {
    const handle = await idbGet(HANDLE_KEY);
    if (!handle) return null;

    await activateHandle(handle);
    permissionNeeded = !(await ensurePermission(handle, "read"));
    return { handle, permissionNeeded };
  } catch (err) {
    lastFileError = String(err?.message || err);
    return null;
  }
}

/** @returns {Promise<import('./store.js').AppData | null>} */
export async function readConnectedDataFile() {
  if (!activeHandle) return null;

  try {
    if (!(await ensurePermission(activeHandle, "read"))) {
      permissionNeeded = true;
      lastFileError = "File permission required — click Reconnect file";
      return null;
    }

    permissionNeeded = false;
    const file = await activeHandle.getFile();
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!isValidAppData(parsed)) throw new Error("Invalid EDHLOG data file");
    lastFileError = null;
    return parsed;
  } catch (err) {
    lastFileError = String(err?.message || err);
    return null;
  }
}

/** @param {import('./store.js').AppData} data */
export async function writeConnectedDataFile(data) {
  if (!activeHandle) return false;

  try {
    if (!(await ensurePermission(activeHandle, "readwrite"))) {
      permissionNeeded = true;
      lastFileError = "File permission required — click Reconnect file";
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
    lastFileError = String(err?.message || err);
    return false;
  }
}

export async function reconnectDataFile() {
  if (!activeHandle) return false;
  const ok =
    (await ensurePermission(activeHandle, "readwrite")) &&
    (await ensurePermission(activeHandle, "read"));
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
