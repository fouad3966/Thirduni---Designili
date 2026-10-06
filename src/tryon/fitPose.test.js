/* eslint-env node */
import assert from 'node:assert/strict';
import test from 'node:test';
import { GARMENT_FIT, getPoseFit } from './fitPose.js';

function pose() {
  const landmarks = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 1 }));
  landmarks[11] = { x: 0.65, y: 0.25, visibility: 0.95 };
  landmarks[12] = { x: 0.35, y: 0.25, visibility: 0.95 };
  landmarks[23] = { x: 0.60, y: 0.65, visibility: 0.95 };
  landmarks[24] = { x: 0.40, y: 0.65, visibility: 0.95 };
  return landmarks;
}

test('centers the garment below shoulders and keeps its shoulder line anchored', () => {
  const fit = getPoseFit(pose(), 640, 480);
  assert.equal(fit.visible, true);
  assert.equal(fit.center.x, 320);
  assert.equal(fit.rotation, 0);
  assert.ok(Math.abs(fit.center.y - GARMENT_FIT.tshirt.shoulderY * fit.scaleY - 120) < 1e-8);
});

test('viewport resizing scales the same fit without changing rotation', () => {
  const small = getPoseFit(pose(), 640, 480);
  const large = getPoseFit(pose(), 1280, 960);
  assert.equal(large.center.x, small.center.x * 2);
  assert.equal(large.center.y, small.center.y * 2);
  assert.equal(large.scaleX, small.scaleX * 2);
  assert.equal(large.scaleY, small.scaleY * 2);
});

test('mirroring both camera axes produces a mirrored center and opposite rotation', () => {
  const landmarks = pose();
  landmarks[23].x += 0.06;
  landmarks[24].x += 0.06;
  landmarks[11].y -= 0.025;
  landmarks[12].y += 0.025;
  const normal = getPoseFit(landmarks, 640, 480);
  const mirrored = getPoseFit(landmarks.map(point => ({ ...point, x: 1 - point.x })), 640, 480);
  assert.ok(normal.rotation > 0);
  assert.ok(Math.abs(mirrored.rotation + normal.rotation) < 1e-8);
  assert.ok(Math.abs(mirrored.center.x + normal.center.x - 640) < 1e-8);
  assert.ok(Math.abs(mirrored.center.y - normal.center.y) < 1e-8);
});

test('missing, low confidence, cropped and narrow sideways poses hide the garment', () => {
  assert.equal(getPoseFit(null, 640, 480).visible, false);
  for (const mutate of [
    landmarks => { landmarks[11].visibility = 0.2; },
    landmarks => { landmarks[12].x = NaN; },
    landmarks => { landmarks[11].x = 0.51; landmarks[12].x = 0.49; },
    landmarks => { landmarks[23].y = 0.05; landmarks[24].y = 0.05; },
  ]) {
    const landmarks = pose();
    mutate(landmarks);
    assert.equal(getPoseFit(landmarks, 640, 480).visible, false);
  }
});

test('a top fits from the shoulders alone, while a dress waits for the hips', () => {
  const landmarks = pose();
  landmarks[23].y = 1.1;
  landmarks[24].y = 1.1;
  const shirt = getPoseFit(landmarks, 640, 480, 'tshirt');
  assert.equal(shirt.visible, true);
  assert.equal(shirt.hipsVisible, false);
  assert.equal(getPoseFit(landmarks, 640, 480, 'dress').visible, false);
  assert.equal(getPoseFit(landmarks, 640, 480, 'suit').visible, false);
  assert.equal(getPoseFit(landmarks, 640, 480, 'hoodie').visible, true);

  // The estimated torso follows the model's own proportions, so the garment
  // keeps its shape: width and length scale together from the shoulders.
  const shoulderPixels = (0.65 - 0.35) * 640;
  assert.ok(Math.abs(shirt.scaleX - shoulderPixels / GARMENT_FIT.tshirt.shoulderWidth) < 1e-8);
  assert.ok(Math.abs(shirt.scaleX - shirt.scaleY) < 1e-8);
  assert.equal(shirt.center.x, 320);
  assert.ok(Math.abs(shirt.center.y - GARMENT_FIT.tshirt.shoulderY * shirt.scaleY - 120) < 1e-8);
});

test('shoulders-only fitting still rejects a camera that is too close or sideways', () => {
  const cropped = () => {
    const landmarks = pose();
    landmarks[23].y = 1.1;
    landmarks[24].y = 1.1;
    return landmarks;
  };
  const tooClose = cropped();
  tooClose[11].x = 0.95;
  tooClose[12].x = 0.05;
  assert.equal(getPoseFit(tooClose, 640, 480, 'tshirt').visible, false);

  const sideways = cropped();
  sideways[11].y = 0.55;
  sideways[12].y = 0.1;
  assert.equal(getPoseFit(sideways, 640, 480, 'tshirt').visible, false);
});

test('long garments use torso anchors instead of shrinking the complete outfit into the torso', () => {
  const shirt = getPoseFit(pose(), 640, 480, 'tshirt');
  const suit = getPoseFit(pose(), 640, 480, 'suit');
  const dress = getPoseFit(pose(), 640, 480, 'dress');
  assert.ok(suit.scaleY * 0.75 > shirt.scaleY * 0.613 * 1.5);
  assert.ok(dress.scaleY * 0.75 > shirt.scaleY * 0.613 * 1.5);
  assert.ok(suit.center.y > shirt.center.y);
});

test('manual fit controls are bounded and vertical movement uses torso proportions', () => {
  const normal = getPoseFit(pose(), 640, 480);
  const changed = getPoseFit(pose(), 640, 480, 'tshirt', { size: 1.2, verticalOffset: 0.1 });
  assert.ok(Math.abs(changed.scaleY / normal.scaleY - 1.2) < 1e-8);
  assert.ok(Math.abs(changed.center.y - 120 - GARMENT_FIT.tshirt.shoulderY * changed.scaleY - 19.2) < 1e-8);
  const extreme = getPoseFit(pose(), 640, 480, 'tshirt', { size: 20, verticalOffset: 10 });
  const clamped = getPoseFit(pose(), 640, 480, 'tshirt', { size: 1.3, verticalOffset: 0.25 });
  assert.deepEqual(extreme, clamped);
  assert.equal(getPoseFit(pose(), 0, 480).visible, false);
});
