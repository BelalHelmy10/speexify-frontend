// app/classroom/[sessionId]/ClassroomShell.jsx
"use client";

import { useState, useMemo, useEffect } from "react";
import PrepVideoCall from "@/app/resources/prep/PrepVideoCall";
import PrepShell from "@/app/resources/prep/PrepShell";
import ClassroomResourcePicker from "./ClassroomResourcePicker";
import { buildResourceIndex, getViewerInfo } from "./classroomHelpers";
// helpers we’ll define in a moment

export default function ClassroomShell({ session, sessionId, tracks }) {
  const isTeacher = session.role === "teacher" || session.isTeacher;

  // Build the same index you use on /resources,
  // but here we only need to be able to go from selected resourceId
  // to the full resource object.
  const { resourcesById } = useMemo(() => buildResourceIndex(tracks), [tracks]);

  const [selectedResourceId, setSelectedResourceId] = useState(null);

  // default: if there is at least one resource in the tree, auto-select it
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

        {resource ? (
          <PrepShell
            resource={resource}
            viewer={viewer}
            sessionId={sessionId} // same room id for collaboration
            collaborative
          />
        ) : (
          <div className="prep-viewer__placeholder">
            <h2>No resource selected</h2>
            <p>
              {isTeacher
                ? "Use the picker above to choose a unit and resource."
                : "Waiting for your teacher to pick a resource."}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
