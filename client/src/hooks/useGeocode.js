import { useEffect, useState } from 'react';
import { geoApi } from '../api/client';

/**
 * Resolve a list of place names to coordinates through the backend geocoder.
 * places: [{ key, query }]
 * Returns { [key]: { latitude, longitude, name, admin1, country } | null }
 */
export default function useGeocode(places) {
  const [results, setResults] = useState({});
  const signature = JSON.stringify(places);

  useEffect(() => {
    let cancelled = false;
    const list = JSON.parse(signature);

    if (!list.length) {
      setResults({});
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      const entries = await Promise.all(
        list.map(async (place) => {
          const query = String(place.query || '').trim();
          if (query.length < 2) return [place.key, null];
          try {
            const { data } = await geoApi.search(query, 1);
            const hit = data.results?.[0];
            return [place.key, hit || null];
          } catch {
            return [place.key, null];
          }
        })
      );

      if (!cancelled) setResults(Object.fromEntries(entries));
    })();

    return () => {
      cancelled = true;
    };
  }, [signature]);

  return results;
}
