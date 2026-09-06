/** @typedef {{ deck?: () => void, game?: () => void, gameDetail?: () => void, entityReport?: () => void, recovery?: () => void }} ModalDismissHandlers */

/**
 * Ctrl/Cmd/Shift/middle-click on a submit button submits the form to the current URL
 * in a new tab, bypassing JS submit handlers. Block that for in-app forms.
 * @param {ParentNode} [root]
 */
export function bindFormAccidentalNavigationGuard(root = document) {
  root.addEventListener(
    "click",
    (e) => {
      if (!(e.ctrlKey || e.metaKey || e.shiftKey)) return;
      const submit = e.target.closest('button[type="submit"], input[type="submit"]');
      if (submit?.form) e.preventDefault();
    },
    true
  );

  root.addEventListener(
    "auxclick",
    (e) => {
      if (e.button !== 1) return;
      const submit = e.target.closest('button[type="submit"], input[type="submit"]');
      if (submit?.form) e.preventDefault();
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
    else if (id === "recovery-modal") handlers.recovery?.();
  });
}
