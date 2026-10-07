const SETTINGS_KEY = "edhlog-settings-v1";
export const DEFAULT_PLAYER_NAME = "Brass";
export const DEFAULT_COLOR = "default";
export const DEFAULT_THEME_MODE = "dark";

/** @typedef {{ playerName: string, themeAccent: string, themeBackground: string, themeMode: 'dark' | 'light' }} AppSettings */

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

/** @typedef {{ bg: string, surface: string, surface2: string, border: string, text: string, muted: string, green: string, red: string, glowA: string, glowB: string }} BgPalette */

/** @type {Record<string, BgPalette>} */
const BG_VARS_BASE_DARK = {
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

/** @type {Record<string, BgPalette>} */
const BG_VARS_LIGHT = {
  default: {
    bg: "#e8ecf2",
    surface: "#f4f6f9",
    surface2: "#dde2ea",
    border: "#b8c0ce",
    text: "#12161e",
    muted: "#5c6678",
    green: "#2a9e5c",
    red: "#c94040",
    glowA: "rgba(91, 159, 212, 0.2)",
    glowB: "rgba(61, 186, 122, 0.1)",
  },
  white: {
    bg: "#f2ebe0",
    surface: "#faf6ef",
    surface2: "#e6ddd0",
    border: "#c9baa8",
    text: "#1e1a14",
    muted: "#6b5f50",
    green: "#3d8f5c",
    red: "#c45a48",
    glowA: "rgba(232, 212, 139, 0.35)",
    glowB: "rgba(196, 168, 74, 0.15)",
  },
  blue: {
    bg: "#dce8f8",
    surface: "#ecf4fc",
    surface2: "#cdddf0",
    border: "#94b0d4",
    text: "#0a1424",
    muted: "#4a6080",
    green: "#2a8f70",
    red: "#d04040",
    glowA: "rgba(94, 179, 255, 0.28)",
    glowB: "rgba(45, 127, 212, 0.14)",
  },
  black: {
    bg: "#e6e2ee",
    surface: "#f2eff6",
    surface2: "#d8d2e4",
    border: "#a89ab8",
    text: "#141018",
    muted: "#5c5468",
    green: "#4a7a42",
    red: "#a84868",
    glowA: "rgba(183, 148, 232, 0.22)",
    glowB: "rgba(122, 158, 110, 0.12)",
  },
  red: {
    bg: "#f5e6e4",
    surface: "#faf0ee",
    surface2: "#e8d0cc",
    border: "#c89890",
    text: "#1a100e",
    muted: "#6b5048",
    green: "#3a8a62",
    red: "#d85040",
    glowA: "rgba(240, 112, 96, 0.25)",
    glowB: "rgba(201, 64, 48, 0.12)",
  },
  green: {
    bg: "#e0ebe4",
    surface: "#eef5f0",
    surface2: "#cdded4",
    border: "#98b8a4",
    text: "#0e1812",
    muted: "#4a6054",
    green: "#2a9e62",
    red: "#c05050",
    glowA: "rgba(78, 207, 138, 0.22)",
    glowB: "rgba(42, 158, 92, 0.12)",
  },
  colorless: {
    bg: "#e8e8e8",
    surface: "#f4f4f4",
    surface2: "#d8d8d8",
    border: "#a8a8a8",
    text: "#141414",
    muted: "#585858",
    green: "#5a8a5a",
    red: "#a85858",
    glowA: "rgba(120, 120, 120, 0.15)",
    glowB: "rgba(90, 90, 90, 0.08)",
  },
};

const DARK_BG_SATURATION = 1.08;

function parseHex(hex) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function rgbToHex(r, g, b) {
  const clamp = (n) => Math.max(0, Math.min(255, Math.round(n)));
  return `#${[clamp(r), clamp(g), clamp(b)]
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("")}`;
}

function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return { h, s, l };
}

function hslToRgb(h, s, l) {
  if (s === 0) {
    const v = l * 255;
    return { r: v, g: v, b: v };
  }
  const hue2rgb = (p, q, t) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: hue2rgb(p, q, h + 1 / 3) * 255,
    g: hue2rgb(p, q, h) * 255,
    b: hue2rgb(p, q, h - 1 / 3) * 255,
  };
}

function saturateHex(hex, factor) {
  const { r, g, b } = parseHex(hex);
  const { h, s, l } = rgbToHsl(r, g, b);
  const next = hslToRgb(h, Math.min(1, s * factor), l);
  return rgbToHex(next.r, next.g, next.b);
}

/** @param {BgPalette} palette */
function saturateBgPalette(palette) {
  return {
    ...palette,
    bg: saturateHex(palette.bg, DARK_BG_SATURATION),
    surface: saturateHex(palette.surface, DARK_BG_SATURATION),
    surface2: saturateHex(palette.surface2, DARK_BG_SATURATION),
    border: saturateHex(palette.border, DARK_BG_SATURATION),
  };
}

/** @type {Record<string, BgPalette>} */
const BG_VARS_DARK = Object.fromEntries(
  Object.entries(BG_VARS_BASE_DARK).map(([id, palette]) => [id, saturateBgPalette(palette)])
);

/** @type {AppSettings | null} */
let cache = null;

/** Saved theme while previewing on the settings page (revert on leave without save). */
let savedThemeSnapshot = null;

function normalizeColorId(id) {
  return COLOR_OPTIONS.some((c) => c.id === id) ? id : DEFAULT_COLOR;
}

function normalizeThemeMode(mode) {
  return mode === "light" ? "light" : "dark";
}

function resolveBgPalette(bgId, mode) {
  const id = normalizeColorId(bgId);
  return normalizeThemeMode(mode) === "light" ? BG_VARS_LIGHT[id] : BG_VARS_DARK[id];
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
        themeMode: normalizeThemeMode(parsed.themeMode),
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
    themeMode: DEFAULT_THEME_MODE,
  };
  return cache;
}

/** @param {string} accentId @param {string} bgId @param {'dark'|'light'} [mode] */
export function applyThemeColors(accentId, bgId, mode) {
  const accent = normalizeColorId(accentId);
  const bg = normalizeColorId(bgId);
  const themeMode = normalizeThemeMode(mode ?? getSettings().themeMode);
  const root = document.documentElement;
  const a = ACCENT_VARS[accent];
  const b = resolveBgPalette(bg, themeMode);

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

  root.setAttribute("data-theme-mode", themeMode);

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
  next.themeMode = normalizeThemeMode(next.themeMode);
  cache = next;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  applyThemeColors(next.themeAccent, next.themeBackground, next.themeMode);
  savedThemeSnapshot = null;
  return next;
}

export function getPlayerName() {
  return getSettings().playerName;
}

export function beginSettingsThemePreview() {
  const s = getSettings();
  savedThemeSnapshot = {
    themeAccent: s.themeAccent,
    themeBackground: s.themeBackground,
    themeMode: s.themeMode,
  };
}

export function cancelSettingsThemePreview() {
  if (!savedThemeSnapshot) return;
  applyThemeColors(
    savedThemeSnapshot.themeAccent,
    savedThemeSnapshot.themeBackground,
    savedThemeSnapshot.themeMode
  );
  savedThemeSnapshot = null;
}

export function commitSettingsThemePreview() {
  savedThemeSnapshot = null;
}

/** @deprecated */
export function applyTheme(themeId) {
  const id = normalizeColorId(themeId);
  const s = getSettings();
  applyThemeColors(id, id, s.themeMode);
}

export function initSettings() {
  const s = getSettings();
  applyThemeColors(s.themeAccent, s.themeBackground, s.themeMode);
}
