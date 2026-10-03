// Measurements refer to each centered Garment's local coordinates, after the
// same normalization used by the showroom. Fit the torso, not a long garment's
// complete bounds: a dress hem and suit trousers must extend below the hips.
export const GARMENT_FIT = Object.freeze({
  tshirt: { shoulderWidth: 0.34, torsoLength: 0.52, shoulderY: 0.245 },
  hoodie: { shoulderWidth: 0.365, torsoLength: 0.50, shoulderY: 0.215 },
  dress: { shoulderWidth: 0.27, torsoLength: 0.36, shoulderY: 0.35 },
  suit: { shoulderWidth: 0.186, torsoLength: 0.275, shoulderY: 0.328 },
});

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const finiteOr = (value, fallback) => Number.isFinite(value) ? value : fallback;
const hiddenFit = () => ({
  center: { x: 0, y: 0 }, scaleX: 0, scaleY: 0, rotation: 0,
  visible: false, confidence: 0,
});

function validPoint(point) {
  return point && Number.isFinite(point.x) && Number.isFinite(point.y)
    && Number.isFinite(point.visibility) && point.visibility >= 0.55
    && (point.presence === undefined || point.presence >= 0.5)
    && point.x >= 0.015 && point.x <= 0.985
    && point.y >= 0.015 && point.y <= 0.985;
}

/**
 * Fits an already-centered showroom garment to normalized camera landmarks.
 * center uses top-left-origin PIXELS; scales are PIXELS per model world unit;
 * rotation uses Three's y-up z rotation. Mirror video and overlay together in
 * CSS, rather than flipping one side's landmarks or the garment texture.
 * adjustments.size changes the fit; verticalOffset is a torso-length fraction.
 */
export function getPoseFit(landmarks, width, height, garment = 'tshirt', adjustments = {}) {
  if (!Array.isArray(landmarks) || !Number.isFinite(width) || !Number.isFinite(height)
    || width <= 0 || height <= 0) return hiddenFit();

  const points = [landmarks[11], landmarks[12], landmarks[23], landmarks[24]];
  if (!points.every(validPoint)) return hiddenFit();
  const [leftShoulder, rightShoulder, leftHip, rightHip] = points.map(point => ({
    x: point.x * width, y: point.y * height,
  }));
  const shoulders = {
    x: (leftShoulder.x + rightShoulder.x) / 2,
    y: (leftShoulder.y + rightShoulder.y) / 2,
  };
  const hips = { x: (leftHip.x + rightHip.x) / 2, y: (leftHip.y + rightHip.y) / 2 };
  const torsoX = hips.x - shoulders.x;
  const torsoY = hips.y - shoulders.y;
  const torsoLength = Math.hypot(torsoX, torsoY);
  const shoulderWidth = Math.hypot(leftShoulder.x - rightShoulder.x, leftShoulder.y - rightShoulder.y);

  // Reject unreliable tiny, sideways, cropped or upside-down detections instead
  // of leaving an enormous or drifting garment over an unrelated camera view.
  if (torsoY < height * 0.10 || torsoLength < height * 0.12
    || shoulderWidth < width * 0.06 || shoulderWidth / torsoLength < 0.40
    || shoulderWidth / torsoLength > 1.8 || torsoLength > height * 0.82) return hiddenFit();

  const profile = GARMENT_FIT[garment] || GARMENT_FIT.tshirt;
  const size = clamp(finiteOr(adjustments.size, 1), 0.75, 1.3);
  const verticalOffset = clamp(finiteOr(adjustments.verticalOffset, 0), -0.25, 0.25);
  const scaleY = torsoLength / profile.torsoLength * size;
  const scaleX = clamp(shoulderWidth / profile.shoulderWidth * size, scaleY * 0.72, scaleY * 1.35);
  const [screenLeft, screenRight] = leftShoulder.x <= rightShoulder.x
    ? [leftShoulder, rightShoulder] : [rightShoulder, leftShoulder];
  const shoulderRotation = Math.atan2(-(screenRight.y - screenLeft.y), screenRight.x - screenLeft.x);
  const torsoRotation = Math.atan2(torsoX, torsoY);
  const rotation = clamp(torsoRotation * 0.6 + shoulderRotation * 0.4, -0.7, 0.7);
  const downX = Math.sin(rotation);
  const downY = Math.cos(rotation);
  const centerDistance = profile.shoulderY * scaleY + verticalOffset * torsoLength;

  return {
    center: { x: shoulders.x + downX * centerDistance, y: shoulders.y + downY * centerDistance },
    scaleX, scaleY, rotation, visible: true,
    confidence: Math.min(...points.map(point => point.visibility)),
  };
}
