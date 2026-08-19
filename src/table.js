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

export function applySort(rows, state, getters) {
  if (!state?.col || !getters[state.col]) return rows;
  const get = getters[state.col];
  const dir = state.dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = get(a);
    const bv = get(b);
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === "string" && typeof bv === "string") {
      return dir * av.localeCompare(bv);
    }
    return dir * (av - bv);
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
