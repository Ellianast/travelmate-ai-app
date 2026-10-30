const KEY = 'travelmate-ai-trips';
const PREF_KEY = 'travelmate-ai-preferences';

export const readTrips = () => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const writeTrips = (trips: unknown[]) => {
  localStorage.setItem(KEY, JSON.stringify(trips));
};

export const readPreferences = () => ({
  destination: '',
  travelDates: '',
  duration: 5,
  travelers: 2,
  budget: 1800,
  style: 'Adventure',
  interests: ['Culture', 'Food'],
});

export const writePreferences = (prefs: unknown) => {
  localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
};

export const readSavedPreferences = () => {
  try {
    const raw = localStorage.getItem(PREF_KEY);
    return raw ? JSON.parse(raw) : readPreferences();
  } catch {
    return readPreferences();
  }
};
