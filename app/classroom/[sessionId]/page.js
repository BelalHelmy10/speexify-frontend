// app/classroom/[sessionId]/page.jsx
import PrepShell from "@/app/resources/prep/PrepShell";
import PrepVideoCall from "@/app/resources/prep/PrepVideoCall";
import api from "@/lib/api";

// fetch session info from your backend
async function getSession(sessionId) {
  const { data } = await api.get(`/sessions/${sessionId}`);
  return data;
}

export default async function ClassroomPage({ params, searchParams }) {
  const sessionId = params.sessionId;
  const session = await getSession(sessionId);

  // Optionally: if the session stores a main resourceId, pull it here
  const resourceId = session.resourceId || searchParams.resourceId || null;

  return (
    <div className="classroom-page">
      {/* LEFT / TOP: video */}
      <PrepVideoCall roomId={sessionId} />

      {/* RIGHT / BOTTOM: prep UI (PDF, notes, etc.) */}
      {resourceId && (
        <PrepShell
          resourceId={resourceId}
          // whatever other props you already pass
        />
      )}
    </div>
  );
}
