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
  { key: 'hostel', label: 'Hostel' },
  { key: 'hotel', label: 'Hotel' },
  { key: 'luxury', label: 'Luxury hotel' },
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
  flexibleDays: '',
  rangeDays: '',
  accommodation: 'hotel',
  accommodationBreakfast: 'either',
  accommodationBathroom: 'either',
  accommodationLocation: 'either',
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
