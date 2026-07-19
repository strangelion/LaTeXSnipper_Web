import { useEffect, useState } from 'react';
import { FALLBACK_RELEASE } from '../data/siteContent';

function mergeReleaseInfo(remote) {
  if (!remote || typeof remote !== 'object') {
    return FALLBACK_RELEASE;
  }

  return {
    ...FALLBACK_RELEASE,
    ...remote,
  };
}

export function useReleaseInfo() {
  const [release, setRelease] = useState(FALLBACK_RELEASE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    async function loadRelease() {
      try {
        const response = await fetch('/release-manifest.json', {
          signal: controller.signal,
          cache: 'no-cache',
        });

        if (!response.ok) {
          throw new Error(`release manifest returned ${response.status}`);
        }

        const data = await response.json();
        setRelease(mergeReleaseInfo(data));
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.warn('Unable to load release metadata:', error);
        }
      } finally {
        setLoading(false);
      }
    }

    loadRelease();

    return () => controller.abort();
  }, []);

  return { release, loading };
}
