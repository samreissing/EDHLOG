/** US Eastern — used for default "today" in forms. */
const APP_TIMEZONE = "America/New_York";

/** Today's date as YYYY-MM-DD in US Eastern (handles EST/EDT). */
export function todayISO() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIMEZONE }).format(new Date());
}

/** Current local time as HH:MM in US Eastern. */
export function nowTime() {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

/** Normalize to HH:MM when possible. */
export function normalizeTime(timeStr) {
  if (!timeStr || typeof timeStr !== "string") return "";
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return "";
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return "";
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** Sortable timestamp for chronological game order. */
export function gameSortKey(game) {
  const date = normalizeDate(game?.date || "");
  const time = normalizeTime(game?.time) || "00:00";
  return `${date}T${time}`;
}

/** Compare games chronologically (oldest first). */
export function compareGamesChronologically(a, b) {
  const byTime = gameSortKey(a).localeCompare(gameSortKey(b));
  if (byTime !== 0) return byTime;
  return String(a.id || "").localeCompare(String(b.id || ""));
}

/** Normalize spreadsheet quirks like "10/?/24" → 2024-10-15. */
export function normalizeDate(dateStr) {
  if (!dateStr || typeof dateStr !== "string") return dateStr;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

  const slash = dateStr.match(/^(\d{1,2})\/\?\/(\d{2})$/);
  if (slash) {
    const [, month, yy] = slash;
    return `20${yy}-${month.padStart(2, "0")}-15`;
  }

  const parsed = new Date(dateStr);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return dateStr;
}

export function formatDate(dateStr) {
  const normalized = normalizeDate(dateStr);
  const [y, m, d] = normalized.split("-");
  if (!y || !m || !d) return dateStr;
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function gameYear(dateStr) {
  return normalizeDate(dateStr).slice(0, 4);
}
