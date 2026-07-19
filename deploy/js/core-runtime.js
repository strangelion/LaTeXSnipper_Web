const DEFAULT_MODULE_URL = '/core-wasm/latexsnipper_wasm.js';
const DEFAULT_BUILD_INFO_URL = '/core-wasm/core-build.json';

let runtimePromise = null;

export class CoreRuntimeError extends Error {
  constructor(message, { code = 'CORE_RUNTIME_ERROR', cause, details } = {}) {
    super(message, { cause });
    this.name = 'CoreRuntimeError';
    this.code = code;
    this.details = details;
  }
}

export function parseCoreEnvelope(value) {
  let payload = value;
  if (typeof value === 'string') {
    try {
      payload = JSON.parse(value);
    } catch (cause) {
      throw new CoreRuntimeError('Core 返回了无法解析的 JSON', {
        code: 'INVALID_CORE_RESPONSE',
        cause,
      });
    }
  }

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new CoreRuntimeError('Core 返回了无效响应', {
      code: 'INVALID_CORE_RESPONSE',
    });
  }

  if (payload.ok !== true) {
    throw new CoreRuntimeError(
      payload.error?.message || 'Core 调用失败',
      {
        code: payload.error?.code || 'CORE_CALL_FAILED',
        details: payload.error || payload,
      },
    );
  }

  return payload;
}

function assertRuntimeCompatibility(apiEnvelope, buildInfo) {
  const api = parseCoreEnvelope(apiEnvelope);
  const versions = api.versions || {};
  const data = api.data || {};

  const actualApi = data.wasmApiVersion ?? versions.apiEnvelopeVersion;
  const actualCore = data.coreVersion ?? versions.coreVersion;
  const actualDocument =
    data.documentSchemaVersion ?? versions.documentSchemaVersion;

  if (actualApi !== buildInfo.wasmApiVersion) {
    throw new CoreRuntimeError(
      `Core WASM API 版本不匹配：预期 ${buildInfo.wasmApiVersion}，实际 ${actualApi}`,
      { code: 'CORE_API_VERSION_MISMATCH' },
    );
  }
  if (actualCore !== buildInfo.coreVersion) {
    throw new CoreRuntimeError(
      `Core 版本不匹配：预期 ${buildInfo.coreVersion}，实际 ${actualCore}`,
      { code: 'CORE_VERSION_MISMATCH' },
    );
  }
  if (actualDocument !== buildInfo.documentSchemaVersion) {
    throw new CoreRuntimeError(
      `Core Document Schema 不匹配：预期 ${buildInfo.documentSchemaVersion}，实际 ${actualDocument}`,
      { code: 'CORE_SCHEMA_VERSION_MISMATCH' },
    );
  }

  return api;
}

async function fetchJson(url, label) {
  const response = await fetch(url, { cache: 'no-cache' });
  if (!response.ok) {
    throw new CoreRuntimeError(`${label}加载失败：HTTP ${response.status}`, {
      code: 'CORE_METADATA_FAILED',
    });
  }
  return response.json();
}

export async function loadCoreRuntime({
  moduleUrl = DEFAULT_MODULE_URL,
  buildInfoUrl = DEFAULT_BUILD_INFO_URL,
} = {}) {
  const isDefaultRequest =
    moduleUrl === DEFAULT_MODULE_URL &&
    buildInfoUrl === DEFAULT_BUILD_INFO_URL;

  if (isDefaultRequest && runtimePromise) return runtimePromise;

  const load = (async () => {
    const buildInfo = await fetchJson(buildInfoUrl, 'Core 构建信息');

    let module;
    try {
      module = await import(moduleUrl);
    } catch (cause) {
      throw new CoreRuntimeError('无法加载 LaTeXSnipper Core WASM 模块', {
        code: 'CORE_IMPORT_FAILED',
        cause,
      });
    }

    try {
      await module.default();
    } catch (cause) {
      throw new CoreRuntimeError('LaTeXSnipper Core WASM 初始化失败', {
        code: 'CORE_INIT_FAILED',
        cause,
      });
    }

    if (module.health_check() !== 'ok') {
      throw new CoreRuntimeError('Core 健康检查失败', {
        code: 'CORE_HEALTH_FAILED',
      });
    }

    const api = assertRuntimeCompatibility(module.api_info_v3(), buildInfo);
    const capabilitiesEnvelope = parseCoreEnvelope(module.capabilities_v3());

    return {
      module,
      api,
      capabilities: capabilitiesEnvelope.data,
      buildInfo,
      version: module.version(),
    };
  })();

  if (isDefaultRequest) {
    runtimePromise = load.catch((error) => {
      runtimePromise = null;
      throw error;
    });
    return runtimePromise;
  }
  return load;
}

export function resetCoreRuntime() {
  runtimePromise = null;
}

export function availableCoreFormats(runtime) {
  return (runtime.capabilities?.exports || [])
    .filter((entry) => entry.available && !entry.binary)
    .map((entry) => entry.format);
}

function asFormulaDocumentSource(latex) {
  const source = String(latex || '').trim();
  if (!source) throw new TypeError('LaTeX 内容不能为空');
  if (
    source.startsWith('$') ||
    source.startsWith('\\(') ||
    source.startsWith('\\[')
  ) {
    return source;
  }
  return `$${source}$`;
}

export async function convertLatex(latex, format) {
  const runtime = await loadCoreRuntime();
  const formats = availableCoreFormats(runtime);
  if (!formats.includes(format)) {
    throw new RangeError(`当前 Core WASM 不支持格式：${format}`);
  }

  let documentValue;
  try {
    documentValue = runtime.module.parse_latex(asFormulaDocumentSource(latex));
  } catch (cause) {
    throw new CoreRuntimeError('Core 无法解析 OCR 结果', {
      code: 'CORE_PARSE_FAILED',
      cause,
    });
  }

  return parseCoreEnvelope(
    runtime.module.convert_v3(JSON.stringify(documentValue), format),
  ).data;
}

export async function convertDocument(documentValue, format) {
  const runtime = await loadCoreRuntime();
  const formats = availableCoreFormats(runtime);
  if (!formats.includes(format)) {
    throw new RangeError(`当前 Core WASM 不支持格式：${format}`);
  }
  if (!documentValue || typeof documentValue !== 'object') {
    throw new TypeError('Core Document 不能为空');
  }
  return parseCoreEnvelope(
    runtime.module.convert_v3(JSON.stringify(documentValue), format),
  ).data;
}

export async function chooseOcrRuntime(mode) {
  try {
    const runtime = await loadCoreRuntime();
    const profile = (runtime.capabilities?.recognition || [])
      .find((entry) => entry.profile === mode);
    if (profile?.ready === true) {
      return { kind: 'core-wasm', runtime };
    }
  } catch {
    // P0 keeps ORT OCR independent when Core conversion is unavailable.
  }
  return { kind: 'ort-web', runtime: null };
}
