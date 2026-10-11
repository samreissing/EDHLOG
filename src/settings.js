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

/** @typedef {{ bg: string, surface: string, surface2: string, border: string, text: string, muted: string, green: string, red: string }} BgPalette */

/** @typedef {{ bg: string, text: string, muted: string, green: string, red: string }} BgCanvasAnchor */

/** Page canvas color per identity — surfaces are derived from this hue, not a separate grey stack. */
/** @type {Record<string, BgCanvasAnchor>} */
const BG_CANVAS_DARK = {
  default: {
    bg: "#161b26",
    text: "#e8ecf4",
    muted: "#8b95a8",
    green: "#3dba7a",
    red: "#e05c5c",
  },
  white: {
    bg: "#2e2a22",
    text: "#f5f0e4",
    muted: "#b8ad98",
    green: "#6abf8a",
    red: "#d97a6a",
  },
  blue: {
    bg: "#1a3d6b",
    text: "#e6f0ff",
    muted: "#9cb8dc",
    green: "#4ec9a0",
    red: "#ff7b7b",
  },
  black: {
    bg: "#2a2238",
    text: "#e8e4f0",
    muted: "#9a92a8",
    green: "#7a9e6e",
    red: "#c96b8a",
  },
  red: {
    bg: "#4a2828",
    text: "#fce8e6",
    muted: "#c49a94",
    green: "#5cb88a",
    red: "#ff9080",
  },
  green: {
    bg: "#1f3d30",
    text: "#e8f4ec",
    muted: "#94b8a4",
    green: "#5ee0a0",
    red: "#e07070",
  },
  colorless: {
    bg: "#242424",
    text: "#ececec",
    muted: "#a0a0a0",
    green: "#8ab88a",
    red: "#c88888",
  },
};

/** @type {Record<string, BgCanvasAnchor>} */
const BG_CANVAS_LIGHT = {
  default: {
    bg: "#e4e8ef",
    text: "#12161e",
    muted: "#5c6678",
    green: "#2a9e5c",
    red: "#c94040",
  },
  white: {
    bg: "#ebe4d6",
    text: "#1e1a14",
    muted: "#6b5f50",
    green: "#3d8f5c",
    red: "#c45a48",
  },
  blue: {
    bg: "#c8daf0",
    text: "#0a1424",
    muted: "#4a6080",
    green: "#2a8f70",
    red: "#d04040",
  },
  black: {
    bg: "#d8d2e6",
    text: "#141018",
    muted: "#5c5468",
    green: "#4a7a42",
    red: "#a84868",
  },
  red: {
    bg: "#ecd0cc",
    text: "#1a100e",
    muted: "#6b5048",
    green: "#3a8a62",
    red: "#d85040",
  },
  green: {
    bg: "#c8ddd0",
    text: "#0e1812",
    muted: "#4a6054",
    green: "#2a9e62",
    red: "#c05050",
  },
  colorless: {
    bg: "#dcdcdc",
    text: "#141414",
    muted: "#585858",
    green: "#5a8a5a",
    red: "#a85858",
  },
};

const DARK_BG_SATURATION = 1.06;

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

function adjustLightness(hex, delta) {
  const { r, g, b } = parseHex(hex);
  const { h, s, l } = rgbToHsl(r, g, b);
  const nextL = Math.max(0, Math.min(1, l + delta));
  const next = hslToRgb(h, s, nextL);
  return rgbToHex(next.r, next.g, next.b);
}

/** @param {BgCanvasAnchor} anchor @param {'dark'|'light'} mode */
function buildBgPalette(anchor, mode) {
  const isLight = mode === "light";
  const bg = isLight ? anchor.bg : saturateHex(anchor.bg, DARK_BG_SATURATION);
  const surfaceLift = isLight ? 0.045 : 0.06;
  const surface2Lift = isLight ? -0.035 : 0.11;
  const borderLift = isLight ? -0.12 : 0.17;
  return {
    bg,
    surface: adjustLightness(bg, surfaceLift),
    surface2: adjustLightness(bg, surface2Lift),
    border: adjustLightness(bg, borderLift),
    text: anchor.text,
    muted: anchor.muted,
    green: anchor.green,
    red: anchor.red,
  };
}

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
  const themeMode = normalizeThemeMode(mode);
  const anchor = themeMode === "light" ? BG_CANVAS_LIGHT[id] : BG_CANVAS_DARK[id];
  return buildBgPalette(anchor, themeMode);
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
