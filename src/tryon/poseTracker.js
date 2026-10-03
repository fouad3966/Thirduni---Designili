const FRAME_INTERVAL = 1000 / 15;
const INITIALIZATION_TIMEOUT = 45_000;
const FRAME_TIMEOUT = 10_000;

const abortError = () => new DOMException('Pose tracking was cancelled.', 'AbortError');

/**
 * Creates a local pose worker. Camera acquisition belongs to the caller.
 * detect(video) can be called from requestAnimationFrame: only one downscaled
 * frame is captured/transferred at a time, and detection is limited to 15 fps.
 */
export function createPoseTracker({ onPose, onError, signal } = {}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(abortError()); return; }
    if (typeof Worker === 'undefined' || typeof createImageBitmap !== 'function') {
      reject(new Error('This browser does not support local camera tracking. Try a recent Chrome, Edge, Firefox or Safari.'));
      return;
    }

    let worker;
    let ready = false;
    let closed = false;
    let inFlight = false;
    let lastFrameAt = -Infinity;
    let lastVideoTime = -Infinity;
    let frameId = 0;
    let initializationTimer;
    let frameTimer;

    function cleanup() {
      if (closed) return;
      closed = true;
      clearTimeout(initializationTimer);
      clearTimeout(frameTimer);
      signal?.removeEventListener('abort', abort);
      worker?.terminate();
      worker = undefined;
    }

    function fail(error) {
      if (closed) return;
      const wasReady = ready;
      cleanup();
      if (wasReady) onError?.(error);
      else reject(error);
    }

    function abort() {
      if (!ready) { fail(abortError()); return; }
      cleanup();
    }

    async function detect(video) {
      if (closed || !ready || inFlight || !video || video.readyState < 2
        || !video.videoWidth || !video.videoHeight) return;
      const timestamp = performance.now();
      if (timestamp - lastFrameAt < FRAME_INTERVAL || video.currentTime === lastVideoTime) return;
      lastFrameAt = timestamp;
      lastVideoTime = video.currentTime;
      inFlight = true;
      let bitmap;
      try {
        const resize = Math.min(1, 640 / Math.max(video.videoWidth, video.videoHeight));
        bitmap = await createImageBitmap(video, {
          resizeWidth: Math.max(1, Math.round(video.videoWidth * resize)),
          resizeHeight: Math.max(1, Math.round(video.videoHeight * resize)),
          resizeQuality: 'low',
        });
        if (closed) { bitmap.close(); return; }
        frameId += 1;
        worker.postMessage({ type: 'frame', bitmap, timestamp, frameId }, [bitmap]);
        bitmap = undefined; // The worker owns and closes the transferred bitmap.
        frameTimer = setTimeout(() => fail(new Error('Camera tracking stopped responding. Please try again.')), FRAME_TIMEOUT);
      } catch (error) {
        bitmap?.close();
        fail(new Error(`Could not process the camera frame: ${error.message || error}`));
      }
    }

    try {
      // Do not set type:'module': MediaPipe loads its WASM glue with importScripts.
      worker = new Worker(new URL('./pose.worker.js', import.meta.url));
      worker.onmessage = event => {
        if (closed) return;
        const data = event.data;
        if (data.type === 'ready' && !ready) {
          ready = true;
          clearTimeout(initializationTimer);
          resolve({ detect, close: cleanup });
        } else if (data.type === 'pose' && data.frameId === frameId) {
          clearTimeout(frameTimer);
          inFlight = false;
          onPose?.(data.landmarks);
        } else if (data.type === 'error') {
          fail(new Error(data.message || 'Local pose tracking failed.'));
        }
      };
      worker.onerror = event => {
        event.preventDefault();
        fail(new Error(event.message || 'The local camera tracker could not load.'));
      };
      worker.onmessageerror = () => fail(new Error('The browser could not read the tracking result.'));
      signal?.addEventListener('abort', abort, { once: true });
      initializationTimer = setTimeout(() => fail(new Error('Camera tracking took too long to load. Please try again.')), INITIALIZATION_TIMEOUT);
      worker.postMessage({ type: 'init' });
    } catch (error) {
      fail(error);
    }
  });
}
