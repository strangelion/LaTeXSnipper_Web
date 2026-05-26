---
name: latexsnipper-manual
description: |
  LaTeXSnipper 用户手册项目完整维护指南。
  包含每个文件的用途、架构、部署流程、R2 配额系统、OCR Demo 功能、主题系统、已知问题和修复方案。
  当需要修改此项目任何文件、排查部署问题、调整配额、或理解项目结构时使用。
metadata:
  type: project
---

# LaTeXSnipper 用户手册 — 完整项目文件地图

## 代码规范（重要）
- **保持代码结构清晰**：每个文件分区块注释，CSS/JS/HTML 各归其位
- **修改后整理**：新增功能不要东插一段西塞一段，归到所属区块
- **区块命名**：用 `/* ── 区块名 ── */` 风格标注 CSS 分区，用 `// ═══ 区块名 ═══` 标注 JS 分区
- **public/ 与 dist/ 同步**：修改 `public/` 下任何文件必须同步到 `dist/`
- **download.html 与 dist/download.html 同步**
- **提交前检查（必做！）**：
  - 代码是否清晰可维护，注释是否齐全
  - **大括号 {} 是否成对**：增删代码后检查周围的 `{}`，删除函数/代码块时确保不留孤儿括号
  - **函数是否在被调用前定义**：IIFE 内部函数在外部不可用
  - **HTML 标签是否闭合**：`<script>` `</script>` 不能嵌套和重复
  - **public/ 和 dist/ 文件内容一致**：`diff public/ocr_demo.html dist/ocr_demo.html`
  - **主题切换测试**：浅色↔深色背景和组件颜色是否跟随
- **避免技术债务**：不要留下临时方案，每个修改都要考虑长期维护

---

## 一、项目架构

```
浏览器 ──→ Cloudflare Worker (worker.js)
              ├─→ GitHub raw.githubusercontent.com/strangelion/LaTeXSnipper_user_manual/{branch}/dist/*
              │    提供静态页面（HTML/CSS/JS/图片）
              ├─→ Cloudflare R2 (release.interknot.dpdns.org)
              │    提供模型文件 (/models/*) 和发布二进制 (/dl/* 代理)
              └─→ Cloudflare KV (USAGE_KV)
                    持久化 R2 配额 B 类操作计数
```

---

## 二、每个文件的作用

### 部署与配置

| 文件 | 作用 | 修改频率 |
|------|------|----------|
| `worker.js` | **项目核心**。Cloudflare Worker 入口：路由分发、CSP/安全头、反爬虫、频率限制、`/models/*` 和 `/dl/*` R2 代理、`/api/unlock` TOTP 验证、`/ping` 健康检查、R2 配额管理、压缩、错误页面 | 高 |
| `wrangler.toml` | Wrangler 部署配置：Worker 名称、兼容日期、环境变量、KV 命名空间绑定、observability 设置 | 中 |
| `package.json` | npm 包定义和部署脚本 (`npm run deploy` 等) | 低 |
| `package-lock.json` | 依赖锁文件 | 低 |
| `vite.config.js` | Vite 构建配置（用于 React SPA 主页） | 低 |
| `.gitignore` | Git 忽略规则 | 低 |
| `.gitattributes` | Git 换行符处理 | 低 |

### 静态页面（源文件 → 构建输出）

| 源文件 | 构建输出 | 用途 |
|--------|----------|------|
| `index.html` | `dist/index.html` | React SPA 主页入口 |
| `download.html` | `dist/download.html` | 下载页面：Windows/Linux/macOS 下载链接 + SHA256 校验 |
| `public/ocr_demo.html` | `dist/ocr_demo.html` | **OCR Demo**：图片/PDF/拍照/手写识别，ONNX 浏览器端推理 |
| `public/error.html` | `dist/error.html` | 错误页面模板（Worker 也内置了一个更完整的错误页） |
| `user_manual.html` | `dist/user_manual.html` | 用户手册 HTML |
| `user_manual.typ` | `dist/user_manual.typ` | 用户手册 Typst 源码 |
| `public/robots.txt` | `dist/robots.txt` | 爬虫规则 |

**规则：修改 `public/` 下的文件必须同步到 `dist/`，修改 `download.html` 必须同步到 `dist/download.html`。**

### React SPA 主页

| 文件 | 作用 |
|------|------|
| `src/main.jsx` | React 入口 |
| `src/App.jsx` | React 根组件 |
| `src/App.css` | 全局 App 样式 |
| `src/index.css` | 全局基础样式 |
| `src/components/Header.jsx` | 顶栏导航 |
| `src/components/HeroSection.jsx` | 首屏区 |
| `src/components/CardCarousel.jsx` | 卡片轮播 |
| `src/components/CardSlide.jsx` | 单张卡片 |
| `src/components/EndingSection.jsx` | 页面底部区 |
| `src/components/SectionIndicator.jsx` | 节指示器 |
| `src/components/ScrollProgress.jsx` | 滚动进度条 |
| `src/components/BackToTop.jsx` | 回到顶部按钮 |
| `src/components/MathBackground.jsx` | 数学粒子背景（React 版） |

### 共享样式与脚本

| 文件 | 作用 |
|------|------|
| `styles/styles.css` | **全局主题样式**：CSS 变量 (`--bg`, `--fg`, `--accent` 等)、浅色/深色主题、响应式布局、通用组件样式。被所有 HTML 页面引用 |
| `js/script.js` | 共享脚本（主题持久化等） |

### 字体

| 文件 | 作用 |
|------|------|
| `fonts/NotoSansCJKsc-Regular.otf` | 无衬线中文字体 |
| `fonts/NotoSerifCJKsc-Regular.otf` | 衬线中文字体 |

### 图片资源

| 文件 | 位置 | 用途 |
|------|------|------|
| `icon.png` | `public/` `dist/` `assets/images/` | 网站图标 |
| `LaTeXSnipper.png` | `public/images/` `dist/images/` `assets/images/` | Logo |
| `mathcraft_*.png` | `assets/images/` `dist/assets/images/` | 功能展示截图 |

### 构建脚本

| 文件 | 作用 |
|------|------|
| `scripts/copy-assets.cjs` | 构建后处理：复制静态资源到 `dist/`，注入主题脚本到 HTML |
| `build_manual.py` | 用户手册构建脚本（Typst → PDF/HTML） |

### 视频演示资源

| 文件 | 用途 |
|------|------|
| `video_assets/scan_demo.html` | 截图演示页 |
| `video_assets/totp.html` | TOTP 验证演示 |
| `video_assets/video_presenter.html` | 视频演示播放器 |
| `video_assets/video_script.md` | 视频脚本 |

### CI/CD

| 文件 | 作用 |
|------|------|
| `.github/workflows/sync_release.yml` | **GitHub Actions**：每 12h 检查上游 `SakuraMathcraft/LaTeXSnipper` Release v2.3.2。下载二进制到 R2，计算 SHA256，更新 `download.html` 和 `dist/download.html` |
| `.release_state.json` | Actions 状态文件：记录上次同步时间戳 |

### IDE 配置

| 文件 | 作用 |
|------|------|
| `.idea/project-skill.md` | **本文件**：项目完整参考 |
| `.vscode/tasks.json` | VS Code 任务配置 |
| `tinymist.lock` | Typst LSP (Tinymist) 锁文件 |

### 文档

| 文件 | 作用 |
|------|------|
| `README.md` | 项目说明 |
| `CHANGELOG.md` | 变更日志 |
| `LICENSE` | 许可证 |

---

## 三、Cloudflare Worker 详解 (worker.js)

### 全局常量
```
GITHUB_OWNER = "strangelion"
GITHUB_REPO = "LaTeXSnipper_user_manual"
ALLOWED_EXTENSIONS / BLOCKED_PATH_PATTERNS — 路径安全白名单
```

### 中间件链（按请求处理顺序）
1. **反爬虫** (`isBadBot`) — UA 黑名单，空/过短 UA 拒绝
2. **频率限制** (`isRateLimited`) — 每 IP 5秒窗口内最多 120 次请求
3. **定期清理** (`cleanupRateLimit`) — 每 500 次请求清理过期条目
4. **安全头** (`securityHeaders`) — CSP, COOP, COEP, X-Frame 等
5. **压缩** (`compressResponse`) — gzip/brotli 文本响应

### 路由表
| 路径 | 方法 | 处理函数 | 说明 |
|------|------|----------|------|
| `/ping` | GET | `jsonResponse({status, kv, quota})` | 健康检查 + KV 诊断 + 配额百分比 |
| `/api/unlock` | POST | `verifyTOTP(secret, token)` | TOTP 6 位数字验证码 (SHA-1, 30s, ±1 窗口) |
| `/models/*` | GET | R2 代理 | Referer 检查 + 配额检查 (≥95%→503) + B 类操作计数 |
| `/dl/*` | GET | R2 代理 | 配额阻断 (≥98%→302 GitHub Releases) + B 类操作计数 |
| `/*` | GET | GitHub raw 代理 | 取 `dist/{path}`，带缓存、安全头、预览分支横幅 |

### CSP 策略（仅 HTML 响应）
```
default-src 'self'
script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https://cdn.jsdelivr.net blob:
style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net
img-src 'self' data: blob: https:
font-src 'self'
connect-src 'self' https: blob:
worker-src 'self' blob:
frame-ancestors 'none'
base-uri 'self'
form-action 'none'
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: credentialless
```

### R2 配额管理（核心函数）
```
quotaGetMonth()              → "YYYY-MM"
quotaLoadFromKV(env)         → 从 KV 读取当月 ops 数
quotaSaveToKV(env, ops)      → 写入 KV，50天 TTL
quotaEnsureLoaded(env)       → 冷启动 / 月初时从 KV 加载
quotaGetStatus(env)          → {opsUsed, limitOps, pctUsed, isWarn, isBlock}
quotaTrackOp(env, ctx)       → ops+1，条件刷入 KV
quotaBanner(type, pct)       → HTML 横幅（warn=黄, block=红）
```

### 刷入策略
- 每 1000 次操作 → 批量刷入
- 超过 1 小时 + 有变化 → 兜底刷入
- 无变化 → 跳过（不浪费 KV 写入）
- 月初自动归零

### 配额阈值
- 默认限额：10,000,000 次/月 (R2 免费 B 类操作)
- 95% → 模型下载 503，OCR Demo 页黄色横幅
- 98% → 下载链接切 GitHub Releases，红色横幅
- 可通过 Secret `QUOTA_LIMIT_OPS` 自定义

### 页面变换（HTML 注入）
- `dist/download.html` → 95%阶段不变，98%阶段替换 `/dl/` → GitHub + 横幅
- `dist/ocr_demo.html` → 95%阶段注入黄色横幅

---

## 四、OCR Demo 详解 (public/ocr_demo.html → dist/ocr_demo.html)

### 依赖加载顺序
1. `styles/styles.css` — 全局主题
2. 内联 `<style>` — 页面专属样式
3. `onnxruntime-web@1.21.0` CDN — ONNX 推理引擎
4. `pdfjs-dist@3.11.174` CDN — PDF 渲染

### 模型加载
1. 配置 WASM 路径 + 线程检测 (`crossOriginIsolated`)
2. 分词器 (`tokenizer.json`) + 生成配置 (`generation_config.json`)
3. 编码器 (`encoder_model.onnx`, 84MB) — Cache API 缓存
4. 解码器 (`decoder_model.onnx`, 29MB) — Cache API 缓存
5. 推理后端：`['webgpu', 'wasm']` 优先 GPU

### 页面结构
```
mode-tabs (图片识别 | 手写识别)
├── 图片识别模式 → dropZone (拖拽/点击/粘贴) + 拍照按钮 + 相机 modal
└── 手写识别模式 → hwPanel (Canvas 画板 + 工具栏)
status-bar → 模型状态 / 识别进度
progress-wrap → 下载/处理进度条
result-card → LaTeX 识别结果 + 复制按钮
error-msg → 错误提示
info-note → 说明文字
```

### 图像预处理 (preprocessImage)
- 缩放到 384×384
- 归一化：pixel/255 × 2 - 1 → [-1, 1]
- 输出：Float32Array [1, 3, 384, 384]

### 识别管线 (recognize)
1. 预处理图像 → ONNX Tensor
2. 编码器 forward → hiddenStates
3. 贪婪解码循环 (max 256 tokens)：解码器 forward → softmax → argmax
4. Token ID → LaTeX 文本 (tokenizerVocab 解码)
5. 返回 {latex, confidence}

### PDF 处理 (processPDF)
1. `file.arrayBuffer()` → `pdfjsLib.getDocument({data})` (不使用 blob URL)
2. 检查页数 ≤ 100
3. 逐页：`getTextContent()` (文本提取) + 渲染为图片 (自适应分辨率 768px)
4. Canvas 直传 `recognize()` (跳过 toBlob/URL/Image)
5. 输出：`% === Page N ===` 分隔，文本和公式分区

### 相机 (openCamera / capturePhoto / closeCamera)
- `getUserMedia({video: {facingMode: 'environment'}})` 后置摄像头
- 全屏 modal 预览 → 拍照 → Canvas → Blob → File → `processImage()`
- `e.stopPropagation()` 防冒泡到 drop-zone
- 点遮罩 / Esc / visibilitychange → `closeCamera()`

### 手写板
- Canvas 800×500 内部分辨率，CSS `width:100%` 自适应
- 画布透明 → CSS 方格底纹透过（识别时加白底导出）
- `hwPenColor()` 动态取色：浅色 `#1e293b`，深色 `#e2e8f0`
- 橡皮：`globalCompositeOperation='destination-out'` 真正擦除
- 撤销：`hwStrokes[]` 存 ImageData，最多 60 步
- `hwRecognize()`: 临时 Canvas 白底 → drawImage → toBlob → `processImage()`

### 主题切换修复
- `updateHwTheme(theme)` → 直接设 `style.backgroundColor` + `style.backgroundImage`（JS 绕过 CSS 重绘延迟）
- `window.dispatchEvent(new Event('resize'))` → 触发粒子背景 `checkerCache=null` 重建

### 性能优化汇总
- 自适应 PDF 渲染分辨率 (目标 768px, 范围 1.0x-2.0x)
- Canvas 直传 OCR (跳过 PNG 编码 + blob URL + Image 解码)
- 文本提取与渲染并行 (`Promise.all`)
- WebGPU 优先 + `crossOriginIsolated` → 4线程 + SIMD
- 无客户端每日限制（模型缓存后识别零 R2 开销）

---

## 五、下载页详解 (download.html → dist/download.html)

### 下载链接格式
- 源码：`/dl/LaTeXSnipperSetup-2.3.2.exe`（不暴露 R2 域名）
- Worker 代理到 R2：`R2_MODEL_BASE + "/" + path.slice(4)`
- 98% 阈值时 Worker 替换为 `https://github.com/SakuraMathcraft/LaTeXSnipper/releases`

### SHA256 同步机制
- GitHub Actions `sync_release.yml` 每 12h 运行
- 下载上游 Release 二进制 → 上传 R2 → 计算 SHA256
- 更新 `download.html` **和** `dist/download.html` 的 `data-sha256` 属性
- 正则用 `\g<1>` (非 `\1`) 避免十六进制冲突

### 代码规范
- 下载链接用 `/dl/` 代理路径，不含 R2 域名
- 不包含 `<link rel="preconnect">` 到 R2

---

## 六、已知 Bug 及修复方案

| 问题 | 根因 | 修复 |
|------|------|------|
| KV 绑定部署后丢失 | Dashboard 绑定被 `wrangler deploy` 覆盖 | `wrangler.toml` 配置 `[[kv_namespaces]]`（顶层+生产环境） |
| 配额计数部署后清零 | `flushStep=1000` 未达标不写 KV | 加 1 小时兜底 + 有变化才写 |
| CSP 阻止 blob: URL | `script-src` / `connect-src` 缺 `blob:` | CSP 添加 `blob:` |
| ONNX `ConstantOfShape` 失败 | WebGL 后端不支持 opset 11 | 改用 `['webgpu', 'wasm']` |
| ONNX `detached ArrayBuffer` | 无 COOP/COEP 时多线程失败 | `crossOriginIsolated` 判断 + Worker 加 COOP/COEP 头 |
| ONNX WASM 超时 | Firefox 多线程无 SharedArrayBuffer | 单线程降级 |
| Actions SHA256 正则报错 | `\1` + 十六进制数字 = 非法组引用 | `\1` → `\g<1>` |
| 下载页 SHA256 不同步到 dist | 工作流只更新根目录 | 同时处理 `download.html` 和 `dist/download.html` |
| 拍照按钮触发文件选择器 | 事件冒泡到 drop-zone | `stopPropagation()` + drop-zone click 排除 `#camTrigger` |
| 主题切换背景不跟随 | 粒子背景 `checkerCache` 只缓存一次 | `updateHwTheme` 中 dispatch `resize` 事件 |
| 手写板主题背景不切换 | CSS `[data-theme]` 选择器重绘延迟 | JS 直接设 `style.backgroundColor` |
| PDF blob URL 被 CSP 拦截 | `connect-src` 缺 `blob:` + PDF.js 内部创建 blob URL | `arrayBuffer()` 替代 `createObjectURL()` |

---

## 七、部署检查清单

- [ ] `public/` 改动已同步到 `dist/`
- [ ] `download.html` 改动已同步到 `dist/download.html`
- [ ] `worker.js` 版本号已递增
- [ ] Cloudflare Dashboard Secrets: `R2_MODEL_BASE` 存在
- [ ] Cloudflare Dashboard KV 绑定: `USAGE_KV` → namespace `1afdc87d24624a80aa99722ebf7e1ec6`
- [ ] `wrangler.toml` 中 `[[kv_namespaces]]` 配置正确
- [ ] 部署后访问 `/ping` 确认 `kv.bound: true` 和版本号正确
- [ ] 部署后访问 `/ping` 确认 `quota.opsUsed` 累计正常
- [ ] OCR Demo 测试：图片/PDF/拍照/手写 均正常
- [ ] 主题切换测试：浅色↔深色背景和手写板颜色跟随
- [ ] 下载页测试：`/dl/` 链接正常代理，SHA256 为最新值
