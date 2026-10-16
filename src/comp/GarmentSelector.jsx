import { useSnapshot } from 'valtio';
import state, { selectGarment } from '../store';
import { GARMENTS } from '../config/garments/catalog';
import { getContrastingColor } from '../config/helpers';

export default function GarmentSelector({ exclude = [] }) {
  const snap = useSnapshot(state);
  return <div className="garment-selector" role="group" aria-label="Choose your garment">
    {GARMENTS.filter(garment => !exclude.includes(garment.id)).map(garment => <button type="button" key={garment.id}
      aria-pressed={snap.garment === garment.id}
      disabled={Boolean(snap.generatingGarment)}
      onClick={() => selectGarment(garment.id)}
      style={snap.garment === garment.id ? { backgroundColor: snap.color, color: getContrastingColor(snap.color) } : undefined}>
      {garment.label}
    </button>)}
  </div>;
}
