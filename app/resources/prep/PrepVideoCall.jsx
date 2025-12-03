// app/resources/prep/PrepVideoCall.jsx
"use client";

import { useMemo } from "react";

export default function PrepVideoCall({ roomId, isTeacher }) {
  // Stable room name based on your classroom session
  const roomName = useMemo(() => `speexify-classroom-${roomId}`, [roomId]);

  return (
    <section className="prep-video">
      <header className="prep-video__header">
        <h2 className="prep-video__title">Live video</h2>
        <p className="prep-video__subtitle">
          Start a 1-to-1 call with your learner directly in the classroom.
        </p>
      </header>

      <div className="prep-video__body">
        <div className="prep-video__frame-wrapper">
          <iframe
            title="Speexify Classroom Video"
            src={`https://meet.speexify.com/${roomName}`}
            allow="camera; microphone; fullscreen; display-capture; clipboard-read; clipboard-write"
            allowFullScreen
            style={{
              width: "100%",
              height: "100%",
              border: "0",
              borderRadius: "inherit",
            }}
          />
        </div>

        <p className="prep-video__hint">
          You are using the new Jitsi-powered media server
          {isTeacher ? " (teacher view)" : ""}. Share this classroom link with
          your learner to join the same room.
        </p>
      </div>
    </section>
  );
}
