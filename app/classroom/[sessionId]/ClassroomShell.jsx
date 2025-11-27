// app/classroom/[sessionId]/ClassroomShell.jsx
"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import PrepVideoCall from "@/app/resources/prep/PrepVideoCall";
import PrepShell from "@/app/resources/prep/PrepShell";
import ClassroomResourcePicker from "./ClassroomResourcePicker";
import { buildResourceIndex, getViewerInfo } from "./classroomHelpers";

export default function ClassroomShell({ session, sessionId, tracks }) {
  const isTeacher = session.role === "teacher" || session.isTeacher;

  // Build lookup of all resources
  const { resourcesById } = useMemo(() => buildResourceIndex(tracks), [tracks]);

  // Shared classroom state (what should be the same for teacher & learner)
  const [classroomState, setClassroomState] = useState({
    selectedResourceId: null,
    currentPage: 1,
  });
  const [hasLoadedInitialState, setHasLoadedInitialState] = useState(false);

  const selectedResourceId = classroomState.selectedResourceId;

  // Helper: send updated state to backend (teacher only)
  const updateClassroomState = useCallback(
    (patch) => {
      setClassroomState((prev) => {
        const next = { ...prev, ...patch };

        if (isTeacher) {
          // Fire-and-forget POST to your backend
          fetch(`/sessions/${sessionId}/classroom-state`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ classroomState: next }),
          }).catch((err) => {
            console.error("Failed to update classroom state", err);
          });
        }

        return next;
      });
    },
    [isTeacher, sessionId]
  );

  // Load/poll classroom state from backend
  useEffect(() => {
    let isCancelled = false;
    let intervalId;

    async function loadStateOnce() {
      try {
        const res = await fetch(`/sessions/${sessionId}/classroom-state`);
        if (!res.ok) return;
        const json = await res.json();
        const remote = json.classroomState || {};

        if (isCancelled) return;

        setClassroomState((prev) => ({ ...prev, ...remote }));
        setHasLoadedInitialState(true);
      } catch (err) {
        console.error("Failed to fetch classroom state", err);
      }
    }

    // Teacher: load once (to reuse any existing state), no polling.
    // Learner: load now + poll every few seconds.
    if (isTeacher) {
      loadStateOnce();
    } else {
      loadStateOnce();
      intervalId = setInterval(loadStateOnce, 5000); // poll every 5s
    }

    return () => {
      isCancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [sessionId, isTeacher]);

  // For the teacher: if no resource is selected yet *after* initial load,
  // default to the first available resource and propagate to backend.
  useEffect(() => {
    if (!isTeacher) return;
    if (!hasLoadedInitialState) return;
    if (classroomState.selectedResourceId) return;

    const first = Object.values(resourcesById)[0];
    if (first) {
      updateClassroomState({ selectedResourceId: first._id });
    }
  }, [
    isTeacher,
    hasLoadedInitialState,
    classroomState.selectedResourceId,
    resourcesById,
    updateClassroomState,
  ]);

  // Currently selected resource + viewer
  const resource = selectedResourceId
    ? resourcesById[selectedResourceId] || null
    : null;

  const viewer = resource ? getViewerInfo(resource) : null;

  // Picker callback (teacher changes resource)
  function handleChangeResourceId(newId) {
    if (!isTeacher) return;
    updateClassroomState({ selectedResourceId: newId });
  }

  return (
    <div className="classroom-layout">
      {/* LEFT: live video */}
      <section className="classroom-video-pane">
        <PrepVideoCall roomId={sessionId} />
      </section>

      {/* RIGHT: resource picker + synced viewer */}
      <section className="classroom-prep-pane">
        {isTeacher && (
          <ClassroomResourcePicker
            tracks={tracks}
            selectedResourceId={selectedResourceId}
            onChangeResourceId={handleChangeResourceId}
          />
        )}

        <div className="classroom-prep-pane__content">
          {resource ? (
            <PrepShell
              resource={resource}
              viewer={viewer}
              hideSidebar
              hideBreadcrumbs
            />
          ) : (
            <div className="prep-viewer">
              <div className="prep-viewer__placeholder">
                <h2>No resource selected</h2>
                <p>
                  {isTeacher
                    ? "Use the bar above to choose a track, book, level, unit and resource."
                    : "Waiting for your teacher to pick a resource."}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
