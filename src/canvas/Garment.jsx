import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { useGLTF, useTexture } from '@react-three/drei';
import { useSnapshot } from 'valtio';
import { Box3, Vector3 } from 'three';
import state from '../store';
import Shirt from './Shirt';
import { createFabricTexture, setFabricTransform } from '../config/fabricTexture';
import { createTailoredMaterial, updateTailoredMaterial } from '../config/garments/materials';

function TailoredGarment() {
  const snap = useSnapshot(state);
  const { scene } = useGLTF(`/garments/${snap.garment}/model.glb`);
  const sourceTexture = useTexture(snap.fullDecal);
  const renderer = useThree(context => context.gl);
  const texture = useMemo(
    () => createFabricTexture(sourceTexture, renderer.capabilities.getMaxAnisotropy()),
    [sourceTexture, renderer]
  );
  const { model, clothMaterials, ownedMaterials, fit } = useMemo(() => {
    const model = scene.clone(true);
    const clothMaterials = [];
    const ownedMaterials = [];
    model.traverse(mesh => {
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const fabric = mesh.name.startsWith('fabric') || mesh.userData.role === 'fabric';
      const cloneMaterial = source => {
        const material = fabric ? createTailoredMaterial(source, snap.garment) : source.clone();
        ownedMaterials.push(material);
        if (fabric) clothMaterials.push(material);
        return material;
      };
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map(cloneMaterial) : cloneMaterial(mesh.material);
    });
    const box = new Box3().setFromObject(model);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    const scale = Math.min((snap.garment === 'hoodie' ? 0.67 : 0.75) / size.y, 0.66 / size.x);
    return { model, clothMaterials, ownedMaterials, fit: { scale, position: center.multiplyScalar(-1).toArray() } };
  }, [scene, snap.garment]);

  useEffect(() => {
    setFabricTransform(texture, {
      patternScale: snap.patternScale, patternRotation: snap.patternRotation,
      patternOffsetX: snap.patternOffsetX, patternOffsetY: snap.patternOffsetY,
    });
  }, [texture, snap.patternScale, snap.patternRotation, snap.patternOffsetX, snap.patternOffsetY]);

  useEffect(() => {
    for (const material of clothMaterials) {
      updateTailoredMaterial(material, texture, { color: snap.color, isFullTexture: snap.isFullTexture });
    }
  }, [clothMaterials, texture, snap.color, snap.isFullTexture]);

  useEffect(() => () => { for (const material of ownedMaterials) material.dispose(); }, [ownedMaterials]);
  useEffect(() => () => texture.dispose(), [texture]);

  return <group scale={fit.scale}>
    <group position={fit.position}><primitive object={model} dispose={null} /></group>
  </group>;
}

export default function Garment() {
  const snap = useSnapshot(state);
  return snap.garment === 'tshirt' ? <Shirt /> : <TailoredGarment key={snap.garment} />;
}

