---
name: latexsnipper-manual
description: |
  LaTeXSnipper 官方网站完整维护指南。
  涵盖 Cloudflare Worker 部署、R2 配额管理、OCR 识别引擎、
  下载页、用户手册自动构建、Actions 工作流、主题系统。
  当修改此项目任何文件、排查部署问题、调整配额时使用。
metadata:
  type: project
---

# LaTeXSnipper 官方网站 — 完整项目维护参考

## 代码规范（重要）

- **保持代码结构清晰**：每文件分区块注释，CSS/HTML/JS 各归其位
- **修改后整理**：新增功能归到所属区块，不东插西塞
- **区块命名**：CSS `/* ── 区块名 ── */`，JS `// ═══ 区块名 ═══`
- **public/ ↔ dist/ 同步**：修改 public/ 必须同步到 dist/
- **提交前检查（必做）**：
  - 大括号 `{}` 成对、函数在被调用前定义、HTML 标签闭合
  - `diff public/ocr_demo.html dist/ocr_demo.html` 一致
  - 浅色/深色主题切换正常
- **部署前**：`worker.js` 版本号递增

---

## 项目架构

```
浏览器 → Cloudflare Worker (worker.js)
           ├─ GitHub raw (dist/*) → 静态页面
           ├─ Cloudflare R2 (release/*) → 模型+下载文件
           └─ Cloudflare KV (USAGE_KV) → 配额管理
```

## 每个文件的作用

### 部署与配置

| 文件 | 用途 |
|------|------|
| `worker.js` | Worker 入口：路由、CSP/安全头、反爬虫、限流、R2代理、配额管理、TOTP API |
| `wrangler.toml` | Wrangler 配置：环境变量、KV 绑定、observability |
| `package.json` | npm 包定义和部署脚本 |
| `vite.config.js` | Vite 构建配置（React SPA） |

### 静态页面

| 源文件 | dist 输出 | 用途 |
|--------|---------|------|
| `index.html` | `dist/index.html` | React SPA 主页 |
| `download.html` | `dist/download.html` | 下载页：三平台 + SHA256 |
| `public/ocr_demo.html` | `dist/ocr_demo.html` | OCR Demo：图片/PDF/拍照/手写 |
| `user_manual.html` | `dist/user_manual.html` | 用户手册 |
| `public/error.html` | `dist/error.html` | 错误页模板 |

### 用户手册

| 文件 | 用途 |
|------|------|
| `user_manual.typ` | Typst 源文件（从上游 LaTeXSnipper 仓库同步） |
| `build_manual.py` | Typst → HTML 生成脚本（自定义 tokenizer/parser） |
| `assets/images/*.png` | 手册配图（从上游同步） |

### CI/CD

| 文件 | 用途 |
|------|------|
| `.github/workflows/sync_release.yml` | 同步上游 Release 文件到 R2 + 更新 SHA256 |
| `.github/workflows/build-manual.yml` | 手动触发：同步 .typ → 构建 HTML → 生成 PDF → 上传 R2 → 提交仓库 |
| `.release_state.json` | 记录最新同步的 asset 时间戳 |

---

## Worker.js 关键路由

| 路径 | 处理 |
|------|------|
| `/ping` | JSON 健康检查 |
| `/api/unlock` (POST) | TOTP 验证 (SHA-1, 30s) |
| `/models/*` | R2 模型代理（Referer 检查 + 配额保护） |
| `/dl/*` | 下载代理（R2 配额保护，PDF 超过上限切回仓库 raw 文件） |
| `/*` | GitHub raw 代理 → `dist/{path}` |

### R2 配额管理

- 追踪 B 类操作次数（GET 请求）
- 默认限额 1000 万次/月（R2 免费额度）
- 刷入策略：每 1000 次或超 1 小时且有变化
- 95% → 模型 503 + OCR Demo 黄色横幅
- 98% → 下载链接切换，PDF 回退到仓库 raw 文件

### 缓存策略

| 类型 | max-age | s-maxage |
|------|---------|----------|
| HTML | 0 | 600 (10min) |
| JS/CSS | 0 | 300 (5min) |
| 图片/字体/WASM | 86400 | 604800 (7天) |
| 带hash的资源 | 31536000 | immutable |

---

## 用户手册自动构建

### 手动触发流程

```
Actions → Build User Manual → Run workflow
  → 从上游 LaTeXSnipper 仓库同步 user_manual/ 全部文件
    → build_manual.py 生成 HTML + weasyprint 生成 PDF
      → PDF 上传到 R2（覆盖旧文件）
        → HTML + PDF 提交到仓库 dist/ + release/
```

### 图像处理

- 上游 `.typ` 中 `#image("filename.png")` 引用同目录下的图片
- 构建时从上游下载图片 → 放入 `assets/images/`
- HTML 中 `src` 统一加 `assets/images/` 前缀
- 构建后同步复制到 `dist/assets/images/`

### 已知 Typst 解析问题

- `+` 号在行首被识别为列表标记，`X11 + GPU` 会被截断 → tokenizer 加行首判断
- `#text(weight: "bold")[...]` 需要在预处理阶段展开为 `*...*`
- `#info-block("title", [...])` 转换为自定义 callout div

---

## OCR Demo 详解

### 识别模式

```
[ 公式(蓝紫) | 文字(橙色) | 混合(绿色) ]
```

| 模式 | 行为 | 手写时 |
|------|------|--------|
| 公式 | 仅 MathCraft 公式模型 | 强制混合 |
| 文字 | 仅 PP-OCR 文字模型 | 强制混合 |
| 混合 | 公式→失败→文字降级 | 强制混合 |

### 推理管线

```
图片 → isImageEmpty(动态阈值) → preprocessImage(384×384) → encoder → decoder(greedy,512tokens) → repairLatex → 输出
                                                                                        ↓每8步yield主线程
```

### 安全防护

| 层级 | 检测 | 时机 |
|------|------|------|
| isImageEmpty | 动态阈值 `max(16, range*0.3)` | 推理前 |
| CONFIDENCE_MIN | 平均置信度 < 15% | 推理后 |
| recognizing 锁 | 防重复点击并发 | 推理中 |

---

## 部署检查清单

- [ ] public/ 改动已同步到 dist/
- [ ] worker.js 版本号已递增
- [ ] Cloudflare Dashboard: Secrets `R2_MODEL_BASE`、`CLOUDFLARE_API_TOKEN` 存在
- [ ] KV 绑定在 wrangler.toml 中配置
- [ ] `/ping` 确认服务正常
- [ ] OCR Demo: 图片/PDF/拍照/手写 均可用
- [ ] 主题切换: 浅色↔深色 正常
- [ ] 下载页: `/dl/` 链接正常代理，SHA256 最新
- [ ] 用户手册: HTML + PDF 可访问
