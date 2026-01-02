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
  { key: 'hotel', label: 'Hotel' },
  { key: 'apartment', label: 'Apartment' },
  { key: 'hostel', label: 'Hostel' },
  { key: 'airbnb', label: 'Airbnb' },
  { key: 'shared-bathroom-room', label: 'Room w/ shared Bathroom' },
  { key: 'luxury-hotel', label: 'Luxury Hotel' },
];

export const TRAVEL_INTERESTS = [
  'Culture & History',
  'Adventure & Sports',
  'Museums',
  'Nature & Wildlife',
  'Beach & Relaxation',
  'Shopping',
  'Nightlife',
  'City life',
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
  if (typeof preferences === 'string') {
    try {
      const parsed = JSON.parse(preferences);
      return mergeTravelPreferences(parsed);
    } catch (err) {
      return {
        ...DEFAULT_TRAVEL_PREFERENCES,
        interests: [...DEFAULT_TRAVEL_PREFERENCES.interests],
      };
    }
  }
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
