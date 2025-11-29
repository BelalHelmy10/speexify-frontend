// app/classroom/[sessionId]/ClassroomShell.jsx
"use client";

import { useState, useMemo, useEffect } from "react";
import PrepVideoCall from "@/app/resources/prep/PrepVideoCall";
import PrepShell from "@/app/resources/prep/PrepShell";
import ClassroomResourcePicker from "./ClassroomResourcePicker";
import { buildResourceIndex, getViewerInfo } from "./classroomHelpers";
import { useClassroomChannel } from "@/app/resources/prep/useClassroomChannel";
import ClassroomChat from "./ClassroomChat";

export default function ClassroomShell({ session, sessionId, tracks }) {
  // ─────────────────────────────────────────────────────────────
  // ROLE + USER INFO (safe, no crashes if fields are missing)
  // ─────────────────────────────────────────────────────────────
  const userObj = session?.user || session || {};

  const isTeacher =
    userObj.role === "teacher" ||
    userObj.isTeacher === true ||
    userObj.userType === "teacher" ||
    session?.role === "teacher" ||
    session?.isTeacher === true ||
    session?.userType === "teacher";

  const userId = userObj.id ?? userObj._id ?? session?.userId ?? null;

  const firstName =
    userObj.firstName || userObj.givenName || userObj.name || "";

  const lastName = userObj.lastName || userObj.familyName || "";

  const userName =
    [firstName, lastName].filter(Boolean).join(" ") ||
    (isTeacher ? "Teacher" : "Learner");

  // ─────────────────────────────────────────────────────────────
  // RESOURCE INDEX
  // ─────────────────────────────────────────────────────────────
  const { resourcesById } = useMemo(
    () => buildResourceIndex(tracks || []),
    [tracks]
  );

  const [selectedResourceId, setSelectedResourceId] = useState(null);
  const [screenShareStream, setScreenShareStream] = useState(null);

  // ─────────────────────────────────────────────────────────────
  // REAL-TIME CLASSROOM CHANNEL (defensive)
  // ─────────────────────────────────────────────────────────────
  const classroomChannel = useClassroomChannel(String(sessionId));

  const ready = classroomChannel?.ready ?? false;
  const send = classroomChannel?.send ?? (() => {});
  const subscribe = classroomChannel?.subscribe ?? (() => () => {});

  // ─────────────────────────────────────────────────────────────
  // LEARNER: listen for teacher changing the resource
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!ready) return;

    const unsubscribe = subscribe((message) => {
      if (message?.type === "SET_RESOURCE") {
        const { resourceId } = message;
        if (resourceId && resourcesById[resourceId]) {
          setSelectedResourceId(resourceId);
        }
      }
    });

    return unsubscribe;
  }, [ready, resourcesById, subscribe]);

  // ─────────────────────────────────────────────────────────────
  // TEACHER: auto-select first resource on load
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isTeacher) return;
    if (selectedResourceId) return;

    const allResources = Object.values(resourcesById || {});
    if (!allResources.length) return;

    const first = allResources[0];
    if (!first?._id) return;

    setSelectedResourceId(first._id);
  }, [isTeacher, resourcesById, selectedResourceId]);

  // ─────────────────────────────────────────────────────────────
  // TEACHER: broadcast resource changes
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isTeacher || !ready || !selectedResourceId) return;
    send({ type: "SET_RESOURCE", resourceId: selectedResourceId });
  }, [isTeacher, ready, selectedResourceId, send]);

  function handleChangeResourceId(nextId) {
    setSelectedResourceId(nextId || null);
  }

  function handleScreenShareStreamChange(stream) {
    setScreenShareStream(stream);
  }

  const resource = selectedResourceId
    ? resourcesById[selectedResourceId] || null
    : null;
  const viewer = resource ? getViewerInfo(resource) : null;

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="classroom-layout">
      {/* LEFT: video call + chat */}
      <section className="classroom-video-pane">
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            width: "100%",
          }}
        >
          <PrepVideoCall
            roomId={sessionId}
            isTeacher={isTeacher}
            onScreenShareStreamChange={handleScreenShareStreamChange}
          />

          <ClassroomChat
            classroomChannel={classroomChannel}
            sessionId={sessionId}
            userId={userId}
            userName={userName}
            isTeacher={isTeacher}
          />
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

              {/* Fallback: show screen share even without a resource */}
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
