import mainWorker from './worker.js';

const ECOSYSTEM_CACHE_TTL_SECONDS = 60 * 60;

const PROJECTS = Object.freeze([
  {
    id: 'desktop',
    name: 'LaTeXSnipper Desktop',
    repository: 'SakuraMathcraft/LaTeXSnipper',
    status: '稳定发布',
    fallbackVersion: 'v2.5.0',
    fallbackChannel: 'LTS',
    fallbackOwner: 'SakuraMathcraft',
    fallbackLicense: 'GPL-3.0',
  },
  {
    id: 'mobile',
    name: 'LaTeXSnipper Mobile',
    repository: 'strangelion/LaTeXSnipper_mobile',
    status: '独立仓库',
    fallbackVersion: 'v1.3.0',
    fallbackOwner: 'strangelion',
    fallbackLicense: 'AGPL-3.0',
  },
  {
    id: 'office',
    name: 'LaTeXSnipper Office',
    repository: 'strangelion/LaTeXSnipper-Office',
    status: '独立仓库',
    fallbackVersion: 'v1.4.2',
    fallbackOwner: 'strangelion',
    fallbackLicense: 'AGPL-3.0',
  },
  {
    id: 'core',
    name: 'LaTeXSnipper Core',
    repository: 'strangelion/latexsnipper-core',
    status: 'Core 3 稳定契约',
    fallbackVersion: 'v3.1.0',
    fallbackOwner: 'strangelion',
    fallbackLicense: 'AGPL-3.0',
  },
]);

function githubHeaders(env) {
  const headers = new Headers({
    Accept: 'application/vnd.github+json',
    'User-Agent': 'LaTeXSnipper-Web-Worker',
    'X-GitHub-Api-Version': '2022-11-28',
  });
  if (env.GITHUB_TOKEN) {
    headers.set('Authorization', `Bearer ${env.GITHUB_TOKEN}`);
  }
  return headers;
}

async function githubJson(env, pathname) {
  try {
    const response = await fetch(`https://api.github.com${pathname}`, {
      headers: githubHeaders(env),
      cf: {
        cacheEverything: true,
        cacheTtl: ECOSYSTEM_CACHE_TTL_SECONDS,
      },
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.warn('GitHub ecosystem metadata request failed:', pathname, error);
    return null;
  }
}

function parseSemverTag(value) {
  const raw = String(value || '').trim();
  const match = raw.match(/^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/);
  if (!match) return null;
  return {
    version: `v${match[1]}.${match[2]}.${match[3]}${match[4] ? `-${match[4]}` : ''}`,
    numbers: [Number(match[1]), Number(match[2]), Number(match[3])],
    prerelease: Boolean(match[4]),
  };
}

function compareSemver(a, b) {
  for (let index = 0; index < 3; index += 1) {
    if (a.numbers[index] !== b.numbers[index]) {
      return a.numbers[index] - b.numbers[index];
    }
  }
  if (a.prerelease !== b.prerelease) return a.prerelease ? -1 : 1;
  return a.version.localeCompare(b.version);
}

async function resolveGitHubVersion(env, repository) {
  const encodedRepo = repository.split('/').map(encodeURIComponent).join('/');
  const latestRelease = await githubJson(env, `/repos/${encodedRepo}/releases/latest`);
  const releaseSemver = parseSemverTag(latestRelease?.tag_name);
  if (releaseSemver) {
    return {
      version: releaseSemver.version,
      publishedAt: latestRelease.published_at || null,
      releaseUrl: latestRelease.html_url || `https://github.com/${repository}/releases/latest`,
      source: 'github-release',
    };
  }

  const tags = await githubJson(env, `/repos/${encodedRepo}/tags?per_page=100`);
  if (Array.isArray(tags)) {
    const semverTags = tags
      .map((tag) => parseSemverTag(tag?.name))
      .filter(Boolean)
      .sort(compareSemver);
    const newest = semverTags.at(-1);
    if (newest) {
      return {
        version: newest.version,
        publishedAt: null,
        releaseUrl: `https://github.com/${repository}/releases`,
        source: 'github-tag',
      };
    }
  }

  return null;
}

async function readDesktopRelease(request, env) {
  try {
    const manifestUrl = new URL('/release-manifest.json', request.url);
    const response = await env.ASSETS.fetch(new Request(manifestUrl, { method: 'GET' }));
    if (!response.ok) return null;
    const manifest = await response.json();
    const version = String(manifest.version || '').trim();
    if (!/^\d+\.\d+\.\d+$/.test(version)) return null;
    return {
      version: `v${version}`,
      channel: String(manifest.channel || '').trim() || null,
      publishedAt: manifest.publishedAt || null,
      releaseUrl: manifest.releaseNotesUrl || null,
      source: 'release-manifest',
    };
  } catch (error) {
    console.warn('Unable to read Desktop release manifest:', error);
    return null;
  }
}

function normalizeLicense(repo, fallbackLicense) {
  const spdx = String(repo?.license?.spdx_id || '').trim();
  if (spdx && spdx !== 'NOASSERTION' && spdx !== 'OTHER') return spdx;
  return fallbackLicense;
}

async function resolveProject(project, request, env) {
  const encodedRepo = project.repository.split('/').map(encodeURIComponent).join('/');
  const [repo, release] = await Promise.all([
    githubJson(env, `/repos/${encodedRepo}`),
    project.id === 'desktop'
      ? readDesktopRelease(request, env)
      : resolveGitHubVersion(env, project.repository),
  ]);

  const version = release?.version || project.fallbackVersion;
  const channel = release?.channel || project.fallbackChannel || null;

  return {
    id: project.id,
    name: project.name,
    repository: project.repository,
    repositoryUrl: repo?.html_url || `https://github.com/${project.repository}`,
    version,
    channel,
    displayVersion: [version, channel].filter(Boolean).join(' '),
    status: project.status,
    owner: repo?.owner?.login || project.fallbackOwner,
    license: normalizeLicense(repo, project.fallbackLicense),
    description: repo?.description || null,
    archived: Boolean(repo?.archived),
    publishedAt: release?.publishedAt || null,
    releaseUrl: release?.releaseUrl || `https://github.com/${project.repository}/releases`,
    source: release?.source || 'fallback',
  };
}

function ecosystemResponse(payload, requestMethod = 'GET') {
  const body = requestMethod === 'HEAD' ? null : JSON.stringify(payload, null, 2);
  return new Response(body, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

async function handleEcosystem(request, env, ctx) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: { Allow: 'GET, HEAD, OPTIONS' },
    });
  }

  const cache = caches.default;
  const cacheUrl = new URL('/__cache/ecosystem-v1', request.url);
  const cacheKey = new Request(cacheUrl.toString(), { method: 'GET' });
  const cached = await cache.match(cacheKey);
  if (cached) {
    if (request.method === 'HEAD') {
      return new Response(null, { status: cached.status, headers: cached.headers });
    }
    return cached;
  }

  const projects = await Promise.all(PROJECTS.map((project) => resolveProject(project, request, env)));
  const payload = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    cacheTtlSeconds: ECOSYSTEM_CACHE_TTL_SECONDS,
    projects,
  };

  const response = ecosystemResponse(payload);
  ctx.waitUntil(cache.put(cacheKey, response.clone()));

  if (request.method === 'HEAD') {
    return new Response(null, { status: response.status, headers: response.headers });
  }
  return response;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/api/ecosystem') {
      return handleEcosystem(request, env, ctx);
    }
    return mainWorker.fetch(request, env, ctx);
  },
};
