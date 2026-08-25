/** Broken rainbow order for multi-select chart lines: R, V, O, I, G, B, Y */
export const RAINBOW_SELECTION = [
  "#e05c5c",
  "#9b7ad4",
  "#e08a4a",
  "#6366f1",
  "#3dba7a",
  "#5b9fd4",
  "#c9a227",
];

/** @returns {{ available: string[], assigned: Map<string, string> }} */
export function createColorPool() {
  return { available: [...RAINBOW_SELECTION], assigned: new Map() };
}

/** @param {{ available: string[], assigned: Map<string, string> }} pool @param {string} id */
export function togglePoolSelection(pool, id) {
  if (pool.assigned.has(id)) {
    const color = pool.assigned.get(id);
    pool.assigned.delete(id);
    pool.available.unshift(color);
    return null;
  }
  const color =
    pool.available.shift() ?? RAINBOW_SELECTION[pool.assigned.size % RAINBOW_SELECTION.length];
  pool.assigned.set(id, color);
  return color;
}

/** @param {{ assigned: Map<string, string> }} pool @param {string} id */
export function getPoolColor(pool, id) {
  return pool.assigned.get(id) ?? null;
}

/** @param {{ available: string[], assigned: Map<string, string> }} pool */
export function resetColorPool(pool) {
  pool.available = [...RAINBOW_SELECTION];
  pool.assigned.clear();
}
