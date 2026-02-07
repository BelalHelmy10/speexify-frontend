"use client";

import ClassroomResourcePicker from "./ClassroomResourcePicker";

export default function ClassroomResourcePickerModal({
  isOpen,
  setIsPickerOpen,
  isTeacher,
  tracks,
  selectedResourceId,
  handleChangeResourceId,
  sessionId,
}) {
  if (!isOpen || !isTeacher) return null;

  return (
    <div className="cr-modal-overlay" onClick={() => setIsPickerOpen(false)}>
      <div className="cr-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cr-modal__header">
          <h2 className="cr-modal__title">Choose a Resource</h2>
          <button
            className="cr-modal__close"
            onClick={() => setIsPickerOpen(false)}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="cr-modal__body" data-lenis-prevent>
          <ClassroomResourcePicker
            tracks={tracks}
            selectedResourceId={selectedResourceId}
            onChangeResourceId={handleChangeResourceId}
            isTeacher={isTeacher}
            sessionId={sessionId}
          />
        </div>
      </div>
    </div>
  );
}
