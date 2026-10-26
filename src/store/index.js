import { proxy } from 'valtio';
import { getGarment, isGarment } from '../config/garments/catalog';
import { getDailyGenerationsUsed, resetDailyGenerations } from '../config/dailyQuota';

const params = new URLSearchParams(window.location.search);
const showTiger = params.get('design') === 'tiger' || params.get('preview') === 'tiger';
const showFabric = params.get('design') === 'full' || params.get('preview') === 'full';
const initialGarment = isGarment(params.get('garment')) ? params.get('garment') : 'tshirt';

const defaultDesign = garment => ({
  color: getGarment(garment).color,
  isLogoTexture: garment === 'tshirt',
  isFullTexture: false,
  logoDecal: '/logo designili no BG.png',
  logoScale: 0.15,
  logoPosition: [0, 0.04, 0.15],
  logoRotation: 0,
  isDraggingLogo: false,
  removeLogoBackground: false,
  fullDecal: '/samples/studio-knit.svg',
  patternScale: 1,
  patternRotation: 0,
  patternOffsetX: 0,
  patternOffsetY: 0,
  trimColor: '#111f35',
  useTrim: false,
  isTextTexture: false,
  textContent: 'PARIS',
  textColor: '#ffffff',
  textFont: 'Impact',
  textSize: 1.0,
  textScale: 0.16,
  textPosition: [0, 0.04, 0.15],
  textRotation: 0,
  textCurved: false,
  textCurveRadius: 260,
  textUppercase: true,
  textBorder: false,
  textBorderColor: '#111827',
  textBorderWidth: 4,
  textShadow: true,
  textShadowColor: 'rgba(0, 0, 0, 0.4)',
  textPrintStyle: 'screenprint',
  isDraggingText: false,
  activeEditorTab: '',
  shirtRotationY: 0,
  isFlipped: false,
  autoRotate: false,
  textPlacement: 'front',
});
const designKeys = Object.keys(defaultDesign('tshirt'));
const savedDesigns = new Map();

const state = proxy({
  wearItOpen: false,
  intro: !params.has('preview') && !showTiger && !showFabric,
  preview: params.has('preview'),
  garment: initialGarment,
  generatingGarment: null,
  snapRotationInstant: false,
  activeDesignId: null,
  ...defaultDesign(initialGarment),
  ...(showTiger && initialGarment === 'tshirt' ? {
    color: '#30343a', logoDecal: '/samples/tiger.webp', logoScale: [0.46, 0.46, 0.2],
    logoPosition: [0, -0.035, 0.15], removeLogoBackground: true,
  } : {}),
  ...(showFabric ? { isLogoTexture: false, isFullTexture: true, useTrim: true } : {}),

  // Currency & Billing State (Official rate: 1 USD = 134 DA, October 2026)
  currency: 'DA', // 'DA' | 'USD' | 'BOTH'
  billingCycle: 'monthly', // 'monthly' | 'annual'
  audienceTab: 'individuals', // 'individuals' | 'companies'

  // Active Subscription & Usage Quota State
  currentPlan: 'free', // 'free' | 'pro' | 'studio' | 'business' | 'business_plus'
  generationsUsed: getDailyGenerationsUsed(), // Daily tracked AI generations (resets automatically at midnight)
  brandKit: {
    companyName: 'Atlas Apparel DZ',
    savedLogos: ['/logo designili no BG.png'],
    brandColors: ['#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#ec4899'],
  },

  // UI Modal Triggers
  pricingModalOpen: false,
  checkoutModalOpen: false,
  selectedPlanForCheckout: null, // plan key when opening subscription checkout
  orderModalOpen: false,
  orderTrackingOpen: false,
  judgeDemoBarOpen: true, // Sandbox tier switcher bar

  // Active Payment & Order Prototype State
  selectedPaymentMethod: 'edahabia', // 'edahabia' | 'cib' | 'mastercard'
  currentOrder: {
    garment: 'tshirt',
    size: 'L',
    bulkSizes: { XS: 0, S: 10, M: 20, L: 20, XL: 10, XXL: 0 },
    isBulk: false,
    quantity: 1,
    wilaya: '31 - Oran',
    address: '12 Rue Larbi Ben M\'hidi, Oran',
    selectedShopId: 'oran-print-hub',
    paymentType: 'cod', // Cash on Delivery (paid to print shop, not platform)
    status: 'received', // 'received' | 'printing' | 'shipped' | 'delivered'
    ordersHistory: [],
  },
});

export function resetDailyQuota() {
  resetDailyGenerations();
  state.generationsUsed = 0;
}

export function syncDailyQuota() {
  state.generationsUsed = getDailyGenerationsUsed();
  return state.generationsUsed;
}

export function setPlan(planId) {
  state.currentPlan = planId;
}

export function openPricing(audience = 'individuals') {
  state.audienceTab = audience;
  state.pricingModalOpen = true;
}

export function openCheckout(planId) {
  state.selectedPlanForCheckout = planId;
  state.pricingModalOpen = false;
  state.checkoutModalOpen = true;
}

export function openOrderPrint() {
  state.currentOrder.garment = state.garment;
  state.orderModalOpen = true;
}

export function simulateNextOrderStatus() {
  const flow = ['received', 'printing', 'shipped', 'delivered'];
  const currentIdx = flow.indexOf(state.currentOrder.status);
  const nextIdx = (currentIdx + 1) % flow.length;
  state.currentOrder.status = flow[nextIdx];
}

export function toggleFlip() {
  state.autoRotate = false;
  if (state.isFlipped) {
    state.isFlipped = false;
    state.shirtRotationY = 0;
  } else {
    state.isFlipped = true;
    state.shirtRotationY = Math.PI;
  }
}

export function rotateShirt(deltaAngle) {
  state.autoRotate = false;
  state.shirtRotationY = (state.shirtRotationY || 0) + deltaAngle;
  const normalized = ((state.shirtRotationY % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  state.isFlipped = normalized > Math.PI * 0.5 && normalized < Math.PI * 1.5;
}

export function setShirtAngle(targetAngle) {
  state.autoRotate = false;
  state.shirtRotationY = targetAngle;
  const normalized = ((targetAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  state.isFlipped = normalized > Math.PI * 0.5 && normalized < Math.PI * 1.5;
}

export function toggleAutoRotate() {
  state.autoRotate = !state.autoRotate;
}

export function selectGarment(garment) {
  if (!isGarment(garment) || garment === state.garment || state.generatingGarment) return;
  const previous = Object.fromEntries(designKeys.map(key => [key, Array.isArray(state[key]) ? [...state[key]] : state[key]]));
  savedDesigns.set(state.garment, previous);
  Object.assign(state, savedDesigns.get(garment) || defaultDesign(garment), { garment });
}

export default state;
