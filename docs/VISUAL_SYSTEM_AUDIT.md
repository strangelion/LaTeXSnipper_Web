# LaTeXSnipper Web 视觉系统审计

审计日期：2026-07-20

## 审计范围

本轮审计覆盖首页 React 入口、下载页、在线 OCR、Typst 用户手册源文件与 HTML 转换器，以及全站已有样式、主题和构建链路。业务逻辑（OCR/Core/ONNX、PDF、MathJax、相机、手写、release manifest、下载、设备检测、R2、Worker、Cloudflare 路由）不在视觉重构范围内。

## 当前样式所有权

| 文件 | 当前职责 | 主要问题 | 迁移目标 |
| --- | --- | --- | --- |
| `src/styles/tokens.css` | 首页 `--ls-*` 颜色与字体 token | 只覆盖 React 首页，静态页无法直接复用 | 兼容入口，转由 `styles/site-tokens.css` 提供唯一 token |
| `src/styles/landing.css` | 首页布局、Header、按钮、Liquid Glass、响应式 | 混合页面布局与共享组件，玻璃实现无法被其他页面安全复用 | 只保留首页专属布局，通用 Header/按钮/玻璃迁出 |
| `styles/styles.css` | 旧静态页全局 reset、背景、导航、下载、手册 | 同一文件存在多次 `:root`，`--max-w` 等变量互相覆盖；暗色背景和深蓝卡片层级过重 | 仅保留兼容导入，页面样式进入独立文件 |
| `styles/product-shell.css` | 静态页二次覆盖、Header、下载、OCR、手册、玻璃 | 739 行混合多个页面；再次定义 token；与 `styles/styles.css`、`editorial.css` 产生级联竞争 | 变成共享视觉兼容入口，主要导入新系统 |
| `styles/editorial.css` | 排版，同时覆盖 Header、下载、OCR、手册侧栏 | 职责越界并再次定义全局 token | 只负责文章排版、标题、正文、表格、代码和 callout 节奏 |
| `download.html` 内联 CSS | 下载卡片、平台图标、Hero、响应式 | 大块内联样式、粒子脚本、三套 CSS 叠加；卡片密度与对齐不一致 | 外移到 `styles/download.css`，保留 manifest/设备检测/复制逻辑 |
| `public/ocr.html` 内联 CSS | OCR 工作区、状态、上传、相机、手写、结果 | 紫色旧视觉、硬编码颜色、功能区层级不清；移动端拥挤 | 外移到 `styles/ocr.css`，保持全部 ID 和 JS hook |
| `build_manual.py` | Typst 解析、目录构建、HTML shell、侧栏/主题脚本 | Shell 与解析器耦合；生成巨量内联 CSS；Header/主题重复实现 | 仅调整 HTML shell 与资源引用；解析函数保持不变；样式进入 `styles/manual.css` |
| `user_manual.typ` | 四卷手册的唯一内容源 | 内容量大但不是视觉问题 | 不修改内容与语法 |
| `user_manual.html` | `build_manual.py` 生成产物 | 内联 CSS、旧 Header、重复主题脚本 | 只由转换脚本重新生成，不手工编辑 |
| `js/product-shell.js` | 静态页玻璃指针高光 | 只处理 pointer，主题和移动导航散落在各页 | 统一静态页主题、Header、移动菜单、滚动状态和玻璃轻交互 |
| `scripts/copy-assets.cjs` | Vite 构建后复制非入口静态资产 | 新 CSS 不会自动进入 `dist/` | 明确加入全部共享与页面 CSS |
| `scripts/assemble-deploy.mjs` | 合并并校验最终 `deploy/` | 尚未校验新视觉资源 | 增加共享 CSS 与页面 CSS 的产物校验 |

## 级联冲突与视觉根因

1. `styles/styles.css`、`styles/editorial.css`、`styles/product-shell.css` 都声明全局 token，并以不同语义复用 `--bg`、`--surface`、`--muted`、`--border-color`。
2. 下载页和 OCR 页先加载旧全局样式，再加载大块内联样式，最后由 editorial/product-shell 覆盖；页面实际效果依赖加载顺序而非明确组件所有权。
3. 首页的 Liquid Glass 有折射高光、边缘光、指针高光和层级深度，静态页只有模糊背景或单层渐变，造成“同品牌、不同材质”。
4. Header 在 React、静态页和手册生成器中分别实现；移动菜单尺寸、主题按钮、滚动态和导航文案不一致。
5. 手册的左右侧栏、浮动箭头和顶栏都使用高 `z-index`，同时侧栏 CSS 内联在 HTML 中，难以保证和 Header、OCR 弹窗的统一层级。
6. 下载卡片对每个平台都使用大盒子，推荐态依靠边框和深蓝渐变，而不是通过信息密度和材质层级建立主次。
7. OCR 工作区仍使用旧黑紫主题，状态条、runtime、模式切换、上传区和结果区各自成盒，缺乏一个明确的工作台容器。

## 统一后的文件职责

| 文件 | 唯一职责 |
| --- | --- |
| `styles/site-tokens.css` | 色彩、字体、间距、圆角、阴影、层级与兼容变量 |
| `styles/liquid-glass.css` | Liquid Glass 材质、光学层、指针高光、降级和 reduced-motion |
| `styles/site-shell.css` | 全站 reset、页面背景、共享 Header、按钮、Footer、移动导航 |
| `styles/download.css` | 下载页 Hero、推荐卡、平台列表、版本信息、安装说明 |
| `styles/ocr.css` | 在线 OCR 工作台、上传/手写/相机/结果区域及其响应式 |
| `styles/manual.css` | 手册三栏 shell、目录侧栏、浮动控制、移动阅读布局 |
| `styles/editorial.css` | 文章正文、标题、列表、表格、代码块、图片和 callout 排版 |
| `styles/product-shell.css` | 旧入口兼容层，仅导入共享系统 |

## 迁移原则

- 主题只使用 `latexSnipper-theme`，`data-theme="light|dark"` 是唯一显式状态。
- 默认跟随系统；用户选择后跨首页、下载、OCR、手册共享。
- Liquid Glass 只用于 Header、主 CTA、推荐下载、浮动控制和少量关键面板；普通内容使用低对比 surface，避免全站玻璃化。
- 页面背景、普通表面、抬升表面和品牌强调保持四级层次；品牌蓝只用于交互与推荐状态。
- SVG 作为主要图标表达，不使用 Unicode 字符充当核心图标。
- 所有页面以 390px 宽度为最低移动端验证基线，禁止横向溢出。
- `build_manual.py` 的 Typst tokeniser、parser、TOC 与图片路径转换不修改；仅更新生成 shell、外部样式引用和交互装配。
- `user_manual.typ` 不修改；`user_manual.html` 每次由脚本重新生成。

## 明确禁止改动的功能边界

- 下载页：release manifest 请求、asset 选择、R2 URL、SHA256、设备检测与 fallback。
- OCR：Core WASM、ONNX fallback、模型缓存、PDF、MathJax、相机裁剪、手写画布、复制与下载。
- 基础设施：Worker 路由、Cloudflare Static Assets、Wrangler、R2 和 deploy 目录结构。
- 手册：Typst 内容、解析规则、章节 ID、目录提取和图片重写规则。

## 验收基线

- 页面：Homepage、Download、OCR、Manual。
- 视口：1920×1080 dark、1440×900 dark、390×844 dark、1440×900 light。
- 自动验证：`npm ci`、`npm test`、`python build_manual.py`、`npm run build`。
- 产物验证：`dist/` 与 `deploy/` 必须包含全部新 CSS、静态页、手册和 OCR 脚本；不得出现横向滚动或未加载样式闪烁。
