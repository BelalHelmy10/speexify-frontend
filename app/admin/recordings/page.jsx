"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Film, Play, RefreshCw, X } from "lucide-react";
import api from "@/lib/api";
import useAuth from "@/hooks/useAuth";
import AdminAccessFallback from "../components/AdminAccessFallback";
import "@/styles/admin-recordings.scss";

const PAGE_SIZE = 20;

function formatBytes(value) {
  const bytes = Number(value);
  if (!Number.isFinite(bytes)) return "—";
  return `${(bytes / (1024 ** 3)).toFixed(2)} GB`;
}

function formatDate(value, locale) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function AdminRecordingsPage() {
  const { user, checking } = useAuth();
  const pathname = usePathname();
  const prefix = pathname?.startsWith("/ar") ? "/ar" : "";
  const locale = prefix ? "ar-EG" : "en-EG";
  const isAdmin = user?.role === "admin";
  const [sessionIdInput, setSessionIdInput] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [page, setPage] = useState(0);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [storageReady, setStorageReady] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [playUrl, setPlayUrl] = useState("");
  const [playBusy, setPlayBusy] = useState(false);

  const load = useCallback(async () => {
    if (!isAdmin) return;
    setBusy(true);
    setError("");
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
      });
      if (sessionId) params.set("sessionId", sessionId);
      const { data } = await api.get(`/admin/recordings?${params}`);
      setItems(data.items || []);
      setTotal(data.total || 0);
      setStorageReady(data.storageReady !== false);
    } catch (err) {
      setError(err?.response?.data?.error || "Could not load recordings.");
    } finally {
      setBusy(false);
    }
  }, [isAdmin, page, sessionId]);

  useEffect(() => {
    load();
  }, [load]);

  async function openRecording(recording) {
    setSelected(recording);
    setPlayUrl("");
    setPlayBusy(true);
    setError("");
    try {
      const { data } = await api.get(`/admin/recordings/${recording.id}/play`);
      setPlayUrl(data.url);
    } catch (err) {
      setError(err?.response?.data?.error || "Could not open recording.");
      setSelected(null);
    } finally {
      setPlayBusy(false);
    }
  }

  function closeRecording() {
    setSelected(null);
    setPlayUrl("");
  }

  function applyFilter(event) {
    event.preventDefault();
    const value = sessionIdInput.trim();
    if (value && !/^[1-9]\d*$/.test(value)) {
      setError("Enter a valid class ID.");
      return;
    }
    setError("");
    setPage(0);
    setSessionId(value);
  }

  if (checking || !isAdmin) {
    return <AdminAccessFallback checking={checking} isAdmin={isAdmin} />;
  }

  return (
    <main className="adm-admin-modern adm-recordings">
      <header className="adm-recordings__header">
        <div>
          <Link href={`${prefix}/admin`} className="adm-recordings__back">← Admin dashboard</Link>
          <h1><Film size={30} aria-hidden="true" /> Class recordings</h1>
          <p>Private recordings linked to Speexify classes. Only admins can open them.</p>
        </div>
        <button type="button" className="adm-btn-secondary" onClick={load} disabled={busy}>
          <RefreshCw size={16} aria-hidden="true" /> Refresh
        </button>
      </header>

      {!storageReady && (
        <div className="adm-recordings__notice" role="status">
          Cloud recording storage is not configured yet. Existing records can be listed, but videos cannot be opened.
        </div>
      )}
      {error && <div className="adm-recordings__error" role="alert">{error}</div>}

      <section className="adm-admin-card adm-recordings__card" aria-label="Recording list">
        <div className="adm-recordings__toolbar">
          <form onSubmit={applyFilter}>
            <label htmlFor="recording-class-id">Class ID</label>
            <input
              id="recording-class-id"
              inputMode="numeric"
              value={sessionIdInput}
              onChange={(event) => setSessionIdInput(event.target.value)}
              placeholder="All classes"
            />
            <button type="submit" className="adm-btn-primary">Filter</button>
          </form>
          <span>{total} recording{total === 1 ? "" : "s"}</span>
        </div>

        {busy && items.length === 0 ? (
          <p className="adm-recordings__empty">Loading recordings…</p>
        ) : items.length === 0 ? (
          <p className="adm-recordings__empty">No recordings found.</p>
        ) : (
          <div className="adm-recordings__list">
            {items.map((recording) => (
              <article className="adm-recordings__item" key={recording.id}>
                <div>
                  <h2>{recording.sessionTitle}</h2>
                  <p>
                    Class #{recording.sessionId || "archived"}
                    {recording.session?.teacher?.name ? ` · ${recording.session.teacher.name}` : ""}
                  </p>
                  <p>
                    Class: {formatDate(recording.session?.startAt, locale)}
                    {" · "}Uploaded: {formatDate(recording.createdAt, locale)}
                    {" · "}{formatBytes(recording.sizeBytes)}
                  </p>
                </div>
                <button
                  type="button"
                  className="adm-btn-primary"
                  onClick={() => openRecording(recording)}
                  disabled={!storageReady || playBusy}
                >
                  <Play size={16} aria-hidden="true" /> Watch
                </button>
              </article>
            ))}
          </div>
        )}

        {total > PAGE_SIZE && (
          <div className="adm-recordings__pagination">
            <button type="button" className="adm-btn-secondary" disabled={page === 0 || busy} onClick={() => setPage((p) => p - 1)}>Previous</button>
            <span>Page {page + 1} of {Math.ceil(total / PAGE_SIZE)}</span>
            <button type="button" className="adm-btn-secondary" disabled={(page + 1) * PAGE_SIZE >= total || busy} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        )}
      </section>

      {selected && (
        <div className="adm-recordings__modal" role="dialog" aria-modal="true" aria-label={`Recording of ${selected.sessionTitle}`}>
          <div className="adm-recordings__player">
            <div className="adm-recordings__player-header">
              <div>
                <strong>{selected.sessionTitle}</strong>
                <span>Class #{selected.sessionId || "archived"}</span>
              </div>
              <button type="button" onClick={closeRecording} aria-label="Close recording"><X size={22} /></button>
            </div>
            {playUrl ? <video src={playUrl} controls autoPlay playsInline preload="metadata" /> : <p>Opening recording…</p>}
          </div>
        </div>
      )}
    </main>
  );
}
