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
  //
  // `tileview` is intentionally omitted — the classroom locks the
  // conference into a Teams-style adaptive grid so the toggle would
  // only let users break the layout for themselves.
  return [
    "microphone",
    "camera",
    "desktop",
    "fullscreen",
    "hangup",
    "settings",
    "select-background",
    "videoquality",
  ];
}

/**
 * Build configOverwrite for Jitsi.
 * This is pure data and easy to tweak / test.
 */
export function buildJitsiConfigOverwrite({
  isTeacher,
  startWithAudioMuted = true,
  startWithVideoMuted = false,
} = {}) {
  return {
    // Core settings
    disableDeepLinking: true,
    startWithAudioMuted: Boolean(startWithAudioMuted),
    startWithVideoMuted: Boolean(startWithVideoMuted),

    // UI simplification
    disableModeratorIndicator: false,
    disableReactions: true,
    disablePolls: true,
    disableSelfView: false,
    toolbarButtons: getToolbarButtons({ isTeacher }),
    disableAEC: false,
    disableVirtualBackground: false,
    disableAddingBackgroundImages: false,

    // Quality settings
    resolution: 720,
    constraints: {
      video: {
        height: { ideal: 720, max: 720, min: 240 },
        width: { ideal: 1280, max: 1280, min: 320 },
      },
    },

    // Teams-style adaptive grid: never suspend a participant's video,
    // so every tile stays populated regardless of who's speaking or
    // how the panel is resized. `enableLayerSuspension` still lets
    // the SFU drop down to a lower simulcast layer for small tiles —
    // that saves bandwidth without making tiles vanish.
    enableLayerSuspension: true,
    channelLastN: -1,

    // Always render in tile view; uniform tiles, no surprise stage flips.
    disableTileEnlargement: true,
    tileView: {
      numberOfVisibleTiles: 25,
    },
    filmstrip: {
      disableResizable: true,
      disableStageFilmstrip: true,
      disableTopPanel: true,
    },

    // Self-view must stay visible; lock the setting so a stray click
    // can't hide a learner from themselves.
    disableSelfView: false,
    disableSelfViewSettings: true,

    // Quiet the chrome so notifications don't compete with captions etc.
    notifications: [],
    hideConferenceTimer: true,
    hideConferenceSubject: true,

    // Disable features we don't need
    enableWelcomePage: false,
    enableClosePage: false,

    // Speexify renders its own prejoin lobby before mounting Jitsi.
    prejoinConfig: {
      enabled: false,
      hideDisplayName: true,
      hideExtraJoinButtons: ["no-audio", "by-phone"],
    },

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

    // Filmstrip is intentionally suppressed — we're in tile view always.
    FILM_STRIP_MAX_HEIGHT: 0,
    VERTICAL_FILMSTRIP: false,
    MOBILE_APP_PROMO: false,

    // Up to 5 columns lets Jitsi pick the best grid for the panel width
    // and participant count (Teams-like adaptive grid).
    TILE_VIEW_MAX_COLUMNS: 5,
    VIDEO_LAYOUT_FIT: "both",
  };
}

/**
 * Build the full options object for JitsiMeetExternalAPI.
 * PrepVideoCall just calls this, instead of having a giant inline object.
 */
export function buildJitsiOptions({
  roomId,
  userName,
  isTeacher,
  parentNode,
  devices = {},
  startWithAudioMuted = true,
  startWithVideoMuted = false,
}) {
  const roomName = buildJitsiRoomName(roomId, "classroom");
  const selectedDevices = {
    ...(devices.audioInput ? { audioInput: devices.audioInput } : {}),
    ...(devices.audioOutput ? { audioOutput: devices.audioOutput } : {}),
    ...(devices.videoInput ? { videoInput: devices.videoInput } : {}),
  };

  return {
    roomName,
    parentNode,
    width: "100%",
    height: "100%",
    userInfo: {
      displayName: userName || (isTeacher ? "Teacher" : "Learner"),
    },
    configOverwrite: buildJitsiConfigOverwrite({
      isTeacher,
      startWithAudioMuted,
      startWithVideoMuted,
    }),
    interfaceConfigOverwrite: buildJitsiInterfaceConfigOverwrite({ isTeacher }),
    ...(Object.keys(selectedDevices).length ? { devices: selectedDevices } : {}),
  };
}
