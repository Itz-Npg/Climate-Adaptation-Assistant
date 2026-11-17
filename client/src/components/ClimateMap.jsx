import { useEffect, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Layers, Map as MapIcon, Mountain, Satellite } from 'lucide-react';

/**
 * Base layers. All are free public tile services that need no API key:
 *  - satellite: Esri World Imagery (+ Esri place labels overlay)
 *  - streets:   CARTO Voyager on OpenStreetMap data
 *  - terrain:   OpenTopoMap
 */
const BASE_LAYERS = {
  satellite: {
    label: 'Satellite',
    icon: Satellite,
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Imagery &copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community',
    labels: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Labels &copy; Esri',
    },
  },
  streets: {
    label: 'Streets',
    icon: MapIcon,
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
  },
  terrain: {
    label: 'Terrain',
    icon: Mountain,
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors, SRTM | &copy; OpenTopoMap (CC-BY-SA)',
  },
};

const TONES = {
  low: '#2f6b4a',
  moderate: '#d97706',
  high: '#ea580c',
  severe: '#dc2626',
  accent: '#2563eb',
};

function pinIcon(color) {
  return L.divIcon({
    className: 'caa-map-pin',
    html: `<span style="display:block;width:22px;height:22px;border-radius:50% 50% 50% 4px;transform:rotate(-45deg);background:${color};border:2.5px solid #ffffff;box-shadow:0 6px 14px rgba(0,0,0,0.35)"></span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -14],
  });
}

function MapEvents({ onClick }) {
  useMapEvents({
    click(event) {
      if (onClick) onClick([event.latlng.lat, event.latlng.lng]);
    },
  });
  return null;
}

function MapSync({ center, zoom, places }) {
  const map = useMap();
  const bounds = places.filter((place) => Number.isFinite(place.lat) && Number.isFinite(place.lon));

  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 220);
    return () => clearTimeout(timer);
  }, [map]);

  const boundsKey = bounds.map((place) => `${place.lat.toFixed(3)},${place.lon.toFixed(3)}`).join('|');

  useEffect(() => {
    if (bounds.length > 1) {
      map.fitBounds(
        L.latLngBounds(bounds.map((place) => [place.lat, place.lon])),
        { padding: [46, 46], maxZoom: 9 }
      );
      return;
    }
    if (bounds.length === 1) {
      map.flyTo([bounds[0].lat, bounds[0].lon], zoom ?? 10, { duration: 0.9 });
      return;
    }
    if (center) map.flyTo(center, zoom ?? 5, { duration: 0.9 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boundsKey, center?.[0], center?.[1], zoom, map]);

  return null;
}

/**
 * Reusable climate map.
 *
 * places: [{ id, lat, lon, title, subtitle, tone, details: [{ label, value }] }]
 */
export default function ClimateMap({
  places = [],
  center,
  zoom = 5,
  height = 420,
  defaultBaseLayer = 'satellite',
  onMapClick,
  className = '',
  ariaLabel = 'Interactive climate map',
}) {
  const [baseLayer, setBaseLayer] = useState(
    BASE_LAYERS[defaultBaseLayer] ? defaultBaseLayer : 'satellite'
  );
  const layer = BASE_LAYERS[baseLayer];

  const initialCenter =
    center || (places.length ? [places[0].lat, places[0].lon] : [22.97, 79.5]);

  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl border border-line bg-canvas ${className}`}
      style={{ height }}
    >
      <MapContainer
        center={initialCenter}
        zoom={places.length > 1 ? 5 : zoom}
        scrollWheelZoom
        className="h-full w-full"
        aria-label={ariaLabel}
      >
        <TileLayer
          key={layer.url}
          url={layer.url}
          attribution={layer.attribution}
          maxZoom={19}
          subdomains="abc"
        />
        {layer.labels ? (
          <TileLayer
            key={`${baseLayer}-labels`}
            url={layer.labels.url}
            attribution={layer.labels.attribution}
            maxZoom={19}
            opacity={0.9}
          />
        ) : null}

        <MapSync center={center} zoom={zoom} places={places} />
        <MapEvents onClick={onMapClick} />

        {places.map((place) => (
          <Marker
            key={place.id}
            position={[place.lat, place.lon]}
            icon={pinIcon(TONES[place.tone] || TONES.low)}
          >
            <Popup>
              <div style={{ minWidth: 168 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#182b21' }}>
                  {place.title}
                </p>
                {place.subtitle ? (
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: '#61736a' }}>{place.subtitle}</p>
                ) : null}
                {place.details?.length ? (
                  <dl style={{ margin: '8px 0 0', display: 'grid', gap: 3 }}>
                    {place.details.map((detail) => (
                      <div
                        key={detail.label}
                        style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 11 }}
                      >
                        <dt style={{ color: '#61736a' }}>{detail.label}</dt>
                        <dd style={{ margin: 0, fontWeight: 600, color: '#182b21' }}>{detail.value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Layer switcher */}
      <div className="pointer-events-auto absolute right-3 top-3 z-[500] flex flex-col gap-1 rounded-xl border border-white/60 bg-white/95 p-1 shadow-lift backdrop-blur">
        <span className="sr-only">Map style</span>
        {Object.entries(BASE_LAYERS).map(([key, option]) => {
          const Icon = option.icon;
          const active = key === baseLayer;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setBaseLayer(key)}
              aria-pressed={active}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition ${
                active ? 'bg-forest-600 text-white' : 'text-muted hover:bg-leaf hover:text-forest-700'
              }`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {option.label}
            </button>
          );
        })}
      </div>

      <div className="pointer-events-none absolute bottom-1.5 left-3 z-[500] inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-medium text-muted shadow-sm">
        <Layers className="h-3 w-3" aria-hidden="true" />
        {layer.label} view
      </div>
    </div>
  );
}
