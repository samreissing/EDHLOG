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
/** @type {boolean} */
let permissionNeeded = false;
/** @type {number | null} */
let lastFileSavedAt = null;
/** @type {string | null} */
let rememberedFileName = null;

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

function setLastFileError(err) {
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
  permissionNeeded = false;
  lastFileSavedAt = null;
  lastFileError = null;
  /* Keep rememberedFileName so the UI still knows which file the user linked. */
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

/** @param {unknown} err */
function isPermissionFileError(err) {
  const name = String(err?.name || "");
  if (name === "NotAllowedError" || name === "SecurityError") return true;
  const msg = fileErrorMessage(err).toLowerCase();
  return msg.includes("permission") || msg.includes("not allowed");
}

/** @param {string | null | undefined} message */
export function humanizeFileError(message) {
  if (!message) return message;
  const s = String(message).trim();
  if (/internal error/i.test(s)) return FILE_RELINK_MESSAGE;
  return message;
}

export function isDataFileStorageSupported() {
  return typeof window !== "undefined" && "showOpenFilePicker" in window && "showSaveFilePicker" in window;
}

export function isDataFileConnected() {
  return !!activeHandle;
}

/** True when the user has linked a file before (handle and/or saved link memory). */
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
    setLastFileError(err);
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

/** @param {string} text */
function parseAppDataText(text) {
  const parsed = JSON.parse(text);
  if (!isValidAppData(parsed)) throw new Error("Invalid EDHLOG data file (needs decks and games arrays)");
  if (!Array.isArray(parsed.opponentDecks)) parsed.opponentDecks = [];
  return /** @type {import('./store.js').AppData} */ (parsed);
}

/** Read JSON from a handle (call in the same user gesture as the file picker when possible). */
export async function readAppDataFromHandle(handle) {
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
  await idbSet(HANDLE_KEY, handle);
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
    if (!handle) {
      if (rememberedFileName) {
        permissionNeeded = true;
        return { handle: null, permissionNeeded: true, rememberedOnly: true };
      }
      return null;
    }

    activeHandle = handle;
    activeFileName = handle.name;
    lastFileError = null;
    await saveLinkMeta(handle.name);

    try {
      await handle.getFile();
    } catch (err) {
      if (isStaleFileHandleError(err)) {
        await releaseStaleHandle();
        if (rememberedFileName) {
          permissionNeeded = true;
          return { handle: null, permissionNeeded: true, rememberedOnly: true };
        }
        return null;
      }
      permissionNeeded = true;
      if (isPermissionFileError(err)) lastFileError = null;
      else setLastFileError(err);
      return { handle, permissionNeeded: true };
    }

    permissionNeeded = !(await canWriteFile(handle));
    if (!(await canReadFile(handle))) permissionNeeded = true;
    return { handle, permissionNeeded };
  } catch (err) {
    if (isStaleFileHandleError(err)) {
      await releaseStaleHandle();
      if (rememberedFileName) {
        permissionNeeded = true;
        return { handle: null, permissionNeeded: true, rememberedOnly: true };
      }
    } else {
      setLastFileError(err);
    }
    return null;
  }
}

/** @returns {Promise<import('./store.js').AppData | null>} */
export async function readConnectedDataFile() {
  if (!activeHandle) return null;

  try {
    const parsed = await readAppDataFromHandle(activeHandle);
    permissionNeeded = !(await canWriteFile(activeHandle));
    lastFileError = null;
    return parsed;
  } catch (err) {
    if (isStaleFileHandleError(err)) {
      await releaseStaleHandle();
      return null;
    }
    if (isPermissionFileError(err)) {
      permissionNeeded = true;
      lastFileError = null;
      return null;
    }
    permissionNeeded = true;
    setLastFileError(err);
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
    permissionNeeded = true;
    setLastFileError(err);
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

  if (mode === "create") {
    await activateHandle(handle);
    permissionNeeded = false;
    lastFileError = null;
    return handle;
  }

  activeHandle = handle;
  activeFileName = handle.name;
  lastFileError = null;
  permissionNeeded = true;
  await saveLinkMeta(handle.name);
  return handle;
}

export async function disconnectDataFile() {
  await idbDelete(HANDLE_KEY);
  await clearLinkMeta();
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
