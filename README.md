# LaTeXSnipper Web

LaTeXSnipper 数学软件生态官网，包含 React/Vite 首页、Desktop 下载中心、
浏览器单公式 OCR 与用户手册。生产环境运行在
Cloudflare Worker + Static Assets 上。

## 本地开发

```bash
npm ci
npm run dev
```

`prepare:web` 会校验 `latexsnipper-core` 子模块锁定提交、准备经 SHA-256
校验的 Core Release WASM，并复制自托管 ONNX Runtime、PDF.js、MathJax 和
fflate 运行时文件。

## 构建与验证

```bash
npm test
npm run validate:release
npm run build
npx wrangler deploy --dry-run --env=""
```

构建路径：

```text
src/ + index.html -> Vite -> dist/
download.html + public/ + manual + styles/assets -> dist/
dist/ + public/ -> scripts/assemble-deploy.mjs -> deploy/
ecosystem-worker.js -> worker.js + ecosystem metadata -> Cloudflare Worker
[assets].directory = "deploy" -> Cloudflare Static Assets
```

最终部署目录是 `deploy/`，不是 `dist/`。`scripts/assemble-deploy.mjs` 会验证
OCR、Core WASM、自托管运行时以及 Release Manifest 必需资产。

## Release 同步

`public/release-manifest.json` 是下载中心唯一事实来源。定时 Action 读取固定
Tag 中每个声明资产的 `updated_at`；即使 Tag 和版本号不变，只要作者替换了
Release 文件，也会重新下载、计算 SHA-256、上传 R2，并在全部成功后原子更新
manifest。`download.html` 不保存可直接使用的 Desktop 文件链接或校验值。
页面只在系统判断可靠且架构不冲突时显示推荐；无法确认 CPU 架构或没有兼容
资产时会明确提示，而不会默认推荐 Windows。

`public/old-versions.json` 是下载页版本切换器的旧版数据。同步 Action 在覆盖
manifest 之前运行 `scripts/record-archived-release.mjs`，把即将被顶掉的版本
（含已上传 R2 的 `href`、`sha256`、`size`）追加到该文件顶部，并只保留最新
的 3 条归档，与页面的 `MAX_ARCHIVED_VERSIONS`（见 `js/download-versions.js`）
一致，因此该文件不会无限增长，也不需要人工在每次发布时补条目。切换器最多
渲染最新版加 3 个归档版本。`/dl/` 只保留有限的归档文件：清理 R2 旧对象时，
应手动删除 `old-versions.json` 中对应条目，否则下载链接会 404；条目引用的
资产在 manifest 中缺失时页面会隐藏对应卡片，而不是保留失效链接。

## 品牌人物素材

Hero 使用 `/assets/brand/snipper-girl.webp` 及 640/960 宽度的 `srcset`
透明素材。当前版本由提供的绿幕立绘通过确定性色键处理得到，没有生成式重绘；
禁止把完整海报裁切进 Hero，或使用带文案、信息框和背景的合成图替换该素材。

## Cloudflare 部署

```bash
npm run deploy
npm run deploy:preview
npm run deploy:branch -- <branch>
```

非敏感变量放在 `wrangler.toml`。Token、TOTP secret、R2 私有配置等敏感值
必须通过 Cloudflare Secrets 配置，禁止写入仓库。

## 关键路由

- `/`：React 首页
- `/download.html`：manifest 驱动的下载中心
- `/ocr.html`：浏览器单公式 OCR 与 Core/ORT runtime
- `/user_manual.html`：生成式用户手册
- `/models/*`：模型流式代理与配额保护
- `/dl/*`：Release 文件流式代理与配额保护
- `/ping`：Worker 服务健康检查

更多工程说明见 `docs/`。

## 许可证

本 Web 仓库使用 MIT License。Desktop、Core、Office、Mobile 各自使用其仓库
声明的 GPL-3.0 或 AGPL-3.0，不能将 Web 许可证扩展为整个生态的许可证。
