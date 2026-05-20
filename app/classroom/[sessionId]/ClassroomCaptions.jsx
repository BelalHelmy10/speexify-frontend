// app/classroom/[sessionId]/ClassroomCaptions.jsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Captions, CaptionsOff } from "lucide-react";

const CAPTION_FINAL_TTL_MS = 6500;
const CAPTION_INTERIM_TTL_MS = 9000;
const MAX_VISIBLE_CAPTIONS = 4;
const SOFT_CAP = MAX_VISIBLE_CAPTIONS * 3;

function localeToRecognitionLang(locale) {
  if (!locale) return "en-US";
  const normalized = String(locale).toLowerCase();
  if (normalized.startsWith("ar")) return "ar-SA";
  if (normalized.startsWith("es")) return "es-ES";
  if (normalized.startsWith("fr")) return "fr-FR";
  if (normalized.startsWith("de")) return "de-DE";
  if (normalized.startsWith("pt")) return "pt-PT";
  if (normalized.startsWith("it")) return "it-IT";
  if (normalized.startsWith("zh")) return "zh-CN";
  if (normalized.startsWith("ja")) return "ja-JP";
  if (normalized.startsWith("ko")) return "ko-KR";
  return "en-US";
}

function getSpeechRecognition() {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

/* ─── Floating Captions Overlay (on top of video) ─────────────────────── */
export function ClassroomCaptionsOverlay({ captions }) {
  if (!captions || captions.length === 0) return null;

  const visible = captions.slice(-MAX_VISIBLE_CAPTIONS);

  return (
    <div className="cr-captions-overlay" aria-live="polite" aria-atomic="false">
      {visible.map((c) => (
        <div
          key={c.id}
          className={[
            "cr-caption",
            c.isFinal ? "cr-caption--final" : "cr-caption--interim",
            c.isMine ? "cr-caption--mine" : "cr-caption--other",
          ].join(" ")}
        >
          <span className="cr-caption__name">{c.userName}</span>
          <span className="cr-caption__text">{c.text}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Toggle Button for the Control Bar ───────────────────────────────── */
export function ClassroomCaptionsButton({ enabled, supported, onToggle, iconOnly = false }) {
  if (!supported) {
    return (
      <button
        type="button"
        className={`cr-controls__btn cr-controls__btn--ghost${iconOnly ? " cr-controls__btn--icon-only" : ""}`}
        disabled
        aria-label="Live captions are not supported in this browser"
        title="Live captions are not supported in this browser. Try Chrome or Edge."
      >
        <span className="cr-controls__btn-icon"><CaptionsOff size={16} /></span>
        {!iconOnly && <span className="cr-controls__btn-label">Captions</span>}
      </button>
    );
  }

  return (
    <button
      type="button"
      className={
        "cr-controls__btn cr-controls__btn--ghost" +
        (enabled ? " cr-controls__btn--active" : "") +
        (iconOnly ? " cr-controls__btn--icon-only" : "")
      }
      onClick={onToggle}
      aria-pressed={enabled}
      aria-label={enabled ? "Turn captions off" : "Turn captions on"}
      title={enabled ? "Captions on — click to turn off" : "Turn captions on"}
    >
      <span className="cr-controls__btn-icon">
        {enabled ? <Captions size={16} /> : <CaptionsOff size={16} />}
      </span>
      {!iconOnly && (
        <span className="cr-controls__btn-label">
          {enabled ? "Captions on" : "Captions"}
        </span>
      )}
    </button>
  );
}

/* ─── Hook: SpeechRecognition lifecycle + WS broadcast/receive ────────── */
export function useClassroomCaptions(
  classroomChannel,
  userName,
  { locale = "en", storageKey = null, micMuted = false } = {}
) {
  const SpeechRecognitionImpl = getSpeechRecognition();
  const supported = !!SpeechRecognitionImpl;

  const [enabled, setEnabled] = useState(() => {
    if (!supported) return false;
    if (typeof window === "undefined" || !storageKey) return false;
    try {
      return window.localStorage.getItem(storageKey) === "1";
    } catch {
      return false;
    }
  });

  const [captions, setCaptions] = useState([]);
  const recognitionRef = useRef(null);
  const recognitionSessionRef = useRef(0);

  const ready = classroomChannel?.ready ?? false;
  const send = classroomChannel?.send ?? (() => { });
  const subscribe = classroomChannel?.subscribe ?? (() => () => { });

  // Persist toggle state.
  useEffect(() => {
    if (typeof window === "undefined" || !storageKey) return;
    try {
      window.localStorage.setItem(storageKey, enabled ? "1" : "0");
    } catch { }
  }, [enabled, storageKey]);

  const upsertCaption = useCallback((caption) => {
    setCaptions((prev) => {
      // Upsert by composite id so interim → final overwrites in place.
      const idx = prev.findIndex((c) => c.id === caption.id);
      if (idx >= 0) {
        const next = prev.slice();
        next[idx] = { ...prev[idx], ...caption };
        return next;
      }
      const next = [...prev, caption];
      // Soft cap memory: drop oldest if list grows too long.
      if (next.length > SOFT_CAP) {
        return next.slice(-SOFT_CAP);
      }
      return next;
    });
  }, []);

  // Receive captions from other participants.
  useEffect(() => {
    if (!ready) return;

    const unsub = subscribe((msg) => {
      if (msg?.type !== "CAPTION") return;

      const incomingName = msg.userName || "Someone";
      // Defensive: ignore self-echo if the server ever broadcasts back to sender.
      if (incomingName === userName) return;

      const text = typeof msg.text === "string" ? msg.text.trim() : "";
      if (!text) return;

      const utteranceId = msg.utteranceId || `${msg.at || Date.now()}`;
      upsertCaption({
        id: `${incomingName}__${utteranceId}`,
        utteranceId,
        userName: incomingName,
        text,
        isFinal: !!msg.isFinal,
        isMine: false,
        at: Number(msg.at) || Date.now(),
      });
    });

    return unsub;
  }, [ready, subscribe, upsertCaption, userName]);

  // Garbage-collect old captions.
  useEffect(() => {
    if (captions.length === 0) return;

    const id = setInterval(() => {
      const now = Date.now();
      setCaptions((prev) =>
        prev.filter((c) => {
          const ttl = c.isFinal ? CAPTION_FINAL_TTL_MS : CAPTION_INTERIM_TTL_MS;
          return now - c.at < ttl;
        })
      );
    }, 1000);

    return () => clearInterval(id);
  }, [captions.length]);

  // Local SpeechRecognition lifecycle. Auto-pauses when mic is muted.
  useEffect(() => {
    if (!enabled || !supported) return;
    if (micMuted) return;

    const recognition = new SpeechRecognitionImpl();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = localeToRecognitionLang(locale);

    let stopped = false;
    recognitionSessionRef.current += 1;
    const sessionId = recognitionSessionRef.current;

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = (result[0]?.transcript || "").trim();
        if (!transcript) continue;

        // utteranceId is stable per recognition slot within a session.
        // Interim updates of the same slot overwrite each other; new slots
        // (i+1, i+2) are separate utterances.
        const utteranceId = `s${sessionId}_${i}`;
        const at = Date.now();
        const isFinal = !!result.isFinal;
        const speaker = userName || "You";

        upsertCaption({
          id: `${speaker}__${utteranceId}`,
          utteranceId,
          userName: speaker,
          text: transcript,
          isFinal,
          isMine: true,
          at,
        });

        if (ready) {
          send({
            type: "CAPTION",
            userName: speaker,
            text: transcript,
            isFinal,
            utteranceId,
            at,
          });
        }
      }
    };

    recognition.onerror = (event) => {
      const code = event?.error;
      if (code === "not-allowed" || code === "service-not-allowed") {
        console.warn("[Captions] Microphone permission denied for recognition");
        setEnabled(false);
        return;
      }
      if (code === "audio-capture") {
        console.warn("[Captions] No microphone available for recognition");
        setEnabled(false);
        return;
      }
      // 'no-speech', 'network', 'aborted' → let onend restart.
    };

    recognition.onend = () => {
      if (stopped) return;
      try {
        recognition.start();
      } catch {
        // start() can throw if already running; ignore.
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      console.warn("[Captions] Failed to start recognition", err);
      stopped = true;
    }

    return () => {
      stopped = true;
      recognitionRef.current = null;
      try {
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;
        recognition.stop();
      } catch { }
    };
  }, [
    enabled,
    supported,
    locale,
    userName,
    ready,
    send,
    upsertCaption,
    SpeechRecognitionImpl,
    micMuted,
  ]);

  const toggle = useCallback(() => {
    if (!supported) return;
    setEnabled((v) => !v);
  }, [supported]);

  return {
    captions,
    enabled,
    supported,
    toggle,
    pausedForMute: enabled && micMuted,
  };
}
