/** @typedef {{ name: string, count: number, lastDate: string }} NameEntry */

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** @param {Map<string, NameEntry>} map @param {string} name @param {string} date */
function trackName(map, name, date) {
  const trimmed = String(name || "").trim();
  if (!trimmed) return;

  const key = trimmed.toLowerCase();
  const existing = map.get(key);
  if (!existing) {
    map.set(key, { name: trimmed, count: 1, lastDate: date });
    return;
  }

  existing.count += 1;
  if (date >= existing.lastDate) {
    existing.lastDate = date;
    existing.name = trimmed;
  }
}

/** @param {import('./store.js').Game[]} games */
export function collectCommanderHistory(games) {
  /** @type {Map<string, NameEntry>} */
  const map = new Map();

  for (const game of games) {
    for (const opp of game.opponents || []) {
      trackName(map, opp.name, game.date);
    }
  }

  return [...map.values()];
}

/** @param {import('./store.js').Game[]} games */
export function collectPlayerHistory(games) {
  /** @type {Map<string, NameEntry>} */
  const map = new Map();

  for (const game of games) {
    trackName(map, game.myPlayer, game.date);
    for (const opp of game.opponents || []) {
      trackName(map, opp.player, game.date);
    }
  }

  return [...map.values()];
}

/** @param {string} name @param {string} query */
function scoreMatch(name, query) {
  const n = name.toLowerCase();
  const q = query.toLowerCase().trim();
  if (!q) return 0;

  if (n === q) return 1000;
  if (n.startsWith(q)) return 900 - q.length * 0.1;

  const idx = n.indexOf(q);
  if (idx >= 0) return 700 - idx;

  const words = q.split(/\s+/).filter(Boolean);
  if (words.length > 1 && words.every((w) => n.includes(w))) {
    return 500 - words.length;
  }

  return 0;
}

/** @param {string} query @param {NameEntry[]} entries @param {number} limit */
export function searchNameHistory(query, entries, limit = 8) {
  const q = query.trim();

  if (!q) {
    return [...entries]
      .sort((a, b) => b.lastDate.localeCompare(a.lastDate) || b.count - a.count)
      .slice(0, limit)
      .map((entry) => entry.name);
  }

  return entries
    .map((entry) => ({ ...entry, score: scoreMatch(entry.name, q) }))
    .filter((entry) => entry.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score || b.count - a.count || b.lastDate.localeCompare(a.lastDate)
    )
    .slice(0, limit)
    .map((entry) => entry.name);
}

/** @param {HTMLFormElement | null} form @param {import('./store.js').Game[]} games */
export function bindPodAutocomplete(form, games) {
  if (!form) return;

  const commanders = collectCommanderHistory(games);
  const players = collectPlayerHistory(games);
  /** @type {WeakMap<HTMLInputElement, number>} */
  const activeIndexByInput = new WeakMap();

  function entriesFor(input) {
    if (input.classList.contains("opponent-input")) return commanders;
    if (input.classList.contains("player-input")) return players;
    return [];
  }

  function isAutocompleteInput(input) {
    return (
      input instanceof HTMLInputElement &&
      (input.classList.contains("opponent-input") || input.classList.contains("player-input"))
    );
  }

  function wrapFor(input) {
    return input.closest(".opponent-input-wrap");
  }

  function listFor(input) {
    return wrapFor(input)?.querySelector(".opponent-suggestions");
  }

  function hideList(input) {
    const list = listFor(input);
    if (list) list.hidden = true;
  }

  function selectValue(input, value) {
    input.value = value;
    hideList(input);
    input.focus();
  }

  function renderList(input) {
    const list = listFor(input);
    if (!list) return;

    const results = searchNameHistory(input.value, entriesFor(input));
    activeIndexByInput.set(input, -1);

    if (!results.length) {
      list.hidden = true;
      list.innerHTML = "";
      return;
    }

    list.innerHTML = results
      .map((name) => `<li role="option" data-value="${escapeHtml(name)}">${escapeHtml(name)}</li>`)
      .join("");
    list.hidden = false;
  }

  function setActiveOption(input, index) {
    const list = listFor(input);
    if (!list) return;

    const items = [...list.querySelectorAll('[role="option"]')];
    if (!items.length) return;

    const clamped = Math.max(0, Math.min(index, items.length - 1));
    activeIndexByInput.set(input, clamped);
    items.forEach((item, i) => item.classList.toggle("active", i === clamped));
    items[clamped].scrollIntoView({ block: "nearest" });
  }

  form.addEventListener("input", (e) => {
    const input = e.target;
    if (!isAutocompleteInput(input)) return;
    renderList(input);
  });

  form.addEventListener("focusin", (e) => {
    const input = e.target;
    if (!isAutocompleteInput(input)) return;
    renderList(input);
  });

  form.addEventListener("focusout", (e) => {
    const input = e.target;
    if (!isAutocompleteInput(input)) return;
    setTimeout(() => {
      const wrap = wrapFor(input);
      if (wrap && !wrap.contains(document.activeElement)) hideList(input);
    }, 150);
  });

  form.addEventListener("keydown", (e) => {
    const input = e.target;
    if (!isAutocompleteInput(input)) return;

    const list = listFor(input);
    if (!list || list.hidden) return;

    const items = [...list.querySelectorAll('[role="option"]')];
    if (!items.length) return;

    const activeIndex = activeIndexByInput.get(input) ?? -1;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveOption(input, activeIndex + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveOption(input, activeIndex <= 0 ? 0 : activeIndex - 1);
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      selectValue(input, items[activeIndex].dataset.value || "");
    } else if (e.key === "Escape") {
      hideList(input);
    }
  });

  form.addEventListener("mousedown", (e) => {
    const option = e.target.closest('[role="option"]');
    if (!option) return;

    e.preventDefault();
    const wrap = option.closest(".opponent-input-wrap");
    const input = wrap?.querySelector(".opponent-input, .player-input");
    if (input instanceof HTMLInputElement) {
      selectValue(input, option.dataset.value || "");
    }
  });
}

/** @deprecated Use bindPodAutocomplete */
export function bindOpponentAutocomplete(form, games) {
  bindPodAutocomplete(form, games);
}
