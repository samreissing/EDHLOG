/** @typedef {{ deck?: () => void, game?: () => void, gameDetail?: () => void, entityReport?: () => void }} ModalDismissHandlers */

const APP_FORM_IDS = new Set(["add-game-form", "deck-form", "deck-list-form"]);

function isAppForm(form) {
  return form instanceof HTMLFormElement && APP_FORM_IDS.has(form.id);
}

/**
 * In-app forms have no action; native submit (incl. modifier-clicks on submit buttons)
 * reloads this page — often in a new tab. Block that entirely; JS handlers do the work.
 * @param {ParentNode} [root]
 */
export function bindFormAccidentalNavigationGuard(root = document) {
  root.addEventListener(
    "submit",
    (e) => {
      if (isAppForm(e.target)) e.preventDefault();
    },
    true
  );

  root.addEventListener(
    "click",
    (e) => {
      const submit = e.target.closest('button[type="submit"], input[type="submit"]');
      if (!submit || !isAppForm(submit.form)) return;
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) e.preventDefault();
    },
    true
  );

  root.addEventListener(
    "auxclick",
    (e) => {
      if (e.button !== 1) return;
      const submit = e.target.closest('button[type="submit"], input[type="submit"]');
      if (submit && isAppForm(submit.form)) e.preventDefault();
    },
    true
  );
}

/** @param {ModalDismissHandlers} handlers */
export function bindModalBackdropDismiss(handlers) {
  /** @type {string | null} */
  let downOutsideModalId = null;

  document.addEventListener("mousedown", (e) => {
    const modal = e.target.closest(".modal:not(.hidden)");
    if (!modal) {
      downOutsideModalId = null;
      return;
    }
    downOutsideModalId = e.target.closest(".modal-content") ? null : modal.id;
  });

  document.addEventListener("mouseup", (e) => {
    if (!downOutsideModalId) return;
    if (e.target.closest(".modal-content")) {
      downOutsideModalId = null;
      return;
    }

    const id = downOutsideModalId;
    downOutsideModalId = null;

    if (id === "deck-modal") handlers.deck?.();
    else if (id === "game-modal") handlers.game?.();
    else if (id === "game-detail-modal") handlers.gameDetail?.();
    else if (id === "entity-report-modal") handlers.entityReport?.();
  });
}
