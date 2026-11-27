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
import ClassroomUnreadBadge from "./ClassroomUnreadBadge";
import {
    getUnreadChatLabel,
    normalizeUnreadCount,
} from "@/lib/classroomChatUnread.mjs";
import { useClassroomLocale, useClassroomText } from "./classroomText";

/**
 * Mobile-specific tabbed layout for classroom
 * Shows Video/Content/Chat as fullscreen tabs with bottom navigation
 */
export default function MobileClassroomLayout({
    chromeOnly = false,
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
    moreAction = null,
}) {
    const ct = useClassroomText();
    const locale = useClassroomLocale();
    const shouldShowVideoPip = activeTab !== "video";
    const unreadCount = normalizeUnreadCount(chatUnreadCount);
    const hasUnread = activeTab !== "chat" && unreadCount > 0;

    return (
        <div className={`cr-mobile-layout ${chromeOnly ? "cr-mobile-layout--chrome" : ""}`}>
            {/* Content panels - only active one is visible */}
            {!chromeOnly && <div className="cr-mobile-content" data-lenis-prevent>
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
            </div>}

            {/* Floating quick actions */}
            <div
                className={`cr-mobile-quick-actions${activeTab === "content" ? " cr-mobile-quick-actions--row" : ""}`}
            >
                {/* Raise hand (always visible) */}
                <button
                    className={`cr-mobile-quick-actions__btn ${isHandRaised ? "cr-controls__btn--active" : ""}`}
                    onClick={toggleHand}
                    aria-label={isHandRaised ? ct("cr_hand_lower") : ct("cr_hand_raise")}
                >
                    <Hand size={20} />
                </button>

                {/* Captions toggle (always visible if supported) */}
                {captionsSupported && (
                    <button
                        className={`cr-mobile-quick-actions__btn ${captionsEnabled ? "cr-controls__btn--active" : ""}`}
                        onClick={onToggleCaptions}
                        aria-label={captionsEnabled ? ct("cr_captions_off") : ct("cr_captions_on")}
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
                        aria-label={ct("cr_choose_resource")}
                    >
                        <BookOpen size={20} />
                    </button>
                )}

                {isTeacher && (
                    <button
                        className="cr-mobile-quick-actions__btn"
                        onClick={onOpenParticipants}
                        aria-label={ct("cr_open_teacher_controls")}
                    >
                        <Users size={20} />
                    </button>
                )}

                {moreAction}
            </div>

            {/* Bottom tab bar */}
            <nav className="cr-mobile-tabs" aria-label={ct("cr_mobile_nav")}>
                <button
                    className={`cr-mobile-tabs__tab ${activeTab === "video" ? "cr-mobile-tabs__tab--active" : ""
                        }`}
                    onClick={() => onTabChange("video")}
                    aria-current={activeTab === "video" ? "page" : undefined}
                >
                    <span className="cr-mobile-tabs__tab-icon">
                        <Video size={22} />
                    </span>
                    <span className="cr-mobile-tabs__tab-label">{ct("cr_tab_video")}</span>
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
                        {ct("cr_tab_content")}
                    </span>
                </button>

                <button
                    className={`cr-mobile-tabs__tab ${activeTab === "chat" ? "cr-mobile-tabs__tab--active" : ""
                        } ${hasUnread ? "cr-mobile-tabs__tab--has-unread" : ""
                        }`}
                    onClick={() => onTabChange("chat")}
                    aria-current={activeTab === "chat" ? "page" : undefined}
                    aria-label={hasUnread ? ct("cr_chat_with_unread", { label: getUnreadChatLabel(unreadCount, locale) }) : ct("cr_tab_chat")}
                >
                    <span className="cr-mobile-tabs__tab-icon">
                        <MessageSquare size={22} />
                        <ClassroomUnreadBadge
                            count={hasUnread ? unreadCount : 0}
                            className="cr-mobile-tabs__badge"
                        />
                    </span>
                    <span className="cr-mobile-tabs__tab-label">{ct("cr_tab_chat")}</span>
                </button>
            </nav>
        </div>
    );
}
