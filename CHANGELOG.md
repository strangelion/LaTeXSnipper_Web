# 更新日志

## [1.5.0] — 2026-05-25

### ✨ 新增

- **PDF 上传识别**：OCR Demo 支持 PDF 上传（最多 100 页），PDF.js 渲染 + 逐页 OCR
- **相机拍照识别**：`getUserMedia` 调用后置摄像头，拍照直接送 OCR
- **手写识别模式**：Canvas 手写板，笔/橡皮/撤销/清空，方格底纹跟随主题
- **MathJax SVG 预览**：识别结果以 SVG 数学公式渲染，替代纯文本 LaTeX
- **R2 配额管理系统**：追踪 B 类操作次数，95% 限制模型下载，98% 下载链接切 GitHub
- **页面访问统计**：Worker 端按月份/路径记录 PV，`/ping` 端点可查
- **COOP/COEP 响应头**：启用 SharedArrayBuffer，ONNX 多线程 + SIMD 加速
- **下载链接加密**：`/dl/` 代理路径替代 R2 直链，R2 域名通过 Secret 注入

### 🎨 优化

- **LaTeX 自动修复**：OCR 结果自动修复括号、分式、环境、left-right 配对
- **解码上限 256→512 tokens**：匹配模型 generation_config
- **ONNX WebGPU 优先**：Chrome/Edge 使用 GPU 推理，WASM 兜底
- **PDF 自适应渲染**：目标 768px 分辨率，Canvas 直传 OCR 跳过编码往返
- **手写板内容裁剪**：识别前自动裁剪空白边距，提高识别准确率
- **手写板主题跟随**：JS 直接设 style 绕过 CSS 重绘延迟
- **代码整理**：CSS/HTML/JS 全文件分区，14 个区块各带目录标题

### 🔧 修复

- CSP `script-src` / `connect-src` 添加 `blob:` 允许 ONNX 动态模块加载
- PDF blob URL 改用 `arrayBuffer()` 绕过 CSP
- KV 配额数据每次操作/每 1 小时有变化即刷入，防止部署丢失
- Actions SHA256 替换用 `\g<1>` 避免十六进制冲突
- Actions 工作流同时更新 `download.html` 和 `dist/download.html`
- Actions 减少到每天一次 + API 校验防止空状态文件
- 拍照按钮 `stopPropagation` 防止冒泡触发文件选择器
- 主题切换粒子背景重建、手写板方格即时切换
- 移除每日 20 次客户端限制（模型缓存后识别零 R2 开销）

### ⚠️ 安全

- `R2_MODEL_BASE` 移至 Cloudflare Dashboard Secret
- CSP 放行 `blob:` / `wasm-unsafe-eval` / `cdn.jsdelivr.net`
- `.gitignore` 移除 `dist/` 排除规则，全量跟踪构建产物

## [1.3.0] — 2026-05-24

### ✨ 新增

- **可拖动浮动箭头**：用户手册页面新增圆形浮动箭头按钮，可拖拽至屏幕左右两侧自动吸附，点按打开对应侧目录，位置自动记忆（localStorage）
- **目录外部点击关闭**：目录打开时点击页面任意位置自动关闭
- **鼠标靠边展开**：鼠标移至屏幕左/右边缘自动展开对应侧目录
- **robots.txt**：新增爬虫规则文件，允许主流搜索引擎，屏蔽 AI 爬虫（GPTBot、CCBot、Anthropic-AI、Google-Extended 等）
- **Worker 反爬虫检测**：拦截恶意 UA（漏洞扫描器、数据抓取脚本、curl/wget 等），空 UA / 过短 UA 拒绝，IP 频率限制（5 秒窗口 120 请求）

### 🎨 优化

- **用户手册侧边栏大改**：
  - 目录标题与叉号 sticky 固定，不随目录滚动，标题居中对称
  - 叉号绝对定位在内侧（左栏在右，右栏在左），方便单手点击
  - 目录列表独立滚动，header 带毛玻璃背景
- **轮播卡片窄屏修复**：移动端弃用 `scale()`（避免布局盒子残留导致偏移），改用 `max-width` + `clamp()` 动态约束卡片宽度，间距和字体联动缩放
- **用户手册内容更新**：合并最新版 `user_manual.typ`（v2.4.0 LTS），同步软件最新功能说明

## [1.2.0] — 2026-05-24

### ✨ 新增

- **美观的错误页面**：Worker 中 400/404/405 错误不再显示纯文本，改为完整的中文 HTML 错误页面，包含渐变色错误码、中文描述、导航按钮和可展开的调试信息区，自动适配深色/浅色模式
- **gzip / brotli 压缩**：Worker 对所有文本类响应（HTML、CSS、JS、SVG）启用动态压缩，优先使用 brotli，回退 gzip
- **简单防护**：Worker 中增加对常见攻击方式的简单防护

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

## [1.0.0] — 2026-05-21

### ✨ 初始版本

- **项目初始化**：Vite + React 技术栈，Cloudflare Workers 部署，从 GitHub 仓库拉取静态文件
- **首页**：Hero 区域 + 9 张功能卡片（截取识别、数学工作台、手写识别、自动排版、多格式导出、本地模型、外部模型、多平台、双语 PDF 翻译）+ Ending 区域
- **下载页**：Windows / Linux / macOS 三平台下载卡片，SHA256 一键复制
- **用户手册页**：Typst 源码通过 `build_manual.py` 编译为独立 HTML，包含完整目录导航、代码块复制、日夜模式切换
- **Worker 安全**：路径白名单校验、安全头（CSP、X-Frame-Options 等）、CORS 支持
- **数学粒子背景**：Canvas 渲染数学符号和公式浮动粒子，鼠标/触屏交互跟随
- **主题切换**：手动切换 + 系统偏好自动检测，暗色/亮色双主题
- **响应式适配**：桌面端 / 平板 / 手机三档断点适配
- **预览分支部署**：Cloudflare Workers 分支预览环境，注入橙色预览横幅
- **GitHub 源文件服务**：Worker 从 GitHub Raw 动态拉取文件，CDN 缓存策略（HTML 短期 / 静态资源长期）
