// app/classroom/[sessionId]/page.jsx
import Link from "next/link";
import PrepShell from "@/app/resources/prep/PrepShell";
import PrepVideoCall from "@/app/resources/prep/PrepVideoCall";
import api from "@/lib/api";

export const dynamic = "force-dynamic";

// Load one session from the backend
async function getSession(sessionId) {
  try {
    const { data } = await api.get(`/sessions/${sessionId}`);
    // your /sessions/:id endpoint returns { session: { ... } }
    return data?.session || null;
  } catch (err) {
    console.error("Failed to load session for classroom", err);
    return null;
  }
}

export default async function ClassroomPage({ params }) {
  const sessionId = params.sessionId;
  const session = await getSession(sessionId);

  // If the session doesn’t exist or failed to load,
  // show a friendly message instead of the global 404 page.
  if (!session) {
    return (
      <div className="resources-page">
        <div className="resources-page__inner prep-page">
          <div className="prep-empty-card">
            <h1 className="prep-empty-card__title">Session not found</h1>
            <p className="prep-empty-card__text">
              Unable to load this classroom (session #{sessionId}).
            </p>
            <Link
              href="/dashboard"
              className="resources-button resources-button--primary"
            >
              ← Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // If you store a "main" resource for the session, use it
  const resourceId = session.resourceId || null;

  return (
    <div className="resources-page">
      <div className="resources-page__inner prep-page">
        {/* Left card with session info */}
        <aside className="prep-info-card">
          <div className="prep-info-card__header">
            <h1 className="prep-info-card__title">
              {session.title || "Classroom"}
            </h1>
            <p className="prep-info-card__description">
              This is your private room for this session. Both teacher and
              learner see the same video room (session #{sessionId}).
            </p>
          </div>

          <div className="prep-info-card__actions">
            <Link
              href="/dashboard"
              className="resources-button resources-button--ghost"
            >
              ← Back to dashboard
            </Link>
            <Link
              href={`/dashboard/sessions/${session.id}`}
              className="resources-button resources-button--ghost"
            >
              View session details
            </Link>
          </div>

          {/* WebRTC call – uses the sessionId as the room key */}
          <PrepVideoCall roomId={sessionId} />
        </aside>

        {/* Right side: resource prep UI if we have a resourceId */}
        <section className="prep-viewer">
          {resourceId ? (
            <PrepShell
              // PrepShell will fetch the resource itself via Sanity,
              // and use the same WebRTC room (sessionId) inside.
              resource={{ _id: resourceId }}
              viewer={null} // PrepShell will recompute viewer from resource
              sessionId={sessionId}
            />
          ) : (
            <div className="prep-viewer__placeholder">
              <h2>No resource attached</h2>
              <p>
                You can still use the classroom for conversation. Attach a
                resource to this session later from the resources section.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
