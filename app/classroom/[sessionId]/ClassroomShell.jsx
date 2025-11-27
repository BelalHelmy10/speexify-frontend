// app/classroom/[sessionId]/ClassroomShell.jsx
"use client";

import { useState, useMemo, useEffect } from "react";
import PrepVideoCall from "@/app/resources/prep/PrepVideoCall";
import PrepShell from "@/app/resources/prep/PrepShell";
import ClassroomResourcePicker from "./ClassroomResourcePicker";
import { buildResourceIndex, getViewerInfo } from "./classroomHelpers";
import { useClassroomChannel } from "@/app/resources/prep/useClassroomChannel";

export default function ClassroomShell({ session, sessionId, tracks }) {
  // Who is the current viewer?
  const isTeacher =
    session.role === "teacher" ||
    session.isTeacher ||
    session.userType === "teacher";

  // Build { resourceId -> full resource + context }
  const { resourcesById } = useMemo(() => buildResourceIndex(tracks), [tracks]);

  const [selectedResourceId, setSelectedResourceId] = useState(null);

  // Realtime classroom channel (separate from video)
  const { ready, send, subscribe } = useClassroomChannel(String(sessionId));

  // ───────────────────────────────────────────────
  // 1) Learner listens for teacher changes
  // ───────────────────────────────────────────────
  useEffect(() => {
    if (!ready) return;

    const unsubscribe = subscribe((message) => {
      console.log("[Classroom] message received", message);

      if (message?.type === "SET_RESOURCE") {
        const { resourceId } = message;
        if (resourceId && resourcesById[resourceId]) {
          console.log("[Classroom] applying teacher resource:", resourceId);
          setSelectedResourceId(resourceId);
        }
      }
    });

    return unsubscribe;
  }, [ready, resourcesById, subscribe]);

  // ───────────────────────────────────────────────
  // 2) Teacher: auto-select first resource when ready
  // ───────────────────────────────────────────────
  useEffect(() => {
    if (!isTeacher) return;
    if (selectedResourceId) return;

    const allResources = Object.values(resourcesById || {});
    if (!allResources.length) return;

    const first = allResources[0];
    if (!first?._id) return;

    setSelectedResourceId(first._id);
  }, [isTeacher, resourcesById, selectedResourceId]);

  // ───────────────────────────────────────────────
  // 3) Teacher: whenever selection changes AND WS is ready -> broadcast
  //    This covers:
  //      - auto-select first resource
  //      - manual changes in the picker
  //      - changes made before the socket was ready
  // ───────────────────────────────────────────────
  useEffect(() => {
    if (!isTeacher) return;
    if (!ready) return;
    if (!selectedResourceId) return;

    console.log(
      "[Classroom] broadcasting selected resource",
      selectedResourceId
    );
    send({ type: "SET_RESOURCE", resourceId: selectedResourceId });
  }, [isTeacher, ready, selectedResourceId, send]);

  // ───────────────────────────────────────────────
  // 4) Teacher changes resource via picker
  // ───────────────────────────────────────────────
  function handleChangeResourceId(nextId) {
    // Just update state – the effect above will broadcast when ready
    setSelectedResourceId(nextId || null);
  }

  // Resolve the actual resource + viewer info
  const resource = selectedResourceId
    ? resourcesById[selectedResourceId] || null
    : null;

  const viewer = resource ? getViewerInfo(resource) : null;

  return (
    <div className="classroom-layout">
      {/* LEFT: video */}
      <section className="classroom-video-pane">
        <PrepVideoCall roomId={sessionId} />
      </section>

      {/* RIGHT: picker (teacher only) + viewer */}
      <section className="classroom-prep-pane">
        {/* ✅ Only teachers see the picker at all */}
        {isTeacher && (
          <ClassroomResourcePicker
            isTeacher={isTeacher}
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
            <div className="prep-viewer prep-viewer__placeholder">
              <h2>No resource selected</h2>
              <p>
                {isTeacher
                  ? "Use the bar above to choose a track, book, level, unit and resource."
                  : "Waiting for your teacher to pick a resource."}
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
