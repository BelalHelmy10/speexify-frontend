import test from 'node:test';
import assert from 'node:assert/strict';
import { acquirePreviewMedia } from '../lib/previewMedia.mjs';
const stream = kind => ({ getTracks: () => [{ kind }] });
const makeStream = tracks => ({ getTracks: () => tracks });
test('a denied microphone does not discard a working camera', async () => {
  const result = await acquirePreviewMedia({getUserMedia: async c => {
    if(c.audio) throw new Error('Microphone denied');
    return stream('video');
  }}, {audio:true,video:true}, makeStream);
  assert.deepEqual(result.stream.getTracks(), [{kind:'video'}]);
  assert.ok(result.audioError); assert.equal(result.videoError,null);
});
test('an unavailable camera does not discard a working microphone', async () => {
  const result = await acquirePreviewMedia({getUserMedia: async c => {
    if(c.video) throw new Error('Camera busy');
    return stream('audio');
  }}, {audio:true,video:true}, makeStream);
  assert.deepEqual(result.stream.getTracks(), [{kind:'audio'}]);
  assert.ok(result.videoError); assert.equal(result.audioError,null);
});
test('muted devices are not requested and both-muted does not prompt', async () => {
  const requests=[];
  const devices={getUserMedia: async c=>{requests.push(c);return stream('video');}};
  await acquirePreviewMedia(devices,{audio:false,video:true},makeStream);
  assert.deepEqual(requests,[{audio:false,video:true}]);
  assert.equal((await acquirePreviewMedia(devices,{audio:false,video:false},makeStream)).stream,null);
  assert.equal(requests.length,1);
});
test('successful combined capture is reused without extra requests', async () => {
  let calls=0;const original=stream('video');
  const result=await acquirePreviewMedia({getUserMedia:async()=>{calls++;return original;}},{audio:true,video:true},makeStream);
  assert.equal(result.stream,original);assert.equal(calls,1);
});
