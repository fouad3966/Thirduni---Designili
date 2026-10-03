/* eslint-env node */
import assert from 'node:assert/strict';
import test from 'node:test';
import { createPoseTracker } from './poseTracker.js';

function fakeRuntime(t, capture) {
  const originalWorker = globalThis.Worker;
  const originalCapture = globalThis.createImageBitmap;
  const workers = [];
  class FakeWorker {
    messages = [];
    terminated = false;
    constructor() { workers.push(this); }
    postMessage(message, transfers) { this.messages.push({ message, transfers }); }
    terminate() { this.terminated = true; }
    reply(data) { this.onmessage({ data }); }
  }
  globalThis.Worker = FakeWorker;
  globalThis.createImageBitmap = capture;
  t.after(() => {
    if (originalWorker === undefined) delete globalThis.Worker;
    else globalThis.Worker = originalWorker;
    if (originalCapture === undefined) delete globalThis.createImageBitmap;
    else globalThis.createImageBitmap = originalCapture;
  });
  return workers;
}

const video = () => ({ readyState: 4, videoWidth: 1280, videoHeight: 720, currentTime: 1 });

test('abort during initialization terminates the worker and rejects the pending tracker', async t => {
  const workers = fakeRuntime(t, async () => ({}));
  const controller = new AbortController();
  const pending = createPoseTracker({ signal: controller.signal });
  assert.equal(workers[0].messages[0].message.type, 'init');
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
  assert.equal(workers[0].terminated, true);
});

test('closing while a bitmap is being created closes that late bitmap without transfer', async t => {
  let finishCapture;
  let bitmapClosed = false;
  const workers = fakeRuntime(t, () => new Promise(resolve => { finishCapture = resolve; }));
  const pending = createPoseTracker();
  workers[0].reply({ type: 'ready' });
  const tracker = await pending;
  const detecting = tracker.detect(video());
  tracker.close();
  finishCapture({ close: () => { bitmapClosed = true; } });
  await detecting;
  assert.equal(bitmapClosed, true);
  assert.equal(workers[0].messages.length, 1);
  assert.equal(workers[0].terminated, true);
});

test('only one resized camera frame is in flight and a matching result reaches the caller', async t => {
  let captures = 0;
  let options;
  const bitmap = { close() {} };
  const workers = fakeRuntime(t, async (_, settings) => { captures += 1; options = settings; return bitmap; });
  const poses = [];
  const pending = createPoseTracker({ onPose: pose => poses.push(pose) });
  const worker = workers[0];
  worker.reply({ type: 'ready' });
  const tracker = await pending;
  t.after(() => tracker.close());
  await tracker.detect(video());
  await tracker.detect({ ...video(), currentTime: 2 });
  assert.equal(captures, 1);
  assert.equal(options.resizeWidth, 640);
  assert.equal(options.resizeHeight, 360);
  assert.deepEqual(worker.messages[1].transfers, [bitmap]);
  worker.reply({ type: 'pose', frameId: 99, landmarks: [] });
  assert.deepEqual(poses, []);
  worker.reply({ type: 'pose', frameId: 1, landmarks: null });
  assert.deepEqual(poses, [null]);
});

test('a runtime worker failure releases resources and reports exactly one error', async t => {
  const workers = fakeRuntime(t, async () => ({}));
  const errors = [];
  const pending = createPoseTracker({ onError: error => errors.push(error) });
  const worker = workers[0];
  worker.reply({ type: 'ready' });
  await pending;
  worker.reply({ type: 'error', message: 'WebGL context lost' });
  worker.reply({ type: 'error', message: 'late duplicate' });
  assert.equal(worker.terminated, true);
  assert.equal(errors.length, 1);
  assert.equal(errors[0].message, 'WebGL context lost');
});
