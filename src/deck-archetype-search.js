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

/** @param {string[] | undefined} archetypes */
export function formatArchetypesForInput(archetypes) {
  return (archetypes || []).filter(Boolean).join(", ");
}

/** @param {string} value */
export function parseArchetypesFromInput(value) {
  return String(value || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

/** @param {import('./store.js').Deck[]} decks */
export function collectArchetypeHistory(decks) {
  /** @type {Map<string, string>} */
  const map = new Map();
  for (const deck of decks) {
    for (const archetype of deck.archetypes || []) {
      const trimmed = String(archetype || "").trim();
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      if (!map.has(key)) map.set(key, trimmed);
    }
  }
  return [...map.values()].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

/** @param {string} query @param {string[]} allArchetypes @param {string[]} committed */
export function searchArchetypeHistory(query, allArchetypes, committed, limit = 8) {
  const committedKeys = new Set(committed.map((value) => value.toLowerCase()));
  const pool = allArchetypes.filter((name) => !committedKeys.has(name.toLowerCase()));
  const q = query.trim().toLowerCase();

  if (!q) {
    return pool.slice(0, limit);
  }

  return pool
    .filter((name) => name.toLowerCase().startsWith(q))
    .slice(0, limit);
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

/** @param {HTMLFormElement | null} form @param {import('./store.js').Deck[]} decks */
export function bindArchetypeAutocomplete(form, decks) {
  if (!form) return;

  const input = form.querySelector(".deck-archetype-input");
  const list = form.querySelector(".deck-archetype-suggestions");
  if (!(input instanceof HTMLTextAreaElement) || !list) return;

  let activeIndex = -1;
  let suppressFocusOutUntil = 0;
  const allArchetypes = () => collectArchetypeHistory(decks);

  const hideList = () => {
    list.hidden = true;
    list.innerHTML = "";
    activeIndex = -1;
  };

  const renderList = () => {
    const { committed, query } = parseArchetypeSegments(input.value);
    const results = searchArchetypeHistory(query, allArchetypes(), committed);
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

  const selectValue = (value) => {
    appendArchetypeSelection(input, value);
    suppressFocusOutUntil = Date.now() + 200;
    renderList();
  };

  const setActiveOption = (index) => {
    const items = [...list.querySelectorAll('[role="option"]')];
    if (!items.length) return;
    activeIndex = Math.max(0, Math.min(index, items.length - 1));
    items.forEach((item, i) => item.classList.toggle("active", i === activeIndex));
    items[activeIndex].scrollIntoView({ block: "nearest" });
  };

  resizeArchetypeInput(input);

  input.addEventListener("input", () => {
    resizeArchetypeInput(input);
    renderList();
  });

  input.addEventListener("focus", renderList);

  input.addEventListener("focusout", () => {
    setTimeout(() => {
      if (Date.now() < suppressFocusOutUntil) return;
      const wrap = input.closest(".deck-archetype-wrap");
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
    }
  });

  list.addEventListener("mousedown", (e) => {
    const option = e.target.closest('[role="option"]');
    if (!option) return;
    e.preventDefault();
    selectValue(option.dataset.value || "");
  });
}
