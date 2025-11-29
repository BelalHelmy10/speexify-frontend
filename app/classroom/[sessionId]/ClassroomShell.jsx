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

  const { resourcesById } = useMemo(() => buildResourceIndex(tracks), [tracks]);

  const [selectedResourceId, setSelectedResourceId] = useState(null);
  const [screenShareStream, setScreenShareStream] = useState(null);

  const classroomChannel = useClassroomChannel(String(sessionId));
  const { ready, send, subscribe } = classroomChannel;

  // Debug: log screen share state
  useEffect(() => {
    console.log(
      "[ClassroomShell] screenShareStream updated:",
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

  // Learner listens for teacher resource changes
  useEffect(() => {
    if (!ready) return;

    const unsubscribe = subscribe((message) => {
      if (message?.type === "SET_RESOURCE") {
        const { resourceId } = message;
        if (resourceId && resourcesById[resourceId]) {
          console.log("[Classroom] Applying teacher resource:", resourceId);
          setSelectedResourceId(resourceId);
        }
      }
    });

    return unsubscribe;
  }, [ready, resourcesById, subscribe]);

  // Teacher: auto-select first resource
  useEffect(() => {
    if (!isTeacher) return;
    if (selectedResourceId) return;

    const allResources = Object.values(resourcesById || {});
    if (!allResources.length) return;

    const first = allResources[0];
    if (!first?._id) return;

    setSelectedResourceId(first._id);
  }, [isTeacher, resourcesById, selectedResourceId]);

  // Teacher: broadcast resource changes
  useEffect(() => {
    if (!isTeacher || !ready || !selectedResourceId) return;

    console.log("[Classroom] Broadcasting resource:", selectedResourceId);
    send({ type: "SET_RESOURCE", resourceId: selectedResourceId });
  }, [isTeacher, ready, selectedResourceId, send]);

  function handleChangeResourceId(nextId) {
    setSelectedResourceId(nextId || null);
  }

  function handleScreenShareStreamChange(stream) {
    console.log("[ClassroomShell] handleScreenShareStreamChange:", stream);
    setScreenShareStream(stream);
  }

  const resource = selectedResourceId
    ? resourcesById[selectedResourceId] || null
    : null;
  const viewer = resource ? getViewerInfo(resource) : null;

  return (
    <div className="classroom-layout">
      {/* LEFT: video call */}
      <section className="classroom-video-pane">
        <PrepVideoCall
          roomId={sessionId}
          isTeacher={isTeacher}
          onScreenShareStreamChange={handleScreenShareStreamChange}
        />

        {/* Debug panel */}
        <div
          style={{
            padding: "8px",
            fontSize: "11px",
            color: "#888",
            borderTop: "1px solid #eee",
          }}
        >
          <div>Role: {isTeacher ? "Teacher" : "Learner"}</div>
          <div>Screen share: {screenShareStream ? "✅ Active" : "❌ None"}</div>
          {screenShareStream && (
            <div>
              Tracks:{" "}
              {screenShareStream
                .getTracks()
                .map((t) => t.kind)
                .join(", ")}
            </div>
          )}
        </div>
      </section>

      {/* RIGHT: resource picker + viewer */}
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
              <h2>
                {screenShareStream
                  ? "Screen Share Active"
                  : "No resource selected"}
              </h2>
              <p>
                {screenShareStream
                  ? "The screen share is being displayed."
                  : isTeacher
                  ? "Use the bar above to choose a track, book, level, unit and resource."
                  : "Waiting for your teacher to pick a resource."}
              </p>

              {/* 🔥 Fallback: show screen share even without a resource */}
              {screenShareStream && (
                <div style={{ marginTop: "20px", width: "100%" }}>
                  <video
                    autoPlay
                    playsInline
                    muted={isTeacher}
                    style={{
                      width: "100%",
                      maxHeight: "500px",
                      background: "#000",
                      borderRadius: "8px",
                    }}
                    ref={(el) => {
                      if (el && screenShareStream) {
                        el.srcObject = screenShareStream;
                        el.play().catch(() => {});
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
