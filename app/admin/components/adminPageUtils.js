export const toDateInput = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

export const toTimeInput = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mi}`;
};

export const fmt = (iso) =>
  new Date(iso).toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export const joinDateTime = (dateStr, timeStr) => {
  if (!dateStr || !timeStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0, 0);
};

export const diffMinutes = (start, end) => {
  if (!start || !end) return 0;
  let ms = end - start;
  if (ms < 0) ms += 24 * 60 * 60 * 1000;
  return Math.round(ms / 60000);
};

export const normType = (v) => String(v || "ONE_ON_ONE").toUpperCase();

export const getSessionLearnerDisplay = (session) => {
  const type = normType(session.type);
  if (type === "GROUP") {
    const learners = session.learners || [];
    const count =
      session.participantCount ??
      learners.filter((l) => l.status !== "canceled").length;
    const cap = session.capacity;

    if (learners.length === 0) {
      return `${count} participant${count !== 1 ? "s" : ""}${cap ? ` / ${cap}` : ""}`;
    }

    const names = learners
      .filter((l) => l.status !== "canceled")
      .slice(0, 2)
      .map((l) => l.name || l.email?.split("@")[0] || "Learner")
      .join(", ");
    const extra = count > 2 ? ` +${count - 2} more` : "";
    return `${names}${extra}${cap ? ` (${count}/${cap})` : ` (${count})`}`;
  }

  return session.user?.name || session.user?.email || "No learner";
};
