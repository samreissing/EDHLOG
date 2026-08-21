import { getAllowedEmail, getSupabase, isAllowedUser, isCloudSyncEnabled } from "./supabase.js";

/** @typedef {import('@supabase/supabase-js').Session} Session */
/** @typedef {import('@supabase/supabase-js').User} User */

/** @type {Session | null} */
let session = null;

/** @type {((session: Session | null) => void) | null} */
let onAuthChange = null;

export function cloudAuthEnabled() {
  return isCloudSyncEnabled();
}

export function getSession() {
  return session;
}

export function getUser() {
  return session?.user ?? null;
}

export function setAuthChangeHandler(handler) {
  onAuthChange = handler;
}

export async function initAuth() {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;

  session = data.session;
  if (session && !isAllowedUser(session.user)) {
    await supabase.auth.signOut();
    session = null;
    throw new Error(`Sign in with ${getAllowedEmail() || "your allowed account"}.`);
  }

  supabase.auth.onAuthStateChange((_event, nextSession) => {
    if (nextSession && !isAllowedUser(nextSession.user)) {
      supabase.auth.signOut();
      session = null;
      onAuthChange?.(null);
      return;
    }
    session = nextSession;
    onAuthChange?.(nextSession);
  });

  return session;
}

/** @param {string} email */
export async function signInWithEmail(email) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Cloud sync is not configured");

  const normalized = email.trim().toLowerCase();
  const allowed = getAllowedEmail();
  if (allowed && normalized !== allowed) {
    throw new Error(`Only ${allowed} can sign in.`);
  }

  const redirectTo = window.location.origin + window.location.pathname;
  const { error } = await supabase.auth.signInWithOtp({
    email: normalized,
    options: { emailRedirectTo: redirectTo },
  });
  if (error) throw error;
}

export async function signOut() {
  const supabase = getSupabase();
  if (!supabase) return;
  await supabase.auth.signOut();
  session = null;
}

export async function completeAuthFromUrl() {
  const supabase = getSupabase();
  if (!supabase) return null;

  const hash = window.location.hash;
  if (!hash.includes("access_token")) return null;

  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;

  session = data.session;
  window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
  return session;
}
