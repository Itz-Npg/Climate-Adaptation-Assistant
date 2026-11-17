import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  CloudRain,
  Compass,
  Droplets,
  Info,
  Loader2,
  Locate,
  MapPin,
  RefreshCw,
  Search,
  Sun,
  Thermometer,
  Wind,
} from 'lucide-react';
import ClimateMap from '../components/ClimateMap';
import { Alert, PageHeader } from '../components/ui';
import { geoApi, getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useSeo } from '../lib/seo';
import { events } from '../lib/tracking';
import Breadcrumbs from '../components/Breadcrumbs';

const QUICK_PLACES = ['Phagwara', 'New Delhi', 'Kochi', 'Shimla', 'Mumbai', 'Guwahati'];

const DEFAULT_CENTER = [22.97, 79.5];

function formatPlace(place) {
  if (!place) return '';
  return [place.name, place.admin1, place.country].filter(Boolean).join(', ');
}

function weatherTone(temperature) {
  if (temperature === null || temperature === undefined) return 'accent';
  if (temperature >= 40) return 'severe';
  if (temperature >= 35) return 'high';
  if (temperature >= 30) return 'moderate';
  return 'low';
}

export default function MapExplorer() {
  const { user } = useAuth();

  useSeo({
    title: 'Climate Map Explorer',
    description:
      'Search any place on satellite, street or terrain maps and see live temperature, humidity, wind and rainfall from the Open-Meteo API.',
    path: '/map',
    breadcrumbs: [{ label: 'Climate map' }],
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'Climate Map Explorer',
      applicationCategory: 'EducationalApplication',
      operatingSystem: 'Web',
      description: 'Satellite and weather map explorer for climate adaptation planning.',
      isPartOf: { '@type': 'WebSite', name: 'Climate Adaptation Assistant' },
    },
  });

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const [selected, setSelected] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const requestId = useRef(0);
  const chosenLabel = useRef('');

  const loadProfile = useCallback(async (latitude, longitude, place) => {
    const current = requestId.current + 1;
    requestId.current = current;
    setLoadingProfile(true);
    setProfileError('');
    try {
      const { data } = await geoApi.profile(latitude, longitude);
      if (requestId.current !== current) return;
      setProfile({ ...data, place: place || null });
    } catch (error) {
      if (requestId.current !== current) return;
      setProfile(null);
      setProfileError(getErrorMessage(error, 'Could not load conditions for this point.'));
    } finally {
      if (requestId.current === current) setLoadingProfile(false);
    }
  }, []);

  function choosePlace(place) {
    events.mapSearched({ place: place.name, country: place.country });
    const label = formatPlace(place);
    chosenLabel.current = label;
    setSelected(place);
    setQuery(label);
    setShowSuggestions(false);
    loadProfile(place.latitude, place.longitude, place);
  }

  // Debounced place search
  useEffect(() => {
    const term = query.trim();
    // Do not re-search the label that a suggestion just filled in.
    if (term === chosenLabel.current) return;
    if (term.length < 2) {
      setSuggestions([]);
      setSearching(false);
      return;
    }

    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const { data } = await geoApi.search(term, 6);
        if (cancelled) return;
        setSuggestions(data.results || []);
        setSearchError(data.results?.length ? '' : 'No matching place found. Try a larger nearby town.');
      } catch (error) {
        if (cancelled) return;
        setSuggestions([]);
        setSearchError(getErrorMessage(error, 'Place search failed.'));
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 420);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  function handleMapClick([latitude, longitude]) {
    const dropped = {
      id: `pin-${latitude.toFixed(3)}-${longitude.toFixed(3)}`,
      name: 'Dropped pin',
      admin1: '',
      country: '',
      latitude,
      longitude,
    };
    setSelected(dropped);
    loadProfile(latitude, longitude, null);
  }

  const markers = useMemo(() => {
    if (!selected) {
      return [
        {
          id: 'hint',
          lat: DEFAULT_CENTER[0],
          lon: DEFAULT_CENTER[1],
          title: 'Start exploring',
          subtitle: 'Search for a place or tap anywhere on the map.',
          tone: 'accent',
        },
      ];
    }
    return [
      {
        id: selected.id || `${selected.latitude}-${selected.longitude}`,
        lat: selected.latitude,
        lon: selected.longitude,
        title: selected.name || 'Selected point',
        subtitle: [selected.admin1, selected.country].filter(Boolean).join(', '),
        tone: weatherTone(profile?.current?.temperature),
        details: profile?.current
          ? [
              { label: 'Temperature', value: `${profile.current.temperature}\u00b0C` },
              { label: 'Humidity', value: `${profile.current.humidity}%` },
              { label: 'Conditions', value: profile.current.summary },
            ]
          : [],
      },
    ];
  }, [selected, profile]);

  const current = profile?.current;

  return (
    <div className="container-page py-10">
      <Breadcrumbs items={[{ label: 'Climate map' }]} className="mb-5" />
      <PageHeader
        eyebrow="Live map"
        title="Climate Map Explorer"
        description="Search any town or city and explore it on satellite, street or terrain maps. Live conditions come from the Open-Meteo API, imagery from Esri World Imagery and streets from OpenStreetMap — no API key needed."
      />

      {/* Search */}
      <div className="card mt-8">
        <div className="relative">
          <label htmlFor="place-search" className="label">
            Search a place
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
              aria-hidden="true"
            />
            <input
              id="place-search"
              className="input pl-11"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setShowSuggestions(true);
                setSearchError('');
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 160)}
              placeholder="e.g. Kochi, Punjab, Shimla"
              autoComplete="off"
              role="combobox"
              aria-expanded={showSuggestions}
              aria-controls="place-suggestions"
            />
            {searching ? (
              <Loader2
                className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-forest-600"
                aria-hidden="true"
              />
            ) : null}
          </div>

          {showSuggestions && suggestions.length ? (
            <ul
              id="place-suggestions"
              className="absolute z-[600] mt-1 max-h-72 w-full overflow-auto rounded-xl border border-line bg-white p-1 shadow-lift"
            >
              {suggestions.map((place) => (
                <li key={`${place.id}-${place.latitude}-${place.longitude}`}>
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => choosePlace(place)}
                    className="flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-leaf"
                  >
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-forest-600" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-ink">{place.name}</span>
                      <span className="block truncate text-xs text-muted">
                        {[place.admin1, place.country].filter(Boolean).join(', ')}
                        {place.elevation !== null ? ` \u00b7 ${Math.round(place.elevation)} m` : ''}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {searchError ? <p className="mt-2 text-xs text-red-600">{searchError}</p> : null}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-muted">Try:</span>
          {QUICK_PLACES.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => {
                setQuery(name);
                setShowSuggestions(true);
              }}
              className="rounded-full border border-line bg-canvas px-3 py-1 text-xs font-medium text-forest-700 transition hover:border-forest-300 hover:bg-leaf"
            >
              {name}
            </button>
          ))}
        </div>

        <p className="mt-4 flex items-start gap-2 rounded-xl bg-canvas px-3.5 py-2.5 text-xs leading-relaxed text-muted">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-forest-600" aria-hidden="true" />
          Tip: click anywhere on the map to inspect that point, or use the buttons at the top right of
          the map to switch between satellite, street and terrain views.
        </p>
      </div>

      {profileError ? (
        <Alert type="error" className="mt-5">
          {profileError}
        </Alert>
      ) : null}

      {/* Map + panel */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr] lg:items-start">
        <div className="min-w-0">
          <ClimateMap
            places={markers}
            center={selected ? [selected.latitude, selected.longitude] : DEFAULT_CENTER}
            zoom={selected ? 9 : 4}
            height={470}
            onMapClick={handleMapClick}
            ariaLabel="Climate map explorer"
          />
          <p className="mt-2 text-[11px] leading-relaxed text-muted">
            Satellite imagery &copy; Esri, Maxar, Earthstar Geographics. Street tiles &copy;
            OpenStreetMap contributors &copy; CARTO. Terrain &copy; OpenTopoMap (CC-BY-SA).
          </p>
        </div>

        <div className="space-y-5">
          {selected ? (
            <div className="card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="eyebrow">Selected place</span>
                  <h2 className="mt-2.5 truncate text-xl font-bold">{selected.name}</h2>
                  <p className="mt-1 text-sm text-muted">
                    {[selected.admin1, selected.country].filter(Boolean).join(', ') || 'Custom point'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => loadProfile(selected.latitude, selected.longitude, selected)}
                  className="rounded-lg p-2 text-muted hover:bg-canvas hover:text-forest-700"
                  aria-label="Refresh conditions"
                >
                  <RefreshCw className={`h-4 w-4 ${loadingProfile ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-xl bg-canvas px-3 py-2">
                  <dt className="text-[11px] text-muted">Latitude</dt>
                  <dd className="font-semibold text-ink">{selected.latitude.toFixed(3)}</dd>
                </div>
                <div className="rounded-xl bg-canvas px-3 py-2">
                  <dt className="text-[11px] text-muted">Longitude</dt>
                  <dd className="font-semibold text-ink">{selected.longitude.toFixed(3)}</dd>
                </div>
                {profile?.elevation !== null && profile?.elevation !== undefined ? (
                  <div className="rounded-xl bg-canvas px-3 py-2">
                    <dt className="text-[11px] text-muted">Elevation</dt>
                    <dd className="font-semibold text-ink">{Math.round(profile.elevation)} m</dd>
                  </div>
                ) : null}
                {profile?.zone ? (
                  <div className="rounded-xl bg-canvas px-3 py-2">
                    <dt className="text-[11px] text-muted">Climate band</dt>
                    <dd className="font-semibold text-ink">{profile.zone.label}</dd>
                  </div>
                ) : null}
              </dl>

              {user ? (
                <Link
                  to={`/risk-checker?city=${encodeURIComponent(selected.name || '')}&country=${encodeURIComponent(
                    selected.country || ''
                  )}&state=${encodeURIComponent(selected.admin1 || '')}`}
                  className="btn-primary btn-sm mt-4 w-full"
                >
                  Check climate risk here
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              ) : (
                <Link to="/login" className="btn-outline btn-sm mt-4 w-full">
                  Sign in to run a risk check
                </Link>
              )}
            </div>
          ) : (
            <div className="card">
              <span className="eyebrow">Getting started</span>
              <h2 className="mt-3 text-lg font-bold">Pick a place to begin</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Search for your town above, or click anywhere on the map. You will see live
                temperature, humidity, wind, rain and a three-day outlook for that exact point.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-muted">
                <li className="flex items-start gap-2">
                  <SatelliteMarker />
                  Switch to satellite view to see roof colours, water bodies and green cover.
                </li>
                <li className="flex items-start gap-2">
                  <Locate className="mt-0.5 h-4 w-4 shrink-0 text-forest-600" aria-hidden="true" />
                  Every pin reports live conditions from a free public weather API.
                </li>
              </ul>
            </div>
          )}

          {loadingProfile && !current ? (
            <div className="card flex items-center gap-2 text-sm text-muted">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading live conditions...
            </div>
          ) : null}

          {current ? (
            <div className="card">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-bold">Live conditions</h2>
                <span className="rounded-full bg-leaf px-2.5 py-1 text-[11px] font-semibold text-forest-700">
                  {current.summary}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <Stat
                  icon={Thermometer}
                  label="Temperature"
                  value={`${current.temperature}\u00b0C`}
                  hint={`Feels like ${current.apparentTemperature}\u00b0C`}
                />
                <Stat
                  icon={Droplets}
                  label="Humidity"
                  value={`${current.humidity}%`}
                  hint={current.humidity > 70 ? 'Muggy air' : 'Relatively dry'}
                />
                <Stat
                  icon={Wind}
                  label="Wind"
                  value={`${current.windSpeed} km/h`}
                  hint={current.windSpeed > 30 ? 'Gusty' : 'Light breeze'}
                />
                <Stat
                  icon={CloudRain}
                  label="Rain now"
                  value={`${current.precipitation} mm`}
                  hint={current.precipitation > 0 ? 'Currently raining' : 'No rain at the moment'}
                />
              </div>

              {profile.daily?.length ? (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                    Three-day outlook
                  </p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-3">
                    {profile.daily.map((day) => (
                      <div key={day.date} className="rounded-xl border border-line px-3 py-2 text-xs">
                        <p className="font-semibold text-ink">
                          {new Date(day.date).toLocaleDateString(undefined, {
                            weekday: 'short',
                            day: 'numeric',
                          })}
                        </p>
                        <p className="mt-1 text-muted">
                          {Math.round(day.min)}&deg; / {Math.round(day.max)}&deg;C
                        </p>
                        <p className="mt-0.5 truncate text-muted" title={day.summary}>
                          {day.summary}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {profile.zone ? (
                <p className="mt-4 flex items-start gap-2 rounded-xl bg-canvas px-3.5 py-2.5 text-xs leading-relaxed text-muted">
                  <Sun className="mt-0.5 h-4 w-4 shrink-0 text-forest-600" aria-hidden="true" />
                  {profile.zone.note} Zone labels are a broad latitude-and-elevation guide, not an
                  official climate classification.
                </p>
              ) : null}

              <p className="mt-3 text-[11px] text-muted">
                Source: {profile.source} &bull; Updated{' '}
                {profile.fetchedAt ? new Date(profile.fetchedAt).toLocaleTimeString() : 'just now'}
              </p>
            </div>
          ) : null}

          {selected ? (
            <div className="rounded-2xl border border-line bg-canvas p-4">
              <p className="flex items-start gap-2 text-xs leading-relaxed text-muted">
                <Compass className="mt-0.5 h-4 w-4 shrink-0 text-forest-600" aria-hidden="true" />
                Weather is live, but the risk scores elsewhere in this app are illustrative teaching
                estimates based on your answers — not official warnings.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, hint }) {
  return (
    <div className="rounded-xl bg-canvas px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-[11px] text-muted">
        <Icon className="h-3.5 w-3.5 text-forest-600" aria-hidden="true" />
        {label}
      </p>
      <p className="mt-1 text-lg font-bold leading-none text-ink">{value}</p>
      <p className="mt-1 text-[11px] text-muted">{hint}</p>
    </div>
  );
}

function SatelliteMarker() {
  return (
    <span
      className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-forest-600 text-white"
      aria-hidden="true"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-white" />
    </span>
  );
}
