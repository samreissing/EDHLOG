/** @typedef {{ name: string, count: number, lastDate: string }} OpponentEntry */

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** @param {import('./store.js').Game[]} games */
export function collectOpponentHistory(games) {
  /** @type {Map<string, OpponentEntry>} */
  const map = new Map();

  for (const game of games) {
    for (const opp of game.opponents || []) {
      const name = String(opp.name || "").trim();
      if (!name) continue;

      const key = name.toLowerCase();
      const existing = map.get(key);
      if (!existing) {
        map.set(key, { name, count: 1, lastDate: game.date });
        continue;
      }

      existing.count += 1;
      if (game.date >= existing.lastDate) {
        existing.lastDate = game.date;
        existing.name = name;
      }
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

/** @param {string} query @param {OpponentEntry[]} opponents @param {number} limit */
export function searchOpponents(query, opponents, limit = 8) {
  const q = query.trim();

  if (!q) {
    return [...opponents]
      .sort((a, b) => b.lastDate.localeCompare(a.lastDate) || b.count - a.count)
      .slice(0, limit)
      .map((o) => o.name);
  }

  return opponents
    .map((o) => ({ ...o, score: scoreMatch(o.name, q) }))
    .filter((o) => o.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score || b.count - a.count || b.lastDate.localeCompare(a.lastDate)
    )
    .slice(0, limit)
    .map((o) => o.name);
}

/** @param {HTMLFormElement | null} form @param {import('./store.js').Game[]} games */
export function bindOpponentAutocomplete(form, games) {
  if (!form) return;

  const opponents = collectOpponentHistory(games);
  /** @type {WeakMap<HTMLInputElement, number>} */
  const activeIndexByInput = new WeakMap();

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

    const results = searchOpponents(input.value, opponents);
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
    if (!(input instanceof HTMLInputElement) || !input.classList.contains("opponent-input")) return;
    renderList(input);
  });

  form.addEventListener("focusin", (e) => {
    const input = e.target;
    if (!(input instanceof HTMLInputElement) || !input.classList.contains("opponent-input")) return;
    renderList(input);
  });

  form.addEventListener("focusout", (e) => {
    const input = e.target;
    if (!(input instanceof HTMLInputElement) || !input.classList.contains("opponent-input")) return;
    setTimeout(() => {
      const wrap = wrapFor(input);
      if (wrap && !wrap.contains(document.activeElement)) hideList(input);
    }, 150);
  });

  form.addEventListener("keydown", (e) => {
    const input = e.target;
    if (!(input instanceof HTMLInputElement) || !input.classList.contains("opponent-input")) return;

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
    const input = option.closest(".opponent-input-wrap")?.querySelector(".opponent-input");
    if (input instanceof HTMLInputElement) {
      selectValue(input, option.dataset.value || "");
    }
  });
}
