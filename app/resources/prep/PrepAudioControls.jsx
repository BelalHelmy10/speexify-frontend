// app/resources/prep/PrepAudioControls.jsx

import { useEffect, useRef, useState } from "react";
import { Play, Pause, Volume2, RotateCcw } from "lucide-react";

function formatAudioTime(value) {
  const totalSeconds = Math.max(0, Math.floor(Number(value) || 0));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export default function PrepAudioControls({
  hasAudio,
  audioTracks,
  safeTrackIndex,
  setCurrentTrackIndex,
  setIsAudioPlaying,
  audioRef,
  isTeacher,
  channelReady,
  sendOnChannel,
  sendAudioState,
  isAudioPlaying,
  needsAudioUnlock,
  setNeedsAudioUnlock,
  currentTrackUrl,
}) {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const seekingRef = useRef(false);
  const seekTimeRef = useRef(0);
  const seekWasPlayingRef = useRef(false);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return undefined;

    const updateCurrentTime = () => {
      setCurrentTime(Number.isFinite(el.currentTime) ? el.currentTime : 0);
    };
    const updateDuration = () => {
      setDuration(Number.isFinite(el.duration) ? el.duration : 0);
    };
    const resetProgress = () => {
      seekingRef.current = false;
      seekTimeRef.current = 0;
      seekWasPlayingRef.current = false;
      setIsSeeking(false);
      setCurrentTime(0);
      setDuration(0);
    };

    el.addEventListener("timeupdate", updateCurrentTime);
    el.addEventListener("loadedmetadata", updateDuration);
    el.addEventListener("durationchange", updateDuration);
    el.addEventListener("emptied", resetProgress);

    if (!seekingRef.current) updateCurrentTime();
    updateDuration();

    return () => {
      el.removeEventListener("timeupdate", updateCurrentTime);
      el.removeEventListener("loadedmetadata", updateDuration);
      el.removeEventListener("durationchange", updateDuration);
      el.removeEventListener("emptied", resetProgress);
    };
  }, [audioRef, currentTrackUrl]);

  if (!hasAudio) return null;

  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const hasEnded = duration > 0 && currentTime >= duration - 0.25 && !isAudioPlaying;

  const beginSeek = (event) => {
    const el = audioRef.current;

    if (!seekingRef.current) {
      seekingRef.current = true;
      seekWasPlayingRef.current = !!(isAudioPlaying || (el && !el.paused));
      seekTimeRef.current = el?.currentTime || currentTime;
      setIsSeeking(true);
    }

    if (event?.currentTarget?.setPointerCapture && event.pointerId !== undefined) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  };

  const handleSeekInput = (event) => {
    const nextTime = Number(event.target.value);

    if (!Number.isFinite(nextTime)) return;

    if (!seekingRef.current) beginSeek();

    seekTimeRef.current = nextTime;
    setCurrentTime(nextTime);
  };

  const commitSeek = () => {
    if (!seekingRef.current) return;

    const el = audioRef.current;
    const nextTime = seekTimeRef.current;
    const shouldResume = seekWasPlayingRef.current;

    seekingRef.current = false;
    setIsSeeking(false);

    if (!el || !Number.isFinite(nextTime)) return;

    el.currentTime = nextTime;
    setCurrentTime(nextTime);

    const finishSeek = (playing) => {
      setIsAudioPlaying(playing);
      if (isTeacher) {
        sendAudioState({
          time: nextTime,
          playing,
        });
      }
    };

    if (!shouldResume) {
      finishSeek(false);
      return;
    }

    const playPromise = el.paused ? el.play() : Promise.resolve();
    playPromise.then(
      () => finishSeek(true),
      () => {
        setIsAudioPlaying(false);
        setNeedsAudioUnlock(true);
        if (isTeacher) {
          sendAudioState({ time: nextTime, playing: false });
        }
      }
    );
  };

  const handleSeekKeyDown = (event) => {
    if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      beginSeek();
    }
  };

  const handleSeekKeyUp = (event) => {
    if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      commitSeek();
    }
  };

  const handleRestart = () => {
    const el = audioRef.current;
    if (!el) return;

    el.currentTime = 0;
    setCurrentTime(0);

    const playPromise = el.play();
    if (playPromise?.then) {
      playPromise.then(
        () => {
          setIsAudioPlaying(true);
          if (isTeacher) {
            sendAudioState({
              trackIndex: safeTrackIndex,
              time: 0,
              playing: true,
            });
          }
        },
        () => setIsAudioPlaying(false)
      );
    }
  };

  return (
    <>
      {audioTracks.length > 1 && (
        <select
          className="prep-annotate-toolbar__audio-select"
          value={safeTrackIndex}
          onChange={(e) => {
            const nextIndex = Number(e.target.value) || 0;

            setCurrentTrackIndex(nextIndex);
            setIsAudioPlaying(false);

            const el = audioRef.current;
            if (el) {
              el.pause();
              el.currentTime = 0;
            }

            if (isTeacher && channelReady && sendOnChannel) {
              sendAudioState({
                trackIndex: nextIndex,
                time: 0,
                playing: false,
              });
            }
          }}
        >
          {audioTracks.map((track, idx) => (
            <option key={track.id || idx} value={idx}>
              {track.label}
            </option>
          ))}
        </select>
      )}

      <div
        className={`prep-audio-player${isAudioPlaying ? " is-playing" : ""}${hasEnded ? " is-ended" : ""}${isSeeking ? " is-seeking" : ""}`}
        style={{ "--audio-progress": `${progress}%` }}
      >
        <button
          type="button"
          className="prep-audio-player__play"
          onClick={() => {
            const el = audioRef.current;
            if (!el) return;

            if (isAudioPlaying) {
              el.pause();
              setIsAudioPlaying(false);
              if (isTeacher) {
                sendAudioState({ playing: false, time: el.currentTime || 0 });
              }
              return;
            }

            const playPromise = el.play();
            if (playPromise?.then) {
              playPromise.then(
                () => {
                  setIsAudioPlaying(true);
                  if (isTeacher) {
                    sendAudioState({ playing: true, time: el.currentTime || 0 });
                  }
                },
                () => setIsAudioPlaying(false)
              );
            }
          }}
          aria-label={isAudioPlaying ? "Pause audio" : hasEnded ? "Replay audio" : "Play audio"}
          title={isAudioPlaying ? "Pause audio" : hasEnded ? "Replay audio" : "Play audio"}
        >
          {isAudioPlaying ? <Pause size={16} /> : <Play size={16} />}
        </button>

        <div className="prep-audio-player__body">
          <div className="prep-audio-player__meta">
            <span className="prep-audio-player__label">
              {hasEnded ? "Finished" : isAudioPlaying ? "Playing" : "Audio"}
            </span>
            <span className="prep-audio-player__time" aria-live="polite">
              {formatAudioTime(currentTime)} / {formatAudioTime(duration)}
            </span>
          </div>

          <input
            type="range"
            className="prep-audio-player__range"
            min="0"
            max={duration || 0}
            step="0.1"
            value={Math.min(currentTime, duration || 0)}
            onChange={handleSeekInput}
            onPointerDown={beginSeek}
            onPointerUp={commitSeek}
            onPointerCancel={commitSeek}
            onKeyDown={handleSeekKeyDown}
            onKeyUp={handleSeekKeyUp}
            onBlur={commitSeek}
            disabled={!duration || !isTeacher}
            aria-label={isTeacher ? "Audio position" : "Audio position, controlled by teacher"}
            title={isTeacher ? "Drag or click to seek" : "Playback position is controlled by the teacher"}
          />
        </div>

        <button
          type="button"
          className="prep-audio-player__restart"
          onClick={handleRestart}
          aria-label="Play from beginning"
          title="Play from beginning"
        >
          <RotateCcw size={15} />
        </button>

        {needsAudioUnlock && (
          <button
            type="button"
            className="prep-audio-player__unlock"
            onClick={() => {
              const el = audioRef.current;
              if (!el) return;
              el.play().then(
                () => {
                  setIsAudioPlaying(true);
                  setNeedsAudioUnlock(false);
                  if (isTeacher) {
                    sendAudioState({
                      trackIndex: safeTrackIndex,
                      time: el.currentTime || 0,
                      playing: true,
                    });
                  }
                },
                () => {}
              );
            }}
            aria-label="Enable audio"
            title="Enable audio"
          >
            <Volume2 size={15} />
          </button>
        )}
      </div>

      <audio
        ref={audioRef}
        src={currentTrackUrl || undefined}
        style={{ display: "none" }}
      />
    </>
  );
}
