/**
 * Live climate conditions for a place, from the free Open-Meteo API.
 *
 * The risk engine is illustrative by design, but it can still use real
 * observations: current temperature and humidity, rainfall over the last
 * 7 and 30 days, and the hottest day in the last month.
 */

const { searchPlaces } = require('./geoService');

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const CACHE_TTL = 1000 * 60 * 20;
const cache = new Map();

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
  61: 'Light rain',
  63: 'Rain',
  65: 'Heavy rain',
  71: 'Light snow',
  73: 'Snow',
  75: 'Heavy snow',
  80: 'Rain showers',
  81: 'Rain showers',
  82: 'Violent rain showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with hail',
  99: 'Severe thunderstorm',
};

async function fetchJson(url, timeoutMs = 7000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json', 'User-Agent': 'ClimateAdaptationAssistant/1.0' },
    });
    if (!response.ok) throw new Error(`Open-Meteo responded ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function cached(key) {
  const hit = cache.get(key);
  if (!hit || Date.now() > hit.expires) return null;
  return hit.value;
}

function store(key, value) {
  if (cache.size > 300) cache.clear();
  cache.set(key, { value, expires: Date.now() + CACHE_TTL });
}

/**
 * @returns {Promise<{ok: boolean, source: string, message: string,
 *   temperature?: number, humidity?: number, rain7d?: number, rain30d?: number,
 *   maxTemp30d?: number, summary?: string, coordinates?: {latitude:number, longitude:number}}>}
 */
async function fetchLiveConditions({ city, state = '', country = '' } = {}) {
  const label = [city, state, country].filter(Boolean).join(', ').trim();
  if (!label) {
    return { ok: false, source: 'Open-Meteo', message: 'No location provided for live conditions.' };
  }

  const key = `live:${label.toLowerCase()}`;
  const hit = cached(key);
  if (hit) return hit;

  try {
    const found = await searchPlaces(label, 1);
    const place = found.results?.[0];
    if (!place) {
      return {
        ok: false,
        source: 'Open-Meteo',
        message: 'This place could not be located, so scores use your answers only.',
      };
    }

    const params = new URLSearchParams({
      latitude: String(place.latitude),
      longitude: String(place.longitude),
      current: 'temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m',
      daily: 'temperature_2m_max,precipitation_sum',
      past_days: '30',
      forecast_days: '1',
      timezone: 'auto',
    });

    const data = await fetchJson(`${FORECAST_URL}?${params.toString()}`);

    const rain = (data.daily?.precipitation_sum || []).filter((value) => Number.isFinite(value));
    const highs = (data.daily?.temperature_2m_max || []).filter((value) => Number.isFinite(value));
    const round = (value) => Number(Number(value).toFixed(1));

    const payload = {
      ok: true,
      source: 'Open-Meteo',
      message: 'Live conditions from Open-Meteo. Scores remain illustrative estimates.',
      place: {
        name: place.name,
        admin1: place.admin1,
        country: place.country,
        latitude: place.latitude,
        longitude: place.longitude,
      },
      temperature: Number.isFinite(data.current?.temperature_2m)
        ? round(data.current.temperature_2m)
        : null,
      humidity: Number.isFinite(data.current?.relative_humidity_2m)
        ? Math.round(data.current.relative_humidity_2m)
        : null,
      windSpeed: Number.isFinite(data.current?.wind_speed_10m)
        ? round(data.current.wind_speed_10m)
        : null,
      precipitationNow: Number.isFinite(data.current?.precipitation)
        ? round(data.current.precipitation)
        : null,
      summary: WEATHER_CODES[data.current?.weather_code] || 'Current conditions',
      rain7d: rain.length ? round(rain.slice(-7).reduce((sum, value) => sum + value, 0)) : null,
      rain30d: rain.length ? round(rain.reduce((sum, value) => sum + value, 0)) : null,
      maxTemp30d: highs.length ? round(Math.max(...highs)) : null,
      observedAt: data.current?.time || new Date().toISOString(),
      elevation: Number.isFinite(data.elevation) ? Math.round(data.elevation) : null,
    };

    store(key, payload);
    return payload;
  } catch (error) {
    return {
      ok: false,
      source: 'Open-Meteo',
      message: 'Live weather is unavailable right now, so scores use your climate answers only.',
    };
  }
}

module.exports = { fetchLiveConditions };
