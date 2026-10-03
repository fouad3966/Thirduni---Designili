/* Dedicated CLASSIC worker: MediaPipe's WASM loader needs importScripts. */
// Keep the pinned runtime's optional metrics logger inside this worker's local
// asset boundary. MediaPipe 1.0.1 uses fetch for its Google metrics endpoint.
// This does not replace fetch in the application or affect image generation.
const fetchLocalAsset = self.fetch.bind(self);
self.fetch = async (input, options) => {
  const url = new URL(input instanceof Request ? input.url : input, self.location.href);
  if (url.origin !== self.location.origin) {
    throw new TypeError('External requests are disabled in the local pose tracker.');
  }
  // A same-origin asset must not silently redirect to an external service.
  return fetchLocalAsset(input, { ...options, redirect: 'error' });
};

let landmarker;
let initialized = false;

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

async function initialize() {
  // All runtime files are served by this website. No frames leave this worker.
  const runtimeUrl = new URL('/tryon/vision_bundle.mjs', self.location.origin).href;
  const { FilesetResolver, PoseLandmarker } = await import(/* @vite-ignore */ runtimeUrl);
  const vision = await FilesetResolver.forVisionTasks('/tryon/wasm');
  let previousError;
  // Lite runs in this dedicated worker, so CPU inference keeps the UI free and
  // avoids GPU shader warmup stalls on software renderers and older devices.
  // GPU remains a fallback when the CPU delegate cannot initialize.
  for (const delegate of ['CPU', 'GPU']) {
    try {
      landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: '/tryon/pose_landmarker_lite.task', delegate },
        runningMode: 'VIDEO', numPoses: 1,
        minPoseDetectionConfidence: 0.55,
        minPosePresenceConfidence: 0.55,
        minTrackingConfidence: 0.55,
        outputSegmentationMasks: false,
      });
      initialized = true;
      self.postMessage({ type: 'ready', delegate });
      return;
    } catch (error) {
      landmarker?.close();
      landmarker = undefined;
      if (delegate === 'CPU') previousError = error;
      else throw new Error(`Pose tracking could not start: ${errorMessage(error || previousError)}`);
    }
  }
}

self.onmessage = async event => {
  const { type, bitmap, timestamp, frameId } = event.data;
  if (type === 'init') {
    try { await initialize(); }
    catch (error) { self.postMessage({ type: 'error', message: errorMessage(error) }); }
  } else if (type === 'frame') {
    try {
      if (!initialized || !landmarker) throw new Error('Pose tracking is not ready.');
      const result = landmarker.detectForVideo(bitmap, timestamp);
      self.postMessage({ type: 'pose', frameId, landmarks: result.landmarks[0] || null });
    } catch (error) {
      self.postMessage({ type: 'error', message: errorMessage(error), frameId });
    } finally {
      bitmap?.close();
    }
  } else if (type === 'close') {
    landmarker?.close();
    landmarker = undefined;
    self.close();
  }
};
