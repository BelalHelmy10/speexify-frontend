"use client";

export default function ClassroomLeaveConfirmModal({
  show,
  setShowLeaveConfirm,
  prefix,
}) {
  if (!show) return null;

  return (
    <div className="cr-modal-overlay" onClick={() => setShowLeaveConfirm(false)}>
      <div className="cr-modal cr-modal--small" onClick={(e) => e.stopPropagation()}>
        <div className="cr-modal__header">
          <h2 className="cr-modal__title">Leave classroom?</h2>
        </div>
        <div className="cr-modal__body">
          <p>
            Are you sure you want to leave this live session? Any ongoing
            conversation and screen sharing will stop.
          </p>
        </div>
        <div className="cr-modal__footer">
          <button
            type="button"
            className="cr-button cr-button--ghost"
            onClick={() => setShowLeaveConfirm(false)}
          >
            Cancel
          </button>
          <a href={`${prefix}/dashboard`} className="cr-button cr-button--danger">
            Yes, leave
          </a>
        </div>
      </div>
    </div>
  );
}
