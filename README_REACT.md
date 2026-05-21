# LaTeXSnipper 用户手册 - React 版本

这是 LaTeXSnipper 用户手册的 React 重构版本，包含以下改进：

## 功能特性

### 1. 主页 (index.html)
- 使用 React 重构的交互式主页
- 支持暗色/亮色主题切换
- WebGL 水波纹效果（已修复后台运行问题）
- 响应式设计，支持移动设备
- 滚动驱动的卡片动画

### 2. 用户手册 (user_manual.html)
- 由 Python 脚本 `build_manual.py` 生成
- 不加载视频背景，专注于内容
- 支持主题切换
- 代码块复制功能

### 3. Typst 编辑器
- 实时 Typst 到 HTML 转换
- 支持上传 .typ 文件
- 分屏编辑和预览
- 导出为 HTML

## 项目结构

```
.
├── src/
│   ├── main.jsx              # React 入口
│   ├── App.jsx               # 主应用组件
│   ├── App.css               # 应用样式
│   ├── index.css             # 全局样式
│   ├── components/
│   │   ├── Header.jsx        # 头部导航
│   │   ├── HeroSection.jsx   # 英雄区域
│   │   ├── CardSlide.jsx     # 卡片滑动
│   │   ├── EndingSection.jsx # 结尾区域
│   │   ├── BackToTop.jsx     # 回到顶部按钮
│   │   ├── Background.jsx    # 背景和水波纹
│   │   ├── TypstEditor.jsx   # Typst 编辑器
│   │   └── TypstEditor.css   # 编辑器样式
│   └── utils/
│       └── typstParser.js    # Typst 解析器
├── index-react.html          # React 入口 HTML
├── vite.config.js            # Vite 配置
├── package.json              # 项目依赖
├── build_manual.py           # 用户手册生成脚本
├── user_manual.typ           # Typst 源文件
└── styles.css                # 原始样式（保留兼容性）
```

## 安装和运行

### 开发环境

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 访问 http://localhost:5173
```

### 生产构建

```bash
# 构建项目
npm run build

# 预览构建结果
npm run preview
```

## 改进说明

### 1. 水波纹效果修复
**问题**：后台标签页时 WebGL 会被暂停，导致重新进入网页时效果不流畅。

**解决方案**：
- 监听 `visibilitychange` 事件
- 后台时暂停自动水滴效果
- 前台时恢复水滴效果
- 保持交互响应

**文件**：`src/components/Background.jsx`

### 2. 用户手册优化
**改进**：
- 移除视频背景加载
- 内联所有脚本（主题切换、回到顶部、代码复制）
- 减少外部依赖
- 更快的加载速度

**文件**：`build_manual.py`

### 3. React 重构
**优势**：
- 组件化架构，易于维护
- 状态管理清晰
- 性能优化（React.memo、useCallback）
- 更好的代码组织

**主要组件**：
- `Header`：导航和主题切换
- `HeroSection`：打字效果和 CTA 按钮
- `CardSlide`：滚动驱动的卡片动画
- `Background`：视频和水波纹效果
- `BackToTop`：回到顶部按钮

### 4. Typst 转换工具
**功能**：
- 实时 Typst 到 HTML 转换
- 支持基本 Typst 语法
- 文件上传和下载
- 分屏编辑预览

**支持的语法**：
- 标题（`==`, `===`）
- 代码块（` ``` `）
- 列表（`-`, `+`）
- 内联格式（`*粗体*`, `` `代码` ``）
- 链接（`#link(<label>)[text]`）

## 主题系统

支持三种主题模式：
1. **亮色模式**：`data-theme="light"`
2. **暗色模式**：`data-theme="dark"`
3. **系统默认**：无 `data-theme` 属性，跟随系统设置

主题偏好保存在 `localStorage` 中，键为 `latexSnipper-theme`。

## 性能优化

- 使用 Vite 进行快速开发和构建
- 代码分割和懒加载
- CSS 变量用于主题切换
- 使用 `will-change` 优化动画性能
- 被动事件监听器减少主线程阻塞

## 浏览器兼容性

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- 移动浏览器（iOS Safari, Chrome Mobile）

## 许可证

MIT License - 与 LaTeXSnipper 项目保持一致

## 相关链接

- [LaTeXSnipper GitHub](https://github.com/SakuraMathcraft/LaTeXSnipper)
- [Typst 文档](https://typst.app)
- [React 文档](https://react.dev)
- [Vite 文档](https://vitejs.dev)
