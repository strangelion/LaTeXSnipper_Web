import { useEffect, useState } from 'react';
import { normalizeCount } from '../../js/star-stats.js';

/**
 * Public project counters for the landing page.
 *
 * Same origin endpoint as the first-download dialog, so every surface shows the same
 * figures from one cached response. Unavailable means null: surfaces must render
 * nothing rather than invent a number.
 */
export function useProjectStats() {
  const [counters, setCounters] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCounters() {
      try {
        const response = await fetch('/api/stats', {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });

        if (!response.ok) return;

        const data = await response.json();
        if (!data || data.available === false) return;

        const stars = normalizeCount(data.stars);
        // totalDownloads = GitHub Release count + this site's own proxied downloads.
        const downloads = normalizeCount(data.totalDownloads);
        if (stars === null && downloads === null) return;

        setCounters({ stars, downloads });
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.warn('Unable to load project counters:', error);
        }
      }
    }

    loadCounters();

    return () => controller.abort();
  }, []);

  return counters;
}
