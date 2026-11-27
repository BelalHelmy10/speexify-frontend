// app/classroom/[sessionId]/useClassroomVideoModeration.js
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import api from "@/lib/api";
import {
  isPrivilegedSender,
  isRemovalFor,
  moderationMuteFor,
  participantIdentityFrom,
  resolveModerationTarget,
} from "@/lib/classroomVideoModeration.mjs";
import { useClassroomText } from "./classroomText";

/**
 * Teacher video moderation: mute all, cameras off, mute/stop video for one
 * learner, and remove a learner.
 *
 * Two layers act together:
 *  - Native Jitsi moderation (muteEveryone, kickParticipant). Jitsi enforces
 *    it only when the teacher holds the moderator role from the backend JWT.
 *  - The authenticated classroom channel: the backend lets only the teacher
 *    send MODERATION_* events, and each learner's client complies. Jitsi's
 *    iframe API has no "mute one participant" command, so per-learner mute
 *    and camera-off rely on this layer.
 * Removal is also persisted (lobby/deny), so the learner cannot rejoin the
 * classroom socket or get a video token until the teacher admits them again.
 */
export default function useClassroomVideoModeration({
  isTeacher,
  localUserId,
  sessionId,
  ready,
  send,
  subscribe,
  videoModeration,
  onRemoved,
}) {
  const ct = useClassroomText();
  // Read through a ref so the moderation callbacks keep their identity.
  const ctRef = useRef(ct);
  ctRef.current = ct;
  const [identities, setIdentities] = useState(() => new Map());
  const [learnerNotice, setLearnerNotice] = useState(null);
  const actionsRef = useRef(videoModeration?.actions || null);
  const localParticipantIdRef = useRef(videoModeration?.localParticipantId || null);
  const onRemovedRef = useRef(onRemoved);

  useEffect(() => {
    actionsRef.current = videoModeration?.actions || null;
    localParticipantIdRef.current = videoModeration?.localParticipantId || null;
  }, [videoModeration?.actions, videoModeration?.localParticipantId]);

  useEffect(() => {
    onRemovedRef.current = onRemoved;
  }, [onRemoved]);

  const announceIdentity = useCallback(() => {
    const participantId = localParticipantIdRef.current;
    if (!ready || !participantId || localUserId == null) return;
    send({ type: "VIDEO_PARTICIPANT", participantId, userId: Number(localUserId) });
  }, [ready, send, localUserId]);

  // Everyone announces their Jitsi id once they are in the call.
  useEffect(() => {
    announceIdentity();
  }, [announceIdentity, videoModeration?.localParticipantId]);

  // The teacher asks everyone to (re)announce when its call becomes ready.
  useEffect(() => {
    if (!isTeacher || !ready || !videoModeration?.ready) return;
    send({ type: "VIDEO_PARTICIPANT_REQUEST" });
  }, [isTeacher, ready, send, videoModeration?.ready]);

  useEffect(() => {
    if (!ready) return undefined;
    return subscribe((event) => {
      if (event?.type === "VIDEO_PARTICIPANT_REQUEST") {
        if (isPrivilegedSender(event)) announceIdentity();
        return;
      }

      const identity = participantIdentityFrom(event);
      if (identity) {
        if (!isTeacher) return;
        setIdentities((prev) => {
          if (prev.get(identity.participantId) === identity.userId) return prev;
          const next = new Map(prev);
          next.set(identity.participantId, identity.userId);
          return next;
        });
        return;
      }

      const media = moderationMuteFor(event, { localUserId, isTeacher });
      if (media) {
        const actions = actionsRef.current;
        if (media === "video") actions?.muteLocalVideo?.();
        else actions?.muteLocalAudio?.();
        setLearnerNotice(media);
        return;
      }

      if (isRemovalFor(event, { localUserId, isTeacher })) {
        actionsRef.current?.hangup?.();
        onRemovedRef.current?.();
      }
    });
  }, [ready, subscribe, isTeacher, localUserId, announceIdentity]);

  // Auto-dismiss the learner-facing notice.
  useEffect(() => {
    if (!learnerNotice) return undefined;
    const timer = window.setTimeout(() => setLearnerNotice(null), 6000);
    return () => window.clearTimeout(timer);
  }, [learnerNotice]);

  const muteEveryone = useCallback(
    (media) => {
      if (!isTeacher) return { ok: false };
      const nativeOk = media === "video"
        ? actionsRef.current?.stopAllVideo?.()
        : actionsRef.current?.muteAll?.();
      if (ready) send({ type: "MODERATION_MUTE", media, targetUserId: "all" });
      if (!ready && !nativeOk) {
        return { ok: false, message: ctRef.current("cr_mod_connecting") };
      }
      return {
        ok: true,
        message: media === "video" ? ctRef.current("cr_mod_cams_off") : ctRef.current("cr_mod_all_muted"),
      };
    },
    [isTeacher, ready, send]
  );

  const muteOne = useCallback(
    (media, participantId, learnerUserId) => {
      if (!isTeacher) return { ok: false };
      const targetUserId = resolveModerationTarget({ participantId, learnerUserId, identities });
      if (!targetUserId || !ready) {
        return {
          ok: false,
          message: ctRef.current("cr_mod_not_connected"),
        };
      }
      send({ type: "MODERATION_MUTE", media, targetUserId });
      return {
        ok: true,
        message: media === "video" ? ctRef.current("cr_mod_cam_off_one") : ctRef.current("cr_mod_muted_one"),
      };
    },
    [isTeacher, identities, ready, send]
  );

  const removeParticipant = useCallback(
    async (participantId, learnerUserId) => {
      if (!isTeacher) return { ok: false };
      const targetUserId = resolveModerationTarget({ participantId, learnerUserId, identities });

      if (!targetUserId) {
        // Unknown connection (not a classroom member): only Jitsi can drop it.
        const kicked = participantId ? actionsRef.current?.kickParticipant?.(participantId) : false;
        return kicked
          ? { ok: true, message: ctRef.current("cr_mod_removed_conn") }
          : { ok: false, message: ctRef.current("cr_mod_remove_conn_failed") };
      }

      try {
        await api.post(`/sessions/${sessionId}/lobby/deny`, { learnerId: targetUserId });
      } catch (err) {
        console.warn("Failed to remove learner", err);
        return { ok: false, message: ctRef.current("cr_mod_remove_failed") };
      }

      if (ready) send({ type: "MODERATION_REMOVE", targetUserId });
      if (participantId) actionsRef.current?.kickParticipant?.(participantId);
      return {
        ok: true,
        message: ctRef.current("cr_mod_removed"),
      };
    },
    [isTeacher, identities, ready, send, sessionId]
  );

  return {
    identities,
    learnerNotice,
    dismissLearnerNotice: () => setLearnerNotice(null),
    muteAll: () => muteEveryone("audio"),
    stopAllVideo: () => muteEveryone("video"),
    muteParticipant: (participantId, learnerUserId) => muteOne("audio", participantId, learnerUserId),
    stopParticipantVideo: (participantId, learnerUserId) => muteOne("video", participantId, learnerUserId),
    removeParticipant,
  };
}
