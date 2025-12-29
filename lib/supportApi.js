// lib/supportApi.js

function getCsrfToken() {
  if (typeof document === "undefined") return null;

  const match = document.cookie.match(/csrfToken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function createSupportTicket({ category, message }) {
  const csrfToken = getCsrfToken();

  const res = await fetch("/api/support/tickets", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
    },
    credentials: "include",
    body: JSON.stringify({
      category,
      message,
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to contact support");
  }

  return res.json();
}
