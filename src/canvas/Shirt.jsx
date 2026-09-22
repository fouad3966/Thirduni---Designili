import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Decal, useGLTF, useTexture } from '@react-three/drei';
import { SRGBColorSpace } from 'three';
import { easing } from 'maath';
import { useSnapshot } from 'valtio';
import { createFabricMaterial, createFabricTexture, setFabricTransform } from '../config/fabricTexture';
import { createLogoBackgroundMask } from '../config/logoMask';
import state from '../store';

const Shirt = () => {
  const snap = useSnapshot(state);
  const { nodes, materials } = useGLTF('/shirt_baked.glb');
  const sourceTexture = useTexture(snap.fullDecal);
  const logoTexture = useTexture(snap.logoDecal);
  const renderer = useThree(scene => scene.gl);
  const fabricTexture = useMemo(
    () => createFabricTexture(sourceTexture, renderer.capabilities.getMaxAnisotropy()),
    [sourceTexture, renderer]
  );
  const { material, uniforms } = useMemo(() => createFabricMaterial(materials.lambert1), [materials.lambert1]);
  const backgroundMask = useMemo(
    () => snap.removeLogoBackground ? createLogoBackgroundMask(logoTexture) : null,
    [logoTexture, snap.removeLogoBackground]
  );

  useEffect(() => {
    logoTexture.colorSpace = SRGBColorSpace;
    logoTexture.needsUpdate = true;
  }, [logoTexture]);

  useEffect(() => {
    setFabricTransform(fabricTexture, {
      patternScale: snap.patternScale, patternRotation: snap.patternRotation,
      patternOffsetX: snap.patternOffsetX, patternOffsetY: snap.patternOffsetY,
    });
  }, [fabricTexture, snap.patternScale, snap.patternRotation, snap.patternOffsetX, snap.patternOffsetY]);

  useEffect(() => {
    material.map = snap.isFullTexture ? fabricTexture : null;
    material.color.copy(materials.lambert1.color);
    material.roughness = snap.isFullTexture ? 0.94 : 1;
    material.aoMapIntensity = snap.isFullTexture ? 0.85 : materials.lambert1.aoMapIntensity;
    material.normalScale.copy(materials.lambert1.normalScale).multiplyScalar(snap.isFullTexture ? 0.48 : 1);
    material.needsUpdate = true;
  }, [material, materials, fabricTexture, snap.isFullTexture]);

  useEffect(() => {
    uniforms.garmentTrimColor.value.set(snap.trimColor);
    uniforms.garmentTrimEnabled.value = snap.isFullTexture && snap.useTrim ? 1 : 0;
  }, [uniforms, snap.trimColor, snap.useTrim, snap.isFullTexture]);

  useFrame((_, delta) => easing.dampC(material.color, snap.isFullTexture ? '#ffffff' : snap.color, 0.25, delta));

  useEffect(() => () => fabricTexture.dispose(), [fabricTexture]);
  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => () => backgroundMask?.dispose(), [backgroundMask]);

  return <group>
    <mesh castShadow geometry={nodes.T_Shirt_male.geometry} material={material} dispose={null}>
      {snap.isLogoTexture && <Decal position={snap.logoPosition} rotation={[0, 0, 0]} scale={snap.logoScale} map={logoTexture} depthTest polygonOffsetFactor={-2}>
        <meshStandardMaterial map={logoTexture} alphaMap={backgroundMask} transparent alphaTest={0.05}
          roughness={1} metalness={0} depthTest depthWrite={false} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-1} />
      </Decal>}
    </mesh>
  </group>;
};

export default Shirt;
