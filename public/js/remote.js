/**
 * LaTeXSnipper remote-client page.
 *
 * This page is a thin browser client for a user-owned LaTeXSnipper desktop
 * instance. It never talks to this site's own backend: every request goes
 * straight to the address the user typed in, which the desktop exposes through
 * its Automation API.
 *
 * The desktop API contract is documented in the LaTeXSnipper repository
 * (docs/automation_api.md) and is intentionally not duplicated here:
 *  - GET  /api/v1/config
 *  - POST /api/v1/recognition/jobs   (multipart/form-data)
 *  - GET  /api/v1/recognition/jobs/{id}
 *  - DELETE /api/v1/recognition/jobs/{id}
 */

const STORAGE_KEY = 'latexsnipper-remote-connection';

const POLL_INTERVAL_MS = 1500;
const MAX_POLL_MS = 15 * 60 * 1000;
const PREFER_WAIT_SECONDS = 30;
const JOB_TIMEOUT_SECONDS = 300;

const DEFAULT_MAX_ITEMS = 16;
const DEFAULT_MAX_IMAGE_BYTES = 16 * 1024 * 1024;

/** Permission names proposed for Local Network Access, in probe order. */
const LOCAL_PERMISSION_NAMES = [
  'local-network-access',
  'local-network',
  'loopback-network',
];

const dom = {
  origin: document.getElementById('remoteOrigin'),
  copyOriginBtn: document.getElementById('copyOriginBtn'),
  browserNotice: document.getElementById('browserNotice'),
  browserNoticeDetail: document.getElementById('browserNoticeDetail'),

  connectForm: document.getElementById('connectForm'),
  baseUrl: document.getElementById('remoteBaseUrl'),
  key: document.getElementById('remoteKey'),
  toggleKeyBtn: document.getElementById('toggleKeyBtn'),
  remember: document.getElementById('rememberCheck'),
  testBtn: document.getElementById('testBtn'),
  clearBtn: document.getElementById('clearBtn'),
  connectStatus: document.getElementById('connectStatus'),
  capabilities: document.getElementById('capabilities'),

  submitForm: document.getElementById('submitForm'),
  mode: document.getElementById('remoteMode'),
  backend: document.getElementById('remoteBackend'),
  backendHint: document.getElementById('backendHint'),
  dropZone: document.getElementById('dropZone'),
  fileInput: document.getElementById('remoteFile'),
  pickFileBtn: document.getElementById('pickFileBtn'),
  fileList: document.getElementById('fileList'),
  submitBtn: document.getElementById('submitBtn'),
  cancelJobBtn: document.getElementById('cancelJobBtn'),
  submitStatus: document.getElementById('submitStatus'),

  results: document.getElementById('remoteResults'),
  resultSummary: document.getElementById('resultSummary'),
  resultList: document.getElementById('resultList'),

  setup: document.getElementById('remoteSetup'),
  submit: document.getElementById('remoteSubmit'),

  connectionPanel: document.getElementById('connectionPanel'),
  openConnectionBtn: document.getElementById('openConnectionBtn'),
};

/** Runtime state. Nothing here is trusted until the desktop answers. */
const state = {
  baseUrl: '',
  key: '',
  limits: null,
  permissions: [],
  files: [],
  activeJobId: null,
  pollAbort: false,
};

/* ═══════════════════════════════════════════════════════════════════════════
 * Address classification
 * ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Map a hostname to the Local Network Access address space it belongs to.
 *
 * Returns 'loopback', 'local', or null for public/unknown targets. The ranges
 * follow the IPAddressSpace table in the Local Network Access specification.
 * The value is only used to annotate fetch(), so an unrecognised host simply
 * means "no annotation".
 *
 * @param {string} hostname
 * @returns {'loopback'|'local'|null}
 */
function addressSpaceForHost(hostname) {
  const host = String(hostname || '')
    .toLowerCase()
    .replace(/^\[|\]$/g, '');
  if (!host) return null;

  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (v4) {
    const octets = v4.slice(1).map(Number);
    if (octets.some((value) => value > 255)) return null;
    const [a, b] = octets;
    if (a === 127) return 'loopback';
    if (a === 0) return b === 0 ? 'loopback' : 'local';
    if (a === 198 && (b === 18 || b === 19)) return 'loopback';
    if (a === 10) return 'local';
    if (a === 100 && b >= 64 && b <= 127) return 'local';
    if (a === 172 && b >= 16 && b <= 31) return 'local';
    if (a === 192 && b === 168) return 'local';
    if (a === 169 && b === 254) return 'local';
    return null;
  }

  if (host === 'localhost') return 'loopback';
  if (host === '::1' || host === '::') return 'loopback';
  if (host.endsWith('.local')) return 'local';
  if (/^f[cd][0-9a-f]{2}:/.test(host)) return 'local';
  if (/^fe[89ab][0-9a-f]:/.test(host)) return 'local';
  if (/^fec[0-9a-f]:/.test(host)) return 'local';
  return null;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Requests
 * ═══════════════════════════════════════════════════════════════════════════ */

/**
 * fetch() against the desktop instance.
 *
 * When the target is a non-public address the request is annotated with
 * `targetAddressSpace`, which is how a page states, before DNS resolution,
 * that it intends to reach the local network. Recent Chromium versions use
 * that declaration to decide whether a permission-granted request may bypass
 * the mixed-content block (an https page calling `http://<local ip>`).
 *
 * Browsers that do not implement the member ignore it; browsers that define it
 * as an enum reject unknown values with a TypeError, so the call retries once
 * without the annotation.
 *
 * @param {URL} url
 * @param {RequestInit} [init]
 * @returns {Promise<Response>}
 */
function desktopFetch(url, init = {}) {
  const request = {
    mode: 'cors',
    credentials: 'omit',
    cache: 'no-store',
    redirect: 'error',
    ...init,
  };
  const space = addressSpaceForHost(url.hostname);
  if (!space) return fetch(url, request);
  try {
    return fetch(url, { ...request, targetAddressSpace: space });
  } catch (error) {
    if (error instanceof TypeError) return fetch(url, request);
    throw error;
  }
}

/**
 * Build a URL on the configured desktop base.
 *
 * @param {string} path
 * @returns {URL}
 */
function endpoint(path) {
  if (!state.baseUrl) throw new Error('请先填写并测试桌面版地址。');
  return new URL(path, `${state.baseUrl}/`);
}

/**
 * Convert a non-2xx response into an Error carrying the API error fields.
 *
 * @param {Response} response
 * @returns {Promise<Error>}
 */
async function apiError(response) {
  let code = '';
  let message = '';
  let requestId = '';
  try {
    const body = await response.json();
    if (body && typeof body.error === 'object' && body.error !== null) {
      code = String(body.error.code || '');
      message = String(body.error.message || '');
      requestId = String(body.error.request_id || '');
    }
  } catch {
    // Body was empty or not JSON; fall through to the status line.
  }
  const error = new Error(message || `桌面版返回 HTTP ${response.status}`);
  error.status = response.status;
  error.code = code;
  error.requestId = requestId;
  return error;
}

/**
 * Turn any thrown value into an operator-readable explanation.
 *
 * @param {unknown} error
 * @returns {string}
 */
function describeError(error) {
  const message = error && error.message ? String(error.message) : String(error);
  if (error && typeof error === 'object' && error.status) {
    const parts = [message];
    if (error.code) parts.push(`（${error.code}）`);
    if (error.status === 403 && /Origin/i.test(message)) {
      parts.push('请把本页地址加入桌面端的「浏览器 Origin 白名单」。');
    } else if (error.status === 400) {
      parts.push('请确认地址填的是隧道 IP，且与桌面端「监听地址」完全一致。');
    } else if (error.status === 401) {
      parts.push('请重新从桌面端复制远程访问密钥。');
    } else if (error.status === 429) {
      parts.push('远程设备每分钟提交次数有限，稍等片刻再试。');
    }
    return parts.join('');
  }
  if (error instanceof TypeError) {
    return '无法连上这个地址。可能是浏览器拦截了对本地网络的访问、地址不可达，或该地址不在浏览器标签页能到达的网络里。请先确认设备在同一加密隧道内，再按页面下方的检查清单逐条排查。';
  }
  return message;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * UI helpers
 * ═══════════════════════════════════════════════════════════════════════════ */

/**
 * @param {HTMLElement} element
 * @param {'idle'|'busy'|'ok'|'error'} tone
 * @param {string} text
 */
function setStatus(element, tone, text) {
  element.dataset.tone = tone;
  const label = element.querySelector('.remote-status-text');
  if (label) label.textContent = text;
  // Mirror the job tone onto the block so the drop zone can show it as light.
  if (element === dom.submitStatus && dom.submit) {
    dom.submit.dataset.status = tone;
  }
}

/**
 * @param {string} text
 * @returns {Promise<boolean>} whether the clipboard write succeeded
 */
async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the legacy path.
  }
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(area);
    return copied;
  } catch {
    return false;
  }
}

/**
 * @param {HTMLButtonElement} button
 * @param {string} text
 */
async function copyWithFeedback(button, text) {
  const original = button.textContent;
  const copied = await copyText(text);
  button.textContent = copied ? '已复制' : '复制失败';
  button.disabled = true;
  window.setTimeout(() => {
    button.textContent = original;
    button.disabled = false;
  }, 1400);
}

/**
 * @param {string} path
 * @param {string} label
 * @param {string} [value]
 * @returns {[HTMLElement, HTMLElement]}
 */
function definitionRow(path, label, value) {
  const term = document.createElement('dt');
  term.textContent = label;
  const detail = document.createElement('dd');
  detail.textContent = value === undefined ? path : `${path} → ${value}`;
  return [term, detail];
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Connection
 * ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Normalise operator input into an origin-only base URL.
 *
 * @param {string} raw
 * @returns {string}
 */
function normalizeBaseUrl(raw) {
  let text = String(raw || '').trim();
  if (!text) throw new Error('请填写桌面版地址。');
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(text)) text = `http://${text}`;
  let url;
  try {
    url = new URL(text);
  } catch {
    throw new Error('地址格式不正确。示例：http://100.101.102.103:28765');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('地址必须以 http:// 或 https:// 开头。');
  }
  if ((url.pathname && url.pathname !== '/') || url.search || url.hash) {
    throw new Error('地址只能包含协议、主机和端口，不要带路径。');
  }
  return `${url.protocol}//${url.host}`;
}

/**
 * Probe the Local Network Access permission where the browser exposes it.
 *
 * @returns {Promise<string>} permission state, or 'unknown'
 */
async function probeLocalNetworkPermission() {
  if (!navigator.permissions || typeof navigator.permissions.query !== 'function') {
    return 'unknown';
  }
  for (const name of LOCAL_PERMISSION_NAMES) {
    try {
      const status = await navigator.permissions.query({ name });
      if (status && status.state) return status.state;
    } catch {
      // Unsupported or unrecognised descriptor; try the next candidate.
    }
  }
  return 'unknown';
}

/**
 * Show the banner that explains a pending or required local-network grant.
 *
 * @param {string} baseUrl
 */
async function updateBrowserNotice(baseUrl) {
  let url;
  try {
    url = new URL(baseUrl);
  } catch {
    dom.browserNotice.hidden = true;
    return;
  }
  const isLocalTarget = addressSpaceForHost(url.hostname) !== null;
  if (!isLocalTarget) {
    dom.browserNotice.hidden = true;
    return;
  }

  const isMixed =
    window.isSecureContext && url.protocol === 'http:';
  const permission = await probeLocalNetworkPermission();
  const notes = [
    '这个地址属于本地网络地址，部分浏览器会把它单独当作一项权限处理。',
  ];
  if (isMixed) {
    notes.push(
      '本页是 https，而你填的是 http 地址。Chrome 142 起，只要你在提示中授权本地网络访问，这类请求会被放行，不再按混合内容拦掉；浏览器不支持这项放宽时会直接拒绝。',
    );
  }
  if (permission === 'prompt') {
    notes.push('当前浏览器把这项权限标记为「待询问」，首次请求时会出现提示。');
  } else if (permission === 'denied') {
    notes.push('这项权限已被拒绝，需要在站点设置里重新允许后才能连接。');
  } else if (permission === 'granted') {
    notes.push('这项权限已授予。');
  }
  if (/Safari/i.test(navigator.userAgent) && !/Chrome|Chromium/i.test(navigator.userAgent)) {
    notes.push('Safari 对本地网络访问的处理尚未确认，若被拦截请改用系统快捷指令或桌面版。');
  }
  dom.browserNoticeDetail.textContent = notes.join(' ');
  dom.browserNotice.hidden = false;
}

/**
 * Render the capability summary returned by GET /api/v1/config.
 *
 * @param {any} config
 */
function renderCapabilities(config) {
  const limits = config && config.limits ? config.limits : {};
  state.limits = limits;
  state.permissions = Array.isArray(config && config.permissions)
    ? config.permissions.map(String)
    : [];

  dom.capabilities.replaceChildren();

  const list = document.createElement('dl');
  list.className = 'remote-caps-list';
  const add = (path, label, value) => {
    const [term, detail] = definitionRow(path, label, value);
    list.append(term, detail);
  };

  add('GET /api/v1/config', '接口版本', `api_version ${config.api_version ?? '未知'}`);
  add('GET /api/v1/config', '可用后端', availableBackends(config).map(backendLabel).join('、') || '无');
  add('GET /api/v1/config', '本次授权', state.permissions.join('、') || '无');
  add('GET /api/v1/config', '单张大小上限', formatBytes(limits.max_image_bytes));
  add('GET /api/v1/config', '请求体上限', formatBytes(limits.max_request_bytes));
  add('GET /api/v1/config', '批量张数上限', String(limits.max_batch_items ?? DEFAULT_MAX_ITEMS));
  add('GET /api/v1/config', '单张像素上限', formatPixels(limits.max_image_pixels));
  add('GET /api/v1/config', '单次等待上限', `${limits.max_wait_seconds ?? PREFER_WAIT_SECONDS} 秒`);
  dom.capabilities.append(list);

  applyBackends(config);
  dom.capabilities.hidden = false;
}

/**
 * @param {any} config
 * @returns {string[]}
 */
function availableBackends(config) {
  const backends = [];
  if (config && config.mathcraft_available) backends.push('mathcraft');
  if (config && config.external_available && Array.isArray(config.permissions)
    && config.permissions.includes('recognition.external')) {
    backends.push('external');
  }
  return backends;
}

/**
 * @param {string} backend
 * @returns {string}
 */
function backendLabel(backend) {
  return backend === 'external' ? '外部模型（external）' : '本机模型（mathcraft）';
}

/**
 * Rebuild the backend selector from what the desktop actually permits.
 *
 * @param {any} config
 */
function applyBackends(config) {
  const backends = availableBackends(config);
  const previous = dom.backend.value;
  dom.backend.replaceChildren();
  for (const backend of backends) {
    const option = document.createElement('option');
    option.value = backend;
    option.textContent = backendLabel(backend);
    dom.backend.append(option);
  }
  if (!backends.length) {
    const option = document.createElement('option');
    option.value = 'mathcraft';
    option.textContent = backendLabel('mathcraft');
    dom.backend.append(option);
  }
  dom.backend.value = backends.includes(previous) ? previous : backends[0] || 'mathcraft';
  dom.backend.disabled = backends.length <= 1;

  const backendNames = Array.isArray(config && config.backends)
    ? config.backends
    : (config && config.backends ? Object.keys(config.backends) : []);
  dom.backendHint.textContent = statusNoteForBackend(config, backends, backendNames);
}

/**
 * @param {any} config
 * @param {string[]} available
 * @param {string[]} configured
 * @returns {string}
 */
function statusNoteForBackend(config, available, configured) {
  if (!available.length) {
    return '桌面端目前没有可用的识别后端，请先在桌面版里确认模型已加载。';
  }
  if (configured.includes('external') && !available.includes('external')) {
    return '桌面端已配置外部模型，但远程设备默认无权调用它；如需使用请在桌面端单独开启。';
  }
  return `可用后端：${available.map(backendLabel).join('、')}。`;
}

/**
 * @param {number|undefined} bytes
 * @returns {string}
 */
function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '未知';
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MiB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KiB`;
  return `${bytes} B`;
}

/**
 * @param {number|undefined} pixels
 * @returns {string}
 */
function formatPixels(pixels) {
  if (!Number.isFinite(pixels) || pixels <= 0) return '未知';
  return `${(pixels / 1_000_000).toFixed(1)} 百万像素`;
}

/**
 * Read, validate and store the connection fields, then probe the desktop.
 *
 * @returns {Promise<boolean>}
 */
async function testConnection() {
  dom.testBtn.disabled = true;
  setStatus(dom.connectStatus, 'busy', '正在连接桌面版…');
  try {
    state.baseUrl = normalizeBaseUrl(dom.baseUrl.value);
    state.key = dom.key.value.trim();
    if (!state.key) throw new Error('请填写远程访问密钥。');

    await updateBrowserNotice(state.baseUrl);

    const response = await desktopFetch(endpoint('/api/v1/config'), {
      headers: {
        Authorization: `Bearer ${state.key}`,
        Accept: 'application/json',
      },
    });
    if (!response.ok) throw await apiError(response);
    const config = await response.json();

    renderCapabilities(config);
    persistConnection();
    const backendCount = availableBackends(config).length;
    setStatus(
      dom.connectStatus,
      'ok',
      `已连接 · 接口版本 ${config.api_version ?? '未知'} · 当前可用后端 ${backendCount} 个`,
    );
    revealSubmitStep();
    return true;
  } catch (error) {
    state.limits = null;
    state.permissions = [];
    dom.capabilities.hidden = true;
    setStatus(dom.connectStatus, 'error', describeError(error));
    return false;
  } finally {
    dom.testBtn.disabled = false;
  }
}

/**
 * @returns {void}
 */
function persistConnection() {
  if (!dom.remember.checked) {
    clearStoredConnection();
    return;
  }
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ baseUrl: state.baseUrl, key: state.key }),
    );
  } catch {
    // Private mode or a full quota; the session still works.
  }
}

/**
 * @returns {void}
 */
function clearStoredConnection() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
}

/**
 * @returns {void}
 */
function restoreConnection() {
  let stored = null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) stored = JSON.parse(raw);
  } catch {
    stored = null;
  }
  if (stored && typeof stored === 'object') {
    if (typeof stored.baseUrl === 'string') dom.baseUrl.value = stored.baseUrl;
    if (typeof stored.key === 'string') dom.key.value = stored.key;
  }
  // The setup panel ships open in the markup so the guide is readable without
  // script. With a remembered address the page opens collapsed instead, which
  // keeps the recognition block the only thing above the fold.
  if (dom.baseUrl.value) {
    dom.connectionPanel.open = false;
    setStatus(dom.connectStatus, 'idle', '已载入上次的连接信息，点「测试连接」重新验证。');
    updateBrowserNotice(dom.baseUrl.value);
  }
  syncConnectionPanel();
}

/**
 * @returns {void}
 */
/**
 * Keeps the disclosure button's expanded state in step with the panel, whether
 * it was toggled from the button or by clicking the summary directly.
 *
 * @returns {void}
 */
function syncConnectionPanel() {
  dom.openConnectionBtn.setAttribute('aria-expanded', String(dom.connectionPanel.open));
}

/**
 * The recognition block is always on screen now, so connecting no longer has to
 * reveal it; it only needs to refresh what the submit button allows.
 *
 * @returns {void}
 */
function revealSubmitStep() {
  updateSubmitAvailability();
}

/* ═══════════════════════════════════════════════════════════════════════════
 * File selection
 * ═══════════════════════════════════════════════════════════════════════════ */

/**
 * @returns {number}
 */
function maxItems() {
  const value = state.limits && Number(state.limits.max_batch_items);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_MAX_ITEMS;
}

/**
 * @returns {number}
 */
function maxImageBytes() {
  const value = state.limits && Number(state.limits.max_image_bytes);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_MAX_IMAGE_BYTES;
}

/**
 * Accept additional files, enforcing the count and size caps up front so the
 * desktop is not asked to reject an obviously oversized batch.
 *
 * @param {FileList|File[]} incoming
 * @returns {Promise<void>}
 */
async function addFiles(incoming) {
  const files = Array.from(incoming || []);
  if (!files.length) return;
  const limit = maxItems();
  const sizeLimit = maxImageBytes();
  const rejected = [];

  for (const file of files) {
    if (state.files.length >= limit) {
      rejected.push(`${file.name}：超出 ${limit} 张上限`);
      continue;
    }
    if (file.size > sizeLimit) {
      rejected.push(`${file.name}：${formatBytes(file.size)} 超过 ${formatBytes(sizeLimit)}`);
      continue;
    }
    const duplicate = state.files.some(
      (existing) => existing.name === file.name && existing.size === file.size,
    );
    if (duplicate) continue;
    state.files.push(file);
  }

  renderFileList();
  updateSubmitAvailability();
  if (rejected.length) {
    setStatus(dom.submitStatus, 'error', `已忽略：${rejected.join('；')}`);
  } else {
    setStatus(dom.submitStatus, 'idle', `已选择 ${state.files.length} 张图片。`);
  }
}

/**
 * @returns {void}
 */
function renderFileList() {
  dom.fileList.replaceChildren();
  if (!state.files.length) {
    dom.fileList.hidden = true;
    return;
  }
  state.files.forEach((file, index) => {
    const row = document.createElement('li');
    const name = document.createElement('span');
    name.textContent = `${index + 1}. ${file.name}`;
    const size = document.createElement('span');
    size.className = 'remote-filelist-size';
    size.textContent = formatBytes(file.size);
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'remote-mini-button';
    remove.textContent = '移除';
    remove.addEventListener('click', () => {
      state.files.splice(index, 1);
      renderFileList();
      updateSubmitAvailability();
    });
    row.append(name, size, remove);
    dom.fileList.append(row);
  });
  dom.fileList.hidden = false;
}

/**
 * @returns {void}
 */
function updateSubmitAvailability() {
  const connected = Boolean(state.baseUrl && state.key && !dom.capabilities.hidden);
  dom.submitBtn.disabled = !connected || !state.files.length || Boolean(state.activeJobId);
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Job submission
 * ═══════════════════════════════════════════════════════════════════════════ */

/**
 * @returns {string}
 */
function newIdempotencyKey() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }
  const buffer = new Uint8Array(16);
  if (window.crypto && typeof window.crypto.getRandomValues === 'function') {
    window.crypto.getRandomValues(buffer);
  } else {
    for (let index = 0; index < buffer.length; index += 1) {
      buffer[index] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(buffer, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * @returns {Promise<void>}
 */
async function submitJob() {
  if (!state.files.length) return;
  dom.submitBtn.disabled = true;
  dom.cancelJobBtn.hidden = true;
  setStatus(dom.submitStatus, 'busy', '正在上传到桌面版…');
  dom.results.hidden = true;
  dom.resultList.replaceChildren();

  try {
    const form = new FormData();
    form.append('mode', dom.mode.value);
    form.append('backend', dom.backend.value);
    form.append('timeout', String(JOB_TIMEOUT_SECONDS));
    for (const file of state.files) form.append('images', file, file.name);

    const response = await desktopFetch(endpoint('/api/v1/recognition/jobs'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${state.key}`,
        Accept: 'application/json',
        Prefer: `wait=${PREFER_WAIT_SECONDS}`,
        'Idempotency-Key': newIdempotencyKey(),
      },
      body: form,
    });

    if (response.status !== 200 && response.status !== 202) {
      throw await apiError(response);
    }
    const payload = await response.json();
    const job = payload && payload.job ? payload.job : null;
    if (!job || !job.id) throw new Error('桌面版返回的作业信息不完整。');

    renderJob(job);
    if (job.state === 'completed' || job.state === 'failed' || job.state === 'canceled') {
      finishJob(job);
      return;
    }

    state.activeJobId = String(job.id);
    dom.cancelJobBtn.hidden = false;
    setStatus(dom.submitStatus, 'busy', '已提交，正在等待桌面端识别…');
    await pollJob(state.activeJobId);
  } catch (error) {
    setStatus(dom.submitStatus, 'error', describeError(error));
  } finally {
    state.activeJobId = null;
    dom.cancelJobBtn.hidden = true;
    updateSubmitAvailability();
  }
}

/**
 * Poll GET /api/v1/recognition/jobs/{id} until the job reaches a terminal state.
 *
 * @param {string} jobId
 * @returns {Promise<void>}
 */
async function pollJob(jobId) {
  const startedAt = Date.now();
  while (!state.pollAbort && Date.now() - startedAt < MAX_POLL_MS) {
    await new Promise((resolve) => window.setTimeout(resolve, POLL_INTERVAL_MS));
    if (state.pollAbort) break;

    const response = await desktopFetch(
      endpoint(`/api/v1/recognition/jobs/${encodeURIComponent(jobId)}`),
      { headers: { Authorization: `Bearer ${state.key}`, Accept: 'application/json' } },
    );
    if (!response.ok) throw await apiError(response);
    const payload = await response.json();
    const job = payload && payload.job ? payload.job : null;
    if (!job) throw new Error('桌面版返回的作业信息不完整。');

    renderJob(job);
    setStatus(dom.submitStatus, 'busy', describeJobProgress(job));

    if (job.state === 'completed' || job.state === 'failed' || job.state === 'canceled') {
      finishJob(job);
      return;
    }
  }
  if (state.pollAbort) {
    setStatus(dom.submitStatus, 'idle', '已停止查询作业状态。');
  } else {
    setStatus(dom.submitStatus, 'error', '等待超过 15 分钟仍未完成，已停止查询。可重新提交。');
  }
}

/**
 * @param {any} job
 * @returns {string}
 */
function describeJobProgress(job) {
  const summary = job.summary || {};
  const total = Number(summary.total) || 0;
  const succeeded = Number(summary.succeeded) || 0;
  const failed = Number(summary.failed) || 0;
  const stateLabels = {
    awaiting_result: '等待桌面端接收',
    queued: '排队中',
    running: '识别中',
    completed: '已完成',
    failed: '已失败',
    canceled: '已取消',
  };
  const label = stateLabels[job.state] || job.state || '未知状态';
  return `${label} · ${succeeded}/${total} 完成 · ${failed} 失败`;
}

/**
 * @param {any} job
 * @returns {void}
 */
function finishJob(job) {
  const summary = job.summary || {};
  const succeeded = Number(summary.succeeded) || 0;
  const failed = Number(summary.failed) || 0;
  const total = Number(summary.total) || 0;
  dom.results.hidden = false;
  dom.resultSummary.textContent = `作业 ${job.id} · 共 ${total} 张 · 成功 ${succeeded} · 失败 ${failed}`;
  if (job.error) dom.resultSummary.textContent += ` · ${job.error.code || ''} ${job.error.message || ''}`;
  const tone = failed === 0 && job.state === 'completed' ? 'ok' : 'error';
  setStatus(dom.submitStatus, tone, describeJobProgress(job));
  if (dom.results.scrollIntoView) dom.results.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Cancel the active job. Remote clients may delete their own job; there is no
 * server-side cancel endpoint, so DELETE is the documented way to stop it.
 *
 * @returns {Promise<void>}
 */
async function cancelJob() {
  const jobId = state.activeJobId;
  if (!jobId) return;
  state.pollAbort = true;
  dom.cancelJobBtn.disabled = true;
  try {
    const response = await desktopFetch(
      endpoint(`/api/v1/recognition/jobs/${encodeURIComponent(jobId)}`),
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${state.key}`, Accept: 'application/json' },
      },
    );
    if (!response.ok && response.status !== 404) throw await apiError(response);
    setStatus(dom.submitStatus, 'idle', '已请求取消作业。');
  } catch (error) {
    setStatus(dom.submitStatus, 'error', describeError(error));
  } finally {
    dom.cancelJobBtn.disabled = false;
    state.pollAbort = false;
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Results
 * ═══════════════════════════════════════════════════════════════════════════ */

/**
 * @param {any} job
 * @returns {void}
 */
function renderJob(job) {
  const items = Array.isArray(job.items) ? job.items : [];
  dom.resultList.replaceChildren();
  items.forEach((item) => dom.resultList.append(buildResultCard(item)));
  dom.results.hidden = items.length === 0;
}

/**
 * @param {any} item
 * @returns {HTMLElement}
 */
function buildResultCard(item) {
  const card = document.createElement('article');
  card.className = 'remote-result-card';

  const header = document.createElement('header');
  header.className = 'remote-result-head';
  const name = document.createElement('span');
  name.className = 'remote-result-name';
  name.textContent = item.filename || `图片 ${(Number(item.index) || 0) + 1}`;
  const chip = document.createElement('span');
  chip.className = 'remote-chip';
  chip.dataset.state = String(item.state || 'unknown');
  chip.textContent = describeItemState(item.state);
  header.append(name, chip);
  if (Number.isFinite(item.elapsed_ms)) {
    const elapsed = document.createElement('span');
    elapsed.className = 'remote-result-meta';
    elapsed.textContent = `${(item.elapsed_ms / 1000).toFixed(2)} 秒`;
    header.append(elapsed);
  }
  card.append(header);

  if (item.error) {
    const error = document.createElement('p');
    error.className = 'remote-result-error';
    error.textContent = `${item.error.code ? `${item.error.code}: ` : ''}${item.error.message || '识别失败'}`;
    card.append(error);
    return card;
  }

  if (typeof item.text === 'string' && item.text.length) {
    const code = document.createElement('pre');
    code.className = 'remote-result-code';
    code.textContent = item.text;
    card.append(code);

    const actions = document.createElement('div');
    actions.className = 'remote-result-actions';

    const copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'remote-mini-button';
    copy.textContent = '复制';
    copy.addEventListener('click', () => copyWithFeedback(copy, item.text));
    actions.append(copy);

    if (dom.mode.value !== 'text') {
      const preview = document.createElement('button');
      preview.type = 'button';
      preview.className = 'remote-mini-button';
      preview.textContent = '渲染公式';
      preview.addEventListener('click', () => toggleFormulaPreview(card, item.text, preview));
      actions.append(preview);
    }
    card.append(actions);
  } else if (item.state === 'running' || item.state === 'queued') {
    const pending = document.createElement('p');
    pending.className = 'remote-result-pending';
    pending.textContent = '等待桌面端返回结果…';
    card.append(pending);
  } else {
    const empty = document.createElement('p');
    empty.className = 'remote-result-pending';
    empty.textContent = '该图片没有返回文本。';
    card.append(empty);
  }

  return card;
}

/**
 * @param {string} value
 * @returns {string}
 */
function describeItemState(value) {
  const labels = {
    queued: '排队中',
    running: '识别中',
    completed: '完成',
    failed: '失败',
  };
  return labels[value] || String(value || '未知');
}

/**
 * Render LaTeX with MathJax on demand, so the ~1 MB MathJax bundle is only
 * fetched when somebody actually wants the typeset preview.
 *
 * @param {HTMLElement} card
 * @param {string} latex
 * @param {HTMLButtonElement} button
 * @returns {Promise<void>}
 */
async function toggleFormulaPreview(card, latex, button) {
  const existing = card.querySelector('.remote-result-math');
  if (existing) {
    const hidden = existing.hasAttribute('hidden');
    if (hidden) existing.removeAttribute('hidden');
    else existing.setAttribute('hidden', '');
    button.textContent = hidden ? '隐藏公式' : '渲染公式';
    return;
  }

  const host = document.createElement('div');
  host.className = 'remote-result-math';
  host.textContent = '正在加载渲染引擎…';
  card.append(host);
  button.disabled = true;
  try {
    const mathJax = await ensureMathJax();
    const node = await mathJax.tex2svgPromise(latex, { display: true });
    host.replaceChildren(node);
    button.textContent = '隐藏公式';
  } catch {
    host.textContent = '公式渲染失败，可直接复制 LaTeX 源码。';
  } finally {
    button.disabled = false;
  }
}

/** @type {Promise<any>|null} */
let mathJaxPromise = null;

/**
 * Load /vendor/mathjax/tex-svg.js lazily.
 *
 * The MathJax configuration object has to exist before the bundle runs, and
 * this page's CSP forbids inline scripts, so the bundle is injected from here
 * instead of being referenced from the document.
 *
 * @returns {Promise<any>}
 */
function ensureMathJax() {
  if (mathJaxPromise) return mathJaxPromise;
  mathJaxPromise = new Promise((resolve, reject) => {
    if (typeof window.MathJax !== 'undefined' && window.MathJax.tex2svgPromise) {
      resolve(window.MathJax);
      return;
    }
    window.MathJax = {
      startup: { typeset: false },
      options: { enableMenu: false },
      svg: { fontCache: 'global' },
    };
    const script = document.createElement('script');
    script.src = '/vendor/mathjax/tex-svg.js';
    script.async = true;
    script.onload = () => {
      const startup = window.MathJax && window.MathJax.startup;
      const ready = startup && startup.promise;
      if (ready && typeof ready.then === 'function') {
        ready.then(() => resolve(window.MathJax)).catch(reject);
      } else if (window.MathJax && window.MathJax.tex2svgPromise) {
        resolve(window.MathJax);
      } else {
        reject(new Error('MathJax 未就绪'));
      }
    };
    script.onerror = () => reject(new Error('MathJax 加载失败'));
    document.head.append(script);
  });
  return mathJaxPromise;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Wiring
 * ═══════════════════════════════════════════════════════════════════════════ */

function wire() {
  dom.origin.textContent = window.location.origin;
  dom.copyOriginBtn.addEventListener('click', () =>
    copyWithFeedback(dom.copyOriginBtn, window.location.origin));

  dom.connectForm.addEventListener('submit', (event) => {
    event.preventDefault();
    testConnection();
  });

  dom.toggleKeyBtn.addEventListener('click', () => {
    const revealed = dom.key.type === 'text';
    dom.key.type = revealed ? 'password' : 'text';
    dom.toggleKeyBtn.textContent = revealed ? '显示' : '隐藏';
    dom.toggleKeyBtn.setAttribute('aria-pressed', String(!revealed));
  });

  dom.clearBtn.addEventListener('click', () => {
    clearStoredConnection();
    state.baseUrl = '';
    state.key = '';
    state.limits = null;
    dom.key.value = '';
    dom.capabilities.hidden = true;
    setStatus(dom.connectStatus, 'idle', '已清除本机保存的连接信息。');
    dom.connectionPanel.open = true;
    updateSubmitAvailability();
  });

  dom.baseUrl.addEventListener('change', () => {
    if (dom.baseUrl.value) updateBrowserNotice(normalizeSafe(dom.baseUrl.value));
  });

  dom.pickFileBtn.addEventListener('click', () => dom.fileInput.click());
  dom.fileInput.addEventListener('change', () => {
    addFiles(dom.fileInput.files);
    dom.fileInput.value = '';
  });

  for (const type of ['dragenter', 'dragover']) {
    dom.dropZone.addEventListener(type, (event) => {
      event.preventDefault();
      dom.dropZone.dataset.drag = 'true';
    });
  }
  for (const type of ['dragleave', 'drop']) {
    dom.dropZone.addEventListener(type, (event) => {
      event.preventDefault();
      delete dom.dropZone.dataset.drag;
    });
  }
  dom.dropZone.addEventListener('drop', (event) => {
    const transfer = event.dataTransfer;
    if (transfer && transfer.files) addFiles(transfer.files);
  });
  dom.dropZone.addEventListener('click', (event) => {
    if (event.target === dom.pickFileBtn) return;
    dom.fileInput.click();
  });

  dom.submitForm.addEventListener('submit', (event) => {
    event.preventDefault();
    submitJob();
  });

  dom.cancelJobBtn.addEventListener('click', cancelJob);

  dom.connectionPanel.addEventListener('toggle', syncConnectionPanel);

  dom.openConnectionBtn.addEventListener('click', () => {
    dom.connectionPanel.open = true;
    syncConnectionPanel();
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    dom.connectionPanel.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' });
    dom.baseUrl.focus({ preventScroll: true });
  });

  state.pollAbort = false;
  restoreConnection();
}

/**
 * Best-effort normalisation for the change listener; invalid input keeps the
 * previous notice rather than throwing inside an event handler.
 *
 * @param {string} raw
 * @returns {string}
 */
function normalizeSafe(raw) {
  try {
    return normalizeBaseUrl(raw);
  } catch {
    return '';
  }
}

wire();
