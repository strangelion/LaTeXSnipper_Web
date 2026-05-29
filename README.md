# LaTeXSnipper 官方网站

LaTeXSnipper 的官方网站，包含产品主页、下载页、OCR 公式识别 Demo 和用户手册，部署于 Cloudflare Workers。

## 功能特性

### 主页 (`index.html`)
- React 组件化架构，Vite 构建
- 功能卡片轮播，无限循环，支持键盘/鼠标拖拽
- 数学符号粒子背景（Canvas），鼠标跟随交互
- 暗色/亮色主题切换，跟随系统偏好
- 响应式设计，桌面/平板/手机三档适配

### OCR 公式识别 Demo (`ocr_demo.html`)
- **浏览器端 ONNX Runtime 推理**，图片全程不上传
- 支持图片拖拽/点击/Ctrl+V 粘贴 / PDF 上传
- **拍照识别**：调用后置摄像头，拍完直接识别
- **手写识别**：Canvas 画板，笔/橡皮/撤销/清空
- MathCraft OCR 模型（DeiT 编码器 + TrOCR 解码器），Cache API 缓存
- MathJax SVG 实时渲染识别结果
- WebGPU 优先，WASM 兜底，多线程 + SIMD

### 下载页 (`download.html`)
- Windows / Linux / macOS 三平台下载卡片
- SHA256 一键复制，GitHub Actions 自动同步
- `/dl/` 代理路径，R2 配额保护

### 用户手册 (`user_manual.html`)
- 由 `build_manual.py` 从 `user_manual.typ` 自动生成
- 左右双侧边栏目录导航
- 可拖动浮动箭头按钮，鼠标靠边悬停自动展开目录
- 代码块一键复制，日夜模式切换
- PDF 版本自动生成并上传

### Cloudflare Worker (`worker.js`)
- 从 GitHub 仓库动态拉取静态文件并智能缓存
- `/models/*` 和 `/dl/*` R2 代理，Referer 校验
- R2 配额管理：95% 限制模型下载，98% 下载链接自动切换
- TOTP 验证 API，CSP/COOP/COEP 安全头

## 项目结构

```
LaTeXSnipper_user_manual/
├── src/                           # React 首页源码
│   ├── main.jsx                   # React 入口
│   ├── App.jsx                    # 主应用组件
│   ├── index.css                  # 全局样式
│   └── components/                # React 组件
├── public/                        # 静态资源
│   ├── error.html                 # 错误页面
│   ├── robots.txt                 # 爬虫规则
│   └── images/                    # 图片资源
├── assets/images/                 # 用户手册配图
├── styles/styles.css              # 共享样式
├── scripts/
│   └── copy-assets.cjs            # 构建后复制静态资源
├── index.html                     # 主页入口
├── download.html                  # 下载页
├── user_manual.html               # 生成的用户手册
├── user_manual.typ                # Typst 源文件
├── build_manual.py                # Typst → HTML 生成脚本
├── worker.js                      # Cloudflare Worker
├── wrangler.toml                  # Cloudflare 部署配置
├── release/                       # PDF 文件（自动生成）
├── dist/                          # 构建输出
├── vite.config.js                 # Vite 配置
└── package.json
```

## 安装和运行

```bash
npm install        # 安装依赖
npm run dev        # 启动开发服务器 → http://localhost:5173
```

### 生成用户手册

```bash
python build_manual.py    # user_manual.typ → user_manual.html
```

或通过 GitHub Actions 自动构建（Actions → Build User Manual → Run workflow）。

### 生产构建

```bash
npm run build       # Vite 构建 + 复制静态资源 → dist/
npm run preview     # 预览构建结果
```

### 部署

```bash
npm run deploy            # 默认部署
npm run deploy:prod       # 生产环境
```

部署需要 Cloudflare 账号，并在 Dashboard 配置 KV 命名空间和 R2 存储桶。

## 配置环境变量

### Cloudflare Worker Secrets

| Secret | 说明 |
|--------|------|
| `R2_MODEL_BASE` | R2 公开访问域名（模型和下载文件） |
| `CLOUDFLARE_API_TOKEN` | CI/CD 上传 R2 用的 API Token |

### KV 命名空间

在 `wrangler.toml` 中配置 `USAGE_KV` 绑定，用于配额管理。

## 主题系统

- 亮色/暗色/跟随系统
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
