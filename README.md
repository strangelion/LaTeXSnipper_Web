# LaTeXSnipper 官方网站

LaTeXSnipper 的官方网站，包含产品主页、下载页、OCR 公式识别 Demo 和用户手册，部署于 Cloudflare Workers。

## 功能特性

### 主页 (`index.html`)
- React 组件化架构，Vite 构建
- 9 张功能卡片 PPT 式水平轮播，无限循环，支持键盘/鼠标拖拽
- 数学符号粒子背景（Canvas），鼠标跟随交互
- 暗色/亮色主题切换，跟随系统偏好
- 响应式设计，桌面端 / 平板 / 手机三档适配

### OCR 公式识别 Demo (`ocr_demo.html`)
- **浏览器端 ONNX Runtime 推理**，图片全程不上传
- 支持 图片拖拽/点击/Ctrl+V 粘贴 / PDF 上传（≤100 页）
- **拍照识别**：调用后置摄像头，拍完直接识别
- **手写识别**：Canvas 画板，笔/橡皮/撤销/清空，方格底纹跟随主题
- MathCraft OCR 模型（DeiT 编码器 + TrOCR 解码器），Cache API 缓存
- MathJax SVG 实时渲染识别结果
- WebGPU 优先（GPU 加速），WASM 兜底，`crossOriginIsolated` 时 4 线程 + SIMD
- LaTeX 自动修复（括号/分式/环境/left-right 补全）
- PDF.js 渲染，自适应分辨率，逐页文本提取 + OCR

### 下载页 (`download.html`)
- Windows / Linux / macOS 三平台下载卡片
- SHA256 一键复制，GitHub Actions 自动同步
- `/dl/` 代理路径，R2 域名不暴露在源码中

### 用户手册 (`user_manual.html`)
- 由 `build_manual.py` 从 `user_manual.typ` 自动生成
- 左右双侧边栏目录导航，标题 sticky 固定
- 可拖动浮动箭头按钮，拖至左右吸附，点按打开目录
- 鼠标靠边悬停自动展开目录，点击外部自动关闭
- 代码块一键复制，日夜模式切换

### Cloudflare Worker (`worker.js`)
- 从 GitHub 仓库动态拉取静态文件并智能缓存
- `/models/*` 和 `/dl/*` R2 代理，Referer 校验
- **R2 配额管理**：追踪 B 类操作次数，95% 限制模型下载，98% 下载链接切 GitHub
- **页面访问统计**：按月份/路径记录 PV，`/ping` 端点可查
- TOTP 验证 API (`/api/unlock`)，gzip/brotli 压缩
- CSP/COOP/COEP 安全头，反爬虫检测，频率限制
- 美观的中文错误页面，预览分支部署支持

## 项目结构

```
.
├── src/
│   ├── main.jsx                  # React 入口
│   ├── App.jsx                   # 主应用组件（卡片数据）
│   ├── index.css                 # 全局样式（含轮播卡片样式）
│   ├── components/
│   │   ├── Header.jsx            # 导航栏
│   │   ├── HeroSection.jsx       # 首页 Hero 区域
│   │   ├── CardCarousel.jsx      # 卡片轮播（无限循环）
│   │   ├── CardSlide.jsx         # 单张卡片滑动动画
│   │   ├── EndingSection.jsx     # 结尾区域
│   │   ├── BackToTop.jsx         # 回到顶部按钮
│   │   ├── ScrollProgress.jsx    # 滚动进度条
│   │   ├── SectionIndicator.jsx  # 侧边导航指示器
│   │   └── MathBackground.jsx    # 数学公式粒子背景
├── public/                       # 静态资源（构建时复制到 dist/）
│   ├── error.html                # 错误页面
│   ├── robots.txt                # 爬虫规则
│   └── images/                   # 图片资源
├── assets/images/                # 图片（用户手册用）
├── styles/styles.css             # 共享样式（下载页、用户手册）
├── scripts/
│   └── copy-assets.cjs           # 构建后复制静态资源到 dist/
├── index.html                    # 主页 HTML 入口
├── download.html                 # 下载页
├── user_manual.html              # 生成的用户手册（构建产物）
├── user_manual.typ               # Typst 源文件
├── build_manual.py               # Typst → HTML 生成脚本
├── worker.js                     # Cloudflare Worker
├── wrangler.toml                 # Cloudflare 部署配置
├── vite.config.js                # Vite 配置
└── package.json                  # 项目依赖和脚本
```

## 安装和运行

### 开发环境

```bash
npm install        # 安装依赖
npm run dev        # 启动开发服务器 → http://localhost:5173
```

### 生成用户手册

```bash
python build_manual.py    # user_manual.typ → user_manual.html
```

### 生产构建

```bash
npm run build       # Vite 构建 + 复制静态资源 → dist/
npm run preview     # 预览构建结果
```

### 部署

```bash
npm run deploy            # 默认部署
npm run deploy:prod       # 生产环境
npm run deploy:preview    # 预览环境
```

## 主题系统

- 亮色模式 / 暗色模式 / 跟随系统
- 偏好保存在 `localStorage`，键 `latexSnipper-theme`
- 编辑 `src/index.css` 的 CSS 变量修改颜色

## 浏览器兼容性

- Chrome/Edge 90+ / Firefox 88+ / Safari 14+
- iOS Safari / Chrome Mobile

## 相关链接

- [LaTeXSnipper](https://github.com/SakuraMathcraft/LaTeXSnipper)
- [在线网站](https://latexsnipper.interknot.dpdns.org/)

## 许可证

MIT License
