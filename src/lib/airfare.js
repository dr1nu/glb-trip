// src/lib/airfare.js

// Representative hub per country (IATA + lat/lon) + pricing factor
// If a country has no major airport (e.g., Andorra, San Marino, Monaco, Vatican),
// we map to the nearest practical hub.
export const COUNTRY_HUBS = {
  "Albania":            { iata: "TIA", lat: 41.4147, lon: 19.7206, factor: 1.00 },
  "Andorra":            { iata: "BCN", lat: 41.2974, lon: 2.0833,  factor: 1.00 }, // via Barcelona
  "Armenia":            { iata: "EVN", lat: 40.1473, lon: 44.3959, factor: 1.05 },
  "Austria":            { iata: "VIE", lat: 48.1103, lon: 16.5697, factor: 1.00 },
  "Azerbaijan":         { iata: "GYD", lat: 40.4675, lon: 50.0467, factor: 1.05 },
  "Belarus":            { iata: "MSQ", lat: 53.8881, lon: 27.5436, factor: 1.05 },
  "Belgium":            { iata: "BRU", lat: 50.9010, lon: 4.4844,  factor: 1.00 },
  "Bosnia and Herzegovina": { iata: "SJJ", lat: 43.8246, lon: 18.3315, factor: 1.00 },
  "Bulgaria":           { iata: "SOF", lat: 42.6952, lon: 23.4062, factor: 1.00 },
  "Croatia":            { iata: "ZAG", lat: 45.7429, lon: 16.0688, factor: 1.00 },
  "Cyprus":             { iata: "LCA", lat: 34.8809, lon: 33.6250, factor: 1.05 },
  "Czechia":            { iata: "PRG", lat: 50.1008, lon: 14.26,   factor: 1.00 },
  "Denmark":            { iata: "CPH", lat: 55.6181, lon: 12.6561, factor: 1.10 },
  "Estonia":            { iata: "TLL", lat: 59.4133, lon: 24.8328, factor: 1.05 },
  "Finland":            { iata: "HEL", lat: 60.3172, lon: 24.9633, factor: 1.10 },
  "France":             { iata: "ORY", lat: 48.7233, lon: 2.3794,  factor: 0.95 },
  "Georgia":            { iata: "TBS", lat: 41.6692, lon: 44.9547, factor: 1.05 },
  "Germany":            { iata: "BER", lat: 52.3667, lon: 13.5033, factor: 0.95 },
  "Greece":             { iata: "ATH", lat: 37.9364, lon: 23.9465, factor: 1.00 },
  "Hungary":            { iata: "BUD", lat: 47.4369, lon: 19.2556, factor: 1.00 },
  "Iceland":            { iata: "KEF", lat: 63.9850, lon: -22.6056, factor: 1.20 },
  "Ireland":            { iata: "DUB", lat: 53.4213, lon: -6.2701, factor: 0.95 },
  "Italy":              { iata: "MXP", lat: 45.6306, lon: 8.7281,  factor: 0.95 },
  "Kazakhstan":         { iata: "NQZ", lat: 51.0278, lon: 71.4669, factor: 1.10 },
  "Kosovo":             { iata: "PRN", lat: 42.5728, lon: 21.0358, factor: 1.00 },
  "Latvia":             { iata: "RIX", lat: 56.9236, lon: 23.9711, factor: 1.05 },
  "Liechtenstein":      { iata: "ZRH", lat: 47.4581, lon: 8.5555,  factor: 1.15 }, // via Zurich
  "Lithuania":          { iata: "VNO", lat: 54.6341, lon: 25.2858, factor: 1.05 },
  "Luxembourg":         { iata: "LUX", lat: 49.6233, lon: 6.2044,  factor: 1.00 },
  "Malta":              { iata: "MLA", lat: 35.8575, lon: 14.4775, factor: 1.00 },
  "Moldova":            { iata: "KIV", lat: 46.9278, lon: 28.9308, factor: 1.05 },
  "Monaco":             { iata: "NCE", lat: 43.6653, lon: 7.2150,  factor: 1.10 }, // via Nice
  "Montenegro":         { iata: "TGD", lat: 42.3594, lon: 19.2519, factor: 1.00 },
  "Netherlands":        { iata: "AMS", lat: 52.3086, lon: 4.7639,  factor: 0.95 },
  "North Macedonia":    { iata: "SKP", lat: 41.9616, lon: 21.6214, factor: 1.00 },
  "Norway":             { iata: "OSL", lat: 60.2028, lon: 11.0839, factor: 1.15 },
  "Poland":             { iata: "WAW", lat: 52.1657, lon: 20.9671, factor: 0.95 },
  "Portugal":           { iata: "LIS", lat: 38.7742, lon: -9.1342, factor: 0.95 },
  "Romania":            { iata: "OTP", lat: 44.5711, lon: 26.0850, factor: 1.00 },
  "Russia":             { iata: "SVO", lat: 55.9726, lon: 37.4146, factor: 1.10 },
  "San Marino":         { iata: "BLQ", lat: 44.5354, lon: 11.2887, factor: 1.00 }, // via Bologna
  "Serbia":             { iata: "BEG", lat: 44.8184, lon: 20.3091, factor: 1.00 },
  "Slovakia":           { iata: "BTS", lat: 48.1702, lon: 17.2127, factor: 1.00 },
  "Slovenia":           { iata: "LJU", lat: 46.2236, lon: 14.4576, factor: 1.00 },
  "Spain":              { iata: "MAD", lat: 40.4722, lon: -3.5608, factor: 0.90 },
  "Sweden":             { iata: "ARN", lat: 59.6519, lon: 17.9186, factor: 1.10 },
  "Switzerland":        { iata: "ZRH", lat: 47.4581, lon: 8.5555,  factor: 1.15 },
  "Türkiye":            { iata: "IST", lat: 41.2753, lon: 28.7519, factor: 0.95 },
  "Ukraine":            { iata: "KBP", lat: 50.3450, lon: 30.8947, factor: 1.10 },
  "United Kingdom":     { iata: "LTN", lat: 51.8740, lon: -0.3683, factor: 0.90 },
  "Vatican City":       { iata: "FCO", lat: 41.8003, lon: 12.2389, factor: 1.00 } // via Rome
};

// Great-circle distance (km)
export function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Distance → return fare range (hand-luggage, low-season-ish) with light multipliers
export function estimateReturnFare(homeCountry, destCountry, opts = {}) {
  const seasonFactor  = opts.seasonFactor  ?? 1.0; // 0.9 off, 1.0 shoulder, 1.2 peak
  const weekendFactor = opts.weekendFactor ?? 1.0; // 1.1 if Fri/Sun heavy

  const home = COUNTRY_HUBS[homeCountry];
  const dest = COUNTRY_HUBS[destCountry];
  if (!home || !dest) {
    // Fallback: safe midrange if a country is missing
    return { low: 120, high: 220, from: "N/A", to: "N/A", distanceKm: 0 };
  }

  const distanceKm = haversine(home.lat, home.lon, dest.lat, dest.lon);

  // Tunable linear model with clamps
  const base = 25;          // base fee
  const perKm = 0.06;       // price per km (return)
  let mid = base + perKm * distanceKm;
  mid = clamp(mid, 35, 260);

  // Use the "worse" factor between origin/destination to simulate market differences
  const marketFactor = Math.max(home.factor, dest.factor);

  mid = mid * marketFactor * seasonFactor * weekendFactor;

  const low  = Math.round(mid * 0.8);
  const high = Math.round(mid * 1.2);

  return { low, high, from: home.iata, to: dest.iata, distanceKm: Math.round(distanceKm) };
}

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
