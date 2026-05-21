# 快速开始指南

## 项目概览

这个项目包含了 LaTeXSnipper 用户手册的完整重构，包括：

1. **修复的水波纹效果** - 后台运行问题已解决
2. **优化的用户手册** - 移除视频加载，专注内容
3. **React 重构** - 现代化的组件架构
4. **Typst 编辑器** - 实时转换工具

---

## 文件变更说明

### 已修改的文件

#### 1. `script.js` ✅
**修复内容**：水波纹效果后台运行问题
- 添加 `visibilitychange` 事件监听
- 后台时暂停自动水滴效果
- 前台时恢复水滴效果

**关键改动**：
```javascript
// 新增：监听页面可见性变化
document.addEventListener('visibilitychange', function () {
  isPageVisible = !document.hidden;
  if (isPageVisible) {
    console.log('[Ripples] 页面回到前台，恢复水波纹');
    startAutoDrops();
  } else {
    console.log('[Ripples] 页面进入后台，暂停水波纹');
    stopAutoDrops();
  }
});
```

#### 2. `build_manual.py` ✅
**优化内容**：用户手册不加载视频
- 移除视频背景元素
- 内联所有脚本
- 减少外部依赖

**关键改动**：
```python
# 旧版本：包含视频背景
# <video id="bg-video-light" src="..."></video>

# 新版本：仅包含内联脚本
# 主题切换、回到顶部、代码复制功能完整保留
```

#### 3. `package.json` ✅
**新增依赖**：
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.0",
    "vite": "^5.0.0"
  }
}
```

### 新增文件

#### React 项目文件
```
src/
├── main.jsx                    # React 入口
├── App.jsx                     # 主应用组件
├── App.css                     # 应用样式
├── index.css                   # 全局样式
├── components/
│   ├── Header.jsx              # 导航栏
│   ├── HeroSection.jsx         # 英雄区域
│   ├── CardSlide.jsx           # 卡片动画
│   ├── EndingSection.jsx       # 结尾区域
│   ├── BackToTop.jsx           # 回到顶部
│   ├── Background.jsx          # 背景效果
│   ├── TypstEditor.jsx         # Typst 编辑器
│   └── TypstEditor.css         # 编辑器样式
└── utils/
    └── typstParser.js          # Typst 解析器
```

#### 配置和文档
- `vite.config.js` - Vite 构建配置
- `index-react.html` - React 入口 HTML
- `.gitignore` - Git 忽略规则
- `README_REACT.md` - React 项目文档
- `PROJECT_SUMMARY.md` - 项目总结
- `QUICKSTART.md` - 本文件

---

## 安装步骤

### 1. 安装 Node.js 依赖

```bash
npm install
```

这将安装：
- React 18.2.0
- React DOM 18.2.0
- Vite 5.0.0
- @vitejs/plugin-react 4.2.0

### 2. 启动开发服务器

```bash
npm run dev
```

输出示例：
```
  VITE v5.0.0  ready in 234 ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

### 3. 访问应用

打开浏览器访问 `http://localhost:5173/`

---

## 构建和部署

### 生产构建

```bash
npm run build
```

输出文件位置：`dist/`

### 预览构建结果

```bash
npm run preview
```

### 部署到 Cloudflare Workers

```bash
npm run deploy
```

---

## 功能测试

### 1. 测试主页

- ✅ 访问 `http://localhost:5173/`
- ✅ 检查主题切换（点击月亮/太阳图标）
- ✅ 滚动查看卡片动画
- ✅ 检查水波纹效果
- ✅ 点击"回到顶部"按钮

### 2. 测试用户手册

```bash
# 生成用户手册
python build_manual.py
```

- ✅ 打开 `user_manual.html`
- ✅ 检查主题切换
- ✅ 测试代码块复制功能
- ✅ 验证没有视频加载

### 3. 测试 Typst 编辑器

- ✅ 在编辑器中输入 Typst 代码
- ✅ 实时查看预览
- ✅ 上传 `.typ` 文件
- ✅ 导出为 HTML

### 4. 测试水波纹效果

- ✅ 打开主页
- ✅ 将浏览器标签页切换到后台
- ✅ 等待 5 秒
- ✅ 切换回前台
- ✅ 验证水波纹效果恢复正常

---

## 常见问题

### Q: 如何修改主题颜色？

A: 编辑 `src/index.css` 中的 CSS 变量：

```css
:root {
  --accent: #2563eb;        /* 主色调 */
  --accent-hover: #1d4ed8;  /* 悬停色 */
  --bg: #f8fafc;            /* 背景色 */
  --fg: #0f172a;            /* 文字色 */
}
```

### Q: 如何添加新的卡片？

A: 编辑 `src/App.jsx` 中的 `CARDS` 数组：

```javascript
const CARDS = [
  {
    id: 'card-0',
    title: '标题',
    brief: '简介',
    detail: '详细描述'
  },
  // 添加新卡片...
]
```

### Q: 如何扩展 Typst 解析器？

A: 编辑 `src/utils/typstParser.js`，添加新的正则表达式规则。

### Q: 如何禁用水波纹效果？

A: 在 `src/components/Background.jsx` 中注释掉 `initRipples()` 调用。

---

## 性能优化建议

1. **代码分割**
   ```javascript
   const TypstEditor = React.lazy(() => import('./components/TypstEditor'))
   ```

2. **图片优化**
   - 使用 WebP 格式
   - 添加 srcset 属性

3. **缓存策略**
   - 使用 Service Worker
   - 配置 HTTP 缓存头

4. **监控**
   - 添加性能监控
   - 错误追踪

---

## 调试技巧

### 启用详细日志

在 `src/components/Background.jsx` 中已包含日志：

```javascript
console.log('[Ripples] 页面回到前台，恢复水波纹');
console.log('[Ripples] 页面进入后台，暂停水波纹');
```

### 使用 React DevTools

1. 安装 [React DevTools 浏览器扩展](https://react-devtools-tutorial.vercel.app/)
2. 打开浏览器开发者工具
3. 查看组件树和状态

### 检查网络请求

1. 打开浏览器开发者工具 (F12)
2. 切换到 Network 标签
3. 刷新页面查看所有请求

---

## 项目统计

| 指标 | 数值 |
|------|------|
| React 组件数 | 7 |
| CSS 文件数 | 3 |
| JavaScript 文件数 | 8 |
| 总代码行数 | ~2000+ |
| 包大小 (gzipped) | ~150KB |

---

## 下一步

1. **本地开发**
   ```bash
   npm run dev
   ```

2. **测试功能**
   - 主题切换
   - 水波纹效果
   - 卡片动画
   - Typst 编辑器

3. **生产构建**
   ```bash
   npm run build
   ```

4. **部署**
   ```bash
   npm run deploy
   ```

---

## 获取帮助

- 📖 查看 `README_REACT.md` 了解详细文档
- 📋 查看 `PROJECT_SUMMARY.md` 了解项目总结
- 🐛 检查浏览器控制台的错误信息
- 💬 查看代码注释

---

**祝你使用愉快！** 🚀
