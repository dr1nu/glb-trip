// src/lib/pricing.js

// Baseline buckets (~2025, per person, per day)
const BUCKETS = {
  cheap:  { accom: 45, other: 30 },   // total 75
  medium: { accom: 60, other: 35 },   // total 95
  pricey: { accom: 90, other: 45 }    // total 135
};

// Country → bucket
export const COUNTRY_BUCKET = {
  Albania: "cheap", Andorra: "medium", Armenia: "cheap", Austria: "medium",
  Azerbaijan: "cheap", Belarus: "cheap", Belgium: "medium",
  "Bosnia and Herzegovina": "cheap", Bulgaria: "cheap", Croatia: "cheap",
  Cyprus: "medium", Czechia: "cheap", Denmark: "pricey", Estonia: "cheap",
  Finland: "pricey", France: "medium", Georgia: "cheap", Germany: "medium",
  Greece: "cheap", Hungary: "cheap", Iceland: "pricey", Ireland: "medium",
  Italy: "medium", Kazakhstan: "cheap", Kosovo: "cheap", Latvia: "cheap",
  Liechtenstein: "pricey", Lithuania: "cheap", Luxembourg: "medium",
  Malta: "medium", Moldova: "cheap", Monaco: "pricey", Montenegro: "cheap",
  Netherlands: "medium", "North Macedonia": "cheap", Norway: "pricey",
  Poland: "cheap", Portugal: "cheap", Romania: "cheap", Russia: "cheap",
  "San Marino": "medium", Serbia: "cheap", Slovakia: "cheap",
  Slovenia: "cheap", Spain: "cheap", Sweden: "pricey",
  Switzerland: "pricey", Türkiye: "cheap", Ukraine: "cheap",
  "United Kingdom": "medium", "Vatican City": "medium"
};

// Travel style deltas (per person, per day)
export const STYLE_PRESETS = {
  shoestring: { accomDelta: -15, otherDelta: -10, label: "Budget" },
  value:      { accomDelta:   0, otherDelta:   0, label: "Value" },
  comfort:    { accomDelta: +25, otherDelta: +15, label: "Comfort" }
};

// Helper: returns STYLE-ADJUSTED per-day totals AND split (per person)
export function getDailyBreakdown(country, style = "value") {
  const bucket = COUNTRY_BUCKET[country] || "medium";
  const base = BUCKETS[bucket];
  const preset = STYLE_PRESETS[style] || STYLE_PRESETS.value;

  // apply deltas then clamp to minimum sensible floors
  const accom = Math.max(30, base.accom + preset.accomDelta);
  const other = Math.max(18, base.other + preset.otherDelta);
  const perDay = accom + other;

  return { bucket, style, styleLabel: preset.label, perDay, accom, other };
}
