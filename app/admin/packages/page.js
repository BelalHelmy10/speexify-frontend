// app/admin/packages/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import useAuth from "@/hooks/useAuth";
import { useToast, useConfirm } from "@/components/ToastProvider";
import "@/styles/admin.scss";

const normAudience = (v) => String(v || "INDIVIDUAL").toUpperCase();
const normPriceType = (v) => String(v || "BUNDLE").toUpperCase();

function toNumberOrNull(v) {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default function AdminPackagesPage() {
  const { toast } = useToast();
  const { confirmModal } = useConfirm();
  const { user, checking } = useAuth();

  const isAdmin = user?.role === "admin";

  // Filters
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [audience, setAudience] = useState(""); // "", INDIVIDUAL, CORPORATE
  const [active, setActive] = useState(""); // "", "true", "false"

  // Data
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);

  // Create form (modal)
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: "",
    description: "",
    audience: "INDIVIDUAL",
    priceType: "BUNDLE",
    priceUSD: "",
    startingAtUSD: "",
    sessionsPerPack: "",
    durationMin: "",
    sortOrder: "0",
    isPopular: false,
    active: true,
    image: "",
    features: "",
  });

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q), 250);
    return () => clearTimeout(t);
  }, [q]);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (qDebounced.trim()) p.set("q", qDebounced.trim());
    if (audience) p.set("audience", audience);
    if (active) p.set("active", active);
    return p.toString();
  }, [qDebounced, audience, active]);

  async function load() {
    if (!isAdmin) {
      setItems([]);
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.get(`/admin/packages?${queryString}`);
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error(e?.response?.data?.error || "Failed to load packages");
      setItems([]);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString, isAdmin]);

  async function patch(id, partial) {
    try {
      await api.patch(`/admin/packages/${id}`, partial);
      toast.success("Saved");
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.error || "Failed to save");
    }
  }

  async function del(id) {
    const ok = await confirmModal(
      "Delete this package? This cannot be undone."
    );
    if (!ok) return;
    try {
      await api.delete(`/admin/packages/${id}`);
      toast.success("Package deleted");
      setItems((rows) => rows.filter((r) => r.id !== id));
    } catch (e) {
      toast.error(e?.response?.data?.error || "Failed to delete");
    }
  }

  async function create(e) {
    e.preventDefault();
    if (!createForm.title.trim()) {
      toast.error("Title is required");
      return;
    }

    const payload = {
      title: createForm.title.trim(),
      description: createForm.description?.trim() || null,
      audience: normAudience(createForm.audience),
      priceType: normPriceType(createForm.priceType),
      priceUSD: toNumberOrNull(createForm.priceUSD),
      startingAtUSD: toNumberOrNull(createForm.startingAtUSD),
      sessionsPerPack: toNumberOrNull(createForm.sessionsPerPack),
      durationMin: toNumberOrNull(createForm.durationMin),
      sortOrder: Number(createForm.sortOrder || 0),
      isPopular: !!createForm.isPopular,
      active: !!createForm.active,
      image: createForm.image?.trim() || null,
      features: createForm.features || "",
    };

    try {
      await api.post("/admin/packages", payload);
      toast.success("Package created");
      setCreateOpen(false);
      setCreateForm({
        title: "",
        description: "",
        audience: "INDIVIDUAL",
        priceType: "BUNDLE",
        priceUSD: "",
        startingAtUSD: "",
        sessionsPerPack: "",
        durationMin: "",
        sortOrder: "0",
        isPopular: false,
        active: true,
        image: "",
        features: "",
      });
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.error || "Failed to create package");
    }
  }

  if (checking) {
    return (
      <div className="adm-admin-modern adm-admin-loading">
        Checking your permissions…
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="adm-admin-modern adm-admin-denied">
        <div className="adm-admin-card">
          <div className="adm-admin-card__header">
            <div className="adm-admin-card__title-group">
              <div className="adm-admin-card__icon adm-admin-card__icon--warning">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2L2 22H22L12 2Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M12 9V14"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <circle cx="12" cy="17" r="1" fill="currentColor" />
                </svg>
              </div>
              <div>
                <h1 className="adm-admin-card__title">Access denied</h1>
                <p className="adm-admin-card__subtitle">
                  You don&apos;t have permission to view this page.
                </p>
              </div>
            </div>
          </div>
          <div style={{ padding: "1.5rem" }}>
            <Link href="/dashboard" className="adm-btn-primary">
              Go to dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="adm-admin-modern">
      <div className="adm-admin-header">
        <div className="adm-admin-header__content">
          <h1 className="adm-admin-title">
            Packages
            <span className="adm-admin-subtitle">
              Manage what learners can buy (pricing, active/inactive, ordering,
              popular)
            </span>
          </h1>
        </div>

        <div className="adm-admin-header__actions" style={{ gap: 12 }}>
          <Link href="/admin" className="adm-btn-secondary">
            ← Back to Admin
          </Link>
          <button
            className="adm-btn-primary"
            onClick={() => setCreateOpen(true)}
          >
            + New Package
          </button>
        </div>
      </div>

      <section className="adm-admin-card">
        <div className="adm-admin-card__header">
          <div className="adm-admin-card__title-group">
            <div className="adm-admin-card__icon adm-admin-card__icon--accent">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect
                  x="3"
                  y="4"
                  width="18"
                  height="18"
                  rx="2"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M3 10H21"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div>
              <h2 className="adm-admin-card__title">Catalog</h2>
              <p className="adm-admin-card__subtitle">
                {busy ? "Loading…" : `${items.length} packages`}
              </p>
            </div>
          </div>

          <div className="adm-admin-card__actions" style={{ gap: 10 }}>
            <div className="adm-search-box">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M7 13C10.3137 13 13 10.3137 13 7C13 3.68629 10.3137 1 7 1C3.68629 1 1 3.68629 1 7C1 10.3137 3.68629 13 7 13Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <path
                  d="M11.5 11.5L15 15"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              <input
                type="text"
                placeholder="Search title/description/features…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            <select
              className="adm-filter-select"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
            >
              <option value="">All Audiences</option>
              <option value="INDIVIDUAL">Individual</option>
              <option value="CORPORATE">Corporate</option>
            </select>

            <select
              className="adm-filter-select"
              value={active}
              onChange={(e) => setActive(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </div>

        <div className="adm-data-table">
          {busy ? (
            <div className="adm-table-skeleton">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton skeleton--row" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="adm-empty">
              No packages found. Try changing filters.
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: 70 }}>ID</th>
                  <th>Title</th>
                  <th>Audience</th>
                  <th>Price Type</th>
                  <th>Price ($)</th>
                  <th>Starting At ($)</th>
                  <th>Sessions</th>
                  <th>Duration (min)</th>
                  <th>Sort</th>
                  <th>Popular</th>
                  <th>Active</th>
                  <th style={{ width: 120 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id}>
                    <td>#{p.id}</td>

                    <td style={{ minWidth: 220 }}>
                      <input
                        className="adm-form-input"
                        defaultValue={p.title || ""}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v !== (p.title || "")) patch(p.id, { title: v });
                        }}
                      />

                      <div style={{ marginTop: 6 }}>
                        <small style={{ opacity: 0.6 }}>Description:</small>
                        <textarea
                          className="adm-form-textarea"
                          defaultValue={p.description || ""}
                          rows={2}
                          style={{ marginTop: 4 }}
                          onBlur={(e) => {
                            const v = e.target.value.trim();
                            if (v !== (p.description || ""))
                              patch(p.id, { description: v || null });
                          }}
                        />
                      </div>

                      <div style={{ marginTop: 8 }}>
                        <small style={{ opacity: 0.6 }}>Features:</small>
                        <textarea
                          className="adm-form-textarea"
                          defaultValue={p.features || ""}
                          rows={2}
                          style={{ marginTop: 4 }}
                          onBlur={(e) => {
                            const v = e.target.value;
                            if (v !== (p.features || ""))
                              patch(p.id, { features: v });
                          }}
                        />
                      </div>

                      <div style={{ marginTop: 8 }}>
                        <small style={{ opacity: 0.6 }}>Image URL:</small>
                        <input
                          className="adm-form-input"
                          defaultValue={p.image || ""}
                          style={{ marginTop: 4 }}
                          onBlur={(e) => {
                            const v = e.target.value.trim();
                            if (v !== (p.image || ""))
                              patch(p.id, { image: v || null });
                          }}
                        />
                      </div>
                    </td>

                    <td>
                      <select
                        className="adm-form-input"
                        defaultValue={normAudience(p.audience)}
                        onChange={(e) =>
                          patch(p.id, { audience: e.target.value })
                        }
                      >
                        <option value="INDIVIDUAL">INDIVIDUAL</option>
                        <option value="CORPORATE">CORPORATE</option>
                      </select>
                    </td>

                    <td>
                      <select
                        className="adm-form-input"
                        defaultValue={normPriceType(p.priceType)}
                        onChange={(e) =>
                          patch(p.id, { priceType: e.target.value })
                        }
                      >
                        <option value="BUNDLE">BUNDLE</option>
                        <option value="PER_SESSION">PER_SESSION</option>
                        <option value="CUSTOM">CUSTOM</option>
                      </select>
                    </td>

                    <td>
                      <input
                        type="number"
                        className="adm-form-input"
                        step="0.01"
                        min="0"
                        defaultValue={p.priceUSD ?? ""}
                        placeholder="—"
                        onBlur={(e) => {
                          const next =
                            e.target.value === ""
                              ? null
                              : Number(e.target.value);
                          if ((p.priceUSD ?? null) !== (next ?? null))
                            patch(p.id, { priceUSD: next });
                        }}
                      />
                    </td>

                    <td>
                      <input
                        type="number"
                        className="adm-form-input"
                        step="0.01"
                        min="0"
                        defaultValue={p.startingAtUSD ?? ""}
                        placeholder="—"
                        onBlur={(e) => {
                          const next =
                            e.target.value === ""
                              ? null
                              : Number(e.target.value);
                          if ((p.startingAtUSD ?? null) !== (next ?? null))
                            patch(p.id, { startingAtUSD: next });
                        }}
                      />
                    </td>

                    <td>
                      <input
                        type="number"
                        className="adm-form-input"
                        min="0"
                        defaultValue={p.sessionsPerPack ?? ""}
                        placeholder="—"
                        onBlur={(e) => {
                          const next =
                            e.target.value === ""
                              ? null
                              : Number(e.target.value);
                          if ((p.sessionsPerPack ?? null) !== (next ?? null))
                            patch(p.id, { sessionsPerPack: next });
                        }}
                      />
                    </td>

                    <td>
                      <input
                        type="number"
                        className="adm-form-input"
                        min="0"
                        defaultValue={p.durationMin ?? ""}
                        placeholder="—"
                        onBlur={(e) => {
                          const next =
                            e.target.value === ""
                              ? null
                              : Number(e.target.value);
                          if ((p.durationMin ?? null) !== (next ?? null))
                            patch(p.id, { durationMin: next });
                        }}
                      />
                    </td>

                    <td>
                      <input
                        type="number"
                        className="adm-form-input"
                        defaultValue={p.sortOrder ?? 0}
                        onBlur={(e) => {
                          const next = Number(e.target.value || 0);
                          if (Number(p.sortOrder || 0) !== next)
                            patch(p.id, { sortOrder: next });
                        }}
                      />
                    </td>

                    <td style={{ textAlign: "center" }}>
                      <input
                        type="checkbox"
                        defaultChecked={!!p.isPopular}
                        onChange={(e) =>
                          patch(p.id, { isPopular: e.target.checked })
                        }
                      />
                    </td>

                    <td style={{ textAlign: "center" }}>
                      <input
                        type="checkbox"
                        defaultChecked={!!p.active}
                        onChange={(e) =>
                          patch(p.id, { active: e.target.checked })
                        }
                      />
                    </td>

                    <td>
                      <div className="adm-action-buttons">
                        <button
                          className="adm-btn-action adm-btn-action--danger"
                          onClick={() => del(p.id)}
                          title="Delete"
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 16 16"
                            fill="none"
                          >
                            <path
                              d="M2 4H14M6 7V11M10 7V11M3 4L4 13C4 13.5304 4.21071 14.0391 4.58579 14.4142C4.96086 14.7893 5.46957 15 6 15H10C10.5304 15 11.0391 14.7893 11.4142 14.4142C11.7893 14.0391 12 13.5304 12 13L13 4M5 4V2C5 1.73478 5.10536 1.48043 5.29289 1.29289C5.48043 1.10536 5.73478 1 6 1H10C10.2652 1 10.5196 1.10536 10.7071 1.29289C10.8946 1.48043 11 1.73478 11 2V4"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {createOpen && (
        <div className="adm-modal-overlay">
          <div className="adm-modal-content" style={{ maxWidth: 760 }}>
            <div className="adm-modal-header">
              <h2>+ Create Package</h2>
              <button
                className="adm-btn-close"
                onClick={() => setCreateOpen(false)}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M12 4L4 12M4 4L12 12"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            <div className="adm-modal-body">
              <form onSubmit={create} className="adm-modern-form">
                <div className="adm-form-grid">
                  <div className="adm-form-field adm-form-field--full">
                    <label className="adm-form-label">
                      Title<span className="adm-form-required">*</span>
                    </label>
                    <input
                      className="adm-form-input"
                      value={createForm.title}
                      onChange={(e) =>
                        setCreateForm((f) => ({ ...f, title: e.target.value }))
                      }
                      required
                    />
                  </div>

                  <div className="adm-form-field adm-form-field--full">
                    <label className="adm-form-label">Description</label>
                    <textarea
                      className="adm-form-textarea"
                      rows={3}
                      value={createForm.description}
                      onChange={(e) =>
                        setCreateForm((f) => ({
                          ...f,
                          description: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="adm-form-field">
                    <label className="adm-form-label">Audience</label>
                    <select
                      className="adm-form-input"
                      value={createForm.audience}
                      onChange={(e) =>
                        setCreateForm((f) => ({
                          ...f,
                          audience: e.target.value,
                        }))
                      }
                    >
                      <option value="INDIVIDUAL">INDIVIDUAL</option>
                      <option value="CORPORATE">CORPORATE</option>
                    </select>
                  </div>

                  <div className="adm-form-field">
                    <label className="adm-form-label">Price Type</label>
                    <select
                      className="adm-form-input"
                      value={createForm.priceType}
                      onChange={(e) =>
                        setCreateForm((f) => ({
                          ...f,
                          priceType: e.target.value,
                        }))
                      }
                    >
                      <option value="BUNDLE">BUNDLE</option>
                      <option value="PER_SESSION">PER_SESSION</option>
                      <option value="CUSTOM">CUSTOM</option>
                    </select>
                  </div>

                  <div className="adm-form-field">
                    <label className="adm-form-label">Price ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="adm-form-input"
                      value={createForm.priceUSD}
                      onChange={(e) =>
                        setCreateForm((f) => ({
                          ...f,
                          priceUSD: e.target.value,
                        }))
                      }
                      placeholder="e.g. 99"
                    />
                  </div>

                  <div className="adm-form-field">
                    <label className="adm-form-label">Starting At ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="adm-form-input"
                      value={createForm.startingAtUSD}
                      onChange={(e) =>
                        setCreateForm((f) => ({
                          ...f,
                          startingAtUSD: e.target.value,
                        }))
                      }
                      placeholder="optional"
                    />
                  </div>

                  <div className="adm-form-field">
                    <label className="adm-form-label">Sessions / Pack</label>
                    <input
                      type="number"
                      min="0"
                      className="adm-form-input"
                      value={createForm.sessionsPerPack}
                      onChange={(e) =>
                        setCreateForm((f) => ({
                          ...f,
                          sessionsPerPack: e.target.value,
                        }))
                      }
                      placeholder="optional"
                    />
                  </div>

                  <div className="adm-form-field">
                    <label className="adm-form-label">Duration (min)</label>
                    <input
                      type="number"
                      min="0"
                      className="adm-form-input"
                      value={createForm.durationMin}
                      onChange={(e) =>
                        setCreateForm((f) => ({
                          ...f,
                          durationMin: e.target.value,
                        }))
                      }
                      placeholder="optional"
                    />
                  </div>

                  <div className="adm-form-field">
                    <label className="adm-form-label">Sort Order</label>
                    <input
                      type="number"
                      className="adm-form-input"
                      value={createForm.sortOrder}
                      onChange={(e) =>
                        setCreateForm((f) => ({
                          ...f,
                          sortOrder: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="adm-form-field">
                    <label className="adm-form-label">Image URL</label>
                    <input
                      className="adm-form-input"
                      value={createForm.image}
                      onChange={(e) =>
                        setCreateForm((f) => ({ ...f, image: e.target.value }))
                      }
                      placeholder="optional"
                    />
                  </div>

                  <div className="adm-form-field adm-form-field--full">
                    <label className="adm-form-label">Features (text)</label>
                    <textarea
                      className="adm-form-textarea"
                      rows={3}
                      value={createForm.features}
                      onChange={(e) =>
                        setCreateForm((f) => ({
                          ...f,
                          features: e.target.value,
                        }))
                      }
                      placeholder="Any text you currently store in `features`"
                    />
                  </div>

                  <div className="adm-form-field">
                    <label className="adm-form-label">Popular</label>
                    <input
                      type="checkbox"
                      checked={createForm.isPopular}
                      onChange={(e) =>
                        setCreateForm((f) => ({
                          ...f,
                          isPopular: e.target.checked,
                        }))
                      }
                    />
                  </div>

                  <div className="adm-form-field">
                    <label className="adm-form-label">Active</label>
                    <input
                      type="checkbox"
                      checked={createForm.active}
                      onChange={(e) =>
                        setCreateForm((f) => ({
                          ...f,
                          active: e.target.checked,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="adm-form-actions">
                  <button
                    type="button"
                    className="adm-btn-secondary"
                    onClick={() => setCreateOpen(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="adm-btn-primary">
                    Create Package
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
