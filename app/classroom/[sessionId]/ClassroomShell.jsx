// app/classroom/[sessionId]/ClassroomShell.jsx
"use client";

import { useState, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import ClassroomResourcePicker from "./ClassroomResourcePicker";
import { buildResourceIndex, getViewerInfo } from "./classroomHelpers";
import { useClassroomChannel } from "@/app/resources/prep/useClassroomChannel";
import ClassroomChat from "./ClassroomChat";

// Lazy-load WebRTC video (heavy) – client only
const PrepVideoCall = dynamic(
  () => import("@/app/resources/prep/PrepVideoCall"),
  {
    ssr: false,
    loading: () => (
      <div className="prep-viewer prep-viewer__placeholder">
        <h2>Connecting video…</h2>
        <p>This will only take a moment.</p>
      </div>
    ),
  }
);

// Lazy-load the full PrepShell (PDFs, annotations, etc.)
const PrepShell = dynamic(() => import("@/app/resources/prep/PrepShell"), {
  ssr: false,
  loading: () => (
    <div className="prep-viewer prep-viewer__placeholder">
      <h2>Loading classroom material…</h2>
      <p>Please wait while we prepare your resource.</p>
    </div>
  ),
});

/**
 * Safely build a display name from a user-like object or plain string.
 */
function buildDisplayName(source) {
  if (!source) return "";

  if (typeof source === "string") {
    return source;
  }

  // explicit fields first
  if (source.fullName) return source.fullName;
  if (source.name) return source.name;
  if (source.displayName) return source.displayName;

  const first = source.firstName || source.givenName || source.first_name || "";
  const last = source.lastName || source.familyName || source.last_name || "";

  const combined = [first, last].filter(Boolean).join(" ");
  return combined || "";
}

/**
 * Try to extract teacher / learner identities from the session object.
 * This is defensive and will happily ignore fields that don't exist.
 */
function getParticipantsFromSession(session) {
  const s = session || {};

  // teacher-ish objects / ids / names
  const teacherObj =
    s.teacherUser ||
    s.teacher ||
    s.tutor ||
    s.teacherProfile ||
    s.teacherAccount ||
    null;

  const learnerObj =
    s.learnerUser ||
    s.learner ||
    s.student ||
    s.learnerProfile ||
    s.user ||
    null;

  const teacherId =
    (teacherObj && (teacherObj.id || teacherObj._id)) || s.teacherId || null;

  const learnerId =
    (learnerObj && (learnerObj.id || learnerObj._id)) || s.learnerId || null;

  const teacherName =
    s.teacherName ||
    s.teacherDisplayName ||
    buildDisplayName(teacherObj) ||
    "Teacher";

  const learnerName =
    s.learnerName ||
    s.learnerDisplayName ||
    buildDisplayName(learnerObj) ||
    "Learner";

  return {
    teacherId,
    learnerId,
    teacherName,
    learnerName,
  };
}

export default function ClassroomShell({ session, sessionId, tracks }) {
  const { teacherId, learnerId, teacherName, learnerName } =
    getParticipantsFromSession(session);

  // Decide role for the *current viewer*
  const isTeacher =
    session?.role === "teacher" ||
    session?.isTeacher === true ||
    session?.userType === "teacher" ||
    (session?.currentUser && session.currentUser.role === "teacher");

  const userId = isTeacher ? teacherId : learnerId;
  const userName = isTeacher ? teacherName : learnerName;

  // This viewer object is what we pass to ClassroomChat
  const classroomViewer = {
    id: userId ?? null,
    name: userName ?? "",
    role: isTeacher ? "teacher" : "learner",
  };

  // ─── Resources index ────────────────────────────────────────
  const { resourcesById } = useMemo(
    () => buildResourceIndex(tracks || []),
    [tracks]
  );

  const [selectedResourceId, setSelectedResourceId] = useState(null);
  const [screenShareStream, setScreenShareStream] = useState(null);

  // ─── Real-time channel ──────────────────────────────────────
  const classroomChannel = useClassroomChannel(String(sessionId));
  const ready = classroomChannel?.ready ?? false;
  const send = classroomChannel?.send ?? (() => {});
  const subscribe = classroomChannel?.subscribe ?? (() => () => {});

  // Learner: listen for teacher resource changes
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

  // This viewer is for the PrepShell (resource viewer), so give it a different name
  const resourceViewer = resource ? getViewerInfo(resource) : null;

  return (
    <div className="classroom-layout">
      {/* LEFT: video + chat */}
      <section className="classroom-video-pane">
        <PrepVideoCall
          roomId={sessionId}
          isTeacher={isTeacher}
          onScreenShareStreamChange={handleScreenShareStreamChange}
        />

        <ClassroomChat
          classroomChannel={classroomChannel}
          sessionId={sessionId}
          viewer={classroomViewer}
          teacherName={teacherName}
          learnerName={learnerName}
        />
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
              viewer={resourceViewer}
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
