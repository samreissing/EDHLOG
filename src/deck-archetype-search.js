function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** @param {string} value */
export function parseArchetypeSegments(value) {
  const text = String(value || "");
  const parts = text.split(",").map((part) => part.trim());
  if (/,\s*$/.test(text)) {
    return { committed: parts.filter(Boolean), query: "" };
  }
  if (!parts.length) return { committed: [], query: "" };
  const query = parts[parts.length - 1] || "";
  const committed = parts.slice(0, -1).filter(Boolean);
  return { committed, query };
}

/** @param {string[] | undefined} values */
export function formatArchetypesForInput(values) {
  const list = (values || []).filter(Boolean);
  if (!list.length) return "";
  return `${list.join(", ")}, `;
}

/** @param {string} value */
export function parseArchetypesFromInput(value) {
  return String(value || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export const formatTribesForInput = formatArchetypesForInput;
export const parseTribesFromInput = parseArchetypesFromInput;

/** @param {string[] | undefined} archetypes */
export function deckHasTribalArchetype(archetypes) {
  return (archetypes || []).some((value) => {
    const key = String(value || "").trim().toLowerCase();
    return key === "tribal" || key === "kindred";
  });
}

/**
 * @param {import('./store.js').Deck[]} decks
 * @param {(deck: import('./store.js').Deck) => string[] | undefined} getDeckValues
 * @param {{ includeRetired?: boolean }} [options]
 */
function collectTagHistory(decks, getDeckValues, { includeRetired = false } = {}) {
  /** @type {Map<string, string>} */
  const map = new Map();
  for (const deck of decks) {
    if (!includeRetired && deck.retired) continue;
    for (const value of getDeckValues(deck) || []) {
      const trimmed = String(value || "").trim();
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      if (!map.has(key)) map.set(key, trimmed);
    }
  }
  return [...map.values()].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

/**
 * @param {import('./store.js').Deck[]} decks
 * @param {{ includeRetired?: boolean }} [options]
 */
export function collectArchetypeHistory(decks, { includeRetired = false } = {}) {
  return collectTagHistory(decks, (deck) => deck.archetypes, { includeRetired });
}

/**
 * @param {import('./store.js').Deck[]} decks
 * @param {{ includeRetired?: boolean }} [options]
 */
export function collectTribeHistory(decks, { includeRetired = false } = {}) {
  return collectTagHistory(decks, (deck) => deck.tribes, { includeRetired });
}

/** @param {string} query @param {string[]} allValues @param {string[]} committed */
function searchTagHistory(query, allValues, committed) {
  const committedKeys = new Set(committed.map((value) => value.toLowerCase()));
  const pool = allValues.filter((name) => !committedKeys.has(name.toLowerCase()));
  const q = query.trim().toLowerCase();

  if (!q) return pool;

  return pool.filter((name) => name.toLowerCase().startsWith(q));
}

export function searchArchetypeHistory(query, allArchetypes, committed) {
  return searchTagHistory(query, allArchetypes, committed);
}

/** @param {HTMLInputElement | HTMLTextAreaElement} input @param {string} selected */
export function appendArchetypeSelection(input, selected) {
  const value = input.value;
  const lastComma = value.lastIndexOf(",");
  const prefix = lastComma >= 0 ? `${value.slice(0, lastComma + 1)} ` : "";
  input.value = `${prefix}${selected}, `;
  resizeArchetypeInput(input);
  input.focus();
  input.setSelectionRange(input.value.length, input.value.length);
}

/** @param {HTMLInputElement | HTMLTextAreaElement} input */
export function resizeArchetypeInput(input) {
  input.style.height = "auto";
  input.style.height = `${Math.max(input.scrollHeight, 36)}px`;
}

/**
 * @param {HTMLFormElement | null} form
 * @param {{
 *   inputSelector: string,
 *   listSelector: string,
 *   wrapSelector?: string,
 *   getAllValues: () => string[],
 *   onInput?: (input: HTMLTextAreaElement) => void,
 *   onSelect?: (input: HTMLTextAreaElement) => void,
 * }} config
 */
function bindCommaSeparatedTagAutocomplete(form, config) {
  if (!form) return;

  const input = form.querySelector(config.inputSelector);
  const list = form.querySelector(config.listSelector);
  if (!(input instanceof HTMLTextAreaElement) || !list) return;

  let activeIndex = -1;
  let suppressFocusOutUntil = 0;
  let clickOpensList = true;

  const hideList = () => {
    list.hidden = true;
    list.innerHTML = "";
    activeIndex = -1;
  };

  const renderList = () => {
    const { committed, query } = parseArchetypeSegments(input.value);
    const results = searchTagHistory(query, config.getAllValues(), committed);
    activeIndex = -1;

    if (!results.length) {
      hideList();
      return;
    }

    list.innerHTML = results
      .map((name) => `<li role="option" data-value="${escapeHtml(name)}">${escapeHtml(name)}</li>`)
      .join("");
    list.hidden = false;
  };

  const openList = () => {
    renderList();
  };

  const selectValue = (value) => {
    appendArchetypeSelection(input, value);
    suppressFocusOutUntil = Date.now() + 200;
    config.onSelect?.(input);
    openList();
  };

  const setActiveOption = (index) => {
    const items = [...list.querySelectorAll('[role="option"]')];
    if (!items.length) return;
    activeIndex = Math.max(0, Math.min(index, items.length - 1));
    items.forEach((item, i) => item.classList.toggle("active", i === activeIndex));
    items[activeIndex].scrollIntoView({ block: "nearest" });
  };

  resizeArchetypeInput(input);

  const wrap = config.wrapSelector
    ? form.querySelector(config.wrapSelector)
    : input.closest(".opponent-input-wrap");
  const dismissRoot = form.closest(".modal-content") || form;

  const onDismissPointerDown = (e) => {
    if (!document.body.contains(input)) {
      dismissRoot.removeEventListener("mousedown", onDismissPointerDown, true);
      return;
    }
    if (wrap?.contains(e.target)) return;
    if (list.hidden) return;
    hideList();
    clickOpensList = false;
  };
  dismissRoot.addEventListener("mousedown", onDismissPointerDown, true);

  input.addEventListener("mousedown", () => {
    clickOpensList = true;
  });

  input.addEventListener("click", () => {
    if (!clickOpensList) {
      clickOpensList = true;
      return;
    }
    openList();
  });

  input.addEventListener("input", () => {
    config.onInput?.(input);
    openList();
  });

  input.addEventListener("focusout", () => {
    setTimeout(() => {
      if (Date.now() < suppressFocusOutUntil) return;
      if (wrap && !wrap.contains(document.activeElement)) hideList();
    }, 150);
  });

  input.addEventListener("keydown", (e) => {
    if (list.hidden) return;
    const items = [...list.querySelectorAll('[role="option"]')];
    if (!items.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveOption(activeIndex + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveOption(activeIndex <= 0 ? 0 : activeIndex - 1);
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      selectValue(items[activeIndex].dataset.value || "");
    } else if (e.key === "Escape") {
      hideList();
      clickOpensList = false;
    }
  });

  list.addEventListener("mousedown", (e) => {
    const option = e.target.closest('[role="option"]');
    if (!option) return;
    e.preventDefault();
    selectValue(option.dataset.value || "");
  });
}

/** @param {HTMLFormElement | null} form */
export function syncDeckTribeFieldVisibility(form) {
  if (!form) return;
  const block = form.querySelector(".deck-tribe-field");
  const input = form.querySelector(".deck-archetype-input");
  if (!(block instanceof HTMLElement) || !(input instanceof HTMLTextAreaElement)) return;

  const show = deckHasTribalArchetype(parseArchetypesFromInput(input.value));
  block.hidden = !show;

  if (show) {
    const tribeInput = form.querySelector(".deck-tribe-input");
    if (tribeInput instanceof HTMLTextAreaElement) resizeArchetypeInput(tribeInput);
  }
}

/**
 * @param {HTMLFormElement | null} form
 * @param {import('./store.js').Deck[]} decks
 * @param {{ includeRetired?: boolean }} [options]
 */
export function bindArchetypeAutocomplete(form, decks, options = {}) {
  bindCommaSeparatedTagAutocomplete(form, {
    inputSelector: ".deck-archetype-input",
    listSelector: ".deck-archetype-suggestions",
    wrapSelector: ".deck-archetype-wrap",
    getAllValues: () => collectArchetypeHistory(decks, options),
    onInput: (input) => {
      resizeArchetypeInput(input);
      syncDeckTribeFieldVisibility(form);
    },
    onSelect: () => syncDeckTribeFieldVisibility(form),
  });
  syncDeckTribeFieldVisibility(form);
}

/**
 * @param {HTMLFormElement | null} form
 * @param {import('./store.js').Deck[]} decks
 * @param {{ includeRetired?: boolean }} [options]
 */
export function bindTribeAutocomplete(form, decks, options = {}) {
  bindCommaSeparatedTagAutocomplete(form, {
    inputSelector: ".deck-tribe-input",
    listSelector: ".deck-tribe-suggestions",
    wrapSelector: ".deck-tribe-wrap",
    getAllValues: () => collectTribeHistory(decks, options),
    onInput: (input) => resizeArchetypeInput(input),
  });
}

/** @param {HTMLFormElement | null} form @param {import('./store.js').Deck[]} decks */
export function bindDeckTagAutocompletes(form, decks) {
  bindArchetypeAutocomplete(form, decks);
  bindTribeAutocomplete(form, decks);
}
