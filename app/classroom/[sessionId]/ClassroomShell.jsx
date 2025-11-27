// app/classroom/[sessionId]/ClassroomShell.jsx
"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import PrepVideoCall from "@/app/resources/prep/PrepVideoCall";
import PrepShell from "@/app/resources/prep/PrepShell";
import ClassroomResourcePicker from "./ClassroomResourcePicker";
import { buildResourceIndex, getViewerInfo } from "./classroomHelpers";
import api from "@/lib/api"; // ⭐ use the same API client as the rest of the app

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
          // Fire-and-forget POST to your backend API
          api
            .post(`/sessions/${sessionId}/classroom-state`, {
              classroomState: next,
            })
            .catch((err) => {
              console.error("Failed to update classroom state", err);
            });
        }

        return next;
      });
    },
    [isTeacher, sessionId]
  );

  // Poll backend for classroom state so teacher & learner stay in sync
  useEffect(() => {
    let isCancelled = false;
    let intervalId;

    async function loadState() {
      try {
        const res = await api.get(`/sessions/${sessionId}/classroom-state`);

        if (isCancelled) return;

        const remote = res.data?.classroomState || {};

        setClassroomState((prev) => ({
          ...prev,
          ...remote,
        }));
      } catch (err) {
        console.error("Failed to fetch classroom state", err);
      } finally {
        // ✅ even if it fails, allow the teacher to pick the first resource locally
        if (!isCancelled) {
          setHasLoadedInitialState(true);
        }
      }
    }

    // initial load
    loadState();

    // slow polling to avoid killing the DB
    intervalId = setInterval(loadState, 5000); // every 5s

    return () => {
      isCancelled = true;
      clearInterval(intervalId);
    };
  }, [sessionId]);

  // For the teacher: if no resource is selected yet, default to the first one
  useEffect(() => {
    if (!hasLoadedInitialState) return; // wait until we tried to load remote state
    if (!isTeacher) return;
    if (classroomState.selectedResourceId) return;

    const first = Object.values(resourcesById)[0];
    if (first) {
      updateClassroomState({ selectedResourceId: first._id });
    }
  }, [
    hasLoadedInitialState,
    isTeacher,
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
