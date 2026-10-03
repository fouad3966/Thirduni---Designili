import { proxy } from 'valtio';
import { getGarment, isGarment } from '../config/garments/catalog';

const params = new URLSearchParams(window.location.search);
const showTiger = params.get('design') === 'tiger' || params.get('preview') === 'tiger';
const showFabric = params.get('design') === 'full' || params.get('preview') === 'full';
const initialGarment = isGarment(params.get('garment')) ? params.get('garment') : 'tshirt';

const defaultDesign = garment => ({
  color: getGarment(garment).color,
  isLogoTexture: garment === 'tshirt',
  isFullTexture: false,
  logoDecal: './threejs.png',
  logoScale: 0.15,
  logoPosition: [0, 0.04, 0.15],
  removeLogoBackground: false,
  fullDecal: '/samples/studio-knit.svg',
  patternScale: 1,
  patternRotation: 0,
  patternOffsetX: 0,
  patternOffsetY: 0,
  trimColor: '#111f35',
  useTrim: false,
});
const designKeys = Object.keys(defaultDesign('tshirt'));
const savedDesigns = new Map();

const state = proxy({
  wearItOpen: false,
  intro: !params.has('preview') && !showTiger && !showFabric,
  preview: params.has('preview'),
  garment: initialGarment,
  generatingGarment: null,
  ...defaultDesign(initialGarment),
  ...(showTiger && initialGarment === 'tshirt' ? {
    color: '#30343a', logoDecal: '/samples/tiger.webp', logoScale: [0.46, 0.46, 0.2],
    logoPosition: [0, -0.035, 0.15], removeLogoBackground: true,
  } : {}),
  ...(showFabric ? { isLogoTexture: false, isFullTexture: true, useTrim: true } : {}),
});

export function selectGarment(garment) {
  if (!isGarment(garment) || garment === state.garment || state.generatingGarment) return;
  const previous = Object.fromEntries(designKeys.map(key => [key, Array.isArray(state[key]) ? [...state[key]] : state[key]]));
  savedDesigns.set(state.garment, previous);
  Object.assign(state, savedDesigns.get(garment) || defaultDesign(garment), { garment });
}

export default state;
