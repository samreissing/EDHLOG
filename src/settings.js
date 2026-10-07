const SETTINGS_KEY = "edhlog-settings-v1";
export const DEFAULT_PLAYER_NAME = "Brass";
export const DEFAULT_COLOR = "default";

/** @typedef {{ playerName: string, themeAccent: string, themeBackground: string }} AppSettings */

export const COLOR_OPTIONS = [
  { id: "default", label: "Default" },
  { id: "white", label: "White" },
  { id: "blue", label: "Blue" },
  { id: "black", label: "Black" },
  { id: "red", label: "Red" },
  { id: "green", label: "Green" },
  { id: "colorless", label: "Colorless" },
];

/** @deprecated */
export const THEME_OPTIONS = COLOR_OPTIONS;

const ACCENT_VARS = {
  default: { accent: "#5b9fd4", accentDim: "#3d7ab0" },
  white: { accent: "#e8d48b", accentDim: "#c4a84a" },
  blue: { accent: "#5eb3ff", accentDim: "#2d7fd4" },
  black: { accent: "#b794e8", accentDim: "#8b5fc9" },
  red: { accent: "#f07060", accentDim: "#c94030" },
  green: { accent: "#4ecf8a", accentDim: "#2a9e5c" },
  colorless: { accent: "#c8c8c8", accentDim: "#909090" },
};

/** @type {Record<string, { bg: string, surface: string, surface2: string, border: string, text: string, muted: string, green: string, red: string, glowA: string, glowB: string }>} */
const BG_VARS = {
  default: {
    bg: "#0d0f14",
    surface: "#151820",
    surface2: "#1c2130",
    border: "#2a3144",
    text: "#e8ecf4",
    muted: "#8b95a8",
    green: "#3dba7a",
    red: "#e05c5c",
    glowA: "rgba(91, 159, 212, 0.07)",
    glowB: "rgba(61, 186, 122, 0.04)",
  },
  white: {
    bg: "#1c1b18",
    surface: "#26241f",
    surface2: "#302d26",
    border: "#4a4538",
    text: "#f5f0e4",
    muted: "#b8ad98",
    green: "#6abf8a",
    red: "#d97a6a",
    glowA: "rgba(232, 212, 139, 0.12)",
    glowB: "rgba(196, 168, 74, 0.06)",
  },
  blue: {
    bg: "#070d18",
    surface: "#0c1528",
    surface2: "#12203a",
    border: "#1e3a5f",
    text: "#e6f0ff",
    muted: "#8ba8cc",
    green: "#4ec9a0",
    red: "#ff7b7b",
    glowA: "rgba(94, 179, 255, 0.14)",
    glowB: "rgba(45, 127, 212, 0.08)",
  },
  black: {
    bg: "#0a080e",
    surface: "#12101a",
    surface2: "#1a1624",
    border: "#2e2838",
    text: "#e8e4f0",
    muted: "#9a92a8",
    green: "#7a9e6e",
    red: "#c96b8a",
    glowA: "rgba(183, 148, 232, 0.1)",
    glowB: "rgba(122, 158, 110, 0.05)",
  },
  red: {
    bg: "#140a0a",
    surface: "#1e1010",
    surface2: "#2a1616",
    border: "#4a2828",
    text: "#fce8e6",
    muted: "#c49a94",
    green: "#5cb88a",
    red: "#ff9080",
    glowA: "rgba(240, 112, 96, 0.12)",
    glowB: "rgba(201, 64, 48, 0.07)",
  },
  green: {
    bg: "#0a120e",
    surface: "#101a14",
    surface2: "#16241c",
    border: "#2a4434",
    text: "#e8f4ec",
    muted: "#94b8a4",
    green: "#5ee0a0",
    red: "#e07070",
    glowA: "rgba(78, 207, 138, 0.12)",
    glowB: "rgba(42, 158, 92, 0.07)",
  },
  colorless: {
    bg: "#121212",
    surface: "#1a1a1a",
    surface2: "#242424",
    border: "#3a3a3a",
    text: "#ececec",
    muted: "#a0a0a0",
    green: "#8ab88a",
    red: "#c88888",
    glowA: "rgba(200, 200, 200, 0.08)",
    glowB: "rgba(144, 144, 144, 0.05)",
  },
};

/** @type {AppSettings | null} */
let cache = null;

/** Saved colors while previewing on the settings page (revert on leave without save). */
let savedThemeSnapshot = null;

function normalizeColorId(id) {
  return COLOR_OPTIONS.some((c) => c.id === id) ? id : DEFAULT_COLOR;
}

/** @returns {AppSettings} */
export function getSettings() {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      let themeAccent = parsed.themeAccent;
      let themeBackground = parsed.themeBackground;
      if (parsed.theme && !themeAccent) {
        const legacy = normalizeColorId(parsed.theme);
        themeAccent = legacy;
        themeBackground = legacy;
      }
      cache = {
        playerName: String(parsed.playerName || "").trim() || DEFAULT_PLAYER_NAME,
        themeAccent: normalizeColorId(themeAccent),
        themeBackground: normalizeColorId(themeBackground),
      };
      return cache;
    }
  } catch {
    /* ignore */
  }
  cache = {
    playerName: DEFAULT_PLAYER_NAME,
    themeAccent: DEFAULT_COLOR,
    themeBackground: DEFAULT_COLOR,
  };
  return cache;
}

/** @param {string} accentId @param {string} bgId */
export function applyThemeColors(accentId, bgId) {
  const accent = normalizeColorId(accentId);
  const bg = normalizeColorId(bgId);
  const root = document.documentElement;
  const a = ACCENT_VARS[accent];
  const b = BG_VARS[bg];

  root.style.setProperty("--accent", a.accent);
  root.style.setProperty("--accent-dim", a.accentDim);
  root.style.setProperty("--bg", b.bg);
  root.style.setProperty("--surface", b.surface);
  root.style.setProperty("--surface-2", b.surface2);
  root.style.setProperty("--border", b.border);
  root.style.setProperty("--text", b.text);
  root.style.setProperty("--muted", b.muted);
  root.style.setProperty("--green", b.green);
  root.style.setProperty("--red", b.red);
  root.style.setProperty("--theme-glow-a", b.glowA);
  root.style.setProperty("--theme-glow-b", b.glowB);

  if (accent === DEFAULT_COLOR && bg === DEFAULT_COLOR) {
    root.removeAttribute("data-theme-accent");
    root.removeAttribute("data-theme-bg");
  } else {
    if (accent === DEFAULT_COLOR) root.removeAttribute("data-theme-accent");
    else root.setAttribute("data-theme-accent", accent);
    if (bg === DEFAULT_COLOR) root.removeAttribute("data-theme-bg");
    else root.setAttribute("data-theme-bg", bg);
  }
}

/** @param {Partial<AppSettings>} patch */
export function saveSettings(patch) {
  const next = { ...getSettings(), ...patch };
  next.playerName = String(next.playerName || "").trim() || DEFAULT_PLAYER_NAME;
  next.themeAccent = normalizeColorId(next.themeAccent);
  next.themeBackground = normalizeColorId(next.themeBackground);
  cache = next;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  applyThemeColors(next.themeAccent, next.themeBackground);
  savedThemeSnapshot = null;
  return next;
}

export function getPlayerName() {
  return getSettings().playerName;
}

export function beginSettingsThemePreview() {
  const s = getSettings();
  savedThemeSnapshot = { themeAccent: s.themeAccent, themeBackground: s.themeBackground };
}

export function cancelSettingsThemePreview() {
  if (!savedThemeSnapshot) return;
  applyThemeColors(savedThemeSnapshot.themeAccent, savedThemeSnapshot.themeBackground);
  savedThemeSnapshot = null;
}

export function commitSettingsThemePreview() {
  savedThemeSnapshot = null;
}

/** @deprecated */
export function applyTheme(themeId) {
  const id = normalizeColorId(themeId);
  applyThemeColors(id, id);
}

export function initSettings() {
  const s = getSettings();
  applyThemeColors(s.themeAccent, s.themeBackground);
}
