import { useCallback, useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowRightLeft,
  Check,
  Info,
  Loader2,
  MapPinned,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { comparisonApi, getErrorMessage } from '../api/client';
import { Alert, EmptyState, PageHeader, RiskBadge } from '../components/ui';
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

const climates = [
  { value: 'hot-dry', label: 'Hot and dry' },
  { value: 'hot-humid', label: 'Hot and humid' },
  { value: 'temperate', label: 'Temperate' },
  { value: 'cold', label: 'Cold / high altitude' },
  { value: 'monsoon', label: 'Strong monsoon' },
];

const LABELS = ['Place A', 'Place B', 'Place C'];
const PLACE_COLORS = ['#2f6b4a', '#75b183', '#a3cdaa'];

const initialPlaces = [
  { city: '', state: '', country: 'India', locationType: 'urban', climate: 'hot-dry' },
  { city: '', state: '', country: 'India', locationType: 'suburban', climate: 'monsoon' },
];

const factorRows = [
  { key: 'floodRisk', label: 'Flood exposure', suffix: '/100', lowerIsBetter: true },
  { key: 'heatRisk', label: 'Extreme heat', suffix: '/100', lowerIsBetter: true },
  { key: 'waterAvailability', label: 'Water availability', suffix: '/100', lowerIsBetter: false },
  { key: 'greenCoverage', label: 'Green cover (estimated)', suffix: '%', lowerIsBetter: false },
];

function emptyPlace(index) {
  return {
    city: '',
    state: '',
    country: 'India',
    locationType: index === 2 ? 'rural' : 'urban',
    climate: index === 2 ? 'temperate' : 'hot-dry',
  };
}

export default function Compare() {
  const [places, setPlaces] = useState(initialPlaces);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [saved, setSaved] = useState([]);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [deletingId, setDeletingId] = useState('');
  const toast = useToast();

  useSeo({
    title: 'Compare Places',
    description:
      'Compare two or three locations on heat, flooding, water availability and green cover, with a satellite map and side-by-side scores.',
    path: '/compare',
    noIndex: true,
    breadcrumbs: [{ label: 'Compare places' }],
  });

  const loadSaved = useCallback(async () => {
    setLoadingSaved(true);
    try {
      const { data } = await comparisonApi.list();
      const list = data.comparisons || [];
      setSaved(list);
      // Show the most recent saved comparison instead of an empty result panel.
      setResult((current) => current || list[0] || null);
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Could not load saved comparisons.'));
    } finally {
      setLoadingSaved(false);
    }
  }, []);

  useEffect(() => {
    loadSaved();
  }, [loadSaved]);

  function updatePlace(index, field, value) {
    setPlaces((current) =>
      current.map((place, placeIndex) => (placeIndex === index ? { ...place, [field]: value } : place))
    );
    setErrors((current) => ({ ...current, [`${index}-${field}`]: undefined }));
    setError('');
  }

  function addPlace() {
    if (places.length >= 3) return;
    setPlaces((current) => [...current, emptyPlace(current.length)]);
  }

  function removePlace(index) {
    if (places.length <= 2) return;
    setPlaces((current) => current.filter((_, placeIndex) => placeIndex !== index));
    setErrors({});
  }

  function validate() {
    const next = {};
    places.forEach((place, index) => {
      if (!place.city.trim()) next[`${index}-city`] = 'City is required.';
      if (!place.country.trim()) next[`${index}-country`] = 'Country is required.';
    });
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleCompare(event) {
    event.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setError('');
    setNotice('');
    try {
      const { data } = await comparisonApi.create({
        locations: places.map((place) => ({
          city: place.city.trim(),
          state: place.state.trim(),
          country: place.country.trim(),
          locationType: place.locationType,
          climate: place.climate,
        })),
      });
      setResult(data.comparison);
      setSaved((current) => [data.comparison, ...current]);
      setNotice('Comparison calculated and saved to your account.');
      events.comparisonCreated({ places: data.comparison?.locations?.length ?? 0 });
      toast.success('Comparison saved to your account.');
    } catch (submitError) {
      setError(getErrorMessage(submitError, 'Could not calculate the comparison.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    setDeletingId(id);
    try {
      await comparisonApi.remove(id);
      setSaved((current) => current.filter((item) => item._id !== id));
      setResult((current) => (current && current._id === id ? null : current));
      setNotice('Comparison deleted.');
      toast.success('Comparison deleted.');
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    } finally {
      setDeletingId('');
    }
  }

  const comparisonPlaces = result?.comparisonData?.places || [];
  const chartData = result
    ? [
        { metric: 'Heat risk', ...Object.fromEntries(comparisonPlaces.map((place) => [place.label, place.heatRisk])) },
        { metric: 'Flood risk', ...Object.fromEntries(comparisonPlaces.map((place) => [place.label, place.floodRisk])) },
        {
          metric: 'Water availability',
          ...Object.fromEntries(comparisonPlaces.map((place) => [place.label, place.waterAvailability])),
        },
        {
          metric: 'Green cover',
          ...Object.fromEntries(comparisonPlaces.map((place) => [place.label, place.greenCoverage])),
        },
      ]
    : [];

  // Pin the compared places on the map (place names -> coordinates).
  const coordinateQueries = comparisonPlaces.map((place) => ({
    key: place.label,
    query: [place.city, place.state, place.country].filter(Boolean).join(', '),
  }));
  const coordinates = useGeocode(coordinateQueries);
  const mappedPlaces = comparisonPlaces
    .map((place) => {
      const hit = coordinates[place.label];
      if (!hit) return null;
      return {
        id: place.label,
        lat: hit.latitude,
        lon: hit.longitude,
        title: `${place.label}: ${place.city}`,
        subtitle: [place.state, place.country].filter(Boolean).join(', '),
        tone: place.riskLevel,
        details: [
          { label: 'Heat risk', value: `${place.heatRisk}/100` },
          { label: 'Flood risk', value: `${place.floodRisk}/100` },
          { label: 'Water availability', value: `${place.waterAvailability}/100` },
        ],
      };
    })
    .filter(Boolean);

  return (
    <div className="container-page py-10">
      <Breadcrumbs items={[{ label: 'Compare places' }]} className="mb-5" />
      <PageHeader
        eyebrow="Tool 03"
        title="Compare Places"
        description="Compare two or three locations on heat, flooding, water availability and green cover. These are illustrative estimates for household planning — not official safety ratings or relocation advice."
      />

      {error ? <Alert type="error" className="mt-5">{error}</Alert> : null}
      {notice ? <Alert type="success" className="mt-5">{notice}</Alert> : null}

      {/* Input form */}
      <form onSubmit={handleCompare} noValidate className="card mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Places to compare</h2>
            <p className="mt-1 text-sm text-muted">Add two or three locations with the same details you would use in the risk checker.</p>
          </div>
          {places.length < 3 ? (
            <button type="button" onClick={addPlace} className="btn-outline btn-sm">
              <Plus className="h-3.5 w-3.5" /> Add a third place
            </button>
          ) : null}
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {places.map((place, index) => (
            <div key={LABELS[index]} className="rounded-2xl border border-line bg-canvas/60 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="eyebrow">{LABELS[index]}</span>
                {index >= 2 ? (
                  <button
                    type="button"
                    onClick={() => removePlace(index)}
                    className="rounded-lg p-1.5 text-muted hover:bg-white hover:text-red-600"
                    aria-label="Remove third place"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>

              <div className="mt-3 space-y-3">
                <div>
                  <label htmlFor={`city-${index}`} className="label">
                    City / town
                  </label>
                  <input
                    id={`city-${index}`}
                    className={`input ${errors[`${index}-city`] ? 'border-red-300 ring-2 ring-red-100' : ''}`}
                    value={place.city}
                    onChange={(event) => updatePlace(index, 'city', event.target.value)}
                    placeholder={index === 0 ? 'e.g. Phagwara' : 'e.g. Kochi'}
                    aria-invalid={Boolean(errors[`${index}-city`])}
                  />
                  {errors[`${index}-city`] ? (
                    <p className="mt-1 text-xs text-red-600">{errors[`${index}-city`]}</p>
                  ) : null}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor={`state-${index}`} className="label">
                      State / province
                    </label>
                    <input
                      id={`state-${index}`}
                      className="input"
                      value={place.state}
                      onChange={(event) => updatePlace(index, 'state', event.target.value)}
                      placeholder="e.g. Punjab"
                    />
                  </div>
                  <div>
                    <label htmlFor={`country-${index}`} className="label">
                      Country
                    </label>
                    <input
                      id={`country-${index}`}
                      className={`input ${
                        errors[`${index}-country`] ? 'border-red-300 ring-2 ring-red-100' : ''
                      }`}
                      value={place.country}
                      onChange={(event) => updatePlace(index, 'country', event.target.value)}
                      aria-invalid={Boolean(errors[`${index}-country`])}
                    />
                    {errors[`${index}-country`] ? (
                      <p className="mt-1 text-xs text-red-600">{errors[`${index}-country`]}</p>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor={`type-${index}`} className="label">
                      Location type
                    </label>
                    <select
                      id={`type-${index}`}
                      className="select"
                      value={place.locationType}
                      onChange={(event) => updatePlace(index, 'locationType', event.target.value)}
                    >
                      {locationTypes.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={`climate-${index}`} className="label">
                      Climate profile
                    </label>
                    <select
                      id={`climate-${index}`}
                      className="select"
                      value={place.climate}
                      onChange={(event) => updatePlace(index, 'climate', event.target.value)}
                    >
                      {climates.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {places.length === 2 ? (
            <div className="hidden items-center justify-center rounded-2xl border border-dashed border-line bg-canvas/40 p-4 lg:flex">
              <div className="text-center">
                <MapPinned className="mx-auto h-6 w-6 text-forest-400" aria-hidden="true" />
                <p className="mt-2 text-sm font-medium text-ink">Comparing two places is enough</p>
                <p className="mt-1 text-xs text-muted">Add a third to see it alongside them.</p>
                <button type="button" onClick={addPlace} className="btn-ghost btn-sm mt-2">
                  <Plus className="h-3.5 w-3.5" /> Add place C
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Comparing...
              </>
            ) : (
              <>
                <ArrowRightLeft className="h-4 w-4" /> Compare places
              </>
            )}
          </button>
          <p className="text-xs text-muted">The comparison is saved automatically when you calculate it.</p>
        </div>
      </form>

      {/* Result */}
      {result ? (
        <section className="mt-8 space-y-6" aria-label="Comparison result">
          {result._id ? (
            <p className="text-xs text-muted">
              Showing{' '}
              {new Date(result.createdAt).toLocaleDateString(undefined, {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}{' '}saved comparison — change the places above to recalculate.
            </p>
          ) : null}
          <div className="grid gap-4 md:grid-cols-3">
            {comparisonPlaces.map((place, index) => (
              <div key={place.label} className="card">
                <div className="flex items-center justify-between gap-2">
                  <span className="eyebrow">{place.label}</span>
                  <RiskBadge level={place.riskLevel} />
                </div>
                <h3 className="mt-3 text-lg font-bold">
                  {place.city}
                  {place.state ? `, ${place.state}` : ''}
                </h3>
                <p className="mt-1 text-xs text-muted">
                  {place.country} &bull; {place.locationTypeLabel} &bull; {place.climateLabel}
                </p>

                <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl bg-canvas px-3 py-2">
                    <dt className="text-[11px] text-muted">Heat risk</dt>
                    <dd className="font-semibold text-ink">{place.heatRisk}/100</dd>
                  </div>
                  <div className="rounded-xl bg-canvas px-3 py-2">
                    <dt className="text-[11px] text-muted">Flood risk</dt>
                    <dd className="font-semibold text-ink">{place.floodRisk}/100</dd>
                  </div>
                  <div className="rounded-xl bg-canvas px-3 py-2">
                    <dt className="text-[11px] text-muted">Water availability</dt>
                    <dd className="font-semibold text-ink">{place.waterAvailability}/100</dd>
                  </div>
                  <div className="rounded-xl bg-canvas px-3 py-2">
                    <dt className="text-[11px] text-muted">Green cover</dt>
                    <dd className="font-semibold text-ink">{place.greenCoverage}%</dd>
                  </div>
                </dl>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-canvas">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${100 - place.heatRisk}%`,
                      backgroundColor: PLACE_COLORS[index % PLACE_COLORS.length],
                    }}
                    aria-hidden="true"
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-muted">Relative heat resilience (higher is better)</p>
              </div>
            ))}
          </div>

          {mappedPlaces.length ? (
            <div className="card min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">Mapped locations</h2>
                  <p className="mt-1 text-sm text-muted">
                    Switch between satellite, street and terrain views. Each pin carries that place&apos;s
                    comparison scores.
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {comparisonPlaces.map((place) => (
                    <span
                      key={place.label}
                      className="rounded-full bg-leaf px-2.5 py-1 text-[11px] font-semibold text-forest-700"
                    >
                      {place.label}: {place.city}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-4">
                <ClimateMap
                  places={mappedPlaces}
                  height={380}
                  defaultBaseLayer="satellite"
                  ariaLabel="Map of the compared places"
                />
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-muted">
                Pins are placed from the city names you entered, so zoom in to confirm the exact
                area. Satellite imagery &copy; Esri, Maxar, Earthstar Geographics.
              </p>
            </div>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
            <div className="card min-w-0">
              <h2 className="text-lg font-bold">Side-by-side scores</h2>
              <p className="mt-1 text-sm text-muted">
                Higher bars mean more risk for heat and flood, and better conditions for water and green cover.
              </p>
              <div className="mt-4 h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e3ebe4" vertical={false} />
                    <XAxis
                      dataKey="metric"
                      tick={{ fontSize: 11, fill: '#61736a' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 11, fill: '#61736a' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: '1px solid #e3ebe4', fontSize: 12 }}
                      formatter={(value, name) => [`${value}`, name]}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    {comparisonPlaces.map((place, index) => (
                      <Bar
                        key={place.label}
                        dataKey={place.label}
                        fill={PLACE_COLORS[index % PLACE_COLORS.length]}
                        radius={[6, 6, 0, 0]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card min-w-0">
              <h2 className="text-lg font-bold">Factor comparison</h2>
              <div className="mt-4 w-full overflow-x-auto">
                <table className="w-full min-w-[420px] border-collapse text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-muted">
                      <th className="pb-2 pr-3 font-semibold">Factor</th>
                      {comparisonPlaces.map((place) => (
                        <th key={place.label} className="pb-2 pr-3 font-semibold">
                          {place.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {factorRows.map((row) => {
                      const values = comparisonPlaces.map((place) => place[row.key]);
                      const best = row.lowerIsBetter ? Math.min(...values) : Math.max(...values);
                      return (
                        <tr key={row.key} className="table-row-line">
                          <td className="py-2.5 pr-3 font-medium text-ink">{row.label}</td>
                          {comparisonPlaces.map((place, index) => {
                            const value = place[row.key];
                            return (
                              <td key={place.label} className="py-2.5 pr-3 text-muted">
                                <span className="inline-flex items-center gap-1.5">
                                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PLACE_COLORS[index % PLACE_COLORS.length] }} />
                                  {value}
                                  {row.suffix}
                                  {value === best ? <Check className="h-3.5 w-3.5 text-forest-600" aria-label="best" /> : null}
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 flex items-start gap-2 rounded-xl bg-canvas px-3 py-2.5 text-xs leading-relaxed text-muted">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-forest-600" aria-hidden="true" />
                Best values are marked with a check. Green cover is an estimate based on the location
                type you selected, not satellite data.
              </p>
            </div>
          </div>

          <div className="card-soft">
            <h2 className="text-lg font-bold text-forest-800">Local adaptation recommendations</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {comparisonPlaces.map((place) => (
                <div key={place.label} className="rounded-2xl bg-white/80 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-forest-600">
                    {place.label}
                  </p>
                  <h3 className="mt-1 text-sm font-bold">
                    {place.city}
                    {place.state ? `, ${place.state}` : ''}
                  </h3>
                  <ul className="mt-2 space-y-1.5">
                    {place.recommendations.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-xs leading-relaxed text-forest-900/85">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-forest-600" aria-hidden="true" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs leading-relaxed text-forest-900/70">
              {result.comparisonData?.guidance}
            </p>
          </div>
        </section>
      ) : (
        <section className="mt-8">
          <div className="card">
            <EmptyState
              icon={ArrowRightLeft}
              title="No comparison yet"
              description="Enter two or three places above and press Compare places. You will get profile cards, a chart, a factor table and local recommendations."
            />
          </div>
        </section>
      )}

      {/* Saved comparisons */}
      <section className="mt-10">
        <h2 className="text-xl font-bold">Saved comparisons</h2>
        <p className="mt-1 text-sm text-muted">Only you can see these records.</p>

        {loadingSaved ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading saved comparisons...
          </div>
        ) : saved.length ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {saved.map((item) => (
              <div key={item._id} className="card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">
                      {item.locations.map((location) => location.city).join(' vs ')}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {new Date(item.createdAt).toLocaleDateString(undefined, {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <span className="rounded-full bg-leaf px-2.5 py-1 text-[11px] font-semibold text-forest-700">
                    {item.locations.length} places
                  </span>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {(item.comparisonData?.places || []).map((place) => (
                    <div key={place.label} className="rounded-xl bg-canvas px-3 py-2 text-xs">
                      <p className="font-semibold text-ink">
                        {place.label}: {place.city}
                      </p>
                      <p className="mt-0.5 text-muted">
                        Heat {place.heatRisk} &bull; Flood {place.floodRisk} &bull; Water{' '}
                        {place.waterAvailability}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => setResult(item)} className="btn-outline btn-sm flex-1">
                    View comparison
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item._id)}
                    className="btn-danger btn-sm"
                    disabled={deletingId === item._id}
                    aria-label="Delete comparison"
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
              icon={MapPinned}
              title="No saved comparisons"
              description="Calculate a comparison above and it will be stored here."
            />
          </div>
        )}
      </section>

      <RelatedTools current="compare" />
    </div>
  );
}
