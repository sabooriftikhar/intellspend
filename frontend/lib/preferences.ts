export interface UserPreferences {
  displayCurrency: string;
  billReminders: boolean;
  reminderDaysBefore: number;
  compactDashboard: boolean;
}

const STORAGE_KEY = 'intellspend_preferences';

export const DEFAULT_PREFERENCES: UserPreferences = {
  displayCurrency: 'USD',
  billReminders: true,
  reminderDaysBefore: 3,
  compactDashboard: false,
};

export const DISPLAY_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'INR', 'PKR', 'AED', 'CAD', 'AUD', 'SGD', 'JPY',
];

export function loadPreferences(): UserPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function savePreferences(prefs: UserPreferences): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export function updatePreferences(partial: Partial<UserPreferences>): UserPreferences {
  const next = { ...loadPreferences(), ...partial };
  savePreferences(next);
  return next;
}
