// The iframe API does NOT forward lib-jitsi-meet's connectionInterrupted /
// connectionRestored events. Conference admission alone also says nothing
// about ICE/media connectivity. Observe the supported transport events instead.
export function monitorClassroomConnection(api, {
  onStateChange,
  onTransportReady,
  onUnavailable,
  timeoutMs = 20000,
  environment = window,
}) {
  let joined = false;
  let bridgeOpen = false;
  let p2pActive = false;
  let online = environment.navigator?.onLine !== false;
  let disposed = false;
  let timer = null;
  let unavailable = false;
  let lastState;
  const participants = new Set();
  const listeners = [];

  const clearTimer = () => {
    if (timer !== null) environment.clearTimeout(timer);
    timer = null;
  };
  const publish = state => {
    if (disposed || state === lastState) return;
    lastState = state;
    onStateChange(state);
  };
  const update = () => {
    if (disposed || !joined) return;
    if (online && (bridgeOpen || p2pActive)) {
      clearTimer();
      unavailable = false;
      publish(participants.size ? 'connected' : 'waiting');
      onTransportReady();
      return;
    }
    if (online && !participants.size) {
      clearTimer();
      unavailable = false;
      publish('waiting');
      return;
    }
    if (unavailable) return;
    publish(online ? 'connecting' : 'reconnecting');
    if (timer !== null) return;
    timer = environment.setTimeout(() => {
      timer = null;
      if (disposed || !joined) return;
      unavailable = true;
      publish('failed');
      onUnavailable({ reason: online ? 'media_transport_timeout' : 'network_offline' });
    }, timeoutMs);
  };
  const listen = (name, callback) => {
    const guarded = event => { if (!disposed) callback(event); };
    api.addListener(name, guarded);
    listeners.push([name, guarded]);
  };
  const participantId = participant => participant?.id || participant?.participantId;
  listen('participantJoined', participant => {
    const id = participantId(participant);
    if (id) participants.add(String(id));
    update();
  });
  listen('participantLeft', participant => {
    const id = participantId(participant);
    if (id) participants.delete(String(id));
    update();
  });
  listen('videoConferenceJoined', event => {
    joined = true;
    // Participants can arrive before the local join event.
    const localId = event?.id || api.getCurrentUserID?.();
    for (const participant of api.getParticipantsInfo?.() || []) {
      const id = participantId(participant);
      if (id && String(id) !== String(localId)) participants.add(String(id));
    }
    if (localId) participants.delete(String(localId));
    update();
  });
  listen('videoConferenceLeft', () => {
    joined = false;
    bridgeOpen = false;
    p2pActive = false;
    participants.clear();
    clearTimer();
  });
  listen('dataChannelOpened', () => { bridgeOpen = true; update(); });
  listen('dataChannelClosed', () => { bridgeOpen = false; update(); });
  listen('p2pStatusChanged', event => { p2pActive = event?.isP2p === true; update(); });
  const offline = () => {
    online = false;
    bridgeOpen = false;
    p2pActive = false;
    update();
  };
  const onlineAgain = () => { online = true; update(); };
  environment.addEventListener('offline', offline);
  environment.addEventListener('online', onlineAgain);

  return () => {
    disposed = true;
    clearTimer();
    for (const [name, listener] of listeners) api.removeListener?.(name, listener);
    environment.removeEventListener('offline', offline);
    environment.removeEventListener('online', onlineAgain);
  };
}
