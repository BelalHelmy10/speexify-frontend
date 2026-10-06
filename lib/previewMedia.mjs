// Keep an available device usable when the other device fails during prejoin.
export async function acquirePreviewMedia(mediaDevices, constraints, makeStream) {
  if (!constraints.audio && !constraints.video) return { stream: null };
  try {
    return { stream: await mediaDevices.getUserMedia(constraints) };
  } catch (error) {
    if (!constraints.audio || !constraints.video) throw error;
    const results = await Promise.allSettled([
      mediaDevices.getUserMedia({ audio: false, video: constraints.video }),
      mediaDevices.getUserMedia({ audio: constraints.audio, video: false }),
    ]);
    const tracks = results.flatMap(result => result.status === 'fulfilled' ? result.value.getTracks() : []);
    if (!tracks.length) throw error;
    return {
      stream: makeStream(tracks),
      videoError: results[0].status === 'rejected' ? results[0].reason : null,
      audioError: results[1].status === 'rejected' ? results[1].reason : null,
    };
  }
}
