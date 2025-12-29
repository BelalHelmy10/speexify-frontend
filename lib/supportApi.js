// lib/supportApi.js
// IMPROVED: Cached CSRF tokens, better error handling, AbortController support

// CSRF token cache (shared across all support API calls)
let csrfToken = null;
let csrfTokenPromise = null;

/**
 * Fetch CSRF token (with caching)
 */
async function getCsrfToken(forceRefresh = false) {
  if (csrfToken && !forceRefresh) {
    return csrfToken;
  }

  // Prevent multiple simultaneous requests
  if (csrfTokenPromise) {
    return csrfTokenPromise;
  }

  csrfTokenPromise = fetch("/api/csrf-token", {
    method: "GET",
    credentials: "include",
    headers: {
      "Cache-Control": "no-store",
    },
  })
    .then((res) => {
      if (!res.ok) {
        throw new Error("Failed to fetch CSRF token");
      }
      return res.json();
    })
    .then((data) => {
      csrfToken = data.csrfToken;
      csrfTokenPromise = null;
      return csrfToken;
    })
    .catch((err) => {
      csrfTokenPromise = null;
      throw err;
    });

  return csrfTokenPromise;
}

/**
 * Clear cached CSRF token (call after logout or session changes)
 */
export function clearCsrfToken() {
  csrfToken = null;
  csrfTokenPromise = null;
}

/**
 * Enhanced fetch with CSRF token and error handling
 */
async function apiFetch(url, options = {}, retryCount = 0) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

  try {
    const res = await fetch(url, {
      credentials: "include",
      signal: controller.signal,
      ...options,
      headers: {
        ...options.headers,
      },
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));

      // Handle CSRF token errors with retry
      if (
        res.status === 403 &&
        data.error === "Invalid CSRF token" &&
        retryCount === 0
      ) {
        // Clear token and retry once
        csrfToken = null;
        const newToken = await getCsrfToken(true);

        return apiFetch(
          url,
          {
            ...options,
            headers: {
              ...options.headers,
              "CSRF-Token": newToken,
            },
          },
          1
        );
      }

      throw new Error(data.error || `Request failed with status ${res.status}`);
    }

    return res.json();
  } catch (err) {
    clearTimeout(timeoutId);

    if (err.name === "AbortError") {
      throw new Error("Request timeout");
    }

    throw err;
  }
}

/**
 * List support tickets
 */
export async function listSupportTickets() {
  return apiFetch("/api/support/tickets", {
    method: "GET",
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

/**
 * Get support ticket by ID
 */
export async function getSupportTicket(id) {
  return apiFetch(`/api/support/tickets/${id}`, {
    method: "GET",
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

/**
 * Create support ticket
 */
export async function createSupportTicket({
  category,
  message,
  priority = "NORMAL",
}) {
  const token = await getCsrfToken();

  return apiFetch("/api/support/tickets", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "CSRF-Token": token,
    },
    body: JSON.stringify({ category, message, priority }),
  });
}

/**
 * Reply to support ticket
 */
export async function replyToSupportTicket({ ticketId, message }) {
  const token = await getCsrfToken();

  return apiFetch(`/api/support/tickets/${ticketId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "CSRF-Token": token,
    },
    body: JSON.stringify({ body: message }),
  });
}

/**
 * Upload attachment to support ticket
 */
export async function uploadSupportAttachment({ ticketId, file }) {
  const token = await getCsrfToken();

  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`/api/support/tickets/${ticketId}/attachments`, {
    method: "POST",
    headers: {
      "CSRF-Token": token,
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

// ============================================================================
// Admin API functions
// ============================================================================

/**
 * List all tickets (admin)
 */
export async function adminListTickets({
  status,
  priority,
  assignedToId,
  q,
} = {}) {
  const params = new URLSearchParams();
  if (status) params.append("status", status);
  if (priority) params.append("priority", priority);
  if (assignedToId) params.append("assignedToId", assignedToId);
  if (q) params.append("q", q);

  return apiFetch(`/api/support/admin/tickets?${params}`, {
    method: "GET",
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

/**
 * Get ticket (admin)
 */
export async function adminGetTicket(id) {
  return apiFetch(`/api/support/admin/tickets/${id}`, {
    method: "GET",
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

/**
 * Reply to ticket (admin)
 */
export async function adminReplyToTicket({ ticketId, message }) {
  const token = await getCsrfToken();

  return apiFetch(`/api/support/admin/tickets/${ticketId}/reply`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "CSRF-Token": token,
    },
    body: JSON.stringify({ message }),
  });
}

/**
 * Update ticket status (admin)
 */
export async function adminUpdateTicketStatus({ ticketId, status }) {
  const token = await getCsrfToken();

  return apiFetch(`/api/support/admin/tickets/${ticketId}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "CSRF-Token": token,
    },
    body: JSON.stringify({ status }),
  });
}

/**
 * Assign ticket (admin)
 */
export async function adminAssignTicket({ ticketId, assignedToId }) {
  const token = await getCsrfToken();

  return apiFetch(`/api/support/admin/tickets/${ticketId}/assign`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "CSRF-Token": token,
    },
    body: JSON.stringify({ assignedToId }),
  });
}

/**
 * Add internal note (admin)
 */
export async function adminAddInternalNote({ ticketId, note }) {
  const token = await getCsrfToken();

  return apiFetch(`/api/support/admin/tickets/${ticketId}/notes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "CSRF-Token": token,
    },
    body: JSON.stringify({ note }),
  });
}
