const PLATFORM_LABELS = Object.freeze({
  android: 'Android',
  chromeos: 'ChromeOS',
  ios: 'iPhone / iPad',
  linux: 'Linux',
  macos: 'macOS',
  unknown: '未知系统',
  windows: 'Windows',
});

export function normalizeArchitecture(value, bitness = '') {
  const source = String(value || '').toLowerCase();
  const bits = String(bitness || '');
  if (/arm|aarch|apple\s*silicon/.test(source)) return bits === '32' ? 'arm32' : 'arm64';
  if (/x86|amd|x64/.test(source)) return bits === '32' ? 'x86' : 'x86_64';
  return '';
}

export function detectDevice({
  uaPlatform = '',
  legacyPlatform = '',
  userAgent = '',
  maxTouchPoints = 0,
  architecture = '',
  bitness = '',
} = {}) {
  const source = `${uaPlatform} ${legacyPlatform} ${userAgent}`.toLowerCase();
  let platform = 'unknown';

  if (/android/.test(source)) {
    platform = 'android';
  } else if (/iphone|ipad|ipod/.test(source) || (/mac/.test(source) && maxTouchPoints > 1)) {
    platform = 'ios';
  } else if (/windows|win32|win64/.test(source)) {
    platform = 'windows';
  } else if (/cros|chrome\s?os/.test(source)) {
    platform = 'chromeos';
  } else if (/mac/.test(source)) {
    platform = 'macos';
  } else if (/linux|x11/.test(source)) {
    platform = 'linux';
  }

  return {
    platform,
    label: PLATFORM_LABELS[platform],
    architecture: normalizeArchitecture(architecture, bitness),
  };
}

export async function detectCurrentDevice(navigatorRef = navigator) {
  let highEntropy = {};
  const userAgentData = navigatorRef.userAgentData;
  if (userAgentData && typeof userAgentData.getHighEntropyValues === 'function') {
    try {
      highEntropy = await userAgentData.getHighEntropyValues(['architecture', 'bitness']);
    } catch {
      highEntropy = {};
    }
  }

  return detectDevice({
    uaPlatform: userAgentData?.platform || '',
    legacyPlatform: navigatorRef.platform || '',
    userAgent: navigatorRef.userAgent || '',
    maxTouchPoints: navigatorRef.maxTouchPoints || 0,
    architecture: highEntropy.architecture || '',
    bitness: highEntropy.bitness || '',
  });
}

export function isArchitectureCompatible(assetArchitecture, detectedArchitecture) {
  if (!detectedArchitecture) return true;
  const required = normalizeArchitecture(assetArchitecture);
  if (!required) return true;
  return required === detectedArchitecture;
}
