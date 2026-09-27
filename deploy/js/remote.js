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
  useLocalFileBtn: document.getElementById('useLocalFileBtn'),
  connectionFileInput: document.getElementById('remoteConnectionFile'),
  connectStatus: document.getElementById('connectStatus'),
  connection: document.getElementById('remoteConnection'),
  capabilities: document.getElementById('capabilities'),
  openSetupBtn: document.getElementById('openSetupBtn'),

  submitForm: document.getElementById('submitForm'),
  mode: document.getElementById('remoteMode'),
  backend: document.getElementById('remoteBackend'),
  backendHint: document.getElementById('backendHint'),
  dropZone: document.getElementById('dropZone'),
  fileInput: document.getElementById('remoteFile'),
  cameraInput: document.getElementById('remoteCamera'),
  selectFileBtn: document.getElementById('selectFileBtn'),
  cameraBtn: document.getElementById('cameraBtn'),
  pasteBtn: document.getElementById('pasteBtn'),
  screenBtn: document.getElementById('screenBtn'),
  drawingBtn: document.getElementById('drawingBtn'),
  browserFeatures: document.getElementById('browserFeatures'),
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

  drawingDialog: document.getElementById('drawingDialog'),
  drawingCanvas: document.getElementById('drawingCanvas'),
  drawingCloseBtn: document.getElementById('drawingCloseBtn'),
  drawPenBtn: document.getElementById('drawPenBtn'),
  drawEraserBtn: document.getElementById('drawEraserBtn'),
  drawStrokeWidth: document.getElementById('drawStrokeWidth'),
  drawClearBtn: document.getElementById('drawClearBtn'),
  drawAddBtn: document.getElementById('drawAddBtn'),
};

/** Runtime state. Nothing here is trusted until the desktop answers. */
const state = {
  baseUrl: '',
  key: '',
  connectionSource: 'manual',
  limits: null,
  permissions: [],
  files: [],
  activeJobId: null,
  pollAbort: false,
};

const drawingState = {
  activePointerId: null,
  hasInk: false,
  mode: 'pen',
};

let browserNoticeTimer = null;

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
async function desktopFetch(url, init = {}) {
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
    return await fetch(url, { ...request, targetAddressSpace: space });
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
  if (!state.baseUrl) throw new Error('请先填写地址并连接桌面版。');
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
  if (element === dom.connectStatus && dom.connection) {
    dom.connection.dataset.status = tone;
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
  if (url.username || url.password) {
    throw new Error('地址中不要包含用户名或密码。远程访问密钥请单独填写。');
  }
  if ((url.pathname && url.pathname !== '/') || url.search || url.hash) {
    throw new Error('地址只能包含协议、主机和端口，不要带路径。');
  }
  return `${url.protocol}//${url.host}`;
}

/**
 * Import the private discovery file written by a locally running desktop app.
 * Browsers cannot read it silently, so this always follows an explicit file
 * picker action. Local session tokens are never persisted by this path.
 *
 * @param {File} file
 * @returns {Promise<void>}
 */
async function importLocalConnectionFile(file) {
  if (!file) return;
  if (file.size > 64 * 1024) {
    throw new Error('这个连接文件异常大，请确认选择的是 automation-api.json。');
  }

  let payload;
  try {
    payload = JSON.parse(await file.text());
  } catch {
    throw new Error('无法读取连接文件。Windows 用户请到 %USERPROFILE%\\.latexsnipper\\automation-api.json 重新选择。');
  }
  if (!payload || typeof payload !== 'object') {
    throw new Error('连接文件内容不完整。');
  }

  const baseUrl = normalizeBaseUrl(payload.base_url);
  const token = String(payload.token || '').trim();
  if (!token) throw new Error('连接文件里没有本机会话 token。请在桌面版开启自动化接口后重新选择。');

  clearStoredConnection();
  dom.remember.checked = false;
  dom.baseUrl.value = baseUrl;
  dom.key.value = token;
  state.connectionSource = 'local-file';
  setStatus(dom.connectStatus, 'idle', '已读取本机连接文件，正在验证桌面版…');
  await updateBrowserNotice(baseUrl);
  await testConnection();
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
  const addressSpace = addressSpaceForHost(url.hostname);
  const isLocalTarget = addressSpace !== null;
  const isMixed = window.location.protocol === 'https:' && url.protocol === 'http:';
  const permission = await probeLocalNetworkPermission();
  const browser = browserProfile();
  const supportsLocalNetworkIntent = supportsTargetAddressSpace();
  const notes = [];

  if (addressSpace === 'loopback') {
    notes.push(`已选择同机连接。${url.hostname} 指向正在打开此网页的设备，请保持 LaTeXSnipper 与自动化接口运行。`);
    notes.push('网页仍受 Origin 白名单限制；如果桌面端的「仅本机」设置里没有白名单入口，请改用桌面客户端，或配置安全隧道 / HTTPS。');
  } else if (addressSpace === 'local') {
    notes.push('已选择私网或隧道地址。电脑与当前设备需要处于同一 Tailscale 或 WireGuard 网络。');
    if (url.protocol === 'https:') {
      notes.push('请确认桌面端证书的 SAN 包含当前主机名或 IP，并且证书颁发者受此设备信任。');
    }
  } else if (url.protocol === 'https:') {
    notes.push('这是 HTTPS 地址，跨浏览器兼容性通常更好；证书必须受当前设备信任。');
  } else {
    notes.push('不要把未加密的桌面接口直接暴露到公网；优先改用加密隧道或可信 HTTPS。');
  }

  if (isLocalTarget && isMixed && supportsLocalNetworkIntent) {
    notes.push(`${browser.label} 支持声明本地网络目标，首次请求时若出现本地网络访问提示，请选择允许。`);
  } else if (isLocalTarget && isMixed) {
    notes.push(`${browser.label} 可能直接阻止 HTTPS 页面访问 HTTP 私网地址；若连接失败，请改用桌面端的可信 HTTPS 地址，或系统快捷指令。`);
  }
  if (permission === 'prompt') {
    notes.push('当前权限状态为待询问。');
  } else if (permission === 'denied') {
    notes.push('本地网络权限已被拒绝，请在站点设置中重新允许。');
  } else if (permission === 'granted') {
    notes.push('本地网络权限已授予。');
  }
  notes.push(`还需在桌面端把 ${window.location.origin} 加入浏览器 Origin 白名单。`);

  dom.browserNotice.dataset.tone = isLocalTarget && isMixed && !supportsLocalNetworkIntent
    ? 'warning'
    : 'info';
  dom.browserNoticeDetail.textContent = notes.join(' ');
  dom.browserNotice.hidden = false;
}

/** @returns {boolean} */
function supportsTargetAddressSpace() {
  try {
    const probe = new Request(window.location.href, { targetAddressSpace: 'local' });
    return probe.targetAddressSpace === 'local';
  } catch {
    return false;
  }
}

/**
 * Browser names are used only to phrase guidance. Feature detection still
 * controls whether clipboard and screen-capture actions are exposed.
 *
 * @returns {{engine:'chromium'|'firefox'|'webkit'|'other',label:string}}
 */
function browserProfile() {
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  if (isIOS && /CriOS/i.test(ua)) return { engine: 'webkit', label: 'iOS 版 Chrome' };
  if (isIOS && /FxiOS/i.test(ua)) return { engine: 'webkit', label: 'iOS 版 Firefox' };
  if (isIOS && /EdgiOS/i.test(ua)) return { engine: 'webkit', label: 'iOS 版 Edge' };
  if (/Edg\//i.test(ua)) return { engine: 'chromium', label: 'Edge' };
  if (/Chrome|Chromium|CriOS/i.test(ua) && !/OPR\//i.test(ua)) {
    return { engine: 'chromium', label: 'Chrome / Chromium' };
  }
  if (/Firefox|FxiOS/i.test(ua)) return { engine: 'firefox', label: 'Firefox' };
  if (/Safari/i.test(ua) && !/Chrome|Chromium|CriOS|Edg|OPR/i.test(ua)) {
    return { engine: 'webkit', label: 'Safari' };
  }
  return { engine: 'other', label: '当前浏览器' };
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
    if (!state.key) throw new Error('请读取本机连接文件，或填写远程访问密钥。');

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
      `已连接，接口版本 ${config.api_version ?? '未知'}，当前可用后端 ${backendCount} 个`,
    );
    revealSubmitStep();
    return true;
  } catch (error) {
    state.limits = null;
    state.permissions = [];
    dom.capabilities.hidden = true;
    let message = describeError(error);
    if (state.connectionSource === 'local-file' && error instanceof TypeError) {
      message += ' 已读取本机连接文件，但浏览器跨域仍需要桌面端允许本页 Origin；当前「仅本机」界面若没有白名单入口，请使用桌面客户端，或改配安全隧道 / HTTPS。';
    }
    setStatus(dom.connectStatus, 'error', message);
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
  if (dom.baseUrl.value) {
    setStatus(dom.connectStatus, 'idle', '已载入上次的连接信息，点「连接桌面版」重新验证。');
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
  dom.openSetupBtn.setAttribute('aria-expanded', String(dom.connectionPanel.open));
}

/**
 * The recognition block is always on screen now, so connecting no longer has to
 * reveal it; it only needs to refresh what the submit button allows.
 *
 * @returns {void}
 */
function revealSubmitStep() {
  updateSubmitAvailability();
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  dom.submit.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' });
  dom.dropZone.focus({ preventScroll: true });
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
 * Expose only the capture actions this browser can actually perform. File
 * selection, the capture input and the canvas remain universal fallbacks.
 *
 * @returns {void}
 */
function updateInputCapabilities() {
  const canReadClipboard = Boolean(
    window.isSecureContext && navigator.clipboard
      && typeof navigator.clipboard.read === 'function',
  );
  const canCaptureScreen = Boolean(
    window.isSecureContext && navigator.mediaDevices
      && typeof navigator.mediaDevices.getDisplayMedia === 'function',
  );

  dom.pasteBtn.hidden = !canReadClipboard;
  dom.pasteBtn.disabled = false;
  dom.pasteBtn.title = canReadClipboard
    ? '读取剪贴板中的图片'
    : '此浏览器不能用按钮读取剪贴板，可在页面空白处按 Ctrl+V 或 Command+V';
  dom.screenBtn.hidden = !canCaptureScreen;

  const available = ['文件与拖放', '拍照或相册', '画板'];
  if (canReadClipboard) available.push('剪贴板图片');
  if (canCaptureScreen) available.push('屏幕截取');
  const fallback = canReadClipboard
    ? ''
    : ' 当前浏览器不允许按钮读取剪贴板，仍可使用系统粘贴快捷键。';
  dom.browserFeatures.textContent = `当前可用：${available.join('、')}。${fallback}`;
}

/**
 * @param {Blob} blob
 * @param {string} prefix
 * @returns {File}
 */
function fileFromImageBlob(blob, prefix) {
  const subtype = String(blob.type || 'image/png').split('/')[1] || 'png';
  const extension = subtype === 'jpeg' ? 'jpg' : subtype.replace(/[^a-z0-9.+-]/gi, '') || 'png';
  return new File(
    [blob],
    `${prefix}-${new Date().toISOString().replace(/[:.]/g, '-')}.${extension}`,
    { type: blob.type || 'image/png' },
  );
}

/**
 * @param {HTMLCanvasElement} canvas
 * @returns {Promise<Blob>}
 */
function canvasPng(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('浏览器无法生成 PNG 图片。'));
    }, 'image/png');
  });
}

/**
 * Read an image from the async Clipboard API. Paste events remain as the
 * fallback for Firefox, older Safari and policy-restricted browsers.
 *
 * @returns {Promise<void>}
 */
async function importClipboardImage() {
  if (!navigator.clipboard || typeof navigator.clipboard.read !== 'function') {
    setStatus(dom.submitStatus, 'idle', '此浏览器不能用按钮读取剪贴板，请在页面空白处使用系统粘贴快捷键。');
    return;
  }

  dom.pasteBtn.disabled = true;
  try {
    const items = await navigator.clipboard.read();
    const files = [];
    for (const item of items) {
      const imageType = item.types.find((type) => type.startsWith('image/'));
      if (!imageType) continue;
      const blob = await item.getType(imageType);
      files.push(fileFromImageBlob(blob, 'clipboard'));
    }
    if (!files.length) throw new Error('剪贴板里没有图片。');
    await addFiles(files);
  } catch (error) {
    const message = error && error.name === 'NotAllowedError'
      ? '浏览器没有允许读取剪贴板。可以改用系统粘贴快捷键或选择图片。'
      : describeError(error);
    setStatus(dom.submitStatus, 'error', message);
  } finally {
    updateInputCapabilities();
  }
}

/**
 * Convert a pasted clipboard image into the same File path used by drag/drop.
 *
 * @param {ClipboardEvent} event
 * @returns {void}
 */
function handleImagePaste(event) {
  const target = event.target;
  if (target instanceof HTMLElement
    && (target.matches('input, textarea, select') || target.isContentEditable)) return;
  const files = Array.from(event.clipboardData?.items || [])
    .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
    .map((item) => item.getAsFile())
    .filter(Boolean);
  if (!files.length) return;
  event.preventDefault();
  addFiles(files);
}

/**
 * Capture one frame from getDisplayMedia(). The stream is stopped in every
 * outcome so a canceled or completed capture never leaves screen sharing on.
 *
 * @returns {Promise<void>}
 */
async function captureScreenImage() {
  if (!navigator.mediaDevices || typeof navigator.mediaDevices.getDisplayMedia !== 'function') {
    setStatus(dom.submitStatus, 'idle', '当前浏览器不支持屏幕截取，请使用系统截图后选择或粘贴图片。');
    return;
  }

  let stream = null;
  dom.screenBtn.disabled = true;
  try {
    stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    await video.play();
    await new Promise((resolve) => window.requestAnimationFrame(
      () => window.requestAnimationFrame(resolve),
    ));

    if (!video.videoWidth || !video.videoHeight) {
      throw new Error('浏览器没有返回可用的屏幕画面。');
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d', { alpha: false });
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await canvasPng(canvas);
    await addFiles([fileFromImageBlob(blob, 'screen')]);
  } catch (error) {
    const message = error && error.name === 'NotAllowedError'
      ? '屏幕截取已取消。'
      : describeError(error);
    setStatus(dom.submitStatus, error && error.name === 'NotAllowedError' ? 'idle' : 'error', message);
  } finally {
    if (stream) stream.getTracks().forEach((track) => track.stop());
    dom.screenBtn.disabled = false;
  }
}

/** @returns {CanvasRenderingContext2D} */
function drawingContext() {
  return dom.drawingCanvas.getContext('2d', { alpha: false });
}

/** @returns {void} */
function clearDrawing() {
  const context = drawingContext();
  context.save();
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, dom.drawingCanvas.width, dom.drawingCanvas.height);
  context.restore();
  drawingState.hasInk = false;
  dom.drawAddBtn.disabled = true;
}

/** @param {'pen'|'eraser'} mode */
function setDrawingMode(mode) {
  drawingState.mode = mode;
  const penActive = mode === 'pen';
  dom.drawPenBtn.classList.toggle('is-active', penActive);
  dom.drawPenBtn.setAttribute('aria-pressed', String(penActive));
  dom.drawEraserBtn.classList.toggle('is-active', !penActive);
  dom.drawEraserBtn.setAttribute('aria-pressed', String(!penActive));
}

/** @param {PointerEvent} event @returns {{x:number,y:number,scale:number}} */
function drawingPoint(event) {
  const rect = dom.drawingCanvas.getBoundingClientRect();
  const scale = dom.drawingCanvas.width / Math.max(rect.width, 1);
  return {
    x: (event.clientX - rect.left) * (dom.drawingCanvas.width / Math.max(rect.width, 1)),
    y: (event.clientY - rect.top) * (dom.drawingCanvas.height / Math.max(rect.height, 1)),
    scale,
  };
}

/** @param {PointerEvent} event */
function beginDrawing(event) {
  if (event.button !== 0 && event.pointerType === 'mouse') return;
  event.preventDefault();
  drawingState.activePointerId = event.pointerId;
  dom.drawingCanvas.setPointerCapture?.(event.pointerId);
  const point = drawingPoint(event);
  const context = drawingContext();
  context.beginPath();
  context.moveTo(point.x, point.y);
  context.lineTo(point.x + 0.01, point.y + 0.01);
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.strokeStyle = drawingState.mode === 'eraser' ? '#ffffff' : '#111318';
  context.lineWidth = Number(dom.drawStrokeWidth.value) * point.scale;
  context.stroke();
  drawingState.hasInk = true;
  dom.drawAddBtn.disabled = false;
}

/** @param {PointerEvent} event */
function continueDrawing(event) {
  if (drawingState.activePointerId !== event.pointerId) return;
  event.preventDefault();
  const point = drawingPoint(event);
  const context = drawingContext();
  const pressure = event.pressure > 0 ? 0.72 + event.pressure * 0.56 : 1;
  context.strokeStyle = drawingState.mode === 'eraser' ? '#ffffff' : '#111318';
  context.lineWidth = Number(dom.drawStrokeWidth.value) * point.scale * pressure;
  context.lineTo(point.x, point.y);
  context.stroke();
}

/** @param {PointerEvent} event */
function endDrawing(event) {
  if (drawingState.activePointerId !== event.pointerId) return;
  drawingState.activePointerId = null;
  drawingContext().closePath();
}

/** @returns {void} */
function openDrawingDialog() {
  if (!drawingState.hasInk) clearDrawing();
  if (typeof dom.drawingDialog.showModal === 'function') dom.drawingDialog.showModal();
  else dom.drawingDialog.setAttribute('open', '');
}

/** @returns {void} */
function closeDrawingDialog() {
  if (typeof dom.drawingDialog.close === 'function') dom.drawingDialog.close();
  else dom.drawingDialog.removeAttribute('open');
}

/** @returns {Promise<void>} */
async function addDrawingImage() {
  if (!drawingState.hasInk) return;
  dom.drawAddBtn.disabled = true;
  try {
    const blob = await canvasPng(dom.drawingCanvas);
    await addFiles([fileFromImageBlob(blob, 'handwriting')]);
    closeDrawingDialog();
    clearDrawing();
  } catch (error) {
    setStatus(dom.submitStatus, 'error', describeError(error));
    dom.drawAddBtn.disabled = false;
  }
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
  return `${label}，${succeeded}/${total} 完成，${failed} 失败`;
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
  dom.resultSummary.textContent = `作业 ${job.id}，共 ${total} 张，成功 ${succeeded}，失败 ${failed}`;
  if (job.error) dom.resultSummary.textContent += `，${job.error.code || ''} ${job.error.message || ''}`;
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
    if (browserNoticeTimer !== null) window.clearTimeout(browserNoticeTimer);
    browserNoticeTimer = null;
    clearStoredConnection();
    state.baseUrl = '';
    state.key = '';
    state.connectionSource = 'manual';
    state.limits = null;
    dom.baseUrl.value = '';
    dom.key.value = '';
    dom.remember.checked = false;
    dom.capabilities.hidden = true;
    dom.browserNotice.hidden = true;
    setStatus(dom.connectStatus, 'idle', '已清除本机保存的连接信息。');
    updateSubmitAvailability();
  });

  dom.useLocalFileBtn.addEventListener('click', () => dom.connectionFileInput.click());
  dom.connectionFileInput.addEventListener('change', async () => {
    const [file] = Array.from(dom.connectionFileInput.files || []);
    dom.connectionFileInput.value = '';
    if (!file) return;
    dom.useLocalFileBtn.disabled = true;
    try {
      await importLocalConnectionFile(file);
    } catch (error) {
      setStatus(dom.connectStatus, 'error', describeError(error));
    } finally {
      dom.useLocalFileBtn.disabled = false;
    }
  });

  dom.baseUrl.addEventListener('input', () => {
    state.connectionSource = 'manual';
    scheduleBrowserNotice();
  });
  dom.baseUrl.addEventListener('change', scheduleBrowserNotice);
  dom.key.addEventListener('input', () => {
    state.connectionSource = 'manual';
  });

  dom.selectFileBtn.addEventListener('click', () => dom.fileInput.click());
  dom.cameraBtn.addEventListener('click', () => dom.cameraInput.click());
  dom.pasteBtn.addEventListener('click', importClipboardImage);
  dom.screenBtn.addEventListener('click', captureScreenImage);
  dom.drawingBtn.addEventListener('click', openDrawingDialog);

  dom.fileInput.addEventListener('change', () => {
    addFiles(dom.fileInput.files);
    dom.fileInput.value = '';
  });
  dom.cameraInput.addEventListener('change', () => {
    addFiles(dom.cameraInput.files);
    dom.cameraInput.value = '';
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
  dom.dropZone.addEventListener('click', () => dom.fileInput.click());
  dom.dropZone.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    dom.fileInput.click();
  });
  document.addEventListener('paste', handleImagePaste);

  dom.drawingCanvas.addEventListener('pointerdown', beginDrawing);
  dom.drawingCanvas.addEventListener('pointermove', continueDrawing);
  dom.drawingCanvas.addEventListener('pointerup', endDrawing);
  dom.drawingCanvas.addEventListener('pointercancel', endDrawing);
  dom.drawingCloseBtn.addEventListener('click', closeDrawingDialog);
  dom.drawPenBtn.addEventListener('click', () => setDrawingMode('pen'));
  dom.drawEraserBtn.addEventListener('click', () => setDrawingMode('eraser'));
  dom.drawClearBtn.addEventListener('click', clearDrawing);
  dom.drawAddBtn.addEventListener('click', addDrawingImage);
  dom.drawingDialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeDrawingDialog();
  });

  dom.submitForm.addEventListener('submit', (event) => {
    event.preventDefault();
    submitJob();
  });

  dom.cancelJobBtn.addEventListener('click', cancelJob);

  dom.connectionPanel.addEventListener('toggle', syncConnectionPanel);

  dom.openConnectionBtn.addEventListener('click', () => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    dom.connection.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' });
    dom.baseUrl.focus({ preventScroll: true });
  });

  dom.openSetupBtn.addEventListener('click', () => {
    dom.connectionPanel.open = true;
    syncConnectionPanel();
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    dom.connectionPanel.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' });
  });

  state.pollAbort = false;
  updateInputCapabilities();
  clearDrawing();
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

/** @returns {void} */
function scheduleBrowserNotice() {
  if (browserNoticeTimer !== null) window.clearTimeout(browserNoticeTimer);
  const baseUrl = normalizeSafe(dom.baseUrl.value);
  if (!baseUrl) {
    dom.browserNotice.hidden = true;
    browserNoticeTimer = null;
    return;
  }
  browserNoticeTimer = window.setTimeout(() => {
    browserNoticeTimer = null;
    updateBrowserNotice(baseUrl);
  }, 180);
}

wire();
