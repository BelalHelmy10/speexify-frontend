"use client";

// The shared screen, shown in the classroom's content panel (where slides
// and PDFs appear) while the video column stays as it is.
import { useEffect, useRef, useState } from "react";
import { Maximize, Minimize, MonitorOff, RotateCw, Volume2 } from "lucide-react";
import { useClassroomText } from "./classroomText";

function viewersLabel(ct, count) {
  if (count <= 0) return ct("cr_stage_viewers_none");
  if (count === 1) return ct("cr_stage_viewers_one");
  if (count === 2) return ct("cr_stage_viewers_two");
  if (count <= 10) return ct("cr_stage_viewers_few", { n: count });
  return ct("cr_stage_viewers", { n: count });
}

export default function ClassroomScreenStage({ stream, isTeacher = false, sharerName = "" }) {
  const ct = useClassroomText();
  const stageRef = useRef(null);
  const videoRef = useRef(null);
  const [soundBlocked, setSoundBlocked] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const isLocal = stream.isLocal;
  const media = isLocal ? stream.localStream : stream.remoteStream;
  const hasAudio = !isLocal && Boolean(media?.getAudioTracks().length);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.srcObject !== media) video.srcObject = media || null;
    if (!media) return;
    // Your own preview is always silent; viewers hear tab audio when shared.
    video.muted = isLocal;
    const played = video.play();
    if (played?.catch) {
      played.catch(() => {
        // Browsers can block sound until the page is clicked: play muted.
        video.muted = true;
        setSoundBlocked(hasAudio);
        video.play().catch(() => {});
      });
    }
  }, [media, isLocal, hasAudio]);

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement === stageRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const enableSound = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    video.play().then(() => setSoundBlocked(false)).catch(() => {});
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else stageRef.current?.requestFullscreen?.().catch(() => {});
  };

  const name = sharerName || ct("cr_stage_someone");
  const showConnecting = !isLocal && (stream.status === "connecting" || (stream.status === "live" && !media));
  const showFailed = !isLocal && stream.status === "failed";

  return (
    <section ref={stageRef} className="cr-screen-stage" aria-label={ct("cr_stage_aria")}>
      <header className="cr-screen-stage__bar">
        <span className="cr-screen-stage__live" aria-hidden="true" />
        <span className="cr-screen-stage__title">
          <strong>{isLocal ? ct("cr_stage_you") : ct("cr_stage_sharing", { name })}</strong>
          {isLocal && <small>{viewersLabel(ct, stream.viewerCount)}</small>}
        </span>
        <span className="cr-screen-stage__actions">
          {hasAudio && soundBlocked && (
            <button type="button" className="cr-screen-stage__btn" onClick={enableSound}>
              <Volume2 size={15} aria-hidden="true" />
              {ct("cr_stage_sound")}
            </button>
          )}
          {!isLocal && typeof document !== "undefined" && document.fullscreenEnabled && (
            <button
              type="button"
              className="cr-screen-stage__btn cr-screen-stage__btn--icon"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? ct("cr_fullscreen_exit") : ct("cr_fullscreen")}
              title={isFullscreen ? ct("cr_fullscreen_exit") : ct("cr_fullscreen")}
            >
              {isFullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
            </button>
          )}
          {isLocal && (
            <button type="button" className="cr-screen-stage__btn cr-screen-stage__btn--stop" onClick={stream.stop}>
              <MonitorOff size={15} aria-hidden="true" />
              {ct("cr_ss_stop")}
            </button>
          )}
          {!isLocal && isTeacher && stream.remote && (
            <button type="button" className="cr-screen-stage__btn cr-screen-stage__btn--stop" onClick={stream.stopRemote}>
              <MonitorOff size={15} aria-hidden="true" />
              {ct("cr_stage_stop_theirs")}
            </button>
          )}
        </span>
      </header>

      <div className="cr-screen-stage__screen">
        <video ref={videoRef} className="cr-screen-stage__video" autoPlay playsInline muted={isLocal} />
        {showConnecting && (
          <div className="cr-screen-stage__overlay" role="status">
            <span className="cr-screen-stage__spinner" aria-hidden="true" />
            <p>{ct("cr_stage_connecting")}</p>
          </div>
        )}
        {showFailed && (
          <div className="cr-screen-stage__overlay" role="alert">
            <p>{ct("cr_stage_failed")}</p>
            <button type="button" className="cr-screen-stage__btn" onClick={stream.retry}>
              <RotateCw size={15} aria-hidden="true" />
              {ct("cr_error_try_again")}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
