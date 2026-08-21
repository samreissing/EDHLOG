import { getUser } from "./auth.js";
import { getSupabase, isCloudSyncEnabled } from "./supabase.js";

/** @typedef {import('./store.js').AppData} AppData */

const TABLE = "user_data";
let saveTimer = null;
let saveInFlight = false;
let pendingData = null;

export function cloudSyncEnabled() {
  return isCloudSyncEnabled();
}

/** @returns {Promise<AppData | null>} */
export async function loadRemoteData() {
  const supabase = getSupabase();
  const user = getUser();
  if (!supabase || !user) return null;

  const { data, error } = await supabase
    .from(TABLE)
    .select("data")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;
  if (!data?.data) return null;
  return /** @type {AppData} */ (data.data);
}

/** @param {AppData} appData */
export async function saveRemoteData(appData) {
  const supabase = getSupabase();
  const user = getUser();
  if (!supabase || !user) return;

  const payload = {
    user_id: user.id,
    data: appData,
  };

  const { error } = await supabase.from(TABLE).upsert(payload, { onConflict: "user_id" });
  if (error) throw error;
}

/** @param {AppData} appData */
export function scheduleRemoteSave(appData) {
  if (!cloudSyncEnabled() || !getUser()) return;
  pendingData = appData;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flushRemoteSave, 400);
}

async function flushRemoteSave() {
  if (!pendingData || saveInFlight) return;
  const data = pendingData;
  pendingData = null;
  saveInFlight = true;
  try {
    await saveRemoteData(data);
  } catch (err) {
    console.error("Cloud save failed:", err);
    pendingData = data;
  } finally {
    saveInFlight = false;
    if (pendingData) scheduleRemoteSave(pendingData);
  }
}

export async function flushPendingRemoteSave() {
  clearTimeout(saveTimer);
  if (pendingData) {
    const data = pendingData;
    pendingData = null;
    await saveRemoteData(data);
  }
}
