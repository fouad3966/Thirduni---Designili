// Daily Quota Tracking for Designili AI Generator
// Prototype Free Tier: 3 AI generations per day, automatically resetting every day at midnight (local time).

const QUOTA_STORAGE_KEY = 'designili_ai_daily_quota';

export function getTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDailyGenerationsUsed() {
  if (typeof window === 'undefined' || !window.localStorage) return 0;
  try {
    const raw = window.localStorage.getItem(QUOTA_STORAGE_KEY);
    const today = getTodayKey();
    if (!raw) {
      // First visit: initialize with 0 used today
      window.localStorage.setItem(QUOTA_STORAGE_KEY, JSON.stringify({ date: today, count: 0 }));
      return 0;
    }

    const data = JSON.parse(raw);
    if (data && data.date === today) {
      return typeof data.count === 'number' ? data.count : 0;
    }

    // Date has changed (tomorrow arrived): automatically reset count to 0!
    window.localStorage.setItem(QUOTA_STORAGE_KEY, JSON.stringify({ date: today, count: 0 }));
    return 0;
  } catch (e) {
    console.warn('Failed to parse daily quota from localStorage:', e);
    return 0;
  }
}

export function recordGenerationUsed() {
  if (typeof window === 'undefined' || !window.localStorage) return 1;
  try {
    const today = getTodayKey();
    const current = getDailyGenerationsUsed();
    const updated = current + 1;
    window.localStorage.setItem(QUOTA_STORAGE_KEY, JSON.stringify({ date: today, count: updated }));
    return updated;
  } catch (e) {
    console.warn('Failed to record generation count:', e);
    return 1;
  }
}

export function resetDailyGenerations() {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const today = getTodayKey();
    window.localStorage.setItem(QUOTA_STORAGE_KEY, JSON.stringify({ date: today, count: 0 }));
  } catch (e) {
    console.warn('Failed to reset daily quota in localStorage:', e);
  }
}
