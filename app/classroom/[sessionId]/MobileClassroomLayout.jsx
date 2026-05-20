// app/classroom/[sessionId]/MobileClassroomLayout.jsx
"use client";

import {
    BookOpen,
    Captions,
    CaptionsOff,
    FileText,
    Hand,
    MessageSquare,
    Users,
    Video,
} from "lucide-react";

/**
 * Mobile-specific tabbed layout for classroom
 * Shows Video/Content/Chat as fullscreen tabs with bottom navigation
 */
export default function MobileClassroomLayout({
    activeTab,
    onTabChange,
    videoComponent,
    contentComponent,
    chatComponent,
    isTeacher,
    onOpenPicker,
    onOpenParticipants,
    chatUnreadCount = 0,
    hasResource = false,
    isHandRaised,
    toggleHand,
    captionsEnabled = false,
    captionsSupported = false,
    onToggleCaptions,
}) {
    const shouldShowVideoPip = activeTab !== "video";

    return (
        <div className="cr-mobile-layout">
            {/* Content panels - only active one is visible */}
            <div className="cr-mobile-content" data-lenis-prevent>
                <div
                    className={[
                        "cr-mobile-content__panel",
                        "cr-mobile-content__panel--video",
                        activeTab === "video" ? "cr-mobile-content__panel--active" : "",
                        shouldShowVideoPip ? "cr-mobile-content__panel--pip" : "",
                    ]
                        .filter(Boolean)
                        .join(" ")}
                >
                    <div className="cr-mobile-video-wrapper">{videoComponent}</div>
                </div>

                <div
                    className={`cr-mobile-content__panel ${activeTab === "content" ? "cr-mobile-content__panel--active" : ""
                        }`}
                >
                    {contentComponent}
                </div>

                <div
                    className={`cr-mobile-content__panel ${activeTab === "chat" ? "cr-mobile-content__panel--active" : ""
                        }`}
                >
                    <div className="cr-mobile-chat-wrapper">{chatComponent}</div>
                </div>
            </div>

            {/* Floating quick actions */}
            <div className="cr-mobile-quick-actions">
                {/* Raise hand (always visible) */}
                <button
                    className={`cr-mobile-quick-actions__btn ${isHandRaised ? "cr-controls__btn--active" : ""}`}
                    onClick={toggleHand}
                    aria-label={isHandRaised ? "Lower hand" : "Raise hand"}
                >
                    <Hand size={20} />
                </button>

                {/* Captions toggle (always visible if supported) */}
                {captionsSupported && (
                    <button
                        className={`cr-mobile-quick-actions__btn ${captionsEnabled ? "cr-controls__btn--active" : ""}`}
                        onClick={onToggleCaptions}
                        aria-label={captionsEnabled ? "Turn captions off" : "Turn captions on"}
                        aria-pressed={captionsEnabled}
                    >
                        {captionsEnabled ? <Captions size={20} /> : <CaptionsOff size={20} />}
                    </button>
                )}

                {/* Resource picker (teacher only, not on video tab) */}
                {isTeacher && activeTab !== "video" && (
                    <button
                        className="cr-mobile-quick-actions__btn"
                        onClick={onOpenPicker}
                        aria-label="Choose resource"
                    >
                        <BookOpen size={20} />
                    </button>
                )}

                {isTeacher && (
                    <button
                        className="cr-mobile-quick-actions__btn"
                        onClick={onOpenParticipants}
                        aria-label="Open teacher controls"
                    >
                        <Users size={20} />
                    </button>
                )}
            </div>

            {/* Bottom tab bar */}
            <nav className="cr-mobile-tabs" aria-label="Classroom navigation">
                <button
                    className={`cr-mobile-tabs__tab ${activeTab === "video" ? "cr-mobile-tabs__tab--active" : ""
                        }`}
                    onClick={() => onTabChange("video")}
                    aria-current={activeTab === "video" ? "page" : undefined}
                >
                    <span className="cr-mobile-tabs__tab-icon">
                        <Video size={22} />
                    </span>
                    <span className="cr-mobile-tabs__tab-label">Video</span>
                </button>

                <button
                    className={`cr-mobile-tabs__tab ${activeTab === "content" ? "cr-mobile-tabs__tab--active" : ""
                        }`}
                    onClick={() => onTabChange("content")}
                    aria-current={activeTab === "content" ? "page" : undefined}
                >
                    <span className="cr-mobile-tabs__tab-icon">
                        <FileText size={22} />
                    </span>
                    <span className="cr-mobile-tabs__tab-label">
                        Content
                    </span>
                </button>

                <button
                    className={`cr-mobile-tabs__tab ${activeTab === "chat" ? "cr-mobile-tabs__tab--active" : ""
                        }`}
                    onClick={() => onTabChange("chat")}
                    aria-current={activeTab === "chat" ? "page" : undefined}
                >
                    <span className="cr-mobile-tabs__tab-icon">
                        <MessageSquare size={22} />
                        {chatUnreadCount > 0 && activeTab !== "chat" && (
                            <span className="cr-mobile-tabs__badge">{chatUnreadCount}</span>
                        )}
                    </span>
                    <span className="cr-mobile-tabs__tab-label">Chat</span>
                </button>
            </nav>
        </div>
    );
}
