import { AccumulativeShadows, RandomizedLight } from '@react-three/drei';
import { useEffect, useState } from 'react';
import { useSnapshot } from 'valtio';
import state from '../store';

const BackDrop = () => {
  const snap = useSnapshot(state);
  const [compact, setCompact] = useState(() => window.matchMedia('(max-width: 1439px)').matches);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 1439px)');
    const update = () => setCompact(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  // The compact homepage shares one CSS background across its text and preview.
  if (snap.intro && compact) return null;
  return (
  <AccumulativeShadows
    temporal
    frames={60}
    alphaTest={0.85}
    scale={10}
    rotation={[Math.PI / 2, 0, 0]}
    position={[0, 0, -0.22]}
  >
    <RandomizedLight amount={4} radius={9} intensity={0.55} ambient={0.25} position={[5, 5, -10]} />
    <RandomizedLight amount={4} radius={5} intensity={0.25} ambient={0.55} position={[-5, 5, -9]} />
  </AccumulativeShadows>
  );
};

export default BackDrop
