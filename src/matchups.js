import { MY_PLAYER_NAME } from "./opponent-search.js";
import { winRate } from "./stats.js";
import { getCommanderMatchupIdentities } from "./commander-names.js";
import { resolveCommanderColors } from "./commander-colors.js";
import { colorKeyLabel, colorKeysForIdentity, rowColorsFromKey } from "./color-stats.js";
import { deckMapByKey, resolveMyCommander, findDeck } from "./deck-identity.js";
import {
  archetypeRowKeysForTags,
  MATCHUP_COMBINED_CROSS_CAP,
} from "./archetype-stats.js";
import {
  findOpponentDeck,
  findOpponentDeckByPair,
  findOpponentDeckByCommander,
  opponentEntryMatchesDeck,
} from "./opponent-decks.js";

/** Commander pod baseline (30CCSTAT). */
export const MATCHUP_BASELINE = 0.25;
export const MATCHUP_PRIOR_GAMES = 25;
export const MATCHUP_PRIOR_WINS = MATCHUP_PRIOR_GAMES * MATCHUP_BASELINE;

export const MATCHUP_TABS = [
  { id: "players", label: "Player Matchups" },
  { id: "decks", label: "Deck Matchups" },
  { id: "colors", label: "Color Matchups" },
  { id: "archetypes", label: "Archetype Matchups" },
];

export const POD_MATCHUP_TABS = MATCHUP_TABS;

export const POD_SLOT_LETTERS = ["x", "y", "z"];

/** @param {number} mySeat */
export function podFormSlots(mySeat) {
  return mySeat >= 1 && mySeat <= 4 ? [1, 2, 3, 4] : [1, 2, 3];
}

/** @param {number} mySeat */
export function nonMySeatNumbers(mySeat) {
  return [1, 2, 3, 4].filter((seat) => seat !== mySeat);
}

/** @param {import('./store.js').Game | null | undefined} game */
export function gameHasMySeat(game) {
  const mySeat = Number(game?.mySeat);
  return Number.isInteger(mySeat) && mySeat >= 1 && mySeat <= 4;
}

/** @param {import('./store.js').Game} game @param {number} slot */
export function opponentEntryForPodSlot(game, slot) {
  if (!gameHasMySeat(game)) {
    return game.opponents?.[slot - 1] || null;
  }

  const mySeat = Number(game.mySeat);
  if (slot === mySeat) return null;

  const bySeat = (game.opponents || []).find((opp) => Number(opp.seat) === slot);
  if (bySeat) return bySeat;

  const unseated = (game.opponents || []).filter((opp) => {
    const seat = Number(opp.seat);
    return !(Number.isInteger(seat) && seat >= 1 && seat <= 4);
  });
  const targets = nonMySeatNumbers(mySeat);
  const index = targets.indexOf(slot);
  return index >= 0 ? unseated[index] || null : null;
}

/** @param {number} slot @param {number} mySeat */
export function podSlotPlayerLabel(slot, mySeat) {
  if (mySeat >= 1 && mySeat <= 4) return `Player ${slot}`;
  return `Player ${POD_SLOT_LETTERS[slot - 1] || slot}`;
}

/** @param {number} slot @param {number} mySeat */
export function podSlotCommanderLabel(slot, mySeat) {
  if (mySeat >= 1 && mySeat <= 4) return "Commander";
  return `Commander ${POD_SLOT_LETTERS[slot - 1] || slot}`;
}

/** @param {number} slot @param {number} mySeat @param {boolean} [isMeRow] */
export function podRowWinnerKey(slot, mySeat, isMeRow = false) {
  if (isMeRow) return "w";
  if (mySeat >= 1 && mySeat <= 4) return String(slot);
  return POD_SLOT_LETTERS[slot - 1] || String(slot);
}

/** @param {import('./store.js').Game} game */
export function opponentWinnerPodSlot(game) {
  if (game.result === "Win") return null;
  if (game.winnerPodSlot) return String(game.winnerPodSlot);
  if (!game.winnerSeat) return null;
  if (gameHasMySeat(game)) return String(Number(game.winnerSeat));
  const index = Number(game.winnerSeat) - 1;
  return POD_SLOT_LETTERS[index] || String(game.winnerSeat);
}

/** @param {import('./store.js').Game} game @param {number} slot @param {number} mySeat @param {boolean} [isMeRow] */
export function podRowOutcomeClass(game, slot, mySeat, isMeRow = false) {
  const meRow = isMeRow || (gameHasMySeat(game) && slot === mySeat);
  const rowKey = podRowWinnerKey(slot, mySeat, meRow);
  if (game.result === "Win") {
    return meRow ? "pod-seat-win" : "pod-seat-loss";
  }
  const winnerKey = opponentWinnerPodSlot(game);
  if (!winnerKey) return meRow ? "pod-seat-loss" : "";
  return rowKey === winnerKey ? "pod-seat-win" : "pod-seat-loss";
}

/** @param {import('./store.js').Game} game @param {number} opponentIndex @param {import('./store.js').Game['opponents'][number]} opp */
function opponentDidWin(game, opponentIndex, opp) {
  if (game.result === "Win") return false;
  const winnerKey = opponentWinnerPodSlot(game);
  if (!winnerKey) return false;
  if (gameHasMySeat(game)) return winnerKey === String(Number(opp.seat));
  return winnerKey === (POD_SLOT_LETTERS[opponentIndex] || "");
}

/** @typedef {{ seat: number, player: string, deck: string, commander: string, deckSlotId?: string, didWin: boolean }} GameSeat */

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function isMySeat(seat) {
  return normalizeKey(seat.player) === normalizeKey(MY_PLAYER_NAME);
}

/** @param {import('./store.js').Game} game */
export function gameUsesSeatNumbers(game) {
  return gameHasMySeat(game);
}

/** @param {import('./store.js').Game} game @param {import('./store.js').Deck[] | null} [decks] */
export function parseGameSeats(game, decks = null) {
  /** @type {GameSeat[]} */
  const seats = [];

  if (game.mySeat || game.deck) {
    const player = game.myPlayer?.trim() || MY_PLAYER_NAME;
    const deckSlotId = game.deck;
    const commander = decks
      ? resolveMyCommander(game, decks)
      : String(game.myCommander || "").trim() || deckSlotId;
    const seat = Number(game.mySeat) || 0;
    seats.push({
      seat,
      player,
      deck: commander,
      deckSlotId,
      commander,
      didWin: game.result === "Win",
    });
  }

  for (const [index, opp] of (game.opponents || []).entries()) {
    const commander = String(opp.name || "").trim();
    if (!commander) continue;
    const player = String(opp.player || "").trim();
    const seat = Number(opp.seat) || 0;
    seats.push({
      seat,
      player,
      deck: commander,
      commander,
      didWin: opponentDidWin(game, index, opp),
    });
  }

  return seats;
}

/** @param {import('./store.js').Game[]} games */
export function collectAllPodCommanderNames(games) {
  const names = new Set();
  for (const game of games) {
    for (const seat of parseGameSeats(game)) {
      const commander = String(seat.commander || "").trim();
      if (commander) names.add(commander);
    }
  }
  return [...names];
}

/** @param {import('./store.js').Game} game */
function winnerSeatForGame(game) {
  if (game.result === "Win" && gameHasMySeat(game)) return Number(game.mySeat);
  if (game.result === "Loss" && gameHasMySeat(game)) {
    const winnerKey = opponentWinnerPodSlot(game);
    if (winnerKey) return Number(winnerKey);
  }
  if (game.result === "Loss" && game.winnerSeat && gameHasMySeat(game)) {
    return Number(game.winnerSeat);
  }
  return 0;
}

/** @param {GameSeat} mySeat @param {GameSeat} opponentSeat @param {'players' | 'decks'} tabId @param {{ splitPartners?: boolean, splitPlayers?: boolean, archetypeView?: import('./archetype-stats.js').ArchetypeView, canonicalNames?: Map<string, string>, keyCache?: Map<string, string[]> }} options @param {{ game: import('./store.js').Game, decks: import('./store.js').Deck[], opponentDecks: import('./opponent-decks.js').OpponentDeck[] } | null} [context] */
function matchupPairs(mySeat, opponentSeat, tabId, options = {}, context = null) {
  if (tabId === "players") {
    return [matchupPairKeys(mySeat, opponentSeat, tabId)];
  }

  const { splitPartners = false, splitPlayers = false, archetypeView, canonicalNames, keyCache } =
    options;
  const pairs = [];

  if (
    tabId === "decks" &&
    archetypeView &&
    context?.game &&
    canonicalNames &&
    keyCache
  ) {
    const { game, decks, opponentDecks } = context;
    const myKeys = archetypeRowKeysForTags(
      seatArchetypeTags(mySeat, game, decks, opponentDecks),
      archetypeView,
      canonicalNames,
      keyCache
    );
    const oppKeys = archetypeRowKeysForTags(
      seatArchetypeTags(opponentSeat, game, decks, opponentDecks),
      archetypeView,
      canonicalNames,
      keyCache
    );
    for (const subjectLabel of myKeys) {
      for (const opponentLabel of oppKeys) {
        pairs.push({
          subjectKey: `a:${normalizeKey(subjectLabel)}`,
          subjectLabel,
          opponentKey: `oa:${normalizeKey(opponentLabel)}`,
          opponentLabel,
        });
      }
    }
    return pairs;
  }

  if (splitPlayers) {
    const player = opponentSeat.player?.trim();
    if (!player) return pairs;
    for (const subject of getCommanderMatchupIdentities(mySeat.deck, { splitPartners })) {
      for (const opponent of getCommanderMatchupIdentities(opponentSeat.commander, { splitPartners })) {
        pairs.push({
          subjectKey: `d:${normalizeKey(subject)}`,
          subjectLabel: subject,
          opponentKey: `dc:${normalizeKey(opponent)}__p:${normalizeKey(player)}`,
          opponentLabel: opponent,
          opponentPlayer: player,
        });
      }
    }
    return pairs;
  }

  for (const subject of getCommanderMatchupIdentities(mySeat.deck, { splitPartners })) {
    for (const opponent of getCommanderMatchupIdentities(opponentSeat.commander, { splitPartners })) {
      pairs.push({
        subjectKey: `d:${normalizeKey(subject)}`,
        subjectLabel: subject,
        opponentKey: `dc:${normalizeKey(opponent)}`,
        opponentLabel: opponent,
      });
    }
  }
  return pairs;
}

/** @param {GameSeat} mySeat @param {GameSeat} opponentSeat @param {'players' | 'decks'} tabId */
function matchupPairKeys(mySeat, opponentSeat, tabId) {
  if (tabId === "players") {
    return {
      subjectKey: `p:${normalizeKey(mySeat.player)}`,
      subjectLabel: mySeat.player,
      opponentKey: `p:${normalizeKey(opponentSeat.player)}`,
      opponentLabel: opponentSeat.player,
    };
  }

  return {
    subjectKey: `d:${normalizeKey(mySeat.deck)}`,
    subjectLabel: mySeat.deck,
    opponentKey: `dc:${normalizeKey(opponentSeat.commander)}`,
    opponentLabel: opponentSeat.commander,
  };
}

export function calcMatchupImpact(wins, games) {
  if (!games) return 0;
  return winRate(wins, games) - MATCHUP_BASELINE;
}

export function calcNormalizedMatchupImpact(wins, games) {
  const normalizedWinRate = (wins + MATCHUP_PRIOR_WINS) / (games + MATCHUP_PRIOR_GAMES);
  return normalizedWinRate - MATCHUP_BASELINE;
}

/** Higher = better when NMI ties: shared losses beat losses-to. */
export function matchupOutcomeTieRank(row) {
  return (row.sharedLosses ?? 0) - (row.losses ?? 0);
}

function finalizeMatchupRow(row) {
  const winRateVal = row.games > 0 ? winRate(row.wins, row.games) : 0;
  const opponentWins = row.losses;
  const opponentWinRate = row.games > 0 ? winRate(opponentWins, row.games) : 0;
  const normalizedWinRate =
    (row.wins + MATCHUP_PRIOR_WINS) / (row.games + MATCHUP_PRIOR_GAMES);
  const normalizedOpponentWinRate =
    (opponentWins + MATCHUP_PRIOR_WINS) / (row.games + MATCHUP_PRIOR_GAMES);
  const opponentPlayerBreakdown = row.opponentPlayers
    ? [...row.opponentPlayers.entries()]
        .map(([player, games]) => ({ player, games }))
        .sort((a, b) => b.games - a.games || a.player.localeCompare(b.player))
    : [];

  return {
    ...row,
    winRate: winRateVal,
    normalizedWinRate,
    opponentWins,
    opponentWinRate,
    normalizedOpponentWinRate,
    opponentPlayerBreakdown,
    opponentCount: opponentPlayerBreakdown.length,
    matchupImpact: calcMatchupImpact(row.wins, row.games),
    normalizedMatchupImpact: calcNormalizedMatchupImpact(row.wins, row.games),
    opponentMatchupImpact: calcMatchupImpact(opponentWins, row.games),
    opponentNormalizedMatchupImpact: calcNormalizedMatchupImpact(opponentWins, row.games),
  };
}

export function formatMatchupImpact(value) {
  const pct = value * 100;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

export function matchupImpactClass(value) {
  if (value > 1e-9) return "positive";
  if (value < -1e-9) return "negative";
  return "neutral";
}

/**
 * Matchups from Brass's perspective only: me vs players, or my deck vs opponent decks.
 * @param {import('./store.js').Game[]} games
 * @param {'players' | 'decks'} tabId
 * @param {{ splitPartners?: boolean, splitPlayers?: boolean, combineDecks?: boolean }} [options]
 */
export function buildMyMatchupRows(games, tabId, options = {}) {
  const {
    splitPartners = false,
    splitPlayers = false,
    combineDecks = false,
    decks = [],
    archetypeView,
    opponentDecks = [],
  } = options;
  const rows = new Map();
  /** @type {Map<string, string>} */
  const canonicalNames = new Map();
  const keyCache = new Map();

  for (const game of games) {
    const seats = parseGameSeats(game, decks);
    if (seats.length < 2) continue;

    const mySeat = seats.find(isMySeat);
    if (!mySeat) continue;

    for (const opponentSeat of seats) {
      if (opponentSeat === mySeat) continue;
      if (tabId === "players" && !opponentSeat.player) continue;

      for (const pair of matchupPairs(
        mySeat,
        opponentSeat,
        tabId,
        { splitPartners, splitPlayers, archetypeView, canonicalNames, keyCache },
        archetypeView ? { game, decks, opponentDecks } : null
      )) {
        const { subjectKey, subjectLabel, opponentKey, opponentLabel, opponentPlayer } = pair;
        if (subjectKey === opponentKey) continue;

        const mapKey = combineDecks && tabId === "decks" ? opponentKey : `${subjectKey}__${opponentKey}`;
        const row =
          rows.get(mapKey) ??
          ({
            subjectKey: combineDecks && tabId === "decks" ? "" : subjectKey,
            opponentKey,
            subject: combineDecks && tabId === "decks" ? "" : subjectLabel,
            opponent: opponentLabel,
            opponentPlayer,
            games: 0,
            wins: 0,
            losses: 0,
            sharedLosses: 0,
            opponentPlayers: tabId === "decks" && !splitPlayers ? new Map() : undefined,
          });

        row.games += 1;
        if (mySeat.didWin) row.wins += 1;
        else if (opponentSeat.didWin) row.losses += 1;
        else row.sharedLosses += 1;

        if (tabId === "decks" && !splitPlayers && opponentSeat.player && row.opponentPlayers) {
          row.opponentPlayers.set(
            opponentSeat.player,
            (row.opponentPlayers.get(opponentSeat.player) || 0) + 1
          );
        }

        rows.set(mapKey, row);
      }
    }
  }

  const finalized = [...rows.values()].map(finalizeMatchupRow);

  return finalized.sort((a, b) => {
      if (b.normalizedMatchupImpact !== a.normalizedMatchupImpact) {
        return b.normalizedMatchupImpact - a.normalizedMatchupImpact;
      }
      const outcomeA = matchupOutcomeTieRank(a);
      const outcomeB = matchupOutcomeTieRank(b);
      if (outcomeB !== outcomeA) {
        return outcomeB - outcomeA;
      }
      if (b.games !== a.games) {
        return b.games - a.games;
      }
      if (b.matchupImpact !== a.matchupImpact) {
        return b.matchupImpact - a.matchupImpact;
      }
      if (tabId === "decks" && !combineDecks && a.subject !== b.subject) {
        return a.subject.localeCompare(b.subject, undefined, { numeric: true });
      }
      return a.opponent.localeCompare(b.opponent, undefined, { numeric: true });
    });
}

/** @param {import('./store.js').Game[]} games @param {import('./store.js').Deck[]} decks @param {"all" | "active" | "retired"} deckFilter @param {string} bracketFilter */
function filterGamesForColorMatchups(games, decks, deckFilter, bracketFilter) {
  const deckMap = deckMapByKey(decks);
  return games.filter((game) => {
    const deck = deckMap.get(game.deck);
    if (deckFilter === "active" && deck?.retired) return false;
    if (deckFilter === "retired" && !deck?.retired) return false;
    if (bracketFilter) {
      const bracket = game.bracket ?? deck?.bracket ?? 4;
      if (String(bracket) !== bracketFilter) return false;
    }
    return true;
  });
}

/**
 * @param {import('./store.js').Game[]} games
 * @param {{ decks: import('./store.js').Deck[], deckFilter: 'all'|'active'|'retired', bracketFilter: string, view: 'wubrgc'|'all'|'exact', agg: 'inclusive'|'exclusive', splitPartners?: boolean }} options
 */
export function buildColorMatchupRows(games, options) {
  const { decks, deckFilter, bracketFilter, view, agg, splitPartners = false } = options;
  const deckMap = deckMapByKey(decks);
  const filteredGames = filterGamesForColorMatchups(games, decks, deckFilter, bracketFilter);
  const rows = new Map();

  for (const game of filteredGames) {
    const seats = parseGameSeats(game, decks);
    if (seats.length < 2) continue;

    const mySeat = seats.find(isMySeat);
    if (!mySeat) continue;

    const myDeck = deckMap.get(game.deck);
    const myCommander = resolveMyCommander(game, decks);
    const myIdentities = getCommanderMatchupIdentities(myCommander, { splitPartners });

    for (const opponentSeat of seats) {
      if (opponentSeat === mySeat) continue;

      const oppIdentities = getCommanderMatchupIdentities(opponentSeat.commander, { splitPartners });

      for (const myIdentity of myIdentities) {
        const myColors = resolveCommanderColors(myIdentity, {
          splitPartners,
          ownedDeck: myDeck,
        });
        const subjectKeys = colorKeysForIdentity(myColors, view, agg);

        for (const subjectKey of subjectKeys) {
          for (const oppIdentity of oppIdentities) {
            const oppDeck = deckMap.get(oppIdentity);
            const oppColors = resolveCommanderColors(oppIdentity, {
              splitPartners,
              ownedDeck: oppDeck,
            });
            const opponentKeys = colorKeysForIdentity(oppColors, view, agg);

            for (const opponentKey of opponentKeys) {
              const mapKey = `ci:${subjectKey}__oci:${opponentKey}`;
              const row =
                rows.get(mapKey) ??
                ({
                  subjectKey: `ci:${subjectKey}`,
                  opponentKey: `oci:${opponentKey}`,
                  subject: colorKeyLabel(subjectKey, view),
                  opponent: colorKeyLabel(opponentKey, view),
                  subjectColors: rowColorsFromKey(subjectKey),
                  opponentColors: rowColorsFromKey(opponentKey),
                  games: 0,
                  wins: 0,
                  losses: 0,
                  sharedLosses: 0,
                });

              row.games += 1;
              if (mySeat.didWin) row.wins += 1;
              else if (opponentSeat.didWin) row.losses += 1;
              else row.sharedLosses += 1;

              rows.set(mapKey, row);
            }
          }
        }
      }
    }
  }

  const finalized = [...rows.values()].map(finalizeMatchupRow);

  return finalized.sort((a, b) => {
    if (b.normalizedMatchupImpact !== a.normalizedMatchupImpact) {
      return b.normalizedMatchupImpact - a.normalizedMatchupImpact;
    }
    const outcomeA = matchupOutcomeTieRank(a);
    const outcomeB = matchupOutcomeTieRank(b);
    if (outcomeB !== outcomeA) {
      return outcomeB - outcomeA;
    }
    if (b.games !== a.games) {
      return b.games - a.games;
    }
    if (a.subject !== b.subject) {
      return a.subject.localeCompare(b.subject, undefined, { numeric: true });
    }
    return a.opponent.localeCompare(b.opponent, undefined, { numeric: true });
  });
}

function opponentEntryForSeat(game, seat) {
  const seatNum = Number(seat.seat);
  if (Number.isInteger(seatNum) && seatNum >= 1 && seatNum <= 4) {
    const bySeat = (game.opponents || []).find((entry) => Number(entry.seat) === seatNum);
    if (bySeat) return bySeat;
  }
  const commander = String(seat.commander || "").trim();
  if (commander) {
    const byCommander = (game.opponents || []).find(
      (entry) => normalizeKey(entry.name) === normalizeKey(commander)
    );
    if (byCommander) return byCommander;
  }
  const player = String(seat.player || "").trim();
  if (player && commander) {
    return (
      (game.opponents || []).find(
        (entry) =>
          normalizeKey(entry.player) === normalizeKey(player) &&
          normalizeKey(entry.name) === normalizeKey(commander)
      ) || null
    );
  }
  return null;
}

function seatArchetypeTags(seat, game, decks, opponentDecks) {
  if (isMySeat(seat)) {
    const owned = findDeck(decks, game.deck);
    return owned?.archetypes || [];
  }

  const opp = opponentEntryForSeat(game, seat);
  const player = String(seat.player || opp?.player || "").trim();
  const commander = String(seat.commander || opp?.name || "").trim();

  if (opp?.opponentDeckId) {
    const byId = findOpponentDeck(opponentDecks, opp.opponentDeckId);
    if (byId && opponentEntryMatchesDeck(game, opp, byId)) {
      return byId.archetypes || [];
    }
  }

  const byPair = findOpponentDeckByPair(opponentDecks, player, commander);
  if (byPair?.archetypes?.length) return byPair.archetypes;

  const byCommander = findOpponentDeckByCommander(opponentDecks, commander);
  return byCommander?.archetypes || [];
}

function accumulateArchetypeMatchupPair(rows, subject, opponent, seatA, seatB, trackPlayers) {
  const mapKey = `a:${normalizeKey(subject)}__oa:${normalizeKey(opponent)}`;
  let row = rows.get(mapKey);
  if (!row) {
    row = {
      subjectKey: `a:${normalizeKey(subject)}`,
      opponentKey: `oa:${normalizeKey(opponent)}`,
      subject,
      opponent,
      games: 0,
      wins: 0,
      losses: 0,
      sharedLosses: 0,
      ...(trackPlayers
        ? {
            subjectPlayer: seatA.player || "—",
            opponentPlayer: seatB.player || "—",
          }
        : {}),
    };
    rows.set(mapKey, row);
  }

  row.games += 1;
  if (seatA.didWin) row.wins += 1;
  else if (seatB.didWin) row.losses += 1;
  else row.sharedLosses += 1;
}

/** @param {import('./store.js').Game} game @param {import('./matchups.js').GameSeat} seat @param {import('./store.js').Deck[]} decks @param {import('./opponent-decks.js').OpponentDeck[]} opponentDecks @param {import('./archetype-stats.js').ArchetypeView} view @param {Map<string, string>} canonicalNames @param {Map<string, string[]>} keyCache @param {Map<string, string[]>} seatCache */
function seatArchetypeKeysForGame(
  game,
  seat,
  decks,
  opponentDecks,
  view,
  canonicalNames,
  keyCache,
  seatCache
) {
  const cacheKey = `${game.id}:${seat.seat}:${normalizeKey(seat.player)}:${normalizeKey(seat.commander)}:${view}`;
  const hit = seatCache.get(cacheKey);
  if (hit) return hit;
  const keys = archetypeRowKeysForTags(
    seatArchetypeTags(seat, game, decks, opponentDecks),
    view,
    canonicalNames,
    keyCache
  );
  seatCache.set(cacheKey, keys);
  return keys;
}

/**
 * Combined mode can explode row counts; fall back to Unique for heavy tag cross-products.
 * @param {string[]} tagsMy
 * @param {string[]} tagsOpp
 * @param {import('./archetype-stats.js').ArchetypeView} view
 * @param {Map<string, string>} canonicalNames
 * @param {Map<string, string[]>} keyCache
 */
function matchupArchetypeKeyPair(tagsMy, tagsOpp, view, canonicalNames, keyCache) {
  let myKeys = archetypeRowKeysForTags(tagsMy, view, canonicalNames, keyCache);
  let oppKeys = archetypeRowKeysForTags(tagsOpp, view, canonicalNames, keyCache);
  if (
    view === "combined" &&
    myKeys.length * oppKeys.length > MATCHUP_COMBINED_CROSS_CAP
  ) {
    myKeys = archetypeRowKeysForTags(tagsMy, "unique", canonicalNames, keyCache);
    oppKeys = archetypeRowKeysForTags(tagsOpp, "unique", canonicalNames, keyCache);
  }
  return { myKeys, oppKeys };
}

let matchupCacheFingerprint = "";
/** @type {Map<string, { players: unknown[], decks: unknown[], colors: unknown[], archetypes: unknown[] }>} */
const matchupCache = new Map();

export function invalidateMatchupCache() {
  matchupCache.clear();
  matchupCacheFingerprint = "";
}

function gamesMatchupFingerprint(games) {
  if (!games.length) return "0";
  const last = games[games.length - 1];
  return `${games.length}:${last.id}:${last.date}:${last.result}`;
}

function matchupCacheKey(scope, activeTab, options) {
  return JSON.stringify({
    scope,
    activeTab,
    splitPartners: options.splitPartners,
    splitPlayers: options.splitPlayers,
    combineDecks: options.combineDecks,
    archetypeView: options.archetypeView,
    excludeMyPlayer: options.excludeMyPlayer,
    view: options.view,
    agg: options.agg,
    deckFilter: options.colorOptions?.deckFilter,
    bracketFilter: options.colorOptions?.bracketFilter ?? options.bracketFilter,
    colorView: options.colorOptions?.view,
    colorAgg: options.colorOptions?.agg,
  });
}

function buildMatchupBundle(games, options, activeTab) {
  const splitPartners = options.splitPartners ?? false;
  const splitPlayers = options.splitPlayers ?? false;
  const combineDecks = options.combineDecks ?? false;
  const decks = options.colorOptions?.decks ?? options.decks ?? [];
  const opponentDecks = options.opponentDecks ?? [];
  const archetypeView = options.archetypeView ?? "unique";
  const excludeMyPlayer = options.excludeMyPlayer ?? false;
  const view = options.view ?? "exact";
  const agg = options.agg ?? "exclusive";

  const bundle = {
    players: [],
    decks: [],
    colors: [],
    archetypes: [],
  };

  if (options.pod) {
    const podOptions = { splitPartners, excludeMyPlayer, view, agg, archetypeView };
    if (!activeTab || activeTab === "players") {
      bundle.players = buildPodMatchupRows(games, decks, opponentDecks, "players", podOptions);
    }
    if (!activeTab || activeTab === "decks") {
      bundle.decks = buildPodMatchupRows(games, decks, opponentDecks, "decks", podOptions);
    }
    if (!activeTab || activeTab === "colors") {
      bundle.colors = buildPodMatchupRows(games, decks, opponentDecks, "colors", podOptions);
    }
    if (!activeTab || activeTab === "archetypes") {
      bundle.archetypes = buildPodMatchupRows(games, decks, opponentDecks, "archetypes", podOptions);
    }
    return bundle;
  }

  if (!activeTab || activeTab === "players") {
    bundle.players = buildMyMatchupRows(games, "players", { splitPartners, decks });
  }
  if (!activeTab || activeTab === "decks") {
    bundle.decks = buildMyMatchupRows(games, "decks", {
      splitPartners,
      splitPlayers,
      combineDecks,
      decks,
    });
  }
  if (!activeTab || activeTab === "colors") {
    bundle.colors = options.colorOptions
      ? buildColorMatchupRows(games, { ...options.colorOptions, splitPartners })
      : [];
  }
  if (!activeTab || activeTab === "archetypes") {
    bundle.archetypes = buildMyArchetypeMatchupRows(games, decks, opponentDecks, {
      splitPartners,
      archetypeView,
    });
  }

  return bundle;
}

export function getCachedMatchups(scope, games, options, activeTab) {
  const fp = gamesMatchupFingerprint(games);
  if (fp !== matchupCacheFingerprint) {
    matchupCache.clear();
    matchupCacheFingerprint = fp;
  }
  const key = matchupCacheKey(scope, activeTab, options);
  const hit = matchupCache.get(key);
  if (hit) return hit;
  const built = buildMatchupBundle(games, options, activeTab);
  matchupCache.set(key, built);
  return built;
}

function sortMatchupRows(finalized, tabId, combineDecks = false) {
  return finalized.sort((a, b) => {
    if (b.normalizedWinRate !== a.normalizedWinRate) {
      return b.normalizedWinRate - a.normalizedWinRate;
    }
    const outcomeA = matchupOutcomeTieRank(a);
    const outcomeB = matchupOutcomeTieRank(b);
    if (outcomeB !== outcomeA) {
      return outcomeB - outcomeA;
    }
    if (b.games !== a.games) {
      return b.games - a.games;
    }
    if (b.matchupImpact !== a.matchupImpact) {
      return b.matchupImpact - a.matchupImpact;
    }
    if (tabId === "decks" && !combineDecks && a.subject !== b.subject) {
      return a.subject.localeCompare(b.subject, undefined, { numeric: true });
    }
    const playerCmp = String(a.subjectPlayer || "").localeCompare(
      String(b.subjectPlayer || ""),
      undefined,
      { numeric: true }
    );
    if (playerCmp) return playerCmp;
    if (a.subject !== b.subject) {
      return a.subject.localeCompare(b.subject, undefined, { numeric: true });
    }
    const oppPlayerCmp = String(a.opponentPlayer || "").localeCompare(
      String(b.opponentPlayer || ""),
      undefined,
      { numeric: true }
    );
    if (oppPlayerCmp) return oppPlayerCmp;
    return a.opponent.localeCompare(b.opponent, undefined, { numeric: true });
  });
}

/**
 * @param {import('./store.js').Game[]} games
 * @param {import('./store.js').Deck[]} decks
 * @param {import('./opponent-decks.js').OpponentDeck[]} opponentDecks
 * @param {{ splitPartners?: boolean }} [options]
 */
export function buildMyArchetypeMatchupRows(games, decks, opponentDecks, options = {}) {
  const { splitPartners = false, archetypeView = "unique" } = options;
  const rows = new Map();
  /** @type {Map<string, string>} */
  const canonicalNames = new Map();
  const keyCache = new Map();

  for (const game of games) {
    const seats = parseGameSeats(game, decks);
    if (seats.length < 2) continue;

    const mySeat = seats.find(isMySeat);
    if (!mySeat) continue;

    for (const opponentSeat of seats) {
      if (opponentSeat === mySeat) continue;
      const myTags = seatArchetypeTags(mySeat, game, decks, opponentDecks);
      const oppTags = seatArchetypeTags(opponentSeat, game, decks, opponentDecks);
      const { myKeys, oppKeys } = matchupArchetypeKeyPair(
        myTags,
        oppTags,
        archetypeView,
        canonicalNames,
        keyCache
      );
      if (!myKeys.length || !oppKeys.length) continue;

      for (const myCombo of myKeys) {
        for (const oppCombo of oppKeys) {
          accumulateArchetypeMatchupPair(rows, myCombo, oppCombo, mySeat, opponentSeat, false);
        }
      }
    }
  }

  return sortMatchupRows([...rows.values()].map(finalizeMatchupRow), "archetypes");
}

/**
 * Pod matchups: every seat vs every other seat (subject perspective).
 * @param {import('./store.js').Game[]} games
 * @param {import('./store.js').Deck[]} decks
 * @param {import('./opponent-decks.js').OpponentDeck[]} opponentDecks
 * @param {'players' | 'decks' | 'colors' | 'archetypes'} tabId
 * @param {{ splitPartners?: boolean, excludeMyPlayer?: boolean, view?: 'wubrgc'|'all'|'exact', agg?: 'inclusive'|'exclusive' }} [options]
 */
export function buildPodMatchupRows(games, decks, opponentDecks, tabId, options = {}) {
  const {
    splitPartners = false,
    excludeMyPlayer = false,
    view = "exact",
    agg = "exclusive",
    archetypeView = "unique",
  } = options;
  const rows = new Map();
  /** @type {Map<string, string>} */
  const archetypeCanonicalNames = new Map();
  const archetypeKeyCache = new Map();

  for (const game of games) {
    const seats = parseGameSeats(game, decks);
    if (seats.length < 2) continue;

    for (const seatA of seats) {
      if (excludeMyPlayer && isMySeat(seatA)) continue;
      if (tabId === "players" && !seatA.player) continue;

      for (const seatB of seats) {
        if (seatB === seatA) continue;
        if (excludeMyPlayer && isMySeat(seatB)) continue;
        if (tabId === "players" && !seatB.player) continue;

        /** @type {Array<{ mapKey: string, subject: string, opponent: string, subjectColors?: string[], opponentColors?: string[] }>} */
        let pairs = [];

        if (tabId === "players") {
          pairs.push({
            mapKey: `sp:${normalizeKey(seatA.player)}__op:${normalizeKey(seatB.player)}`,
            subject: seatA.player,
            opponent: seatB.player,
          });
        } else if (tabId === "decks") {
          for (const subject of getCommanderMatchupIdentities(seatA.commander, { splitPartners })) {
            for (const opponent of getCommanderMatchupIdentities(seatB.commander, { splitPartners })) {
              pairs.push({
                mapKey: `sp:${normalizeKey(seatA.player)}__d:${normalizeKey(subject)}__op:${normalizeKey(seatB.player)}__dc:${normalizeKey(opponent)}`,
                subject,
                opponent,
              });
            }
          }
        } else if (tabId === "colors") {
          const ownedA = isMySeat(seatA) ? findDeck(decks, game.deck) : null;
          const ownedB = isMySeat(seatB) ? findDeck(decks, game.deck) : null;
          for (const subjectIdentity of getCommanderMatchupIdentities(seatA.commander, {
            splitPartners,
          })) {
            const subjectColors = resolveCommanderColors(subjectIdentity, {
              splitPartners,
              ownedDeck: ownedA,
            });
            for (const subjectKey of colorKeysForIdentity(subjectColors, view, agg)) {
              for (const opponentIdentity of getCommanderMatchupIdentities(seatB.commander, {
                splitPartners,
              })) {
                const opponentColors = resolveCommanderColors(opponentIdentity, {
                  splitPartners,
                  ownedDeck: ownedB,
                });
                for (const opponentKey of colorKeysForIdentity(opponentColors, view, agg)) {
                  pairs.push({
                    mapKey: `ci:${subjectKey}__oci:${opponentKey}`,
                    subject: colorKeyLabel(subjectKey, view),
                    opponent: colorKeyLabel(opponentKey, view),
                    subjectColors: rowColorsFromKey(subjectKey),
                    opponentColors: rowColorsFromKey(opponentKey),
                  });
                }
              }
            }
          }
        } else if (tabId === "archetypes") {
          const tagsA = seatArchetypeTags(seatA, game, decks, opponentDecks);
          const tagsB = seatArchetypeTags(seatB, game, decks, opponentDecks);
          const { myKeys: subjectKeys, oppKeys: opponentKeys } = matchupArchetypeKeyPair(
            tagsA,
            tagsB,
            archetypeView,
            archetypeCanonicalNames,
            archetypeKeyCache
          );
          if (!subjectKeys.length || !opponentKeys.length) continue;
          for (const subject of subjectKeys) {
            for (const opponent of opponentKeys) {
              accumulateArchetypeMatchupPair(rows, subject, opponent, seatA, seatB, false);
            }
          }
          continue;
        }

        for (const pair of pairs) {
          const trackPlayers = tabId === "players" || tabId === "decks";
          const row =
            rows.get(pair.mapKey) ??
            ({
              ...(trackPlayers
                ? {
                    subjectPlayer: seatA.player || "—",
                    opponentPlayer: seatB.player || "—",
                  }
                : {}),
              subject: pair.subject,
              opponent: pair.opponent,
              subjectColors: pair.subjectColors,
              opponentColors: pair.opponentColors,
              games: 0,
              wins: 0,
              losses: 0,
              sharedLosses: 0,
            });

          row.games += 1;
          if (seatA.didWin) row.wins += 1;
          else if (seatB.didWin) row.losses += 1;
          else row.sharedLosses += 1;

          rows.set(pair.mapKey, row);
        }
      }
    }
  }

  return sortMatchupRows([...rows.values()].map(finalizeMatchupRow), tabId);
}

/** @param {import('./store.js').Game[]} games @param {{ splitPartners?: boolean, splitPlayers?: boolean, combineDecks?: boolean, colorOptions?: object, opponentDecks?: import('./opponent-decks.js').OpponentDeck[], archetypeView?: import('./archetype-stats.js').ArchetypeView }} [options] @param {'players' | 'decks' | 'colors' | 'archetypes' | null} [activeTab] */
export function computeAllMatchups(games, options = {}, activeTab = null) {
  return getCachedMatchups("my", games, { ...options, pod: false }, activeTab);
}

/**
 * @param {import('./store.js').Game[]} games
 * @param {import('./store.js').Deck[]} decks
 * @param {import('./opponent-decks.js').OpponentDeck[]} opponentDecks
 * @param {object} [options]
 * @param {'players' | 'decks' | 'colors' | 'archetypes' | null} [activeTab]
 */
export function computePodAllMatchups(games, decks, opponentDecks, options = {}, activeTab = null) {
  return getCachedMatchups(
    "pod",
    games,
    {
      ...options,
      pod: true,
      decks,
      opponentDecks,
    },
    activeTab
  );
}
