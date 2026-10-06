import { Component, Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Center } from '@react-three/drei';
import { useSnapshot } from 'valtio';
import state from '../store';
import Garment from '../canvas/Garment';
import GarmentSelector from '../comp/GarmentSelector';
import { createPoseTracker } from './poseTracker';
import { framingHint, getPoseFit } from './fitPose';
import { measureRoomLight, paintOcclusion } from './occlusion';
import { createFitSmoother } from './smoothFit';
import './wearIt.css';

const stopStream = stream => stream?.getTracks().forEach(track => track.stop());

function cameraError(error) {
  if (['NotAllowedError', 'SecurityError'].includes(error.name)) return 'Camera access is blocked. Allow camera access in your browser’s address bar, then try again.';
  if (error.name === 'NotFoundError') return 'No camera was found. Connect a camera, then try again.';
  if (error.name === 'NotReadableError') return 'Your camera is busy. Close other apps using it, then try again.';
  return error.message || 'The camera preview could not start. Please try again.';
}

class ModelBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError('The garment could not load. Close this preview and try again.'); }
  render() { return this.state.failed ? null : this.props.children; }
}

// Which way you are turned, from the pose model's metric landmarks: the
// garment turns with you instead of staying flat against the camera.
function bodyYaw(worldLandmarks) {
  const left = worldLandmarks?.[11];
  const right = worldLandmarks?.[12];
  if (!left || !right || !Number.isFinite(left.z) || !Number.isFinite(right.z)) return 0;
  const yaw = Math.atan2(left.z - right.z, left.x - right.x);
  return Math.max(-0.8, Math.min(0.8, yaw));
}

function TrackedGarment({ pose, adjustments }) {
  const snap = useSnapshot(state);
  const group = useRef();
  const smoother = useRef(null);
  const lastSample = useRef(0);
  const { size } = useThree();
  smoother.current ||= createFitSmoother();

  // A different garment is a different shape: start its tracking clean.
  useEffect(() => { smoother.current.reset(); lastSample.current = 0; }, [snap.garment]);

  useFrame(() => {
    if (!group.current) return;
    const sample = pose.current;
    const now = performance.now();
    const fresh = sample && now - sample.time < 500;

    if (fresh && sample.capturedAt !== lastSample.current) {
      lastSample.current = sample.capturedAt;
      const fit = getPoseFit(sample.landmarks, size.width, size.height, snap.garment, adjustments);
      if (fit.visible) {
        smoother.current.push({
          x: fit.center.x - size.width / 2,
          y: size.height / 2 - fit.center.y,
          scaleX: fit.scaleX, scaleY: fit.scaleY,
          rotation: fit.rotation, yaw: bodyYaw(sample.worldLandmarks),
        }, sample.capturedAt / 1000);
      } else {
        smoother.current.reset();
      }
    }

    // Drawn where the body is now, not where the last finished frame saw it.
    const fit = fresh ? smoother.current.predict(now / 1000) : null;
    if (!fit) {
      group.current.visible = false;
      return;
    }
    group.current.position.set(fit.x, fit.y, 0);
    group.current.scale.set(fit.scaleX, fit.scaleY, Math.sqrt(fit.scaleX * fit.scaleY));
    group.current.rotation.set(0, fit.yaw, fit.rotation);
    group.current.visible = true;
  });

  return <group ref={group} visible={false}><Center key={snap.garment}><Garment /></Center></group>;
}

// The lights follow the brightness of the room, so the garment does not glow
// in a dim room or look grey in a bright one.
function RoomLights({ light }) {
  const ambient = useRef();
  const key = useRef();

  useFrame((_, delta) => {
    const level = light.current ?? 0.5;
    const amount = 1 - Math.exp(-3 * delta);
    if (ambient.current) ambient.current.intensity += (0.55 + level * 1.3 - ambient.current.intensity) * amount;
    if (key.current) key.current.intensity += (0.7 + level * 1.7 - key.current.intensity) * amount;
  });

  return <>
    <ambientLight ref={ambient} intensity={1.3} />
    <directionalLight ref={key} position={[-3, 5, 8]} intensity={1.8} />
    <directionalLight position={[4, 2, 4]} intensity={0.6} />
  </>;
}

export default function WearIt({ onClose }) {
  const dialog = useRef();
  const video = useRef();
  const occlusion = useRef();
  const pose = useRef(null);
  const roomLight = useRef(0.5);
  const probe = useRef(null);
  probe.current ||= typeof document === 'undefined' ? null : Object.assign(document.createElement('canvas'), { width: 16, height: 16 });
  const sessionFailure = useRef(() => {});
  const [status, setStatus] = useState('Starting camera…');
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [ratio, setRatio] = useState(4 / 3);
  const [size, setSize] = useState(1);
  const [verticalOffset, setVerticalOffset] = useState(0);
  const [mirrored, setMirrored] = useState(true);
  const [paused, setPaused] = useState(false);
  const snap = useSnapshot(state);

  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement;
    element.showModal();
    return () => { element.close(); previousFocus?.focus(); };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let stream;
    let tracker;
    let animation;
    let alive = true;
    let lastStatus = '';
    const element = video.current;
    const cleanup = () => {
      controller.abort();
      cancelAnimationFrame(animation);
      tracker?.close();
      stopStream(stream);
      if (element) element.srcObject = null;
      pose.current = null;
    };
    const fail = problem => {
      if (!alive || controller.signal.aborted) return;
      setError(cameraError(problem));
      setReady(false);
      cleanup();
    };
    sessionFailure.current = fail;
    if (paused) {
      setReady(false);
      return () => { alive = false; cleanup(); };
    }
    setError('');
    setReady(false);
    setStatus('Starting camera…');

    async function start() {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera access needs HTTPS or localhost. Open this site with a secure connection.');
      }
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 960 }, height: { ideal: 720 }, frameRate: { ideal: 24, max: 30 } }, audio: false });
      if (!alive) { stopStream(stream); return; }
      const track = stream.getVideoTracks()[0];
      track?.addEventListener('ended', () => fail(new Error('The camera disconnected. Connect it and try again.')), { once: true, signal: controller.signal });
      if (!track || track.readyState === 'ended') throw new Error('The camera disconnected. Connect it and try again.');
      element.srcObject = stream;
      await element.play();
      if (!alive || controller.signal.aborted) return;
      setRatio((element.videoWidth || 960) / (element.videoHeight || 720));
      setStatus('Loading body tracking…');
      tracker = await createPoseTracker({
        signal: controller.signal,
        onPose: (landmarks, extras) => {
          if (!alive) return;
          pose.current = { landmarks, worldLandmarks: extras?.worldLandmarks ?? null, mask: extras?.mask ?? null, capturedAt: extras?.capturedAt ?? performance.now(), time: performance.now() };
          const visible = getPoseFit(landmarks, element.videoWidth, element.videoHeight, state.garment, { size: 1, verticalOffset: 0 }).visible;
          const next = visible ? 'Following your movement' : framingHint(state.garment);
          if (next !== lastStatus) { lastStatus = next; setStatus(next); }
          roomLight.current = measureRoomLight(probe.current, element, landmarks) ?? roomLight.current;
        },
        onError: fail,
      });
      if (!alive || controller.signal.aborted) { tracker.close(); return; }
      if (track.readyState === 'ended') throw new Error('The camera disconnected. Connect it and try again.');
      setReady(true);
      setStatus(framingHint(state.garment));
      const tick = () => {
        if (!alive || controller.signal.aborted) return;
        tracker.detect(element);
        const sample = pose.current;
        paintOcclusion(occlusion.current, element, sample && performance.now() - sample.time < 500 ? sample : null);
        animation = requestAnimationFrame(tick);
      };
      animation = requestAnimationFrame(tick);
    }
    start().catch(fail);
    return () => { alive = false; cleanup(); };
  }, [attempt, paused]);

  useEffect(() => {
    const onVisibility = () => { if (document.hidden) setPaused(true); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  return <dialog ref={dialog} className="wear-dialog" aria-labelledby="wear-title" onCancel={event => { event.preventDefault(); onClose(); }}>
    <header className="wear-header">
      <div><h2 id="wear-title">Wear it</h2><p>Live 3D preview · Free</p></div>
      <button type="button" className="wear-close" onClick={onClose} aria-label="Close camera preview">×</button>
    </header>
    <div className="wear-options"><GarmentSelector /></div>
    <div className="wear-stage-shell">
      <div className={`wear-stage${mirrored ? ' wear-mirrored' : ''}`} style={{ aspectRatio: ratio, width: `min(100%, calc(54dvh * ${ratio}))` }}>
        <video ref={video} autoPlay muted playsInline aria-label="Your live camera" />
        {ready && <div className="wear-overlay"><Canvas orthographic camera={{ position: [0, 0, 1000], near: 0.1, far: 3000, zoom: 1 }} dpr={[1, 1.5]} gl={{ alpha: true, antialias: true }}>
          <RoomLights light={roomLight} />
          <ModelBoundary key={snap.garment} onError={message => sessionFailure.current(new Error(message))}><Suspense fallback={null}><TrackedGarment pose={pose} adjustments={{ size, verticalOffset }} /></Suspense></ModelBoundary>
        </Canvas></div>}
        {/* Your body and the room, painted back over the garment. */}
        <canvas ref={occlusion} className="wear-occlusion" aria-hidden="true" />
      </div>
      {(error || paused) && <div className="wear-message" role={error ? 'alert' : 'status'}>
        <p>{paused ? 'Camera paused while you were away.' : error}</p>
        <button type="button" onClick={() => { setPaused(false); setAttempt(value => value + 1); }}>{paused ? 'Resume camera' : 'Try again'}</button>
      </div>}
      {!error && !paused && <p className="wear-status" role="status">{status}</p>}
    </div>
    <div className="wear-adjustments">
      <label>Size <input type="range" min="0.75" max="1.3" step="0.01" value={size} onChange={event => setSize(Number(event.target.value))} /></label>
      <label>Position <input type="range" min="-0.25" max="0.25" step="0.01" value={verticalOffset} onChange={event => setVerticalOffset(Number(event.target.value))} /></label>
      <label className="wear-mirror"><input type="checkbox" checked={mirrored} onChange={event => setMirrored(event.target.checked)} /> Mirror</label>
    </div>
    <p className="wear-note">Your camera stays on this device. This is an approximate 3D fit; keep your arms relaxed for the best preview.</p>
  </dialog>;
}
