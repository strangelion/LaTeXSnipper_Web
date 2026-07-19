import { useMemo } from 'react';

function detectPlatform() {
  if (typeof navigator === 'undefined') return 'windows';

  const platform =
    navigator.userAgentData?.platform ||
    navigator.platform ||
    navigator.userAgent ||
    '';

  const normalized = platform.toLowerCase();

  if (normalized.includes('mac')) return 'macos';
  if (
    normalized.includes('linux') ||
    normalized.includes('ubuntu') ||
    normalized.includes('debian')
  ) {
    return 'linux';
  }

  return 'windows';
}

const PLATFORM_LABELS = {
  windows: 'Windows',
  linux: 'Linux',
  macos: 'macOS',
};

export function usePreferredPlatform() {
  return useMemo(() => {
    const platform = detectPlatform();

    return {
      platform,
      label: PLATFORM_LABELS[platform],
      downloadPageHref: `/download.html?platform=${platform}`,
    };
  }, []);
}
