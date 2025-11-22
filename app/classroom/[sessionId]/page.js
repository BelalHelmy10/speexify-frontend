// app/classroom/[sessionId]/page.jsx

import PrepVideoCall from "@/app/resources/prep/PrepVideoCall";
import PrepShell from "@/app/resources/prep/PrepShell";

// Use server-side fetch instead of axios/api.js
async function getSession(sessionId) {
  const apiBase = process.env.NEXT_PUBLIC_API_URL;

  const res = await fetch(`${apiBase}/api/sessions/${sessionId}`, {
    method: "GET",
    cache: "no-store",
    credentials: "include",
  });

  if (!res.ok) {
    console.error("Failed to fetch session:", await res.text());
    return null;
  }

  const data = await res.json();
  return data?.session || null;
}

export default async function ClassroomPage({ params, searchParams }) {
  const sessionId = params.sessionId;
  const session = await getSession(sessionId);

  if (!session) {
    return (
      <div className="resources-page">
        <div className="resources-page__inner prep-page">
          <h1>Session not found</h1>
          <p>Unable to load this classroom.</p>
        </div>
      </div>
    );
  }

  // Optionally load resource (if your Session has resourceId)
  const resourceId = session.resourceId || searchParams?.resourceId || null;

  return (
    <div className="resources-page">
      <div className="resources-page__inner prep-page" style={{ gap: "2rem" }}>
        {/* LEFT SIDE: Live Video */}
        <section style={{ flex: "0 0 420px" }}>
          <PrepVideoCall roomId={sessionId} />
        </section>

        {/* RIGHT SIDE: Resource Viewer + Annotations */}
        <section style={{ flex: 1 }}>
          {resourceId ? (
            <PrepShell resourceId={resourceId} />
          ) : (
            <div className="prep-viewer__placeholder">
              <h2>No resource selected</h2>
              <p>This session has no assigned lesson material.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
