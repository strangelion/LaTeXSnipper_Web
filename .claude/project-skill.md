---
name: latexsnipper-web
description: LaTeXSnipper Web 项目结构、构建、OCR、Release 与 Cloudflare Worker 维护说明。
metadata:
  type: project
---

# LaTeXSnipper Web 维护参考

## 不可破坏的边界

- `core.lock.json` 锁定 Core Release、commit 与 SHA-256；禁止改成自动拉取 latest。
- 浏览器 OCR 继续使用独立 `public/ocr.html` 与 `public/js/ocr.js`，不要为视觉
  重构迁入 React 首页 bundle。
- Core WASM、Core OCR Worker、ONNX Runtime fallback、PDF.js、MathJax、模型
  缓存、粘贴、摄像头、手写和 PDF 流程必须保留。
- 旧的 Website Office.js taskpane、manifest 与静态资产已经退役，禁止恢复
  `public/office/*`、`dist/office/*` 或 `/office/*` Worker 路由；Desktop VSTO
  Office 能力和独立 Office 生态项目不受此项影响。
- `/models/*`、`/dl/*`、KV 配额与 R2 代理属于 Worker 路由，不是静态页逻辑。

## 真实构建链

```text
npm run build
  -> prepare:web
  -> Vite (src + index.html -> dist)
  -> build:manual (独立静态页、手册、共享资源 -> dist)
  -> assemble (dist + public -> deploy)
```

Wrangler 使用 `worker.js`，Static Assets 根目录为 `deploy/`。不要手工同步
`public/` 与 `dist/`，也不要恢复从 GitHub Raw 拉取普通静态页面的旧架构。

## 下载与固定 Tag 替换

`public/release-manifest.json` 是下载 UI 的唯一事实来源。同步 Action 监控固定
Tag 下 asset 的 `updated_at`，因此相同版本文件被替换时仍会重新同步。
manifest 必须在所有下载、SHA-256 校验和 R2 上传成功后再原子更新。

## Worker 路由和安全

- `env.ASSETS.fetch()`：普通页面与 OCR 静态 runtime。
- `/models/core/*`：Core Release 模型 allowlist。
- `/models/*`、`/dl/*`：流式代理、Range/ETag 与配额管理。
- `/api/unlock`：只验证 TOTP，不等于管理会话。
- CSP 按普通站点与 OCR 分级；普通 HTML 不使用全局 `*` CORS。
- isolate 内 Map 限流只是补充，分布式限制应配置 Cloudflare WAF/Rate Limiting。

## 修改后验证

```bash
npm test
npm run validate:release
npm run build
npx wrangler deploy --env production --dry-run
```

同时在浏览器检查 `/`、`/download.html`、`/ocr.html` 与
`/user_manual.html`，确认控制台无新增错误并验证移动端布局与键盘焦点。
