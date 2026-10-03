// A clock update should correct meaningful drift without restarting playback.
export function getAudioTargetTime({ baseTime, sentAt, playing, now }) {
  // Device clocks are not synchronized. Limit apparent network delay so a
  // learner with an inaccurate clock cannot jump far ahead in the exercise.
  const elapsed = Math.max(0, Math.min(1.5, (now - sentAt) / 1000));
  return Math.max(0, baseTime + (playing ? elapsed : 0));
}

export function shouldApplyAudioState({
  seq,
  sentAt,
  lastSeq,
  lastSentAt,
  afterTrackChange = false,
}) {
  if (sentAt > 0 && lastSentAt > 0 && sentAt < lastSentAt) return false;
  if (!afterTrackChange && Number.isFinite(seq) && seq <= lastSeq && sentAt <= lastSentAt) {
    return false;
  }
  return true;
}

export function planAudioSync({
  playing,
  paused,
  currentTime,
  targetTime,
  readyState,
  isSnapshot = false,
  trackChanged = false,
}) {
  const drift = Math.abs(currentTime - targetTime);
  const canSeek = readyState >= 1 && (paused || readyState >= 2);

  return {
    seek: canSeek && (isSnapshot || trackChanged || drift > 0.9),
    play: playing && paused,
    pause: !playing && !paused,
  };
}
