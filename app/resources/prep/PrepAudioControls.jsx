// app/resources/prep/PrepAudioControls.jsx

import { Play, Pause, Volume2, RotateCcw } from "lucide-react";

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
  if (!hasAudio) return null;

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

      <button
        type="button"
        className="prep-annotate-toolbar__btn prep-annotate-toolbar__btn--audio"
        onClick={() => {
          const el = audioRef.current;
          if (!el) return;

          if (isAudioPlaying) {
            if (isTeacher) sendAudioState({ playing: false });
            el.pause();
            setIsAudioPlaying(false);
          } else {
            if (isTeacher) sendAudioState({ playing: true });
            el.play().then(
              () => {
                setIsAudioPlaying(true);
              },
              () => setIsAudioPlaying(false)
            );
          }
        }}
        aria-label={isAudioPlaying ? "Pause audio" : "Play audio"}
      >
        {isAudioPlaying ? <Pause size={18} /> : <Play size={18} />}
      </button>

      {needsAudioUnlock && (
        <button
          type="button"
          className="prep-annotate-toolbar__btn prep-annotate-toolbar__btn--audio"
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
          <Volume2 size={18} />
        </button>
      )}

      <button
        type="button"
        className="prep-annotate-toolbar__btn prep-annotate-toolbar__btn--audio-restart"
        onClick={() => {
          const el = audioRef.current;
          if (!el) return;

          el.currentTime = 0;

          if (isTeacher && channelReady && sendOnChannel) {
            sendAudioState({
              trackIndex: safeTrackIndex,
              time: 0,
              playing: true,
            });
          }

          el.play().then(
            () => {
              setIsAudioPlaying(true);

              if (isTeacher && channelReady && sendOnChannel) {
                sendAudioState({
                  trackIndex: safeTrackIndex,
                  time: 0,
                  playing: true,
                });
              }
            },
            () => setIsAudioPlaying(false)
          );
        }}
        aria-label="Play from beginning"
      >
        <RotateCcw size={18} />
      </button>

      <audio
        ref={audioRef}
        src={currentTrackUrl || undefined}
        style={{ display: "none" }}
      />
    </>
  );
}
