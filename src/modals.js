/** @typedef {{ deck?: () => void, game?: () => void, gameDetail?: () => void }} ModalDismissHandlers */

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
  });
}
