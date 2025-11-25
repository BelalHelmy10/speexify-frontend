// app/classroom/[sessionId]/ClassroomShell.jsx
"use client";

import { useState, useMemo, useEffect } from "react";
import PrepVideoCall from "@/app/resources/prep/PrepVideoCall";
import PrepShell from "@/app/resources/prep/PrepShell";
import ClassroomResourcePicker from "./ClassroomResourcePicker";
import { buildResourceIndex, getViewerInfo } from "./classroomHelpers";

export default function ClassroomShell({ session, sessionId, tracks }) {
  const isTeacher = session.role === "teacher" || session.isTeacher;

  const { resourcesById } = useMemo(() => buildResourceIndex(tracks), [tracks]);

  const [selectedResourceId, setSelectedResourceId] = useState(null);

  useEffect(() => {
    if (!selectedResourceId) {
      const first = Object.values(resourcesById)[0];
      if (first) setSelectedResourceId(first._id);
    }
  }, [resourcesById, selectedResourceId]);

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

      {/* RIGHT: picker (teacher only) + prep viewer */}
      <section className="classroom-prep-pane">
        {isTeacher && (
          <ClassroomResourcePicker
            tracks={tracks}
            selectedResourceId={selectedResourceId}
            onChangeResourceId={setSelectedResourceId}
          />
        )}

        <div className="classroom-prep-pane__content">
          {resource ? (
            <PrepShell
              resource={resource}
              viewer={viewer}
              // you already hid the left info card in classroom mode earlier
              inClassroom
            />
          ) : (
            <div className="prep-viewer__placeholder">
              <h2>No resource selected</h2>
              <p>
                {isTeacher
                  ? "Use the bar above to choose a unit and resource."
                  : "Waiting for your teacher to pick a resource."}
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
