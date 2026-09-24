"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";

const STATUS_LABELS = [
  ["PENDING", "Pending"],
  ["PROCESSING", "Processing"],
  ["SENT", "Sent"],
  ["FAILED", "Failed"],
  ["BOUNCED", "Bounced"],
  ["COMPLAINED", "Complaints"],
  ["SUPPRESSED", "Suppressed"],
];

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function AdminNotificationDeliveriesSection() {
  const [deliveryData, setDeliveryData] = useState({ items: [], counts: {}, suppressionCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryingId, setRetryingId] = useState(null);

  const loadDeliveries = useCallback(async () => {
    try {
      const { data } = await api.get("/admin/notification-deliveries?limit=20");
      setDeliveryData({
        items: data?.items || [],
        counts: data?.counts || {},
        suppressionCount: data?.suppressionCount || 0,
      });
      setError("");
    } catch (requestError) {
      setError(
        requestError.response?.data?.error ||
          "Unable to load notification delivery status"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDeliveries();
    const intervalId = window.setInterval(loadDeliveries, 30000);
    return () => window.clearInterval(intervalId);
  }, [loadDeliveries]);

  async function retryDelivery(id) {
    setRetryingId(id);
    try {
      await api.post(`/admin/notification-deliveries/${id}/retry`);
      await loadDeliveries();
    } catch (requestError) {
      setError(
        requestError.response?.data?.error || "Unable to queue the delivery retry"
      );
    } finally {
      setRetryingId(null);
    }
  }

  return (
    <section className="adm-admin-card" aria-labelledby="notification-delivery-title">
      <div className="adm-admin-card__header">
        <div className="adm-admin-card__title-group">
          <div className="adm-admin-card__icon adm-admin-card__icon--accent" aria-hidden="true">
            <span aria-hidden="true">✉</span>
          </div>
          <div>
            <h2 className="adm-admin-card__title" id="notification-delivery-title">
              Notification delivery
            </h2>
            <p className="adm-admin-card__subtitle">
              Durable email status, retries, and provider failures
            </p>
          </div>
        </div>
        <button
          type="button"
          className="adm-btn-secondary"
          onClick={loadDeliveries}
          disabled={loading}
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <div className="adm-notification-delivery-summary" aria-label="Delivery counts">
        {STATUS_LABELS.map(([status, label]) => (
          <div className="adm-notification-delivery-metric" key={status}>
            <span>{label}</span>
            <strong>{deliveryData.counts[status] || 0}</strong>
          </div>
        ))}
        <div className="adm-notification-delivery-metric">
          <span>Suppressed</span>
          <strong>{deliveryData.suppressionCount || 0}</strong>
        </div>
      </div>

      {error ? (
        <div className="adm-notification-delivery-error" role="alert">
          {error}
        </div>
      ) : null}

      {loading && !deliveryData.items.length ? (
        <p className="adm-empty-state">Loading delivery status…</p>
      ) : deliveryData.items.length ? (
        <div className="adm-notification-delivery-table-wrap">
          <table className="adm-notification-delivery-table">
            <thead>
              <tr>
                <th scope="col">Event</th>
                <th scope="col">Recipient</th>
                <th scope="col">Status</th>
                <th scope="col">Attempts</th>
                <th scope="col">Last activity</th>
                <th scope="col"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {deliveryData.items.map((delivery) => (
                <tr key={delivery.id}>
                  <td>
                    <strong>{delivery.eventType}</strong>
                    <span className="adm-notification-delivery-subject">{delivery.subject}</span>
                  </td>
                  <td>{delivery.recipient}</td>
                  <td>
                    <span className={`adm-notification-delivery-status adm-notification-delivery-status--${String(delivery.status || "").toLowerCase()}`}>
                      {delivery.status}
                    </span>
                    {delivery.lastError ? (
                      <span className="adm-notification-delivery-error-text" title={delivery.lastError}>
                        {delivery.lastError}
                      </span>
                    ) : null}
                  </td>
                  <td>{delivery.attempts}</td>
                  <td>{formatDate(delivery.sentAt || delivery.lastAttemptAt || delivery.createdAt)}</td>
                  <td>
                    {delivery.status === "FAILED" || delivery.status === "PENDING" ? (
                      <button
                        type="button"
                        className="adm-btn-icon-modern"
                        onClick={() => retryDelivery(delivery.id)}
                        disabled={retryingId === delivery.id}
                        aria-label={`Retry ${delivery.eventType} delivery`}
                      >
                        {retryingId === delivery.id ? "…" : "Retry"}
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="adm-empty-state">No notification deliveries have been recorded yet.</p>
      )}
    </section>
  );
}
