import { compareGamesChronologically, gameSortKey } from "./dates.js";

/** @typedef {{ name: string, count: number, lastDate: string }} NameEntry */

export const MY_PLAYER_NAME = "Brass";

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

/**
 * Player -> commanders they have played, built from saved games.
 * @param {import('./store.js').Game[]} games
 * @returns {Map<string, Map<string, NameEntry>>}
 */
export function collectPlayerCommanderLinks(games) {
  /** @type {Map<string, Map<string, NameEntry>>} */
  const byPlayer = new Map();

  function link(player, commander, date) {
    const playerName = String(player || "").trim();
    const commanderName = String(commander || "").trim();
    if (!playerName || !commanderName) return;

    const playerKey = playerName.toLowerCase();
    if (!byPlayer.has(playerKey)) byPlayer.set(playerKey, new Map());

    /** @type {Map<string, NameEntry>} */
    const commanders = byPlayer.get(playerKey);
    const commanderKey = commanderName.toLowerCase();
    const existing = commanders.get(commanderKey);
    if (!existing) {
      commanders.set(commanderKey, { name: commanderName, count: 1, lastDate: date });
      return;
    }

    existing.count += 1;
    if (date >= existing.lastDate) {
      existing.lastDate = date;
      existing.name = commanderName;
    }
  }

  for (const game of games) {
    if (game.mySeat && game.deck) {
      link(MY_PLAYER_NAME, game.myCommander || game.deck, gameSortKey(game));
    }
    for (const opp of game.opponents || []) {
      link(opp.player, opp.name, gameSortKey(game));
    }
  }

  return byPlayer;
}

/** @param {import('./store.js').Game[]} games */
export function collectPlayerHistory(games) {
  const links = collectPlayerCommanderLinks(games);
  /** @type {Map<string, NameEntry>} */
  const map = new Map();

  for (const game of games) {
    if (game.mySeat && game.deck) {
      trackName(map, MY_PLAYER_NAME, gameSortKey(game));
    }
    for (const opp of game.opponents || []) {
      if (opp.player && opp.name) {
        trackName(map, opp.player, gameSortKey(game));
      }
    }
  }

  return [...map.values()].filter(
    (entry) =>
      links.has(entry.name.toLowerCase()) &&
      entry.name.toLowerCase() !== MY_PLAYER_NAME.toLowerCase()
  );
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

function alphaSort(names) {
  return [...names].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

/** @param {import('./store.js').Game[]} games @param {number} limit */
function collectRecentPlayers(games, limit = 8) {
  const sorted = [...games].sort((a, b) => compareGamesChronologically(b, a));
  const seen = new Set();
  const results = [];

  for (const game of sorted) {
    const opponents = [...(game.opponents || [])].sort((a, b) => a.seat - b.seat);
    for (const opp of opponents) {
      const name = String(opp.player || "").trim();
      if (!name || !opp.name) continue;
      const key = name.toLowerCase();
      if (key === MY_PLAYER_NAME.toLowerCase() || seen.has(key)) continue;
      seen.add(key);
      results.push(name);
      if (results.length >= limit) return results;
    }
  }

  return results;
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

/**
 * @param {string} query
 * @param {import('./store.js').Game[]} games
 * @param {NameEntry[]} entries
 * @param {number} limit
 */
export function searchPlayerHistory(query, games, entries, limit = 8) {
  const q = query.trim();
  const pool = entries.filter(
    (entry) => entry.name.toLowerCase() !== MY_PLAYER_NAME.toLowerCase()
  );

  if (!q) {
    const recent = collectRecentPlayers(games, limit);
    if (recent.length >= limit) return recent;

    const seen = new Set(recent.map((name) => name.toLowerCase()));
    const backfill = [...pool]
      .filter((entry) => !seen.has(entry.name.toLowerCase()))
      .sort((a, b) => b.lastDate.localeCompare(a.lastDate) || b.count - a.count)
      .map((entry) => entry.name);

    return [...recent, ...backfill].slice(0, limit);
  }

  return searchNameHistory(q, pool, limit);
}

/**
 * @param {string} query
 * @param {NameEntry[]} allCommanders
 * @param {NameEntry[]} playerCommanders
 * @param {number} limit
 */
export function searchCommanderHistory(query, allCommanders, playerCommanders, limit = 8) {
  if (!playerCommanders.length) {
    return searchNameHistory(query, allCommanders, limit);
  }

  const q = query.trim();
  const playerKeys = new Set(playerCommanders.map((entry) => entry.name.toLowerCase()));
  const playerNames = alphaSort(playerCommanders.map((entry) => entry.name));
  const otherNames = alphaSort(
    allCommanders
      .filter((entry) => !playerKeys.has(entry.name.toLowerCase()))
      .map((entry) => entry.name)
  );

  const matches = (name) => !q || scoreMatch(name, q) > 0;
  const ranked = [...playerNames.filter(matches), ...otherNames.filter(matches)];

  return ranked.slice(0, limit);
}

/** @param {HTMLFormElement | null} form @param {import('./store.js').Game[]} games */
export function bindPodAutocomplete(form, games) {
  if (!form) return;

  const commanders = collectCommanderHistory(games);
  const players = collectPlayerHistory(games);
  const playerCommanderLinks = collectPlayerCommanderLinks(games);
  /** @type {WeakMap<HTMLInputElement, number>} */
  const activeIndexByInput = new WeakMap();

  function playerNameForCommanderInput(input) {
    const row = input.closest(".pod-seat-row");
    const playerInput = row?.querySelector(".player-input");
    return playerInput instanceof HTMLInputElement ? playerInput.value.trim() : "";
  }

  function commandersForPlayer(playerName) {
    const linked = playerCommanderLinks.get(playerName.toLowerCase());
    return linked ? [...linked.values()] : [];
  }

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

  function searchResults(input) {
    if (input.classList.contains("opponent-input")) {
      const playerName = playerNameForCommanderInput(input);
      return searchCommanderHistory(
        input.value,
        commanders,
        commandersForPlayer(playerName)
      );
    }
    return searchPlayerHistory(input.value, games, entriesFor(input));
  }

  function renderList(input) {
    const list = listFor(input);
    if (!list) return;

    const results = searchResults(input);
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

  function refreshCommanderListForRow(playerInput) {
    const row = playerInput.closest(".pod-seat-row");
    const commanderInput = row?.querySelector(".opponent-input");
    if (!(commanderInput instanceof HTMLInputElement)) return;
    const list = listFor(commanderInput);
    if (commanderInput === document.activeElement || (list && !list.hidden)) {
      renderList(commanderInput);
    }
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
    if (!(input instanceof HTMLInputElement) || !isAutocompleteInput(input)) return;

    if (input.classList.contains("player-input")) {
      refreshCommanderListForRow(input);
    }

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
      if (input.classList.contains("player-input")) {
        refreshCommanderListForRow(input);
      }
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
      if (input.classList.contains("player-input")) {
        refreshCommanderListForRow(input);
      }
    }
  });
}

/** @deprecated Use bindPodAutocomplete */
export function bindOpponentAutocomplete(form, games) {
  bindPodAutocomplete(form, games);
}
