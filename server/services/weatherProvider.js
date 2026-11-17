/**
 * Optional live weather integration.
 *
 * If OPENWEATHER_API_KEY is set, the server can enrich an assessment with the
 * current temperature for the given city. Without a key - or if the request
 * fails - the assessment stays fully usable with clearly labelled illustrative
 * inputs. No key is ever exposed to the browser.
 */

const PROVIDER = 'openweathermap';

async function fetchCurrentTemperature({ city, country }) {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      configured: false,
      provider: PROVIDER,
      message:
        'Live weather is not configured. Scores use the climate answers you provide and are illustrative only.',
      temperature: null,
    };
  }

  const query = [city, country].filter(Boolean).join(',');
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
    query
  )}&units=metric&appid=${apiKey}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return {
        ok: false,
        configured: true,
        provider: PROVIDER,
        message: `Live weather lookup failed (HTTP ${response.status}). Using your climate answers instead.`,
        temperature: null,
      };
    }
    const data = await response.json();
    return {
      ok: true,
      configured: true,
      provider: PROVIDER,
      message: 'Current temperature from OpenWeatherMap. Hazard scores are still illustrative estimates.',
      temperature: typeof data.main?.temp === 'number' ? Number(data.main.temp.toFixed(1)) : null,
    };
  } catch (error) {
    return {
      ok: false,
      configured: true,
      provider: PROVIDER,
      message: 'Live weather service unreachable. Using your climate answers instead.',
      temperature: null,
    };
  }
}

module.exports = { fetchCurrentTemperature };
