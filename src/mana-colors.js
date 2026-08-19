/** WUBRGC fill colors from 30-cent-edh / 30ccstat pip styles. */
export const MANA_HEX = {
  W: "#fffbd5",
  U: "#aae0fa",
  B: "#2a2a35",
  R: "#f9aa8f",
  G: "#9bd3ae",
  C: "#ccc2c0",
};

/** Canonical hues for blending multi-color identities (degrees). */
const MANA_HUE = { W: 52, U: 205, B: 260, R: 12, G: 125 };
const MANA_SAT = { W: 82, U: 78, B: 28, R: 82, G: 42 };
const MANA_LIG = { W: 88, U: 78, B: 18, R: 76, G: 69 };

function hslToHex(h, s, l) {
  const sat = s / 100;
  const light = l / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = light - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const toHex = (n) => Math.round((n + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Blend mana colors into one (e.g. R+U → purple). */
export function mixManaColors(keys) {
  const filtered = keys.filter((k) => MANA_HEX[k]);
  if (!filtered.length) return MANA_HEX.C;
  if (filtered.length === 1) return MANA_HEX[filtered[0]];

  let sinSum = 0;
  let cosSum = 0;
  let satSum = 0;
  let ligSum = 0;
  for (const key of filtered) {
    const rad = (MANA_HUE[key] * Math.PI) / 180;
    sinSum += Math.sin(rad);
    cosSum += Math.cos(rad);
    satSum += MANA_SAT[key];
    ligSum += MANA_LIG[key];
  }
  const n = filtered.length;
  let hue = (Math.atan2(sinSum, cosSum) * 180) / Math.PI;
  if (hue < 0) hue += 360;
  return hslToHex(hue, satSum / n, ligSum / n);
}
