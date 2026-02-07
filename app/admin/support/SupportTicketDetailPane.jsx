"use client";

import { Loader2, MessageCircle, Send, StickyNote, User } from "lucide-react";

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
}) {
  return (
        <main className="asp-main">
          {!activeId ? (
            <div className="asp-empty">
              <MessageCircle size={64} />
              <p>Select a ticket to view details</p>
            </div>
          ) : loadingTicket || !activeTicket ? (
            <div className="asp-loading">
              <Loader2 size={32} className="asp-spin" />
              <p>Loading ticket...</p>
            </div>
          ) : (
            <>
              {/* Ticket Header */}
              <div className="asp-ticket-header">
                <div className="asp-ticket-header__left">
                  <div className="asp-avatar asp-avatar--large">
                    {getInitials(
                      activeTicket.user?.name,
                      activeTicket.user?.email
                    )}
                  </div>
                  <div>
                    <h2 className="asp-ticket-title">
                      {niceCategory(activeTicket.category)}
                    </h2>
                    <div className="asp-ticket-meta">
                      <span>
                        <User size={14} />
                        {activeTicket.user?.name || "User"}
                      </span>
                      <span>{activeTicket.user?.email}</span>
                      <span>Created {fmtTime(activeTicket.createdAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="asp-ticket-header__right">
                  {/* Status */}
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

                  {/* Priority */}
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

                  {/* Assignment */}
                  <div className="asp-control-group">
                    <label>Assigned to</label>
                    <select
                      value={activeTicket.assignedToId || ""}
                      onChange={(e) =>
                        updateAssignment(Number(e.target.value) || null)
                      }
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

              {/* Internal Notes */}
              {activeTicket.internalNotes &&
                activeTicket.internalNotes.length > 0 && (
                  <div className="asp-internal-notes">
                    <h3>
                      <StickyNote size={16} />
                      Internal Notes (Staff Only)
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
                        <div className="asp-internal-note__body">
                          {note.body}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              {/* Messages */}
              <div className="asp-messages">
                {(activeTicket.messages || []).length === 0 ? (
                  <div className="asp-empty">
                    <p>No messages yet</p>
                  </div>
                ) : (
                  <>
                    {(activeTicket.messages || []).map((m) => {
                      const isStaff = !!m.isStaff;
                      return (
                        <div
                          key={m.id}
                          className={`asp-message ${isStaff ? "asp-message--staff" : "asp-message--user"
                            }`}
                        >
                          <div className="asp-message__header">
                            <span className="asp-message__author">
                              {isStaff
                                ? "Support"
                                : activeTicket.user?.name || "User"}
                            </span>
                            <span className="asp-message__time">
                              {fmtTime(m.createdAt)}
                            </span>
                          </div>

                          {m.body && (
                            <div className="asp-message__body">{m.body}</div>
                          )}

                          {m.attachments && m.attachments.length > 0 && (
                            <div className="asp-message__attachments">
                              {m.attachments.map((a) => (
                                <a
                                  key={a.id}
                                  href={getAttachmentUrl(a.id)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="asp-attachment"
                                >
                                  <img
                                    src={getAttachmentUrl(a.id)}
                                    alt={a.fileName}
                                  />
                                </a>
                              ))}
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
                  </>
                )}
              </div>

              {/* Input Area */}
              <div className="asp-input-area">
                {/* Internal Note Input */}
                {showNoteInput && (
                  <div className="asp-note-input">
                    <textarea
                      value={internalNote}
                      onChange={(e) => setInternalNote(e.target.value)}
                      placeholder="Add internal note (visible to staff only)..."
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
                          <>
                            <Loader2 size={14} className="asp-spin" />
                            Adding...
                          </>
                        ) : (
                          <>Add Note</>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Reply Input */}
                <div className="asp-reply-area">
                  <button
                    className="asp-btn asp-btn--ghost"
                    onClick={() => setShowNoteInput(!showNoteInput)}
                    title="Add internal note"
                  >
                    <StickyNote size={18} />
                  </button>

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
                      <>
                        <Loader2 size={18} className="asp-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send size={18} />
                        Send Reply
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </main>
  );
}
