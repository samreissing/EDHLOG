import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const allowedEmail = import.meta.env.VITE_ALLOWED_EMAIL?.trim().toLowerCase() || "";

/** @type {import('@supabase/supabase-js').SupabaseClient | null} */
let client = null;

export function isCloudSyncEnabled() {
  return !!(url && anonKey);
}

export function getAllowedEmail() {
  return allowedEmail;
}

export function getSupabase() {
  if (!isCloudSyncEnabled()) return null;
  if (!client) {
    client = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}

export function isAllowedUser(user) {
  if (!user?.email) return false;
  if (!allowedEmail) return true;
  return user.email.toLowerCase() === allowedEmail;
}
