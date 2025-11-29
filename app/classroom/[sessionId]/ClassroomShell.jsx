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

  // 🔥 Screen share stream (for both teacher's local share and learner's remote view)
  const [screenShareStream, setScreenShareStream] = useState(null);

  // Classroom channel (shared with PrepShell for annotations)
  const classroomChannel = useClassroomChannel(String(sessionId));
  const { ready, send, subscribe } = classroomChannel;

  // ───────────────────────────────────────────────
  // Debug logging for screen share state
  // ───────────────────────────────────────────────
  useEffect(() => {
    console.log(
      "[ClassroomShell] screenShareStream changed:",
      screenShareStream
    );
    if (screenShareStream) {
      console.log("[ClassroomShell] Stream active:", screenShareStream.active);
      console.log(
        "[ClassroomShell] Stream tracks:",
        screenShareStream.getTracks()
      );
    }
  }, [screenShareStream]);

  // ───────────────────────────────────────────────
  // 1) Learner listens for teacher resource changes
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
  // 2) Teacher: auto-select first resource when none selected yet
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
  // 3) Teacher: broadcast whenever selection changes AND WS is ready
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
  // 4) Teacher changes resource via Picker
  // ───────────────────────────────────────────────
  function handleChangeResourceId(nextId) {
    setSelectedResourceId(nextId || null);
  }

  // ───────────────────────────────────────────────
  // 5) 🔥 Handle screen share stream changes
  // ───────────────────────────────────────────────
  function handleScreenShareStreamChange(stream) {
    console.log(
      "[ClassroomShell] handleScreenShareStreamChange called with:",
      stream
    );

    if (stream) {
      console.log("[ClassroomShell] Setting screen share stream");
      console.log("[ClassroomShell] Stream ID:", stream.id);
      console.log("[ClassroomShell] Stream active:", stream.active);
      console.log("[ClassroomShell] Video tracks:", stream.getVideoTracks());
    } else {
      console.log("[ClassroomShell] Clearing screen share stream");
    }

    setScreenShareStream(stream);
  }

  // Resolve current resource + viewer info
  const resource = selectedResourceId
    ? resourcesById[selectedResourceId] || null
    : null;

  const viewer = resource ? getViewerInfo(resource) : null;

  return (
    <div className="classroom-layout">
      {/* LEFT: video call panel */}
      <section className="classroom-video-pane">
        <PrepVideoCall
          roomId={sessionId}
          isTeacher={isTeacher}
          onScreenShareStreamChange={handleScreenShareStreamChange}
        />

        {/* 🔥 Debug info - remove in production */}
        <div style={{ padding: "8px", fontSize: "12px", color: "#666" }}>
          <div>Role: {isTeacher ? "Teacher" : "Learner"}</div>
          <div>Screen share: {screenShareStream ? "Active" : "None"}</div>
        </div>
      </section>

      {/* RIGHT: picker (teacher only) + classroom viewer */}
      <section className="classroom-prep-pane">
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
              classroomChannel={classroomChannel}
              screenShareStream={screenShareStream}
              isTeacher={isTeacher}
            />
          ) : (
            <div className="prep-viewer prep-viewer__placeholder">
              <h2>No resource selected</h2>
              <p>
                {isTeacher
                  ? "Use the bar above to choose a track, book, level, unit and resource."
                  : "Waiting for your teacher to pick a resource."}
              </p>

              {/* 🔥 Show screen share even without resource selected */}
              {screenShareStream && (
                <div style={{ marginTop: "20px" }}>
                  <p>
                    <strong>Screen share is active!</strong>
                  </p>
                  <video
                    autoPlay
                    playsInline
                    muted={isTeacher}
                    style={{
                      width: "100%",
                      maxHeight: "400px",
                      background: "#000",
                    }}
                    ref={(el) => {
                      if (el && screenShareStream) {
                        el.srcObject = screenShareStream;
                      }
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
