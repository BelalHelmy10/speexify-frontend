// app/classroom/[sessionId]/ClassroomShell.jsx
"use client";

import { useState, useMemo, useEffect } from "react";
import PrepVideoCall from "@/app/resources/prep/PrepVideoCall";
import PrepShell from "@/app/resources/prep/PrepShell";
import ClassroomResourcePicker from "./ClassroomResourcePicker";
import { buildResourceIndex, getViewerInfo } from "./classroomHelpers";
import { useClassroomChannel } from "@/app/resources/prep/useClassroomChannel";

export default function ClassroomShell({ session, sessionId, tracks }) {
  const isTeacher =
    session.role === "teacher" ||
    session.isTeacher ||
    session.userType === "teacher";

  // One shared channel for this classroom (video + resources + annotations)
  const classroomChannel = useClassroomChannel(String(sessionId));
  const { ready, send, subscribe } = classroomChannel;

  const { resourcesById } = useMemo(() => buildResourceIndex(tracks), [tracks]);
  const [selectedResourceId, setSelectedResourceId] = useState(null);

  // Receive messages from the classroom channel (resource sync)
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
      // Annotation messages are handled inside PrepShell
    });

    return unsubscribe;
  }, [ready, resourcesById, subscribe]);

  // Teacher: auto-select first resource and broadcast it
  useEffect(() => {
    if (!isTeacher) return;

    if (!selectedResourceId) {
      const first = Object.values(resourcesById)[0];
      if (first) {
        setSelectedResourceId(first._id);
        if (ready) {
          send({ type: "SET_RESOURCE", resourceId: first._id });
        }
      }
    }
  }, [isTeacher, resourcesById, selectedResourceId, ready, send]);

  function handleChangeResourceId(nextId) {
    setSelectedResourceId(nextId);
    if (isTeacher && ready && nextId) {
      console.log("[Classroom] teacher sending resource", nextId);
      send({ type: "SET_RESOURCE", resourceId: nextId });
    }
  }

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

      {/* RIGHT: picker (teacher only) + viewer with shared annotations */}
      <section className="classroom-prep-pane">
        <ClassroomResourcePicker
          isTeacher={isTeacher}
          tracks={tracks}
          selectedResourceId={selectedResourceId}
          onChangeResourceId={handleChangeResourceId}
        />

        <div className="classroom-prep-pane__content">
          {resource ? (
            <PrepShell
              resource={resource}
              viewer={viewer}
              hideSidebar
              hideBreadcrumbs
              classroomChannel={classroomChannel} // 🔥 shared annotations here
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
