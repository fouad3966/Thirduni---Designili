import { Canvas } from '@react-three/fiber'
import { Environment, Center } from '@react-three/drei'
import Garment from './Garment'
import { useSnapshot } from 'valtio'
import state from '../store'
import CameraRig from './CameraRig'
import BackDrop from './BackDrop'

const CanvasModel = () => {
  const snap = useSnapshot(state);
  return (
    <Canvas
      frameloop={snap.wearItOpen ? 'never' : 'always'}
      shadows
      camera={{ position: [0, 0, 0], fov: 25 }}
      gl={{ preserveDrawingBuffer: true }}
      className="w-full max-w-full h-full transition-all ease-in">
      <ambientLight intensity={0.5} />
      <Environment preset='city' />
      <CameraRig>
        <BackDrop key={`shadow-${snap.garment}`} />
        <Center key={`model-${snap.garment}`}><Garment /></Center>
      </CameraRig>
    </Canvas>
  )
}

export default CanvasModel
