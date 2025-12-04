// lib/jitsiConfig.js

// Central Jitsi configuration + helpers so we don't hard-code everything
// inside the PrepVideoCall component.

export const JITSI_DOMAIN =
  process.env.NEXT_PUBLIC_JITSI_DOMAIN || "meet.speexify.com";

/**
 * Build a stable room name based on a roomId and kind.
 * This makes it easy to add more room types later (admin/QA, etc.).
 */
export function buildJitsiRoomName(roomId, kind = "classroom") {
  const id = String(roomId || "").trim() || "unknown";
  return `speexify-${kind}-${id}`;
}

/**
 * Toolbar buttons may differ per role / environment later.
 * For now we keep them the same, but centralized here.
 */
export function getToolbarButtons({ isTeacher }) {
  // Example: in future you can hide "desktop" for learners:
  // if (!isTeacher) { ... }
  return [
    "microphone",
    "camera",
    "desktop",
    "fullscreen",
    "hangup",
    "settings",
    "videoquality",
    "tileview",
  ];
}

/**
 * Build configOverwrite for Jitsi.
 * This is pure data and easy to tweak / test.
 */
export function buildJitsiConfigOverwrite({ isTeacher }) {
  return {
    // Core settings
    disableDeepLinking: true,
    startWithAudioMuted: false,
    startWithVideoMuted: false,

    // UI simplification
    disableModeratorIndicator: false,
    disableReactions: true,
    disablePolls: true,
    disableSelfView: false,

    // Quality settings
    resolution: 720,
    constraints: {
      video: {
        height: { ideal: 720, max: 720, min: 240 },
        width: { ideal: 1280, max: 1280, min: 320 },
      },
    },

    // Reduce bandwidth usage
    enableLayerSuspension: true,
    channelLastN: 2,

    // Disable features we don't need
    enableWelcomePage: false,
    enableClosePage: false,

    // Pre-join settings (we keep it for device testing)
    prejoinConfig: {
      enabled: true,
      hideDisplayName: false,
      hideExtraJoinButtons: ["no-audio", "by-phone"],
    },

    //     // ✅ updated version – skip pre-join in classroom
    // prejoinConfig: {
    //   enabled: false,          // go straight into the call
    //   hideDisplayName: true,   // irrelevant when prejoin is off, but explicit
    //   hideExtraJoinButtons: ["no-audio", "by-phone"],
    // },

    // Lobby settings
    enableLobbyChat: false,

    // Recording / streaming
    fileRecordingsEnabled: false,
    liveStreamingEnabled: false,

    // Etherpad
    etherpad_base: undefined,

    // Breakout rooms
    breakoutRooms: {
      hideAddRoomButton: true,
      hideAutoAssignButton: true,
      hideJoinRoomButton: true,
    },
  };
}

/**
 * Build interfaceConfigOverwrite for Jitsi.
 * Again, pure data so you can adjust by environment/role later.
 */
export function buildJitsiInterfaceConfigOverwrite({ isTeacher }) {
  return {
    APP_NAME: "Speexify Classroom",
    DEFAULT_BACKGROUND: "#0f172a",
    DEFAULT_LOCAL_DISPLAY_NAME: isTeacher ? "Teacher" : "Learner",
    DEFAULT_REMOTE_DISPLAY_NAME: "Participant",

    SHOW_JITSI_WATERMARK: false,
    SHOW_WATERMARK_FOR_GUESTS: false,
    SHOW_BRAND_WATERMARK: false,
    SHOW_POWERED_BY: false,
    SHOW_PROMOTIONAL_CLOSE_PAGE: false,
    HIDE_INVITE_MORE_HEADER: true,
    HIDE_DEEP_LINKING_LOGO: true,

    TOOLBAR_BUTTONS: getToolbarButtons({ isTeacher }),

    DISABLE_FOCUS_INDICATOR: true,
    DISABLE_DOMINANT_SPEAKER_INDICATOR: false,
    DISABLE_VIDEO_BACKGROUND: false,
    DISABLE_TRANSCRIPTION_SUBTITLES: true,

    FILM_STRIP_MAX_HEIGHT: 120,
    VERTICAL_FILMSTRIP: true,
    MOBILE_APP_PROMO: false,
    TILE_VIEW_MAX_COLUMNS: 2,
    VIDEO_LAYOUT_FIT: "both",
  };
}

/**
 * Build the full options object for JitsiMeetExternalAPI.
 * PrepVideoCall just calls this, instead of having a giant inline object.
 */
export function buildJitsiOptions({ roomId, userName, isTeacher, parentNode }) {
  const roomName = buildJitsiRoomName(roomId, "classroom");

  return {
    roomName,
    parentNode,
    width: "100%",
    height: "100%",
    userInfo: {
      displayName: userName || (isTeacher ? "Teacher" : "Learner"),
    },
    configOverwrite: buildJitsiConfigOverwrite({ isTeacher }),
    interfaceConfigOverwrite: buildJitsiInterfaceConfigOverwrite({ isTeacher }),
  };
}
