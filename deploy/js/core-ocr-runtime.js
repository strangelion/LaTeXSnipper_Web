export class CoreOcrError extends Error {
  constructor(message, code = 'CORE_OCR_ERROR', details) {
    super(message);
    this.name = 'CoreOcrError';
    this.code = code;
    this.details = details;
  }
}

export class CoreOcrRuntime {
  constructor({ workerUrl = '/js/core-ocr-worker.js' } = {}) {
    this.worker = new Worker(workerUrl, { type: 'module' });
    this.sequence = 0;
    this.pending = new Map();
    this.worker.onmessage = (event) => this.handleMessage(event.data);
    this.worker.onerror = (event) => {
      console.error('[Core OCR Worker fatal]', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
      });
      this.failAll(
        new CoreOcrError(
          event.message || 'Core OCR Worker 启动失败',
          'CORE_OCR_WORKER_CRASH',
          {
            filename: event.filename || null,
            lineno: event.lineno || null,
            colno: event.colno || null,
            error: event.error?.stack || event.error?.message || null,
          },
        ),
      );
    };
    this.worker.onmessageerror = (event) => {
      console.error('[Core OCR Worker message error]', event);
    };
    this.readyPromise = this.call('initialize');
  }

  ready() {
    return this.readyPromise;
  }

  prepareFormulaModels(onProgress) {
    return this.call('prepare-profile', {}, onProgress, 300_000);
  }

  recognize({ width, height, pixels, mode = 'formula' }, onProgress) {
    if (!(pixels instanceof Uint8Array || pixels instanceof Uint8ClampedArray)) {
      throw new TypeError('pixels 必须是 RGBA Uint8Array');
    }
    if (pixels.byteLength !== width * height * 4) {
      throw new RangeError('RGBA 像素长度与图像尺寸不匹配');
    }
    return this.call('recognize', {
      width,
      height,
      pixels: new Uint8Array(pixels),
      mode,
    }, onProgress, 300_000);
  }

  terminate() {
    this.worker.terminate();
    this.failAll(new CoreOcrError('Core OCR Worker 已终止', 'CORE_OCR_TERMINATED'));
  }

  call(type, payload = {}, onProgress, timeout = 30_000) {
    const id = `core-ocr:${++this.sequence}`;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new CoreOcrError(`Core OCR 操作超时：${type}`, 'CORE_OCR_TIMEOUT'));
      }, timeout);
      this.pending.set(id, { resolve, reject, onProgress, timer });
      this.worker.postMessage({ id, type, ...payload });
    });
  }

  handleMessage(message) {
    const call = this.pending.get(message.id);
    if (!call) return;
    if (message.type === 'progress') {
      call.onProgress?.(message);
      return;
    }
    clearTimeout(call.timer);
    this.pending.delete(message.id);
    if (message.type === 'error') {
      call.reject(new CoreOcrError(
        message.error?.message || 'Core OCR 调用失败',
        message.error?.code,
        message.error?.details,
      ));
      return;
    }
    call.resolve(message.data);
  }

  failAll(error) {
    for (const call of this.pending.values()) {
      clearTimeout(call.timer);
      call.reject(error);
    }
    this.pending.clear();
  }
}

let runtimePromise;

export function loadCoreOcrRuntime() {
  if (!runtimePromise) {
    const runtime = new CoreOcrRuntime();
    runtimePromise = runtime.ready().then(() => runtime).catch((error) => {
      runtime.terminate();
      runtimePromise = undefined;
      throw error;
    });
  }
  return runtimePromise;
}
