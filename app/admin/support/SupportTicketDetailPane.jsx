"use client";

import { useRef, useState } from "react";
import {
  CalendarDays,
  CreditCard,
  Download,
  FileText,
  Image as ImageIcon,
  Loader2,
  MessageCircle,
  PackageCheck,
  Send,
  Sparkles,
  StickyNote,
  Tag,
  User,
  X,
} from "lucide-react";
import { uploadSupportAttachment } from "@/lib/supportApi";

const MACROS = [
  "Thanks for reaching out. I’m checking this now and will update you here shortly.",
  "Could you send a screenshot or the exact error message you’re seeing?",
  "I’ve resolved this for you. Reply here if anything still feels off.",
];

function isImageFile(mimeType, fileName) {
  if (mimeType?.startsWith("image/")) return true;
  const ext = String(fileName || "").toLowerCase().split(".").pop();
  return ["jpg", "jpeg", "png", "gif", "webp"].includes(ext);
}

function formatMoney(amountCents, currency = "EGP") {
  const amount = Number(amountCents || 0) / 100;
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatPackageProgress(pkg) {
  const used = Number(pkg.sessionsUsed || 0);
  const total = Number(pkg.sessionsTotal || 0);
  if (!total) return "No sessions";
  return `${Math.max(0, total - used)} of ${total} credits left`;
}

export default function SupportTicketDetailPane({
  activeId,
  loadingTicket,
  activeTicket,
  getInitials,
  niceCategory,
  fmtTime,
  STATUS_OPTIONS,
  PRIORITY_OPTIONS,
  updateStatus,
  savingStatus,
  updatePriority,
  savingPriority,
  activePriorityConfig,
  updateAssignment,
  savingAssignment,
  staffMembers,
  updateTags,
  getAttachmentUrl,
  typingUsers,
  bottomRef,
  showNoteInput,
  setShowNoteInput,
  internalNote,
  setInternalNote,
  addInternalNote,
  addingNote,
  reply,
  setReply,
  sendReply,
  sendingReply,
  onTicketRefresh,
}) {
  const [tagDraft, setTagDraft] = useState("");
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [attachmentError, setAttachmentError] = useState("");
  const fileInputRef = useRef(null);

  async function uploadAttachment(file) {
    if (!file || !activeTicket?.id) return;
    setUploadingAttachment(true);
    setAttachmentError("");
    try {
      await uploadSupportAttachment({ ticketId: activeTicket.id, file });
      await onTicketRefresh?.();
    } catch (error) {
      setAttachmentError(error?.message || "Failed to upload attachment");
    } finally {
      setUploadingAttachment(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function addTag() {
    const clean = tagDraft.trim().toLowerCase();
    if (!clean) return;
    const next = Array.from(new Set([...(activeTicket?.tags || []), clean]));
    updateTags?.(next);
    setTagDraft("");
  }

  function removeTag(tag) {
    updateTags?.((activeTicket?.tags || []).filter((item) => item !== tag));
  }

  if (!activeId) {
    return (
      <main className="asp-main">
        <div className="asp-empty">
          <MessageCircle size={64} />
          <p>Select a ticket to view details</p>
        </div>
      </main>
    );
  }

  if (loadingTicket || !activeTicket) {
    return (
      <main className="asp-main">
        <div className="asp-loading">
          <Loader2 size={32} className="asp-spin" />
          <p>Loading ticket...</p>
        </div>
      </main>
    );
  }

  const packages = activeTicket.user?.userPackages || [];
  const orders = activeTicket.user?.orders || [];
  const sessions = activeTicket.user?.sessions || [];
  const recentTickets = (activeTicket.user?.supportTickets || []).filter(
    (ticket) => ticket.id !== activeTicket.id
  );

  return (
    <main className="asp-main">
      <div className="asp-ticket-header">
        <div className="asp-ticket-header__left">
          <div className="asp-avatar asp-avatar--large">
            {getInitials(activeTicket.user?.name, activeTicket.user?.email)}
          </div>
          <div>
            <div className="asp-ticket-eyebrow">
              Ticket #{activeTicket.id} · {niceCategory(activeTicket.category)}
            </div>
            <h2 className="asp-ticket-title">
              {activeTicket.subject || niceCategory(activeTicket.category)}
            </h2>
            <div className="asp-ticket-meta">
              <span>
                <User size={14} />
                {activeTicket.user?.name || "User"}
              </span>
              <span>{activeTicket.user?.email}</span>
              <span>Created {fmtTime(activeTicket.createdAt)}</span>
              {activeTicket.slaDueAt && (
                <span>SLA {fmtTime(activeTicket.slaDueAt)}</span>
              )}
            </div>
          </div>
        </div>

        <div className="asp-ticket-header__right">
          <div className="asp-control-group">
            <label>Status</label>
            <select
              value={activeTicket.status}
              onChange={(e) => updateStatus(e.target.value)}
              disabled={savingStatus}
              className="asp-select"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>

          <div className="asp-control-group">
            <label>Priority</label>
            <select
              value={activeTicket.priority}
              onChange={(e) => updatePriority(e.target.value)}
              disabled={savingPriority}
              className="asp-select"
              style={{ color: activePriorityConfig?.color }}
            >
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="asp-control-group">
            <label>Assigned to</label>
            <select
              value={activeTicket.assignedToId || ""}
              onChange={(e) => updateAssignment(Number(e.target.value) || null)}
              disabled={savingAssignment}
              className="asp-select"
            >
              <option value="">Unassigned</option>
              {staffMembers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name || s.email}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="asp-ticket-body">
        <section className="asp-conversation">
          <div className="asp-tag-editor">
            <Tag size={15} />
            <div className="asp-tag-list">
              {(activeTicket.tags || []).map((tag) => (
                <button key={tag} type="button" onClick={() => removeTag(tag)}>
                  {tag}
                  <X size={12} />
                </button>
              ))}
              <input
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="Add tag"
              />
            </div>
          </div>

          {activeTicket.internalNotes?.length > 0 && (
            <div className="asp-internal-notes">
              <h3>
                <StickyNote size={16} />
                Internal Notes
              </h3>
              {activeTicket.internalNotes.map((note) => (
                <div key={note.id} className="asp-internal-note">
                  <div className="asp-internal-note__header">
                    <span className="asp-internal-note__author">
                      {note.author?.name || "Staff"}
                    </span>
                    <span className="asp-internal-note__time">
                      {fmtTime(note.createdAt)}
                    </span>
                  </div>
                  <div className="asp-internal-note__body">{note.body}</div>
                </div>
              ))}
            </div>
          )}

          <div className="asp-messages">
            {(activeTicket.messages || []).map((m) => {
              const isStaff = !!m.isStaff;
              return (
                <div
                  key={m.id}
                  className={`asp-message ${
                    isStaff ? "asp-message--staff" : "asp-message--user"
                  }`}
                >
                  <div className="asp-message__header">
                    <span className="asp-message__author">
                      {isStaff ? "Support" : activeTicket.user?.name || "User"}
                    </span>
                    <span className="asp-message__time">
                      {fmtTime(m.createdAt)}
                    </span>
                  </div>

                  {m.body && <div className="asp-message__body">{m.body}</div>}

                  {m.attachments?.length > 0 && (
                    <div className="asp-message__attachments">
                      {m.attachments.map((a) => {
                        const isImage = isImageFile(a.mimeType, a.fileName);
                        return (
                          <a
                            key={a.id}
                            href={getAttachmentUrl(a.id)}
                            target="_blank"
                            rel="noreferrer"
                            className={`asp-attachment ${
                              isImage ? "asp-attachment--image" : ""
                            }`}
                          >
                            {isImage ? (
                              <>
                                <img
                                  src={getAttachmentUrl(a.id)}
                                  alt={a.fileName}
                                />
                                <ImageIcon size={15} />
                              </>
                            ) : (
                              <>
                                <FileText size={18} />
                                <span>{a.fileName || "Attachment"}</span>
                                <Download size={15} />
                              </>
                            )}
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {typingUsers.size > 0 && (
              <div className="asp-typing">
                User is typing
                <span className="asp-typing__dots">...</span>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          <div className="asp-input-area">
            {showNoteInput && (
              <div className="asp-note-input">
                <textarea
                  value={internalNote}
                  onChange={(e) => setInternalNote(e.target.value)}
                  placeholder="Add internal note. Customers cannot see this."
                  className="asp-textarea"
                  rows={3}
                />
                <div className="asp-note-input__actions">
                  <button
                    className="asp-btn asp-btn--secondary asp-btn--small"
                    onClick={() => {
                      setShowNoteInput(false);
                      setInternalNote("");
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="asp-btn asp-btn--primary asp-btn--small"
                    onClick={addInternalNote}
                    disabled={addingNote || !internalNote.trim()}
                  >
                    {addingNote ? (
                      <Loader2 size={14} className="asp-spin" />
                    ) : (
                      <StickyNote size={14} />
                    )}
                    Add Note
                  </button>
                </div>
              </div>
            )}

            <div className="asp-macros">
              <span>
                <Sparkles size={14} />
                Quick replies
              </span>
              {MACROS.map((macro) => (
                <button
                  key={macro}
                  type="button"
                  onClick={() => setReply((prev) => (prev ? `${prev}\n${macro}` : macro))}
                >
                  {macro.slice(0, 34)}...
                </button>
              ))}
            </div>

            <div className="asp-reply-area">
              <button
                className="asp-btn asp-btn--ghost"
                onClick={() => setShowNoteInput(!showNoteInput)}
                title="Add internal note"
              >
                <StickyNote size={18} />
              </button>

              <button
                className="asp-btn asp-btn--ghost"
                onClick={() => fileInputRef.current?.click()}
                title="Attach file"
                disabled={uploadingAttachment}
              >
                {uploadingAttachment ? (
                  <Loader2 size={18} className="asp-spin" />
                ) : (
                  <FileText size={18} />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                hidden
                accept="image/*,.pdf,.doc,.docx"
                onChange={(e) => uploadAttachment(e.target.files?.[0])}
              />

              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Type your reply to the customer..."
                className="asp-textarea"
                rows={2}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendReply();
                  }
                }}
              />

              <button
                className="asp-btn asp-btn--primary"
                onClick={sendReply}
                disabled={sendingReply || !reply.trim()}
              >
                {sendingReply ? (
                  <Loader2 size={18} className="asp-spin" />
                ) : (
                  <Send size={18} />
                )}
                Send Reply
              </button>
            </div>

            {attachmentError && (
              <div className="asp-inline-error">{attachmentError}</div>
            )}
          </div>
        </section>

        <aside className="asp-customer-panel">
          <div className="asp-customer-card">
            <div className="asp-customer-card__avatar">
              {getInitials(activeTicket.user?.name, activeTicket.user?.email)}
            </div>
            <div>
              <strong>{activeTicket.user?.name || "User"}</strong>
              <span>{activeTicket.user?.email}</span>
              <small>
                {activeTicket.user?.role || "learner"} · Joined{" "}
                {fmtTime(activeTicket.user?.createdAt)}
              </small>
            </div>
          </div>

          <div className="asp-context-section">
            <h3>
              <PackageCheck size={16} />
              Packages
            </h3>
            {packages.length ? (
              packages.map((pkg) => (
                <div key={pkg.id} className="asp-context-row">
                  <strong>{pkg.title}</strong>
                  <span>{formatPackageProgress(pkg)}</span>
                </div>
              ))
            ) : (
              <p>No active package data.</p>
            )}
          </div>

          <div className="asp-context-section">
            <h3>
              <CalendarDays size={16} />
              Recent Sessions
            </h3>
            {sessions.length ? (
              sessions.map((session) => (
                <div key={session.id} className="asp-context-row">
                  <strong>{session.title}</strong>
                  <span>
                    {fmtTime(session.startAt)} · {session.status}
                  </span>
                </div>
              ))
            ) : (
              <p>No recent sessions.</p>
            )}
          </div>

          <div className="asp-context-section">
            <h3>
              <CreditCard size={16} />
              Recent Payments
            </h3>
            {orders.length ? (
              orders.map((order) => (
                <div key={order.id} className="asp-context-row">
                  <strong>{formatMoney(order.amountCents, order.currency)}</strong>
                  <span>
                    {order.status} · {order.package?.title || "Package"}
                  </span>
                </div>
              ))
            ) : (
              <p>No recent payments.</p>
            )}
          </div>

          <div className="asp-context-section">
            <h3>
              <MessageCircle size={16} />
              Other Tickets
            </h3>
            {recentTickets.length ? (
              recentTickets.map((ticket) => (
                <div key={ticket.id} className="asp-context-row">
                  <strong>#{ticket.id} {ticket.subject || "Support ticket"}</strong>
                  <span>
                    {ticket.status} · {fmtTime(ticket.updatedAt)}
                  </span>
                </div>
              ))
            ) : (
              <p>No other recent tickets.</p>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
