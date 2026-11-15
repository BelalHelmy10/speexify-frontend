import test from 'node:test';
import assert from 'node:assert/strict';
import { monitorClassroomConnection } from '../lib/classroomConnectionMonitor.mjs';

function setup(initialParticipants = []) {
  const events = new Map();
  const browserEvents = new Map();
  const timers = new Map();
  const states = [];
  const failures = [];
  let nextTimer = 0;
  let readyCount = 0;
  const api = {
    addListener(name, fn) { events.set(name, fn); },
    removeListener(name, fn) { if (events.get(name) === fn) events.delete(name); },
    getParticipantsInfo: () => initialParticipants,
    getCurrentUserID: () => 'local',
  };
  const environment = {
    navigator: { onLine: true },
    setTimeout(fn) { const id = ++nextTimer; timers.set(id, fn); return id; },
    clearTimeout(id) { timers.delete(id); },
    addEventListener(name, fn) { browserEvents.set(name, fn); },
    removeEventListener(name) { browserEvents.delete(name); },
  };
  const stop = monitorClassroomConnection(api, {
    environment,
    onStateChange: state => states.push(state),
    onUnavailable: failure => failures.push(failure),
    onTransportReady: () => readyCount++,
  });
  return {
    states, failures, timers, events, browserEvents, stop,
    get readyCount() { return readyCount; },
    emit: (name, payload) => events.get(name)?.(payload),
    network: name => browserEvents.get(name)?.(),
    expire: () => { const pending = [...timers.values()]; timers.clear(); pending.forEach(fn => fn()); },
  };
}

test('joining a room does not falsely declare the video connected', () => {
  const h = setup();
  h.emit('videoConferenceJoined');
  assert.deepEqual(h.states, ['waiting']);
  assert.equal(h.timers.size, 0);
  assert.equal(h.readyCount, 0);
  h.stop();
});

for (const peerFirst of [true, false]) {
  test(`admitted peers without transport time out (peer first: ${peerFirst})`, () => {
    const h = setup();
    if (peerFirst) h.emit('participantJoined', { id: 'remote' });
    h.emit('videoConferenceJoined');
    if (!peerFirst) h.emit('participantJoined', { id: 'remote' });
    assert.equal(h.states.at(-1), 'connecting');
    h.expire();
    assert.deepEqual(h.failures, [{ reason: 'media_transport_timeout' }]);
    assert.equal(h.states.at(-1), 'failed');
    h.emit('dataChannelOpened');
    assert.equal(h.states.at(-1), 'connected');
    assert.equal(h.readyCount, 1);
    h.stop();
  });
}

test('existing participant snapshot starts the media watchdog and excludes self', () => {
  const h = setup([{ participantId: 'local' }, { participantId: 'remote' }]);
  h.emit('videoConferenceJoined', { id: 'local' });
  assert.equal(h.timers.size, 1);
  h.emit('participantLeft', { id: 'remote' });
  assert.equal(h.states.at(-1), 'waiting');
  assert.equal(h.timers.size, 0);
  h.stop();
});

test('a late-joining peer starts the watchdog only once', () => {
  const h = setup();
  h.emit('videoConferenceJoined');
  h.emit('participantJoined', { id: 'remote' });
  h.emit('participantJoined', { id: 'remote2' });
  assert.equal(h.timers.size, 1);
  h.emit('dataChannelOpened');
  assert.equal(h.timers.size, 0);
  assert.equal(h.states.at(-1), 'connected');
  h.stop();
});

test('supported data channel events detect and recover a bridge interruption', () => {
  const h = setup([{ id: 'remote' }]);
  h.emit('videoConferenceJoined');
  h.emit('dataChannelOpened');
  h.emit('dataChannelClosed');
  assert.equal(h.states.at(-1), 'connecting');
  h.expire();
  assert.equal(h.states.at(-1), 'failed');
  h.emit('dataChannelOpened');
  assert.equal(h.states.at(-1), 'connected');
  h.stop();
});

test('P2P can connect without a bridge channel and survive bridge closure', () => {
  const h = setup([{ id: 'remote' }]);
  h.emit('videoConferenceJoined');
  h.emit('p2pStatusChanged', { isP2p: true });
  h.emit('dataChannelClosed');
  assert.equal(h.states.at(-1), 'connected');
  assert.equal(h.timers.size, 0);
  h.emit('p2pStatusChanged', { isP2p: false });
  h.expire();
  assert.equal(h.states.at(-1), 'failed');
  h.stop();
});

test('returning online requires a new transport signal, not just network availability', () => {
  const h = setup([{ id: 'remote' }]);
  h.emit('videoConferenceJoined');
  h.emit('dataChannelOpened');
  h.network('offline');
  assert.equal(h.states.at(-1), 'reconnecting');
  h.expire();
  assert.deepEqual(h.failures, [{ reason: 'network_offline' }]);
  h.network('online');
  assert.equal(h.states.at(-1), 'failed');
  h.emit('dataChannelOpened');
  assert.equal(h.states.at(-1), 'connected');
  h.stop();
});

test('leaving or retrying cancels pending failure reports and old listeners', () => {
  const h = setup([{ id: 'remote' }]);
  h.emit('videoConferenceJoined');
  const staleOpen = h.events.get('dataChannelOpened');
  h.emit('videoConferenceLeft');
  assert.equal(h.timers.size, 0);
  h.stop();
  const count = h.states.length;
  staleOpen();
  h.expire();
  assert.equal(h.states.length, count);
  assert.equal(h.failures.length, 0);
  assert.equal(h.events.size, 0);
  assert.equal(h.browserEvents.size, 0);
});
