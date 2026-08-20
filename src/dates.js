/** US Eastern — used for default "today" in forms. */
const APP_TIMEZONE = "America/New_York";

/** Today's date as YYYY-MM-DD in US Eastern (handles EST/EDT). */
export function todayISO() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIMEZONE }).format(new Date());
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
