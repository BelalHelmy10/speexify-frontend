// app/resources/prep/PrepClearConfirmModal.jsx

export default function PrepClearConfirmModal({
  show,
  isPdf,
  pdfCurrentPage,
  onCancel,
  onConfirm,
  title,
  messagePage,
  message,
  cancelLabel,
  confirmLabel,
}) {
  if (!show) return null;

  return (
    <div
      className="prep-confirm-modal-backdrop"
      onClick={onCancel}
      onKeyDown={(e) => {
        if (e.key === "Escape") onCancel();
        if (e.key === "Enter") onConfirm();
      }}
    >
      <div className="prep-confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="prep-confirm-modal__icon">⚠️</div>
        <h3 className="prep-confirm-modal__title">{title || "Clear All Annotations?"}</h3>
        <p className="prep-confirm-modal__message">
          {isPdf
            ? messagePage ||
              `This will remove all annotations from page ${pdfCurrentPage}. This action can be undone with Ctrl+Z.`
            : message ||
              "This will remove all annotations. This action can be undone with Ctrl+Z."}
        </p>
        <div className="prep-confirm-modal__actions">
          <button
            type="button"
            className="prep-confirm-modal__btn prep-confirm-modal__btn--cancel"
            onClick={onCancel}
          >
            {cancelLabel || "Cancel"}
          </button>
          <button
            type="button"
            className="prep-confirm-modal__btn prep-confirm-modal__btn--confirm"
            onClick={onConfirm}
            autoFocus
          >
            {confirmLabel || "Yes, Clear All"}
          </button>
        </div>
      </div>
    </div>
  );
}
