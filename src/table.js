/**
 * @typedef {{ col: string, dir: 'asc' | 'desc' }} SortState
 */

export function sortIndicator(state, col) {
  if (!state || state.col !== col) return "";
  return state.dir === "asc" ? " ↑" : " ↓";
}

export function sortHeader(tableId, col, label, state, extraClass = "") {
  const active = state?.col === col ? " sorted" : "";
  return `<th class="sortable${active} ${extraClass}" data-sort-table="${tableId}" data-sort-col="${col}">${label}${sortIndicator(state, col)}</th>`;
}

export function toggleSort(state, col) {
  if (state?.col === col) {
    return { col, dir: state.dir === "asc" ? "desc" : "asc" };
  }
  return { col, dir: "desc" };
}

export function applySort(rows, state, getters, tieBreakers = {}) {
  if (!state?.col || !getters[state.col]) return rows;
  const get = getters[state.col];
  return [...rows].sort((a, b) => {
    const primary = compareValues(get(a), get(b), state.dir);
    if (primary !== 0) return primary;
    const tieKey = tieBreakers[state.col];
    if (tieKey && getters[tieKey]) {
      return compareValues(getters[tieKey](a), getters[tieKey](b), state.dir);
    }
    return 0;
  });
}

export function compareValues(a, b, dir) {
  const mul = dir === "asc" ? 1 : -1;
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === "string" && typeof b === "string") return mul * a.localeCompare(b);
  return mul * (a - b);
}
