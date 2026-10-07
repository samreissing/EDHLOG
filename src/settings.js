const SETTINGS_KEY = "edhlog-settings-v1";
export const DEFAULT_PLAYER_NAME = "Brass";
export const DEFAULT_THEME = "default";

/** @typedef {{ playerName: string, theme: string }} AppSettings */

/** @type {AppSettings | null} */
let cache = null;

export const THEME_OPTIONS = [
  { id: "default", label: "EDHLOG (blue & grey)" },
  { id: "white", label: "White" },
  { id: "blue", label: "Blue" },
  { id: "black", label: "Black" },
  { id: "red", label: "Red" },
  { id: "green", label: "Green" },
  { id: "colorless", label: "Colorless" },
];

/** @returns {AppSettings} */
export function getSettings() {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      cache = {
        playerName: String(parsed.playerName || "").trim() || DEFAULT_PLAYER_NAME,
        theme: THEME_OPTIONS.some((t) => t.id === parsed.theme) ? parsed.theme : DEFAULT_THEME,
      };
      return cache;
    }
  } catch {
    /* ignore */
  }
  cache = { playerName: DEFAULT_PLAYER_NAME, theme: DEFAULT_THEME };
  return cache;
}

/** @param {Partial<AppSettings>} patch */
export function saveSettings(patch) {
  const next = { ...getSettings(), ...patch };
  next.playerName = String(next.playerName || "").trim() || DEFAULT_PLAYER_NAME;
  if (!THEME_OPTIONS.some((t) => t.id === next.theme)) next.theme = DEFAULT_THEME;
  cache = next;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  applyTheme(next.theme);
  return next;
}

export function getPlayerName() {
  return getSettings().playerName;
}

export function getTheme() {
  return getSettings().theme;
}

/** @param {string} themeId */
export function applyTheme(themeId) {
  const id = THEME_OPTIONS.some((t) => t.id === themeId) ? themeId : DEFAULT_THEME;
  const root = document.documentElement;
  if (id === "default") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", id);
}

export function initSettings() {
  applyTheme(getTheme());
}
