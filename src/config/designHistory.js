import state, { selectGarment } from '../store';

const STORAGE_KEY = 'tshirt_design_history_v3';
const DB_NAME = 'ThirdUni_DesignHistory_v3';
const DB_VERSION = 1;
const STORE_NAME = 'designs';

const DEFAULT_HISTORY = [
  {
    id: 'demo-1',
    title: 'Studio Knit (Geometric)',
    fullDecal: '/samples/studio-knit.svg',
    color: '#30343a',
    trimColor: '#111f35',
    useTrim: true,
    patternScale: 1,
    patternRotation: 0,
    patternOffsetX: 0,
    patternOffsetY: 0,
    isFullTexture: true,
    isLogoTexture: false,
    garment: 'tshirt',
    thumbnail: null,
    timestamp: Date.now() - 3600000,
  },
  {
    id: 'demo-2',
    title: 'Tiger Streetwear',
    fullDecal: '/samples/studio-knit.svg',
    logoDecal: '/samples/tiger.webp',
    logoScale: 0.22,
    logoPosition: [0, -0.02, 0.15],
    logoRotation: 0,
    color: '#30343a',
    trimColor: '#111f35',
    useTrim: false,
    isFullTexture: false,
    isLogoTexture: true,
    removeLogoBackground: true,
    garment: 'tshirt',
    thumbnail: null,
    timestamp: Date.now() - 7200000,
  },
  {
    id: 'demo-hoodie-1',
    title: 'Urban Noir Hoodie',
    fullDecal: '/samples/studio-knit.svg',
    color: '#1e293b',
    trimColor: '#0f172a',
    useTrim: false,
    patternScale: 1,
    isFullTexture: false,
    isLogoTexture: false,
    isTextTexture: true,
    textContent: 'URBAN',
    textColor: '#ffffff',
    textPosition: [0, 0.05, 0.15],
    textScale: 0.18,
    textFont: 'Impact',
    garment: 'hoodie',
    thumbnail: null,
    timestamp: Date.now() - 5400000,
  },
  {
    id: 'demo-dress-1',
    title: 'Burgundy Brocade Dress',
    fullDecal: '/samples/studio-knit.svg',
    color: '#6b172a',
    trimColor: '#3b0814',
    useTrim: true,
    patternScale: 1.2,
    patternRotation: 0,
    patternOffsetX: 0,
    patternOffsetY: 0,
    isFullTexture: true,
    isLogoTexture: false,
    garment: 'dress',
    thumbnail: null,
    timestamp: Date.now() - 9000000,
  },
];

// Open IndexedDB database safely
function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Function to recover designs from any previous keys (v2, v1, etc.)
function recoverAllStoredDesigns() {
  const map = new Map();
  for (const item of DEFAULT_HISTORY) {
    map.set(item.id, item);
  }

  const checkStorage = (storage) => {
    try {
      if (!storage) return;
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (
          key &&
          (key.includes('design') ||
            key.includes('history') ||
            key.includes('tshirt') ||
            key.includes('hoodie') ||
            key.includes('garment'))
        ) {
          try {
            const raw = storage.getItem(key);
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              for (const item of parsed) {
                if (item && (item.id || item.title)) {
                  let garment = item.garment;
                  if (!garment && item.title) {
                    const lower = item.title.toLowerCase();
                    if (lower.includes('hoodie')) garment = 'hoodie';
                    else if (lower.includes('dress')) garment = 'dress';
                    else if (lower.includes('caftan')) garment = 'caftan';
                    else if (lower.includes('shoes')) garment = 'shoes';
                    else if (lower.includes('hat')) garment = 'hat';
                  }
                  const id = item.id || `recov-${item.timestamp || Math.random()}`;
                  map.set(id, { ...item, id, garment: garment || 'tshirt' });
                }
              }
            }
          } catch {
            // ignore malformed entry
          }
        }
      }
    } catch {
      // storage unavailable
    }
  };

  checkStorage(typeof localStorage !== 'undefined' ? localStorage : null);
  checkStorage(typeof sessionStorage !== 'undefined' ? sessionStorage : null);

  const all = Array.from(map.values());
  all.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  return all;
}

// In-memory cache for synchronous React state access
let cachedHistory = recoverAllStoredDesigns();

// Async background loader to sync from IndexedDB & merge recovered designs
let isDbLoaded = false;
async function syncFromDB() {
  try {
    const db = await openDB();
    const designs = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    const recovered = recoverAllStoredDesigns();
    const mergedMap = new Map();
    for (const d of recovered) mergedMap.set(d.id, d);
    if (Array.isArray(designs)) {
      for (const d of designs) mergedMap.set(d.id, d);
    }
    const merged = Array.from(mergedMap.values());
    merged.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    cachedHistory = merged;
    isDbLoaded = true;
    await persistToDB(merged);
    persistToLocalStorage(merged);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('designHistoryChange', { detail: cachedHistory }));
    }
  } catch {
    // fallback to localStorage
  }
}

if (typeof window !== 'undefined') {
  syncFromDB();
}

async function persistToDB(designs) {
  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.clear();
      for (const item of designs) {
        store.put(item);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Could not persist designs to IndexedDB:', err);
  }
}

function persistToLocalStorage(designs) {
  try {
    // Strip giant base64 images from localStorage copy so quota is never exceeded
    const safeCopy = designs.map((d) => {
      const hugeFull = typeof d.fullDecal === 'string' && d.fullDecal.length > 50000;
      const hugeLogo = typeof d.logoDecal === 'string' && d.logoDecal.length > 50000;
      if (!hugeFull && !hugeLogo) return d;
      return {
        ...d,
        fullDecal: hugeFull ? (d.thumbnail || '/samples/studio-knit.svg') : d.fullDecal,
        logoDecal: hugeLogo ? (d.thumbnail || '/logo designili no BG.png') : d.logoDecal,
      };
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(safeCopy));
  } catch {
    // Quota reached or storage disabled; IndexedDB handles persistence
  }
}

/**
 * Capture a lightweight 120x120 snapshot of the 3D canvas garment.
 */
export function captureCanvasThumbnail() {
  try {
    const canvas = document.querySelector('canvas');
    if (!canvas || canvas.width === 0 || canvas.height === 0) return null;
    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = 120;
    thumbCanvas.height = 120;
    const ctx = thumbCanvas.getContext('2d');
    if (!ctx) return null;

    // Fill with clean neutral studio backdrop
    ctx.fillStyle = '#e5e7eb';
    ctx.fillRect(0, 0, 120, 120);

    // Crop center square
    const crop = Math.min(canvas.width, canvas.height) * 0.75;
    const sx = (canvas.width - crop) / 2;
    const sy = (canvas.height - crop) / 2;
    ctx.drawImage(canvas, sx, sy, crop, crop, 0, 0, 120, 120);
    return thumbCanvas.toDataURL('image/jpeg', 0.82);
  } catch (err) {
    console.warn('Canvas thumbnail capture error:', err);
    return null;
  }
}

export function getDesignHistory() {
  return cachedHistory;
}

export function saveDesignHistory(history) {
  cachedHistory = history;
  persistToDB(history);
  persistToLocalStorage(history);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('designHistoryChange', { detail: history }));
  }
}

export function addDesignToHistory(item = {}) {
  const current = getDesignHistory();
  const thumbnail = item.thumbnail || captureCanvasThumbnail();

  const newItem = {
    id: `design-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: item.title || `${(state.garment || 'tshirt').toUpperCase()} Design`,
    garment: item.garment || state.garment || 'tshirt',
    color: item.color || state.color || '#EFBD48',
    trimColor: item.trimColor || state.trimColor || '#111f35',
    useTrim: item.useTrim ?? state.useTrim ?? false,

    // Full pattern
    isFullTexture: item.isFullTexture ?? state.isFullTexture ?? false,
    fullDecal: item.fullDecal || state.fullDecal || '/samples/studio-knit.svg',
    patternScale: item.patternScale ?? state.patternScale ?? 1,
    patternRotation: item.patternRotation ?? state.patternRotation ?? 0,
    patternOffsetX: item.patternOffsetX ?? state.patternOffsetX ?? 0,
    patternOffsetY: item.patternOffsetY ?? state.patternOffsetY ?? 0,

    // Logo
    isLogoTexture: item.isLogoTexture ?? state.isLogoTexture ?? false,
    logoDecal: item.logoDecal || state.logoDecal || '/logo designili no BG.png',
    logoPosition: Array.isArray(item.logoPosition)
      ? [...item.logoPosition]
      : Array.isArray(state.logoPosition)
      ? [...state.logoPosition]
      : [0, 0.04, 0.15],
    logoScale: item.logoScale ?? state.logoScale ?? 0.15,
    logoRotation: item.logoRotation ?? state.logoRotation ?? 0,
    removeLogoBackground: item.removeLogoBackground ?? state.removeLogoBackground ?? false,

    // Text
    isTextTexture: item.isTextTexture ?? state.isTextTexture ?? false,
    textContent: item.textContent ?? state.textContent ?? 'PARIS',
    textColor: item.textColor ?? state.textColor ?? '#ffffff',
    textPosition: Array.isArray(item.textPosition)
      ? [...item.textPosition]
      : Array.isArray(state.textPosition)
      ? [...state.textPosition]
      : [0, 0.04, 0.15],
    textScale: item.textScale ?? state.textScale ?? 0.16,
    textRotation: item.textRotation ?? state.textRotation ?? 0,
    textFont: item.textFont ?? state.textFont ?? 'Impact',
    textSize: item.textSize ?? state.textSize ?? 1.0,
    textCurved: item.textCurved ?? state.textCurved ?? false,
    textCurveRadius: item.textCurveRadius ?? state.textCurveRadius ?? 260,
    textUppercase: item.textUppercase ?? state.textUppercase ?? true,
    textBorder: item.textBorder ?? state.textBorder ?? false,
    textBorderColor: item.textBorderColor ?? state.textBorderColor ?? '#111827',
    textBorderWidth: item.textBorderWidth ?? state.textBorderWidth ?? 4,
    textShadow: item.textShadow ?? state.textShadow ?? true,
    textShadowColor: item.textShadowColor ?? state.textShadowColor ?? 'rgba(0, 0, 0, 0.4)',
    textPrintStyle: item.textPrintStyle ?? state.textPrintStyle ?? 'screenprint',

    thumbnail,
    timestamp: Date.now(),
  };

  // Keep up to 50 designs in history
  const updated = [newItem, ...current.filter((x) => x.id !== newItem.id)].slice(0, 50);
  saveDesignHistory(updated);
  state.activeDesignId = newItem.id;
  return updated;
}

export function applyHistoryDesign(item) {
  if (!item) return;

  // 1. Switch garment if needed (properly updates 3D model)
  if (item.garment && item.garment !== state.garment) {
    selectGarment(item.garment);
  }

  // 2. Garment colors & trim
  if (item.color) state.color = item.color;
  if (item.trimColor) state.trimColor = item.trimColor;
  state.useTrim = Boolean(item.useTrim);

  // 3. Full pattern texture
  state.isFullTexture = Boolean(item.isFullTexture);
  if (item.fullDecal) state.fullDecal = item.fullDecal;
  if (item.patternScale !== undefined) state.patternScale = item.patternScale;
  if (item.patternRotation !== undefined) state.patternRotation = item.patternRotation;
  if (item.patternOffsetX !== undefined) state.patternOffsetX = item.patternOffsetX;
  if (item.patternOffsetY !== undefined) state.patternOffsetY = item.patternOffsetY;

  // 4. Logo texture
  state.isLogoTexture = Boolean(item.isLogoTexture);
  if (item.logoDecal) state.logoDecal = item.logoDecal;
  if (Array.isArray(item.logoPosition)) state.logoPosition = [...item.logoPosition];
  if (item.logoScale !== undefined) state.logoScale = item.logoScale;
  if (item.logoRotation !== undefined) state.logoRotation = item.logoRotation;
  state.removeLogoBackground = Boolean(item.removeLogoBackground);

  // 5. Custom text texture
  state.isTextTexture = Boolean(item.isTextTexture);
  if (item.textContent !== undefined) state.textContent = item.textContent;
  if (item.textColor) state.textColor = item.textColor;
  if (Array.isArray(item.textPosition)) state.textPosition = [...item.textPosition];
  if (item.textScale !== undefined) state.textScale = item.textScale;
  if (item.textRotation !== undefined) state.textRotation = item.textRotation;
  if (item.textFont) state.textFont = item.textFont;
  if (item.textSize !== undefined) state.textSize = item.textSize;
  if (item.textCurved !== undefined) state.textCurved = item.textCurved;
  if (item.textCurveRadius !== undefined) state.textCurveRadius = item.textCurveRadius;
  if (item.textUppercase !== undefined) state.textUppercase = item.textUppercase;
  if (item.textBorder !== undefined) state.textBorder = item.textBorder;
  if (item.textBorderColor) state.textBorderColor = item.textBorderColor;
  if (item.textBorderWidth !== undefined) state.textBorderWidth = item.textBorderWidth;
  if (item.textShadow !== undefined) state.textShadow = item.textShadow;
  if (item.textShadowColor) state.textShadowColor = item.textShadowColor;
  if (item.textPrintStyle) state.textPrintStyle = item.textPrintStyle;

  // Mark currently active design
  state.activeDesignId = item.id;
}

