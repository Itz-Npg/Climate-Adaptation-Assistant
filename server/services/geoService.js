/**
 * Location & weather service.
 *
 * Uses two free, key-less public APIs:
 *  - Open-Meteo Geocoding API  (place name -> coordinates)
 *  - Open-Meteo Forecast API   (current conditions + elevation for a point)
 *
 * No API key is required, which keeps the project runnable out of the box.
 * Responses are cached in memory so repeated searches stay fast and we stay
 * well inside the providers' fair-use limits.
 */

const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

const CACHE_TTL = 1000 * 60 * 30; // 30 minutes
const cache = new Map();

function cacheGet(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expires) {
    cache.delete(key);
    return null;
  }
  return hit.value;
}

function cacheSet(key, value) {
  if (cache.size > 500) cache.clear();
  cache.set(key, { value, expires: Date.now() + CACHE_TTL });
}

async function fetchJson(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'ClimateAdaptationAssistant/1.0 (student project)',
      },
    });

    if (!response.ok) {
      const error = new Error(`Map service returned ${response.status}.`);
      error.status = 502;
      throw error;
    }

    return await response.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      const timeout = new Error('The location service took too long to respond.');
      timeout.status = 504;
      throw timeout;
    }
    if (!error.status) {
      const unreachable = new Error('Could not reach the location service. Check your connection.');
      unreachable.status = 502;
      throw unreachable;
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

/** WMO weather interpretation codes used by Open-Meteo. */
const WEATHER_CODES = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Rime fog',
  51: 'Light drizzle',
  53: 'Drizzle',
  55: 'Heavy drizzle',
  56: 'Freezing drizzle',
  57: 'Freezing drizzle',
  61: 'Light rain',
  63: 'Rain',
  65: 'Heavy rain',
  66: 'Freezing rain',
  67: 'Freezing rain',
  71: 'Light snow',
  73: 'Snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Rain showers',
  81: 'Rain showers',
  82: 'Violent rain showers',
  85: 'Snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with hail',
  99: 'Severe thunderstorm with hail',
};

function describeWeather(code) {
  return WEATHER_CODES[code] || 'Unknown conditions';
}

/**
 * Broad, clearly-labelled climate zone guess from latitude and elevation.
 * This is a teaching aid, not a Koppen classification.
 */
function guessZone(latitude, elevation) {
  const abs = Math.abs(latitude);

  if (elevation >= 2400) {
    return {
      label: 'High altitude',
      note: 'Thin air and strong sun by day, cold nights. Snow and frost are likely in winter.',
    };
  }
  if (abs < 10) {
    return {
      label: 'Tropical',
      note: 'Warm year-round with heavy seasonal rain. Heat and waterlogging are the main household concerns.',
    };
  }
  if (abs < 23.5) {
    return {
      label: 'Subtropical',
      note: 'Hot summers and a distinct wet season. Heat stress and flash flooding dominate.',
    };
  }
  if (abs < 35) {
    return {
      label: 'Warm temperate',
      note: 'Hot to mild summers with cooler winters. Drought and heatwaves are the usual pressures.',
    };
  }
  if (abs < 50) {
    return {
      label: 'Temperate',
      note: 'Four clear seasons. Winter storms, spring flooding and summer heat all matter.',
    };
  }
  return {
    label: 'Cool / polar-influenced',
    note: 'Long cold winters. Snow load, frozen pipes and short growing seasons matter most.',
  };
}

/** Search for places by name. Returns a small, normalised list. */
async function searchPlaces(query, count = 6) {
  const name = String(query || '').trim();
  if (name.length < 2) {
    const error = new Error('Type at least two characters to search.');
    error.status = 400;
    throw error;
  }

  const limit = Math.min(10, Math.max(1, Number(count) || 6));
  const key = `search:${name.toLowerCase()}:${limit}`;
  const cached = cacheGet(key);
  if (cached) return { ...cached, cached: true };

  const url = `${GEOCODE_URL}?name=${encodeURIComponent(name)}&count=${limit}&language=en&format=json`;
  const data = await fetchJson(url);

  const results = (data.results || []).map((item) => ({
    id: item.id,
    name: item.name,
    admin1: item.admin1 || '',
    admin2: item.admin2 || '',
    country: item.country || '',
    countryCode: item.country_code || '',
    latitude: item.latitude,
    longitude: item.longitude,
    elevation: item.elevation ?? null,
    timezone: item.timezone || '',
    population: item.population ?? null,
    featureCode: item.feature_code || '',
  }));

  const payload = { results, source: 'Open-Meteo Geocoding API' };
  cacheSet(key, payload);
  return payload;
}

/** Current conditions, a short outlook and a zone hint for a coordinate. */
async function pointProfile(latitude, longitude) {
  const lat = Number(latitude);
  const lon = Number(longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    const error = new Error('Provide a valid latitude and longitude.');
    error.status = 400;
    throw error;
  }

  const key = `point:${lat.toFixed(3)}:${lon.toFixed(3)}`;
  const cached = cacheGet(key);
  if (cached) return { ...cached, cached: true };

  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current:
      'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,is_day',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum',
    forecast_days: '3',
    timezone: 'auto',
  });

  const data = await fetchJson(`${FORECAST_URL}?${params.toString()}`);
  const current = data.current || {};
  const elevation = Number.isFinite(Number(data.elevation)) ? Number(data.elevation) : null;

  const daily = (data.daily?.time || []).map((date, index) => ({
    date,
    code: data.daily.weather_code?.[index] ?? null,
    summary: describeWeather(data.daily.weather_code?.[index]),
    max: data.daily.temperature_2m_max?.[index] ?? null,
    min: data.daily.temperature_2m_min?.[index] ?? null,
    rain: data.daily.precipitation_sum?.[index] ?? null,
  }));

  const payload = {
    coordinates: { latitude: lat, longitude: lon },
    timezone: data.timezone || '',
    elevation,
    zone: guessZone(lat, elevation),
    current: {
      temperature: current.temperature_2m ?? null,
      apparentTemperature: current.apparent_temperature ?? null,
      humidity: current.relative_humidity_2m ?? null,
      precipitation: current.precipitation ?? null,
      windSpeed: current.wind_speed_10m ?? null,
      isDay: current.is_day === 1,
      code: current.weather_code ?? null,
      summary: describeWeather(current.weather_code),
      observedAt: current.time || '',
    },
    daily,
    source: 'Open-Meteo Forecast API',
    fetchedAt: new Date().toISOString(),
  };

  cacheSet(key, payload);
  return payload;
}

module.exports = { searchPlaces, pointProfile };
