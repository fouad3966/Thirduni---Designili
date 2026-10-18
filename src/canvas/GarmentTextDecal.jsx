import { useMemo } from 'react';
import { Decal } from '@react-three/drei';
import { Box3, Matrix4, Raycaster, Vector3 } from 'three';
import { useSnapshot } from 'valtio';
import state from '../store';
import useTextTexture from './useTextTexture';

// The text tool works in the T-shirt's chest coordinates: x from -0.2 to 0.2,
// y from -0.24 to 0.2 (see TextPicker.jsx). Each garment maps that same pad
// onto its own print area, given as fractions of its size: the centre (cx, cy
// from its left and bottom edges) and how far the pad reaches each way.
const PAD = { halfX: 0.2, centreY: -0.02, halfY: 0.22 };
const PRINT_AREAS = {
  dress: { cx: 0.5, cy: 0.74, halfX: 0.16, halfY: 0.11 },   // the bodice
  caftan: { cx: 0.5, cy: 0.7, halfX: 0.2, halfY: 0.08 },    // under the belt (the neckline is embroidered)
  karakou: { cx: 0.5, cy: 0.8, halfX: 0.18, halfY: 0.07 },  // the jacket's chest
  hoodie: { cx: 0.5, cy: 0.6, halfX: 0.2, halfY: 0.14 },    // the chest, under the hood
  hat: { cx: 0.5, cy: 0.62, halfX: 0.2, halfY: 0.16 },      // the front panels
  shoes: { cx: 0.5, cy: 0.42, halfX: 0.2, halfY: 0.14 },    // the outer side
};

const raycaster = new Raycaster();
const identity = new Matrix4();

/**
 * Finds the fabric surface in front of a point, in the mesh's own space, by
 * casting a ray from in front of the garment straight back (-Z).
 */
function frontSurfaceZ(mesh, x, y, box) {
  const saved = mesh.matrixWorld.clone();
  mesh.matrixWorld.copy(identity);
  raycaster.set(new Vector3(x, y, box.max.z + 1), new Vector3(0, 0, -1));
  const hit = raycaster.intersectObject(mesh, false)[0];
  mesh.matrixWorld.copy(saved);
  return hit ? hit.point.z : box.max.z * 0.8;
}

/**
 * A garment's print area, in the mesh's own space, with conversions between
 * a point on the fabric and a position on the text tool's pad. Null for a
 * garment without one.
 */
export function printArea(mesh, garment) {
  const area = PRINT_AREAS[garment];
  if (!area || !mesh) return null;
  mesh.geometry.computeBoundingBox();
  const box = new Box3().copy(mesh.geometry.boundingBox);
  const size = box.getSize(new Vector3());
  const centreX = box.min.x + area.cx * size.x;
  const centreY = box.min.y + area.cy * size.y;
  const reachX = area.halfX * size.x;
  const reachY = area.halfY * size.y;
  return {
    box,
    size,
    // One step on the pad is the same distance on every garment's print area,
    // so the lettering keeps its proportions.
    unit: reachX / PAD.halfX,
    toLocal: ([padX, padY]) => [centreX + (padX / PAD.halfX) * reachX, centreY + ((padY - PAD.centreY) / PAD.halfY) * reachY],
    // Clamped to the pad, as on the T-shirt, so the text cannot be dragged off the print area.
    toPad: (x, y) => [
      Math.max(-0.21, Math.min(0.21, ((x - centreX) / reachX) * PAD.halfX)),
      Math.max(-0.26, Math.min(0.22, PAD.centreY + ((y - centreY) / reachY) * PAD.halfY)),
    ],
  };
}

/** The customer's text on a garment other than the T-shirt. */
export default function GarmentTextDecal({ mesh, garment }) {
  const snap = useSnapshot(state);
  const texture = useTextTexture(snap);
  const area = useMemo(() => printArea(mesh, garment), [mesh, garment]);

  const [padX = 0, padY = 0.04] = snap.textPosition || [];
  const placement = useMemo(() => {
    if (!area) return null;
    const [x, y] = area.toLocal([padX, padY]);
    // Depth stays shallow so the text lands on the front fabric only, not on
    // the back of the garment.
    return { position: [x, y, frontSurfaceZ(mesh, x, y, area.box)], unit: area.unit, depth: area.size.z * 0.3 };
  }, [area, mesh, padX, padY]);

  if (!placement || !snap.isTextTexture || !snap.textContent) return null;
  const textScale = snap.textScale || 0.16;
  return (
    <Decal
      mesh={{ current: mesh }}
      position={placement.position}
      rotation={[0, 0, ((snap.textRotation || 0) * Math.PI) / 180]}
      scale={[textScale * 2 * placement.unit, textScale * placement.unit, placement.depth]}
      map={texture}
      depthTest
      polygonOffsetFactor={-2}
    >
      <meshStandardMaterial
        map={texture}
        transparent
        alphaTest={0.01}
        roughness={0.92}
        metalness={0.04}
        depthTest
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-2}
        polygonOffsetUnits={-1}
      />
    </Decal>
  );
}
