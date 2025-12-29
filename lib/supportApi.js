// lib/supportApi.js

async function getCsrfToken() {
  const res = await fetch("/api/csrf-token", {
    method: "GET",
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch CSRF token");
  }

  const data = await res.json();
  return data.csrfToken;
}

async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    credentials: "include",
    ...options,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Request failed");
  }

  return res.json();
}

export async function listSupportTickets() {
  return apiFetch("/api/support/tickets");
}

export async function getSupportTicket(id) {
  return apiFetch(`/api/support/tickets/${id}`);
}

export async function createSupportTicket({ category, message }) {
  const csrfToken = await getCsrfToken();

  return apiFetch("/api/support/tickets", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "CSRF-Token": csrfToken,
    },
    body: JSON.stringify({ category, message }),
  });
}

export async function replyToSupportTicket({ ticketId, message }) {
  const csrfToken = await getCsrfToken();

  return apiFetch(`/api/support/tickets/${ticketId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "CSRF-Token": csrfToken,
    },
    body: JSON.stringify({ body: message }),
  });
}

export async function uploadSupportAttachment({ ticketId, file }) {
  const csrfRes = await fetch("/api/csrf-token", {
    credentials: "include",
  });
  const { csrfToken } = await csrfRes.json();

  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`/api/support/tickets/${ticketId}/attachments`, {
    method: "POST",
    headers: {
      "CSRF-Token": csrfToken,
    },
    credentials: "include",
    body: formData,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || data.message || "Upload failed");
  }

  return res.json();
}
