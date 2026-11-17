import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  CloudSun,
  Globe2,
  Info,
  Loader2,
  MapPin,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { getErrorMessage, riskApi } from '../api/client';
import { Alert, EmptyState, PageHeader, RiskBadge, ScoreBar } from '../components/ui';
import ClimateMap from '../components/ClimateMap';
import Breadcrumbs from '../components/Breadcrumbs';
import RelatedTools from '../components/RelatedTools';
import useGeocode from '../hooks/useGeocode';
import { useSeo } from '../lib/seo';
import { events } from '../lib/tracking';
import { useToast } from '../components/ToastProvider';

const locationTypes = [
  { value: 'urban', label: 'Urban core' },
  { value: 'suburban', label: 'Suburban' },
  { value: 'rural', label: 'Rural' },
  { value: 'coastal', label: 'Coastal town' },
];

const housingTypes = [
  { value: 'apartment', label: 'Apartment / flat' },
  { value: 'independent-house', label: 'Independent house' },
  { value: 'informal', label: 'Informal / temporary housing' },
  { value: 'farmhouse', label: 'Farmhouse' },
];

const waterBodies = [
  { value: 'none', label: 'No water body nearby' },
  { value: 'river', label: 'River' },
  { value: 'lake', label: 'Lake or pond' },
  { value: 'coast', label: 'Sea / coastline' },
  { value: 'canal', label: 'Canal / irrigation channel' },
  { value: 'groundwater', label: 'Borewell / groundwater dependent' },
];

const drainageOptions = [
  { value: 'good', label: 'Good - water clears quickly' },
  { value: 'moderate', label: 'Moderate - clears slowly' },
  { value: 'poor', label: 'Poor - water pools' },
  { value: 'unknown', label: 'Not sure' },
];

const climates = [
  { value: 'hot-dry', label: 'Hot and dry' },
  { value: 'hot-humid', label: 'Hot and humid' },
  { value: 'temperate', label: 'Temperate' },
  { value: 'cold', label: 'Cold / high altitude' },
  { value: 'monsoon', label: 'Strong monsoon' },
];

const emptyForm = {
  city: '',
  state: '',
  country: 'India',
  locationType: 'urban',
  housingType: 'independent-house',
  waterBody: 'none',
  drainage: 'unknown',
  climate: 'hot-dry',
  averageTemperature: '',
};

const hazardRows = [
  ['heat', 'Extreme heat'],
  ['flood', 'Flooding'],
  ['drought', 'Drought'],
  ['waterScarcity', 'Water scarcity'],
];

export default function RiskChecker() {
  const [searchParams] = useSearchParams();
  // Values can arrive from the map explorer (?city=&state=&country=).
  const [form, setForm] = useState(() => ({
    ...emptyForm,
    city: searchParams.get('city') || emptyForm.city,
    state: searchParams.get('state') || emptyForm.state,
    country: searchParams.get('country') || emptyForm.country,
  }));
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [weatherNote, setWeatherNote] = useState('');
  const [assessments, setAssessments] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [deletingId, setDeletingId] = useState('');
  const [liveConditions, setLiveConditions] = useState(null);
  const toast = useToast();

  useSeo({
    title: 'Climate Risk Checker',
    description:
      'Score extreme heat, flooding, drought and water scarcity for your area using live weather data and the details of your household.',
    path: '/risk-checker',
    noIndex: true,
    breadcrumbs: [{ label: 'Risk checker' }],
  });

  const loadAssessments = useCallback(async () => {
    setLoadingList(true);
    try {
      const { data } = await riskApi.list();
      setAssessments(data.assessments || []);
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Could not load your saved assessments.'));
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    loadAssessments();
  }, [loadAssessments]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setError('');
  }

  function validate() {
    const next = {};
    if (!form.city.trim()) next.city = 'Enter the city or town.';
    if (!form.country.trim()) next.country = 'Enter the country.';
    if (form.averageTemperature !== '' && Number.isNaN(Number(form.averageTemperature))) {
      next.averageTemperature = 'Use a number in degrees Celsius.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setError('');
    try {
      const { data } = await riskApi.create({
        ...form,
        city: form.city.trim(),
        state: form.state.trim(),
        country: form.country.trim(),
        averageTemperature: form.averageTemperature === '' ? null : Number(form.averageTemperature),
      });
      setResult(data.assessment);
      setWeatherNote(data.weather?.message || '');
      setLiveConditions(data.live || null);
      setAssessments((current) => [data.assessment, ...current]);
      events.riskAssessed({ level: data.assessment?.riskLevel, live: Boolean(data.live?.ok) });
      toast.success('Assessment saved. Live conditions applied.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (submitError) {
      setError(getErrorMessage(submitError, 'Could not save the assessment.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    setDeletingId(id);
    try {
      await riskApi.remove(id);
      setAssessments((current) => current.filter((item) => item._id !== id));
      setResult((current) => (current && current._id === id ? null : current));
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    } finally {
      setDeletingId('');
    }
  }

  // Resolve the assessed location so the result can be shown on the map.
  const coordinateQueries = result
    ? [
        {
          key: 'result',
          query: [result.location.city, result.location.state, result.location.country]
            .filter(Boolean)
            .join(', '),
        },
      ]
    : [];
  const coordinates = useGeocode(coordinateQueries);
  const resultCoordinates = coordinates.result;
  const coordinatesSettled = Object.prototype.hasOwnProperty.call(coordinates, 'result');

  return (
    <div className="container-page py-10">
      <Breadcrumbs items={[{ label: 'Risk checker' }]} className="mb-5" />
      <PageHeader
        eyebrow="Tool 01"
        title="Climate Risk Checker"
        description="Choose your location and household details to see an illustrative risk score for heat, flooding, drought and water scarcity. This is a screening tool, not an official forecast."
      />

      {error ? <Alert type="error" className="mt-5">{error}</Alert> : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.05fr] lg:items-start">
        {/* Form */}
        <form onSubmit={handleSubmit} noValidate className="card">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-forest-600" aria-hidden="true" />
            <h2 className="text-lg font-bold">Your location</h2>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="city" className="label">
                City / town
              </label>
              <input
                id="city"
                className={`input ${errors.city ? 'border-red-300 ring-2 ring-red-100' : ''}`}
                value={form.city}
                onChange={(event) => update('city', event.target.value)}
                placeholder="e.g. Phagwara"
                aria-invalid={Boolean(errors.city)}
              />
              {errors.city ? <p className="mt-1 text-xs text-red-600">{errors.city}</p> : null}
            </div>
            <div>
              <label htmlFor="state" className="label">
                State / province
              </label>
              <input
                id="state"
                className="input"
                value={form.state}
                onChange={(event) => update('state', event.target.value)}
                placeholder="e.g. Punjab"
              />
            </div>
            <div>
              <label htmlFor="country" className="label">
                Country
              </label>
              <input
                id="country"
                className={`input ${errors.country ? 'border-red-300 ring-2 ring-red-100' : ''}`}
                value={form.country}
                onChange={(event) => update('country', event.target.value)}
                placeholder="e.g. India"
                aria-invalid={Boolean(errors.country)}
              />
              {errors.country ? <p className="mt-1 text-xs text-red-600">{errors.country}</p> : null}
            </div>
            <div>
              <label htmlFor="averageTemperature" className="label">
                Average temperature (&deg;C)
              </label>
              <input
                id="averageTemperature"
                type="number"
                inputMode="decimal"
                className={`input ${errors.averageTemperature ? 'border-red-300 ring-2 ring-red-100' : ''}`}
                value={form.averageTemperature}
                onChange={(event) => update('averageTemperature', event.target.value)}
                placeholder="Optional, e.g. 31"
              />
              {errors.averageTemperature ? (
                <p className="mt-1 text-xs text-red-600">{errors.averageTemperature}</p>
              ) : null}
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <label htmlFor="locationType" className="label">
                Location type
              </label>
              <select
                id="locationType"
                className="select"
                value={form.locationType}
                onChange={(event) => update('locationType', event.target.value)}
              >
                {locationTypes.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="housingType" className="label">
                Housing type
              </label>
              <select
                id="housingType"
                className="select"
                value={form.housingType}
                onChange={(event) => update('housingType', event.target.value)}
              >
                {housingTypes.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="waterBody" className="label">
                Nearby water body
              </label>
              <select
                id="waterBody"
                className="select"
                value={form.waterBody}
                onChange={(event) => update('waterBody', event.target.value)}
              >
                {waterBodies.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="drainage" className="label">
                Drainage conditions
              </label>
              <select
                id="drainage"
                className="select"
                value={form.drainage}
                onChange={(event) => update('drainage', event.target.value)}
              >
                {drainageOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="climate" className="label">
                Local climate
              </label>
              <select
                id="climate"
                className="select"
                value={form.climate}
                onChange={(event) => update('climate', event.target.value)}
              >
                {climates.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button type="submit" className="btn-primary mt-6 w-full" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Calculating risk...
              </>
            ) : (
              'Calculate my risk score'
            )}
          </button>
          <p className="mt-3 text-center text-[11px] text-muted">
            Your assessment is saved to your account.
          </p>
        </form>

        {/* Result */}
        <div className="space-y-6">
          {result ? (
            <>
              <div className="card">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="eyebrow">Saved result</span>
                    <h2 className="mt-3 text-xl font-bold">
                      {result.location.city}
                      {result.location.state ? `, ${result.location.state}` : ''}
                    </h2>
                    <p className="mt-1 text-sm text-muted">{result.location.country}</p>
                  </div>
                  <RiskBadge level={result.riskLevel} />
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {hazardRows.map(([key, label]) => (
                    <ScoreBar key={key} label={label} score={result.riskScores[key]} />
                  ))}
                </div>

                <div className="mt-5 rounded-xl bg-canvas px-4 py-3">
                  <p className="flex items-start gap-2 text-xs leading-relaxed text-muted">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-forest-600" aria-hidden="true" />
                    Illustrative estimate generated from your answers. It is not a verified climate
                    forecast{weatherNote ? ` — ${weatherNote}` : '.'}
                  </p>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <Link to="/planner" className="btn-primary btn-sm">
                    Turn this into a plan
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                  <Link to="/compare" className="btn-outline btn-sm">
                    Compare with another place
                  </Link>
                </div>
              </div>

              <div className="card">
                <h3 className="flex items-center gap-2 text-base font-bold">
                  <ShieldAlert className="h-4 w-4 text-forest-600" aria-hidden="true" />
                  Contributing factors
                </h3>
                <ul className="mt-3 space-y-2.5">
                  {(result.factors || []).map((factor) => (
                    <li key={factor.label} className="rounded-xl border border-line px-3.5 py-2.5">
                      <p className="text-sm font-semibold text-ink">{factor.label}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted">{factor.detail}</p>
                    </li>
                  ))}
                </ul>
              </div>

              {liveConditions?.ok ? (
                <div className="card">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="flex items-center gap-2 text-base font-bold">
                      <CloudSun className="h-4 w-4 text-forest-600" aria-hidden="true" />
                      Live conditions used
                    </h3>
                    <span className="rounded-full bg-leaf px-2.5 py-1 text-[11px] font-semibold text-forest-700">
                      Open-Meteo
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {liveConditions.summary}
                    {liveConditions.place?.name ? ` in ${liveConditions.place.name}` : ''}
                    {liveConditions.elevation ? ` \u00b7 ${liveConditions.elevation} m elevation` : ''}
                  </p>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-xl bg-canvas px-3 py-2">
                      <dt className="text-[11px] text-muted">Temperature now</dt>
                      <dd className="font-semibold text-ink">{liveConditions.temperature}\u00b0C</dd>
                    </div>
                    <div className="rounded-xl bg-canvas px-3 py-2">
                      <dt className="text-[11px] text-muted">Humidity</dt>
                      <dd className="font-semibold text-ink">{liveConditions.humidity}%</dd>
                    </div>
                    <div className="rounded-xl bg-canvas px-3 py-2">
                      <dt className="text-[11px] text-muted">Rain last 7 days</dt>
                      <dd className="font-semibold text-ink">{liveConditions.rain7d} mm</dd>
                    </div>
                    <div className="rounded-xl bg-canvas px-3 py-2">
                      <dt className="text-[11px] text-muted">Hottest day (30d)</dt>
                      <dd className="font-semibold text-ink">{liveConditions.maxTemp30d}\u00b0C</dd>
                    </div>
                  </dl>
                  <p className="mt-3 text-[11px] leading-relaxed text-muted">
                    These live observations were included in the factor list below. The scores remain
                    illustrative estimates, not forecasts.
                  </p>
                </div>
              ) : null}

              <div className="card">
                <h3 className="flex items-center gap-2 text-base font-bold">
                  <Globe2 className="h-4 w-4 text-forest-600" aria-hidden="true" />
                  Location on the map
                </h3>
                {resultCoordinates ? (
                  <div className="mt-3">
                    <ClimateMap
                      places={[
                        {
                          id: 'assessment',
                          lat: resultCoordinates.latitude,
                          lon: resultCoordinates.longitude,
                          title: result.location.city,
                          subtitle: [result.location.state, result.location.country]
                            .filter(Boolean)
                            .join(', '),
                          tone: result.riskLevel,
                          details: [
                            { label: 'Overall', value: result.riskLevel },
                            { label: 'Heat', value: `${result.riskScores.heat}/100` },
                          ],
                        },
                      ]}
                      height={280}
                      zoom={11}
                      defaultBaseLayer="satellite"
                      ariaLabel={`Map of ${result.location.city}`}
                    />
                  </div>
                ) : (
                  <p className="mt-3 rounded-xl bg-canvas px-3.5 py-2.5 text-xs leading-relaxed text-muted">
                    {coordinatesSettled
                      ? 'This place could not be found on the map. Try adding the state or country.'
                      : 'Locating this place on the map...'}
                  </p>
                )}
              </div>

              <div className="card-soft">
                <h3 className="text-base font-bold text-forest-700">Practical safety recommendations</h3>
                <ul className="mt-3 space-y-2">
                  {(result.recommendations || []).map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm leading-relaxed text-forest-900/90">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-forest-600" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <div className="card">
              <EmptyState
                icon={MapPin}
                title="Your result will appear here"
                description="Fill in the details on the left and calculate a score. You will see four hazard scores, the factors behind them and what you can do next."
              />
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {hazardRows.map(([key, label]) => (
                  <div key={key} className="rounded-xl bg-canvas px-3.5 py-3">
                    <p className="text-xs font-semibold text-muted">{label}</p>
                    <p className="mt-1 text-sm text-ink">Score out of 100</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Saved list */}
      <section className="mt-10">
        <h2 className="text-xl font-bold">Saved assessments</h2>
        <p className="mt-1 text-sm text-muted">Only you can see these records.</p>

        {loadingList ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading assessments...
          </div>
        ) : assessments.length ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {assessments.map((item) => (
              <div key={item._id} className="card flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">
                      {item.location.city}
                      {item.location.state ? `, ${item.location.state}` : ''}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {new Date(item.createdAt).toLocaleDateString(undefined, {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <RiskBadge level={item.riskLevel} />
                </div>
                <div className="mt-4 grid flex-1 grid-cols-2 gap-2 text-xs">
                  {hazardRows.map(([key, label]) => (
                    <div key={key} className="rounded-lg bg-canvas px-2.5 py-2">
                      <p className="text-muted">{label}</p>
                      <p className="font-semibold text-ink">{item.riskScores[key]}/100</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex gap-2">
                  <button type="button" onClick={() => setResult(item)} className="btn-outline btn-sm flex-1">
                    View details
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item._id)}
                    className="btn-danger btn-sm"
                    disabled={deletingId === item._id}
                    aria-label={`Delete assessment for ${item.location.city}`}
                  >
                    {deletingId === item._id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4">
            <EmptyState
              icon={MapPin}
              title="No saved assessments"
              description="Calculate your first risk score above and it will be stored here."
            />
          </div>
        )}
      </section>

      <RelatedTools current="risk" />
    </div>
  );
}
