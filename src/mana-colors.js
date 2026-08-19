/** WUBRGC fill colors from 30-cent-edh / 30ccstat pip styles. */
export const MANA_HEX = {
  W: "#fffbd5",
  U: "#aae0fa",
  B: "#2a2a35",
  R: "#f9aa8f",
  G: "#9bd3ae",
  C: "#ccc2c0",
};

function hexToRgb(hex) {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function rgbToHex(r, g, b) {
  const clamp = (n) => Math.max(0, Math.min(255, Math.round(n)));
  return `#${[r, g, b].map((n) => clamp(n).toString(16).padStart(2, "0")).join("")}`;
}

/** Equal-weight RGB blend of mana colors (e.g. R+W+G → mixed tan-green). */
export function mixManaColors(keys) {
  const filtered = keys.filter((k) => MANA_HEX[k]);
  if (!filtered.length) return MANA_HEX.C;
  if (filtered.length === 1) return MANA_HEX[filtered[0]];

  let r = 0;
  let g = 0;
  let b = 0;
  for (const key of filtered) {
    const [cr, cg, cb] = hexToRgb(MANA_HEX[key]);
    r += cr;
    g += cg;
    b += cb;
  }
  const n = filtered.length;
  return rgbToHex(r / n, g / n, b / n);
}
