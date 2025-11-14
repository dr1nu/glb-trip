export const BAGGAGE_OPTIONS = [
  { key: 'small', label: 'Small bag only' },
  { key: 'cabin', label: 'Cabin bag' },
  { key: 'checked', label: 'Checked bag' },
];

export const TRAVEL_WINDOW_OPTIONS = [
  { key: 'specific', label: 'Specific dates' },
  { key: 'flexible', label: 'Flexible' },
  { key: 'range', label: 'Range' },
];

export const ACCOMMODATION_OPTIONS = [
  { key: 'budget', label: 'Budget hotel' },
  { key: 'hotel', label: 'Hotel' },
  { key: 'b&b', label: 'Bed & breakfast' },
  { key: 'luxury', label: 'Luxury hotel' },
  { key: 'flat', label: 'Flat' },
  { key: 'airbnb', label: 'Airbnb' },
  { key: 'none', label: 'No preference' },
];

export const TRAVEL_INTERESTS = [
  'Culture & History',
  'Adventure & Sports',
  'Food & Dining',
  'Nature & Wildlife',
  'Beach & Relaxation',
  'Shopping',
  'Nightlife',
  'Photography',
];

export const DEFAULT_TRAVEL_PREFERENCES = {
  baggage: 'cabin',
  travelWindow: 'specific',
  dateFrom: '',
  dateTo: '',
  flexibleMonth: '',
  accommodation: 'hotel',
  interests: [],
  details: '',
};

export function mergeTravelPreferences(preferences) {
  if (!preferences || typeof preferences !== 'object') {
    return {
      ...DEFAULT_TRAVEL_PREFERENCES,
      interests: [...DEFAULT_TRAVEL_PREFERENCES.interests],
    };
  }
  return {
    ...DEFAULT_TRAVEL_PREFERENCES,
    ...preferences,
    interests: Array.isArray(preferences.interests)
      ? preferences.interests
      : [...DEFAULT_TRAVEL_PREFERENCES.interests],
  };
}
