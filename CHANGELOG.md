# 更新日志

## [1.2.0] — 2026-05-24

### ✨ 新增

- **美观的错误页面**：Worker 中 400/404/405 错误不再显示纯文本，改为完整的中文 HTML 错误页面，包含渐变色错误码、中文描述、导航按钮和可展开的调试信息区，自动适配深色/浅色模式
- **gzip / brotli 压缩**：Worker 对所有文本类响应（HTML、CSS、JS、SVG）启用动态压缩，优先使用 brotli，回退 gzip

### ⚡ 性能优化

- **图片外置**：`user_manual.html` 中的图片从 base64 内联改为独立文件引用 + 懒加载（`loading="lazy"` + `decoding="async"`），HTML 体积从 3.66 MB 降至 ~90 KB（40 倍），gzip 后约 20 KB

### 🗑️ 移除

- 删除 `wasm/` 目录下的 Typst WASM 二进制文件（~28 MB），减小仓库体积
- 删除 `public/manual.html`、`js/all-in-one-lite.bundle.js` 等冗余静态文件
- 删除 `src/utils/typstParser.js`、`src/components/TypstEditor.*` 未使用组件

### 🔧 其他

- 新增 `scripts/copy-assets.cjs` 构建后复制脚本，替代 `package.json` 中的内联单行命令
- 更新 `vite.config.js`、`package.json`、`sync_manual.py` 等构建配置

## [1.1.0] — 2026-05-22

### ✨ 新增

- **PPT 式水平轮播**：功能卡片区域从纵向滚动改为左右滑动翻看，支持箭头按钮、圆点导航、键盘方向键（← →）
- **无限循环**：首尾相连，第 9 页点「下一页」回到第 1 页，第 1 页点「上一页」跳至第 9 页
- **鼠标拖拽滑动**：桌面端支持鼠标长按左右拖拽切换卡片，`grab`/`grabbing` 光标提示
- **圆点图标**：轮播底部导航圆点加入对应功能的小型 SVG 图标
- **卡片详情翻转**：每张卡片支持「了解更多 →」展开详情、「← 返回」收起

### 🎨 优化

- **数学背景性能**：棋盘格图案使用离屏 canvas 缓存，避免每帧数千次 `fillRect` 调用
- **背景渲染流畅度**：恢复 `ctx.save()`/`ctx.restore()` 防止 canvas 状态泄漏导致的闪烁；使用半像素坐标 `Math.round(x*2)/2` 保持平滑移动
- **动态公式**：降低数值切换频率，减少视觉干扰
- **主题切换**：暗色/亮色切换时自动重建背景缓存
- **section 间距**：压缩各分区滚动高度，减少页面空白区域

### 🔧 其他

- 侧边导航栏（SectionIndicator）精简为「首页 → 功能介绍 → 结尾」三项
- 构建系统已更新，`npm run build` 生成完整 `dist/`
