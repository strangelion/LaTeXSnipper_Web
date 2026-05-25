/* ============================================================
   JS 目录
   1. 初始化 & DOM 引用
   2. 状态 & 工具函数
   3. 模型下载与加载
   4. 分词器 & 配置加载
   5. 图像预处理 & 识别 (preprocessImage, recognize)
   6. LaTeX 修复 (repairLatex)
   7. PDF 处理 (processPDF)
   8. 图片处理入口 (processImage)
   9. 手写板 (canvas, tools, crop, recognize)
   10. 相机 (open/close/capture)
   11. 模式切换 (image <-> handwrite)
   12. UI 事件 (drop, paste, copy, theme)
   13. 主题切换
   14. 粒子背景动画
   ============================================================ */
(function() {
  'use strict';

  // ═══════════════════════════════════════════════
  // 1. 初始化 & DOM 引用
  // ═══════════════════════════════════════════════
  const MODEL_BASE = '/models/mathcraft-formula-rec';

  if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
  }

  // -- 状态/进度 DOM --
  const statusIcon = document.getElementById('statusIcon');
  const statusText = document.getElementById('statusText');
  const spinner = document.getElementById('spinner');
  const errorMsg = document.getElementById('errorMsg');
  const progressWrap = document.getElementById('progressWrap');
  const progressFill = document.getElementById('progressFill');
  const progressFile = document.getElementById('progressFile');
  const progressPercent = document.getElementById('progressPercent');

  // -- 图片模式 DOM --
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const preview = document.getElementById('preview');
  const dropContent = document.getElementById('dropContent');

  // -- 结果 DOM --
  const resultCard = document.getElementById('resultCard');
  const resultCode = document.getElementById('resultCode');
  const confidence = document.getElementById('confidence');
  const copyBtn = document.getElementById('copyBtn');
  const mathPreview = document.getElementById('mathPreview');

  // -- 相机 DOM --
  const camModal = document.getElementById('camModal');
  const camVideo = document.getElementById('camVideo');
  const camTrigger = document.getElementById('camTrigger');
  const camCapture = document.getElementById('camCapture');
  const camClose = document.getElementById('camClose');
  let camStream = null;

  // -- 手写板 DOM --
  const tabImage = document.getElementById('tabImage');
  const tabHandwrite = document.getElementById('tabHandwrite');
  const hwPanel = document.getElementById('hwPanel');
  const hwCanvas = document.getElementById('hwCanvas');
  const hwCtx = hwCanvas.getContext('2d');
  const hwPenBtn = document.getElementById('hwPen');
  const hwEraserBtn = document.getElementById('hwEraser');
  let hwTool = 'pen', hwDrawing = false;
  let hwStrokes = [];
  const HW_MAX_STROKES = 60;

  // -- 状态 --
  const ICONS = {
    loading: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    ready: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    processing: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    done: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    error: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
  };
  let encoderSession = null, decoderSession = null, tokenizerVocab = null;
  let decoderStartId = 2, eosId = 2, padId = 0, ready = false;
  let recognizing = false; // 防并发锁

  // ═══════════════════════════════════════════════
  // 2. 状态 & 工具函数
  // ═══════════════════════════════════════════════
  function setStatus(type, text, showSpin) {
    statusIcon.innerHTML = ICONS[type] || ICONS.loading;
    statusText.textContent = text;
    spinner.classList.toggle('show', showSpin);
  }
  function showError(msg) {
    errorMsg.style.display = 'block';
    errorMsg.textContent = msg;
    setStatus('error', '加载失败', false);
  }
  const COOLDOWN_MS = 2000;
  let lastRecognitionTime = 0;

  // ═══════════════════════════════════════════════
  // 3. 模型下载 (Cache API 缓存)
  // ═══════════════════════════════════════════════
  const MODEL_CACHE = 'ocr-models-v1';
  async function downloadWithProgress(url, label) {
    const cache = await caches.open(MODEL_CACHE);
    const cached = await cache.match(url);
    if (cached) {
      const buf = await cached.arrayBuffer();
      setStatus('loading', label + ' (已缓存 ' + (buf.byteLength/1024/1024).toFixed(1) + ' MB)', true);
      await new Promise(function(r) { setTimeout(r, 300); });
      return buf;
    }
    progressWrap.classList.add('show');
    progressFile.textContent = label;
    progressFill.style.width = '0%';
    progressPercent.textContent = '0%';
    const resp = await fetch(url, { cache: 'no-cache' });
    if (!resp.ok) throw new Error('下载失败: ' + url);
    const contentLength = parseInt(resp.headers.get('content-length') || '0', 10);
    const reader = resp.body.getReader();
    const chunks = [];
    let loaded = 0;
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      chunks.push(result.value);
      loaded += result.value.length;
      if (contentLength > 0) {
        var pct = Math.round(loaded / contentLength * 100);
        progressFill.style.width = pct + '%';
        progressPercent.textContent = pct + '%';
        progressFile.textContent = label + ' (' + (loaded/1024/1024).toFixed(1) + ' / ' + (contentLength/1024/1024).toFixed(1) + ' MB)';
      } else {
        progressFile.textContent = label + ' (' + (loaded/1024/1024).toFixed(1) + ' MB)';
      }
    }
    const blob = new Blob(chunks);
    const arrayBuffer = await blob.arrayBuffer();
    progressWrap.classList.remove('show');
    try { await cache.put(url, new Response(arrayBuffer, { headers: { 'Content-Type': 'application/octet-stream', 'Cache-Control': 'max-age=604800' } })); } catch(e) {}
    return arrayBuffer;
  }

  // ═══════════════════════════════════════════════
  // 4. 分词器 & 生成配置
  // ═══════════════════════════════════════════════
  async function loadModels() {
    const encoderBuf = await downloadWithProgress(MODEL_BASE + '/encoder_model.onnx', '编码器模型');
    setStatus('loading', '正在加载编码器到内存…', true);
    encoderSession = await ort.InferenceSession.create(encoderBuf, { executionProviders: ['webgpu', 'wasm'], graphOptimizationLevel: 'all' });

    const decoderBuf = await downloadWithProgress(MODEL_BASE + '/decoder_model.onnx', '解码器模型');
    setStatus('loading', '正在加载解码器到内存…', true);
    decoderSession = await ort.InferenceSession.create(decoderBuf, { executionProviders: ['webgpu', 'wasm'], graphOptimizationLevel: 'all' });
  }

  async function loadTokenizer() {
    setStatus('loading', '正在加载分词器…', true);
    const resp = await fetch(MODEL_BASE + '/tokenizer.json');
    const data = await resp.json();
    const vocab = data.model.vocab;
    tokenizerVocab = {};
    for (const [token, id] of Object.entries(vocab)) { tokenizerVocab[id] = token; }
    try {
      const genResp = await fetch(MODEL_BASE + '/generation_config.json');
      const genData = await genResp.json();
      decoderStartId = genData.decoder_start_token_id || 2;
      eosId = genData.eos_token_id || 2;
      padId = genData.pad_token_id || 0;
    } catch(e) {}
  }

  // ═══════════════════════════════════════════════
  // 5. 图像预处理 & 识别
  // ═══════════════════════════════════════════════
  const IMG_SIZE = 384;
  const CONFIDENCE_MIN = 0.15;

  // 快速检测图片是否有效（参考桌面版 _looks_like_empty_ocr_input）
  function isImageEmpty(img) {
    var canvas = document.createElement('canvas');
    var size = Math.min(384, img.naturalWidth || img.width, img.naturalHeight || img.height);
    canvas.width = size; canvas.height = size;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, size, size);
    var pixels = ctx.getImageData(0, 0, size, size).data;
    var n = size * size, sum = 0;
    for (var i = 0; i < n; i++) { sum += pixels[i * 4]; }
    var mean = sum / n;
    var variance = 0;
    for (var j = 0; j < n; j++) { var d = pixels[j * 4] - mean; variance += d * d; }
    var std = Math.sqrt(variance / n);
    if (std <= 2.5) return true;
    var fg = 0;
    for (var k = 0; k < n; k++) { if (Math.abs(pixels[k * 4] - mean) >= 32) fg++; }
    return (fg / n) < 0.0015;
  }

  function preprocessImage(img) {
    var canvas = document.createElement('canvas');
    canvas.width = IMG_SIZE; canvas.height = IMG_SIZE;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, IMG_SIZE, IMG_SIZE);
    var pixels = ctx.getImageData(0, 0, IMG_SIZE, IMG_SIZE).data;
    var floatData = new Float32Array(3 * IMG_SIZE * IMG_SIZE);
    var hw = IMG_SIZE * IMG_SIZE, scl = 2.0 / 255.0;
    for (var i = 0; i < hw; i++) {
      var p = i * 4;
      floatData[i] = pixels[p] * scl - 1.0;
      floatData[hw + i] = pixels[p + 1] * scl - 1.0;
      floatData[2 * hw + i] = pixels[p + 2] * scl - 1.0;
    }
    return floatData;
  }

  function softmax(arr) {
    var max = Math.max.apply(null, arr);
    var exp = arr.map(function(x) { return Math.exp(x - max); });
    var sum = exp.reduce(function(a, b) { return a + b; }, 0);
    return exp.map(function(x) { return x / sum; });
  }

  function greedyDecode(logits) {
    var probs = softmax(logits);
    var maxIdx = 0, maxVal = probs[0];
    for (var i = 1; i < probs.length; i++) { if (probs[i] > maxVal) { maxVal = probs[i]; maxIdx = i; } }
    return { tokenId: maxIdx, prob: maxVal };
  }

  function decodeTokens(tokenIds) {
    if (!tokenizerVocab) return tokenIds.join(', ');
    var text = '';
    for (var i = 0; i < tokenIds.length; i++) {
      var token = tokenizerVocab[tokenIds[i]];
      if (!token) continue;
      if (token.startsWith('<') && token.endsWith('>')) continue;
      if (token.startsWith('Ġ')) { text += ' ' + token.slice(1); }
      else if (token.startsWith('▁')) { text += ' ' + token.slice(1); }
      else { text += token; }
    }
    return text.trim();
  }

  async function recognize(img) {
    if (!ready) throw new Error('模型尚未就绪');
    if (recognizing) throw new Error('识别进行中，请稍后再试');
    recognizing = true;
    try {
    setStatus('processing', '正在识别…', true);
    errorMsg.style.display = 'none';

    // 空图预检（纯色/无前景 → 直接拒绝，省去推理耗时）
    if (isImageEmpty(img)) return { latex: '', confidence: 0 };

    var pixelValues = preprocessImage(img);
    var inputTensor = new ort.Tensor('float32', pixelValues, [1, 3, 384, 384]);

    var encName = encoderSession.inputNames[0];
    var encOut = await encoderSession.run({ [encName]: inputTensor });
    var hiddenStates = encOut[encoderSession.outputNames[0]];

    var decName0 = decoderSession.inputNames[0], decName1 = decoderSession.inputNames[1];
    var maxTokens = 512;
    var inputIds = new ort.Tensor('int64', BigInt64Array.from([BigInt(decoderStartId)]), [1, 1]);
    var tokenIds = [], tokenProbs = [];

    for (var step = 0; step < maxTokens; step++) {
      // 每 8 步让出主线程，保持页面响应
      if (step % 8 === 0) await new Promise(function(r) { setTimeout(r, 0); });
      var decOut = await decoderSession.run({ [decName0]: inputIds, [decName1]: hiddenStates });
      var logits = decOut[decoderSession.outputNames[0]];
      var seqLen = logits.dims[1], vocabSize = logits.dims[2];
      var offset = (seqLen - 1) * vocabSize;
      var lastLogits = Array.from(logits.data.slice(offset, offset + vocabSize));
      var res = greedyDecode(lastLogits);
      if (res.tokenId === eosId || res.tokenId === padId) break;
      tokenIds.push(res.tokenId);
      tokenProbs.push(res.prob);
      inputIds = new ort.Tensor('int64', BigInt64Array.from([].concat(Array.from(inputIds.data), [BigInt(res.tokenId)])), [1, seqLen + 1]);
    }

    var latex = repairLatex(decodeTokens(tokenIds));
    var avgConf = tokenProbs.length > 0 ? tokenProbs.reduce(function(a, b) { return a + b; }, 0) / tokenProbs.length : 0;
    if (avgConf < CONFIDENCE_MIN) latex = '';
    return { latex: latex, confidence: avgConf };
    } finally { recognizing = false; }
  }

  // ═══════════════════════════════════════════════
  // 6. LaTeX 修复 (参考桌面版 mathcraft_tex_exporter.py)
  // ═══════════════════════════════════════════════
  function repairLatex(tex) {
    var s = tex.replace(/\r\n/g, '\n').trim();
    if (!s) return s;
    // 去末尾孤立反斜杠
    s = s.replace(/(?:\\\\\s*)+$/g, '').trim();
    while (s.endsWith('\\') && !s.endsWith('\\\\')) s = s.slice(0, -1).trim();
    // 去多余 }
    var depth = 0, cleaned = '';
    for (var i = 0; i < s.length; i++) {
      var ch = s[i];
      if (ch === '{') { depth++; cleaned += ch; }
      else if (ch === '}') { if (depth > 0) { depth--; cleaned += ch; } }
      else { cleaned += ch; }
    }
    s = cleaned;
    // 补全 \frac \binom \dfrac \tfrac 缺参数
    var cmdRe = /\\(?:dfrac|tfrac|frac|binom)\b/g, m, edits = [];
    while ((m = cmdRe.exec(s)) !== null) {
      var pos = m.index + m[0].length;
      while (pos < s.length && s[pos] === ' ') pos++;
      if (pos >= s.length || s[pos] !== '{') { edits.push({p: pos, t: ' {} {}'}); continue; }
      var d = 0, end = -1;
      for (var j = pos; j < s.length; j++) {
        if (s[j] === '{') d++; else if (s[j] === '}') { d--; if (d === 0) { end = j + 1; break; } }
      }
      if (end < 0) { edits.push({p: pos, t: ' {}'}); continue; }
      pos = end; while (pos < s.length && s[pos] === ' ') pos++;
      if (pos >= s.length || s[pos] !== '{') edits.push({p: end, t: ' {}'});
    }
    for (var ei = edits.length - 1; ei >= 0; ei--) s = s.slice(0, edits[ei].p) + edits[ei].t + s.slice(edits[ei].p);
    // 补全 \left / \begin 环境
    var leftStack = [], beginStack = [];
    var re2 = /\\(left|right)\b|\\(begin|end)\s*\{([A-Za-z*]+)\s*\}/g, m2;
    while ((m2 = re2.exec(s)) !== null) {
      if (m2[1] === 'left') leftStack.push(m2.index);
      else if (m2[1] === 'right' && leftStack.length) leftStack.pop();
      else if (m2[2] === 'begin') beginStack.push(m2[3]);
      else if (m2[2] === 'end' && beginStack.length) {
        for (var bi = beginStack.length - 1; bi >= 0; bi--) { if (beginStack[bi] === m2[3]) { beginStack.length = bi; break; } }
      }
    }
    var suffix = '';
    while (leftStack.length) { suffix += ' \\right.'; leftStack.pop(); }
    for (var bi2 = beginStack.length - 1; bi2 >= 0; bi2--) { suffix += '\n\\end{' + beginStack[bi2] + '}'; }
    while (depth > 0) { s += '}'; depth--; }
    return (s + suffix).trim();
  }

  // ═══════════════════════════════════════════════
  // 7. PDF 处理
  // ═══════════════════════════════════════════════
  async function processPDF(file) {
    var MAX_PAGES = 100;
    try {
      var arrayBuffer = await file.arrayBuffer();
      var pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      var totalPages = pdf.numPages;
      if (totalPages > MAX_PAGES) { showError('PDF 页数 (' + totalPages + ') 超过 ' + MAX_PAGES + ' 页限制，请分割后重试'); return null; }

      // 首页预览
      try {
        var firstPage = await pdf.getPage(1);
        var pv = firstPage.getViewport({ scale: 0.5 });
        var pvCanvas = document.createElement('canvas');
        pvCanvas.width = pv.width; pvCanvas.height = pv.height;
        await firstPage.render({ canvasContext: pvCanvas.getContext('2d'), viewport: pv }).promise;
        preview.src = pvCanvas.toDataURL();
        preview.style.display = 'block';
        dropContent.style.display = 'none';
      } catch(e) {}

      // 逐页处理: 提取文本 + OCR
      var allResults = [];
      for (var pageNum = 1; pageNum <= totalPages; pageNum++) {
        setStatus('processing', '正在处理第 ' + pageNum + ' / ' + totalPages + ' 页…', true);
        var pct = Math.round((pageNum - 1) / totalPages * 100);
        progressWrap.classList.add('show');
        progressFile.textContent = 'PDF ' + totalPages + ' 页';
        progressFill.style.width = pct + '%';
        progressPercent.textContent = pct + '%';

        var page = await pdf.getPage(pageNum);

        // 自适应分辨率 (目标 768px)
        var baseVp = page.getViewport({ scale: 1.0 });
        var maxDim = Math.max(baseVp.width, baseVp.height);
        var renderScale = Math.max(1.0, Math.min(2.0, 768 / maxDim));
        var viewport = page.getViewport({ scale: renderScale });
        var canvas = document.createElement('canvas');
        canvas.width = viewport.width; canvas.height = viewport.height;

        // 并行: 提取文本 + 渲染
        var textPromise = page.getTextContent().catch(function() { return { items: [] }; });
        var renderPromise = page.render({ canvasContext: canvas.getContext('2d'), viewport: viewport }).promise;
        var textResult = await Promise.all([textPromise, renderPromise]);
        var textContent = textResult[0];

        // 文本按行分组
        var pageText = '';
        var items = textContent.items;
        if (items && items.length) {
          var lineMap = {};
          for (var i = 0; i < items.length; i++) {
            var item = items[i];
            var y = Math.round(item.transform[5] * 10) / 10;
            var key = null, keys = Object.keys(lineMap);
            for (var k = 0; k < keys.length; k++) { if (Math.abs(parseFloat(keys[k]) - y) < 4) { key = keys[k]; break; } }
            if (!key) key = String(y);
            if (!lineMap[key]) lineMap[key] = [];
            lineMap[key].push(item);
          }
          var sortedYs = Object.keys(lineMap).sort(function(a, b) { return parseFloat(b) - parseFloat(a); });
          var lines = [];
          for (var yi = 0; yi < sortedYs.length; yi++) {
            var ly = sortedYs[yi];
            lineMap[ly].sort(function(a, b) { return a.transform[4] - b.transform[4]; });
            var lineText = lineMap[ly].map(function(it) { return it.str; }).join(' ');
            if (lineText.trim()) lines.push(lineText.trim());
          }
          pageText = lines.join('\n');
        }

        // Canvas 直传 OCR (跳过 PNG 编码)
        var formulaLatex = '', formulaConf = 0;
        try { var recResult = await recognize(canvas); formulaLatex = recResult.latex; formulaConf = recResult.confidence; }
        catch(e) { formulaLatex = '% [Error] ' + (e.message || e); }
        allResults.push({ page: pageNum, text: pageText, latex: formulaLatex, confidence: formulaConf });
      }
      progressWrap.classList.remove('show');
      if (allResults.length === 0) { showError('PDF 识别失败：未能提取内容'); return null; }

      // 合并输出
      var combined = allResults.map(function(r) {
        var parts = ['% === Page ' + r.page + ' ==='];
        if (r.text) { parts.push('% --- Text ---'); parts.push(r.text); }
        if (r.latex && r.latex.trim()) { parts.push('% --- Formulas ---'); parts.push(r.latex); }
        return parts.join('\n');
      }).join('\n\n');
      var avgConf = allResults.reduce(function(s, r) { return s + r.confidence; }, 0) / allResults.length;
      return { latex: combined, confidence: avgConf, pageCount: totalPages };
    } catch(e) { showError('PDF 处理失败: ' + (e.message || e)); return null; }
  }

  // ═══════════════════════════════════════════════
  // 8. 图片处理入口 (图片 / PDF / 相机 / 手写)
  // ═══════════════════════════════════════════════
  async function processImage(file) {
    if (!ready) { showError('模型尚未加载完成，请稍等'); return; }

    var now = Date.now();
    if (now - lastRecognitionTime < COOLDOWN_MS) {
      showError('请等待 ' + Math.ceil((COOLDOWN_MS - (now - lastRecognitionTime)) / 1000) + ' 秒后再识别');
      return;
    }
    if (file.size < 1024) { showError('文件太小，请上传至少 1KB 的文件'); return; }

    // PDF 分流
    if (file.type === 'application/pdf') {
      resultCard.classList.remove('show'); errorMsg.style.display = 'none';
      setStatus('processing', '正在解析 PDF…', true);
      var pdfResult = await processPDF(file);
      if (!pdfResult) return;
      lastRecognitionTime = Date.now();
      resultCode.textContent = pdfResult.latex;
      renderMathPreview(pdfResult.latex);
      confidence.textContent = '置信度 ' + (pdfResult.confidence * 100).toFixed(1) + '% | ' + pdfResult.pageCount + ' 页';
      resultCard.classList.add('show'); copyBtn.style.display = 'block';
      setStatus('done', '识别完成（' + pdfResult.pageCount + ' 页）', false);
      return;
    }

    // 图片: 预览 → 识别
    var url = URL.createObjectURL(file);
    preview.src = url;
    preview.style.display = 'block';
    dropContent.style.display = 'none';
    resultCard.classList.remove('show'); errorMsg.style.display = 'none';
    setStatus('processing', '正在识别…', true);

    var img = new Image();
    img.onload = async function() {
      try {
        var result = await recognize(img);
        lastRecognitionTime = Date.now();
        if (!result.latex) {
          showError('未识别到公式（置信度 ' + (result.confidence * 100).toFixed(1) + '% 过低）。请确保图片中有清晰的公式。');
          setStatus('ready', '模型就绪！请重新上传公式图片', false);
          return;
        }
        resultCode.textContent = result.latex;
        renderMathPreview(result.latex);
        confidence.textContent = '置信度 ' + (result.confidence * 100).toFixed(1) + '%';
        resultCard.classList.add('show'); copyBtn.style.display = 'block';
        setStatus('done', '识别完成', false);
      } catch(e) { showError('识别失败: ' + (e.message || e)); setStatus('ready', '模型就绪！拖入公式图片开始识别', false); }
    };
    img.src = url;
  }

  // ═══════════════════════════════════════════════
  // 9. 手写板
  // ═══════════════════════════════════════════════
  function hwPenColor() { return document.documentElement.getAttribute('data-theme') === 'dark' ? '#e2e8f0' : '#1e293b'; }

  function hwSaveState() {
    hwStrokes.push(hwCtx.getImageData(0, 0, hwCanvas.width, hwCanvas.height));
    if (hwStrokes.length > HW_MAX_STROKES) hwStrokes.shift();
  }

  function hwSetTool(tool) { hwTool = tool; hwPenBtn.classList.toggle('active', tool === 'pen'); hwEraserBtn.classList.toggle('active', tool === 'eraser'); }

  function hwGetPos(e) {
    var rect = hwCanvas.getBoundingClientRect();
    var scaleX = hwCanvas.width / rect.width, scaleY = hwCanvas.height / rect.height;
    var cx = e.touches ? e.touches[0].clientX : e.clientX;
    var cy = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (cx - rect.left) * scaleX, y: (cy - rect.top) * scaleY };
  }

  hwCanvas.addEventListener('mousedown', function(e) { hwSaveState(); hwDrawing = true; var p = hwGetPos(e); hwCtx.beginPath(); hwCtx.moveTo(p.x, p.y); e.preventDefault(); });
  hwCanvas.addEventListener('touchstart', function(e) { hwSaveState(); hwDrawing = true; var p = hwGetPos(e); hwCtx.beginPath(); hwCtx.moveTo(p.x, p.y); e.preventDefault(); });

  function hwDraw(p) {
    if (hwTool === 'eraser') { hwCtx.globalCompositeOperation = 'destination-out'; hwCtx.strokeStyle = 'rgba(0,0,0,1)'; hwCtx.lineWidth = 24; }
    else { hwCtx.globalCompositeOperation = 'source-over'; hwCtx.strokeStyle = hwPenColor(); hwCtx.lineWidth = 3; }
    hwCtx.lineCap = 'round'; hwCtx.lineJoin = 'round';
    hwCtx.lineTo(p.x, p.y); hwCtx.stroke();
    hwCtx.beginPath(); hwCtx.moveTo(p.x, p.y);
  }
  hwCanvas.addEventListener('mousemove', function(e) { if (!hwDrawing) return; hwDraw(hwGetPos(e)); });
  hwCanvas.addEventListener('touchmove', function(e) { if (!hwDrawing) return; hwDraw(hwGetPos(e)); e.preventDefault(); });
  ['mouseup','touchend','mouseleave'].forEach(function(ev) { hwCanvas.addEventListener(ev, function() { hwDrawing = false; }); });

  function hwUndo() { if (hwStrokes.length > 0) hwCtx.putImageData(hwStrokes.pop(), 0, 0); }
  function hwClear() { hwSaveState(); hwCtx.clearRect(0, 0, hwCanvas.width, hwCanvas.height); }

  function hwGetContentBounds() {
    var data = hwCtx.getImageData(0, 0, hwCanvas.width, hwCanvas.height).data;
    var minX = hwCanvas.width, minY = hwCanvas.height, maxX = 0, maxY = 0;
    for (var y = 0; y < hwCanvas.height; y++) {
      for (var x = 0; x < hwCanvas.width; x++) {
        var alpha = data[(y * hwCanvas.width + x) * 4 + 3];
        if (alpha > 0) { if (x < minX) minX = x; if (y < minY) minY = y; if (x > maxX) maxX = x; if (y > maxY) maxY = y; }
      }
    }
    if (minX > maxX) return null;
    var pad = 20;
    return { x: Math.max(0, minX - pad), y: Math.max(0, minY - pad), w: Math.min(hwCanvas.width, maxX - minX + pad * 2), h: Math.min(hwCanvas.height, maxY - minY + pad * 2) };
  }

  function hwRecognize() {
    if (!ready) { showError('模型尚未加载完成，请稍等'); return; }
    var bounds = hwGetContentBounds();
    var sx = bounds ? bounds.x : 0, sy = bounds ? bounds.y : 0, sw = bounds ? bounds.w : hwCanvas.width, sh = bounds ? bounds.h : hwCanvas.height;
    var tmp = document.createElement('canvas'); tmp.width = sw; tmp.height = sh;
    var tctx = tmp.getContext('2d');
    tctx.fillStyle = '#ffffff'; tctx.fillRect(0, 0, sw, sh);
    tctx.drawImage(hwCanvas, sx, sy, sw, sh, 0, 0, sw, sh);
    tmp.toBlob(function(blob) { processImage(new File([blob], 'handwrite.png', { type: 'image/png' })); }, 'image/png');
  }

  // 自由拖拽缩放画布（右下角手柄）
  var hwWrap = document.getElementById('hwWrap');
  var hwResizeHandle = document.getElementById('hwResizeHandle');
  var hwResizing = false, hwRX, hwRY, hwRW, hwRH;

  hwResizeHandle.addEventListener('mousedown', function(e) { e.preventDefault(); e.stopPropagation(); hwResizing = true; hwRX = e.clientX; hwRY = e.clientY; hwRW = hwCanvas.offsetWidth; hwRH = hwCanvas.offsetHeight; });
  hwResizeHandle.addEventListener('touchstart', function(e) { e.preventDefault(); e.stopPropagation(); hwResizing = true; hwRX = e.touches[0].clientX; hwRY = e.touches[0].clientY; hwRW = hwCanvas.offsetWidth; hwRH = hwCanvas.offsetHeight; });
  document.addEventListener('mousemove', function(e) { if (!hwResizing) return; hwCanvas.style.width = Math.max(280, hwRW + e.clientX - hwRX) + 'px'; hwCanvas.style.height = Math.max(200, hwRH + e.clientY - hwRY) + 'px'; });
  document.addEventListener('touchmove', function(e) { if (!hwResizing) return; hwCanvas.style.width = Math.max(280, hwRW + e.touches[0].clientX - hwRX) + 'px'; hwCanvas.style.height = Math.max(200, hwRH + e.touches[0].clientY - hwRY) + 'px'; }, { passive: false });
  document.addEventListener('mouseup', function() { hwResizing = false; });
  document.addEventListener('touchend', function() { hwResizing = false; });

  // MathJax SVG 渲染
  function renderMathPreview(latex) {
    if (!latex || typeof MathJax === 'undefined' || !MathJax.tex2svgPromise) { mathPreview.classList.remove('show'); return; }
    var tex = latex.replace(/\n/g, ' ').trim();
    if (!tex) { mathPreview.classList.remove('show'); return; }
    MathJax.tex2svgPromise(tex).then(function(node) {
      mathPreview.innerHTML = ''; mathPreview.appendChild(node); mathPreview.classList.add('show');
    }).catch(function() { mathPreview.classList.remove('show'); });
  }

  hwPenBtn.addEventListener('click', function() { hwSetTool('pen'); });
  hwEraserBtn.addEventListener('click', function() { hwSetTool('eraser'); });
  document.getElementById('hwUndo').addEventListener('click', hwUndo);
  document.getElementById('hwClear').addEventListener('click', hwClear);
  document.getElementById('hwRecognize').addEventListener('click', hwRecognize);

  // ═══════════════════════════════════════════════
  // 10. 相机
  // ═══════════════════════════════════════════════
  async function openCamera(e) { if (e) { e.preventDefault(); e.stopPropagation(); }
    try { camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } }); camVideo.srcObject = camStream; camModal.classList.add('show'); }
    catch(e) { showError('无法访问摄像头：' + (e.message || e) + '。请确认已授予相机权限。'); }
  }
  function closeCamera() { if (camStream) { camStream.getTracks().forEach(function(t) { t.stop(); }); camStream = null; } camVideo.srcObject = null; camModal.classList.remove('show'); }
  function capturePhoto() { if (!camStream) return;
    var canvas = document.createElement('canvas'); canvas.width = camVideo.videoWidth; canvas.height = camVideo.videoHeight;
    canvas.getContext('2d').drawImage(camVideo, 0, 0); closeCamera();
    canvas.toBlob(function(blob) { processImage(new File([blob], 'camera.jpg', { type: 'image/jpeg' })); }, 'image/jpeg', 0.92);
  }
  camTrigger.addEventListener('click', openCamera);
  camCapture.addEventListener('click', capturePhoto);
  camClose.addEventListener('click', closeCamera);
  camModal.addEventListener('click', function(e) { if (e.target === camModal) closeCamera(); });
  document.addEventListener('keydown', function(e) { if (e.key === 'Escape' && camModal.classList.contains('show')) closeCamera(); });
  document.addEventListener('visibilitychange', function() { if (document.hidden && camStream) closeCamera(); });

  // ═══════════════════════════════════════════════
  // 11. 模式切换
  // ═══════════════════════════════════════════════
  function switchMode(mode) {
    if (mode === 'handwrite') { tabImage.classList.remove('active'); tabHandwrite.classList.add('active'); dropZone.style.display = 'none'; hwPanel.classList.add('show'); hwStrokes = []; }
    else { tabHandwrite.classList.remove('active'); tabImage.classList.add('active'); dropZone.style.display = ''; hwPanel.classList.remove('show'); }
  }
  tabImage.addEventListener('click', function() { switchMode('image'); });
  tabHandwrite.addEventListener('click', function() { switchMode('handwrite'); });

  // ═══════════════════════════════════════════════
  // 12. UI 事件 (drop, paste, copy)
  // ═══════════════════════════════════════════════
  dropZone.addEventListener('click', function(e) { if (e.target.closest('#camTrigger')) return; fileInput.click(); });
  dropZone.addEventListener('dragover', function(e) { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', function() { dropZone.classList.remove('drag-over'); });
  dropZone.addEventListener('drop', function(e) { e.preventDefault(); dropZone.classList.remove('drag-over'); var f = e.dataTransfer.files[0]; if (f && (f.type.startsWith('image/') || f.type === 'application/pdf')) processImage(f); });
  fileInput.addEventListener('change', function(e) { var f = e.target.files[0]; if (f) processImage(f); });
  document.addEventListener('paste', function(e) { var items = e.clipboardData && e.clipboardData.items; if (!items) return;
    for (var i = 0; i < items.length; i++) { if (items[i].type.startsWith('image/')) { e.preventDefault(); var f = items[i].getAsFile(); if (f) processImage(f); return; } }
  });
  window.copyResult = function() { navigator.clipboard.writeText('$$\n' + resultCode.textContent + '\n$$').then(function() { copyBtn.textContent = '已复制 ✓'; copyBtn.classList.add('copied'); setTimeout(function() { copyBtn.textContent = '复制 LaTeX 代码'; copyBtn.classList.remove('copied'); }, 1500); }); };

  // ═══════════════════════════════════════════════
  // 13. 主题切换
  // ═══════════════════════════════════════════════
  var themeBtn = document.getElementById('themeToggle');
  themeBtn.addEventListener('click', function() {
    var root = document.documentElement;
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('latexSnipper-theme', next); } catch(e) {}
    updateThemeBtn(next); updateHwTheme(next);
  });
  function updateThemeBtn(theme) {
    var sun = '<svg class="theme-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
    var moon = '<svg class="theme-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
    themeBtn.innerHTML = theme === 'dark' ? sun + '<span class="theme-label">白天</span>' : moon + '<span class="theme-label">黑夜</span>';
  }
  function updateHwTheme(theme) {
    var wrap = document.querySelector('.hw-canvas-wrap');
    if (wrap) {
      wrap.style.backgroundColor = theme === 'dark' ? '#1e293b' : '#ffffff';
      wrap.style.backgroundImage = theme === 'dark'
        ? 'linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)'
        : 'linear-gradient(rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.06) 1px, transparent 1px)';
      wrap.style.backgroundSize = '20px 20px';
    }
    document.documentElement.style.backgroundColor = theme === 'dark' ? '#0f111a' : '#f8fafc';
  }
  (function() { var isDark = document.documentElement.getAttribute('data-theme') === 'dark'; updateThemeBtn(isDark ? 'dark' : 'light'); updateHwTheme(isDark ? 'dark' : 'light'); })();

  // ═══════════════════════════════════════════════
  // 启动
  // ═══════════════════════════════════════════════
  async function init() {
    try {
      if (typeof ort === 'undefined') {
        showError('ONNX Runtime 加载失败。请检查网络连接，刷新页面重试（Ctrl+F5）。如使用广告拦截器，请将本站加入白名单。');
        setStatus('error', 'CDN 加载失败', false);
        return;
      }
      ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.21.0/dist/';
      if (crossOriginIsolated) { ort.env.wasm.numThreads = Math.min(navigator.hardwareConcurrency || 4, 4); ort.env.wasm.simd = true; }
      else { ort.env.wasm.numThreads = 1; }
      setStatus('loading', '正在加载分词器…', true); await loadTokenizer();
      setStatus('loading', '正在下载编码器模型 (84MB)…', true); await loadModels();
      ready = true;
      setStatus('ready', '模型就绪！拖入公式图片或 Ctrl+V 粘贴截图', false);
    } catch(e) { if (!errorMsg.style.display || errorMsg.style.display === 'none') showError('初始化失败: ' + (e.message || e)); }
  }

  init();

})();
