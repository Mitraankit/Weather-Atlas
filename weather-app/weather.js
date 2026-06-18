// Weather code interpretation, theme mapping, and AQI categorisation.

// Maps Open-Meteo WMO weather codes to a user-facing label.
export function wxLabel(code) {
  const c = Number(code);
  if (c === 0)              return "Clear";
  if (c === 1)              return "Mostly clear";
  if (c === 2)              return "Partly cloudy";
  if (c === 3)              return "Overcast";
  if (c === 45 || c === 48) return "Fog";
  if (c >= 51 && c <= 55)   return "Drizzle";
  if (c === 56 || c === 57) return "Freezing drizzle";
  if (c >= 61 && c <= 65)   return "Rain";
  if (c === 66 || c === 67) return "Freezing rain";
  if (c >= 71 && c <= 75)   return "Snow";
  if (c === 77)             return "Snow grains";
  if (c >= 80 && c <= 82)   return "Rain showers";
  if (c === 85 || c === 86) return "Snow showers";
  if (c === 95)             return "Thunderstorm";
  if (c === 96 || c === 99) return "Thunderstorm with hail";
  return "Unknown";
}

// Returns a theme key used as data-theme on <body> to drive CSS variables.
export function themeFromWeatherCode(code) {
  const c = Number(code);
  if (c === 45 || c === 48) return "fog";
  if (c === 71 || c === 73 || c === 75 || c === 77 || c === 85 || c === 86) return "snow";
  if (c === 95 || c === 96 || c === 99) return "storm";
  if ([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(c)) return "rain";
  if (c === 1 || c === 2 || c === 3) return "cloud";
  return "clear";
}

export function applyTheme(theme) {
  document.body.dataset.theme = theme || "clear";
}

// Returns a { label, tone } pair for a US AQI value.
export function aqiCategory(usAqi) {
  const v = Number(usAqi);
  if (!Number.isFinite(v))  return { label: "",                tone: "muted" };
  if (v <= 50)              return { label: "Good",            tone: "good"  };
  if (v <= 100)             return { label: "Moderate",        tone: "warn"  };
  if (v <= 150)             return { label: "Unhealthy (SG)",  tone: "warn"  };
  if (v <= 200)             return { label: "Unhealthy",       tone: "bad"   };
  if (v <= 300)             return { label: "Very unhealthy",  tone: "bad"   };
  return                           { label: "Hazardous",       tone: "bad"   };
}
