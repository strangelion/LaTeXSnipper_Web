import React, { useState, useEffect } from 'react'
import Header from './components/Header'
import HeroSection from './components/HeroSection'
import CardSlide from './components/CardSlide'
import EndingSection from './components/EndingSection'
import BackToTop from './components/BackToTop'
import MathBackground from './components/MathBackground'
import ScrollProgress from './components/ScrollProgress'
import SectionIndicator from './components/SectionIndicator'
import './App.css'

const CARDS = [
  {
    id: 'card-0',
    title: '截取识别',
    brief: '全局热键截图，本地 ONNX 模型离线识别公式。',
    detail: '按下全局热键（默认 Ctrl+F）或托盘菜单触发，打开全屏截图蒙层（ScreenshotOverlay），框选公式区域后由内置 MathCraft ONNX 引擎在本地完成 OCR 识别，无需上传任何数据到云端。支持印刷公式、手写体、图片内嵌公式等多场景，支持混合排版识别（公式 + 中文文本）。识别结果自动弹出可固定的紧凑结果对话框，支持直接编辑和写回主编辑器。也支持图片/PDF 文件拖入触发识别。'
  },
  {
    id: 'card-1',
    title: '数学工作台',
    brief: 'SymPy 符号计算引擎，嵌入 QWebEngineView 的交互式工作台。',
    detail: 'v2.0 数学工作台基于 SymPy 引擎，通过 WebChannel 与前端交互，支持求值（evaluate）、化简（simplify）、展开（expand）、因式分解（factor）、求解方程（solve）、数值化（numeric / N()）六种运算。内置 MathJSON ↔ LaTeX 互转器（MathJsonConverter），支持多行排版环境（displaylines / multline / align）。LaTeX 代码片段面板提供分式、上下标、根号、求和、积分、矩阵等常用模板，同时支持 LaTeX 和 Typst 两种语法。示例公式一键加载，计算结果可直接写回主编辑器或复制为 LaTeX / MathJSON。'
  },
  {
    id: 'card-2',
    title: '手写识别',
    brief: '独立画布手写输入，抬笔自动识别，实时 MathJax 预览。',
    detail: 'v2.1 手写识别窗口（HandwritingWindow）左侧为 InkCanvas 自定义画布，支持鼠标和触控笔输入，三种绘图工具：书写（WRITE）、橡皮（ERASE，像素级擦除）、圈选修正（SELECT_CORRECT，框内保留笔段）。Ctrl+滚轮缩放（0.3×–2.2×），右键拖拽平移。停笔后通过后台线程送入 MathCraft 模型或外部 API 识别，结果回显到编辑器并触发 MathJax 3 实时预览（tex-mml-chtml.js）。内置自动排版引擎：空间聚类分组为行 → 行间距分析分割段落 → 行特征分类（标题/列表/正文）→ 格式化为纯文本文章。'
  },
  {
    id: 'card-3',
    title: '自动排版文档',
    brief: 'LaTeX 源码编辑器 + 代码片段插入 + 文档结构校验。',
    detail: '文档排版预览窗口（DocumentPreviewWindow）提供 SlowZoomPlainTextEdit 源码编辑器，支持行号显示、Ctrl+滚轮缩放、当前行高亮。内置代码片段面板可插入分式、上下标、根号、求和、积分、矩阵等 LaTeX 模板。文档封装（wrap_tex_document）支持 equation / align / gather / multline 等环境，document 结构校验（validate_tex_document）确保完整性。完成编辑后可导出 .tex 或编译为 PDF。'
  },
  {
    id: 'card-4',
    title: '多格式导出',
    brief: '内置 + Pandoc 扩展共 30+ 导出格式，覆盖主流出版格式。',
    detail: '主窗口和收藏窗口共享统一导出菜单。内置格式：LaTeX 行内（$…$）、LaTeX display（\\[…\\]）、LaTeX equation（带编号）、Markdown 行内和块级、MathML 标准 / .mml / <m> / 属性形式、HTML、Word OMML（通过 MML2OMML.XSL 转换）、SVG 代码。通过 Pandoc 可选导出：Word .docx、ODT、EPUB、InDesign .icml、RTF、独立 HTML、LaTeX .tex、Typst .typ、GitHub Markdown（GFM）、CommonMark、reStructuredText、MediaWiki、DokuWiki、Org-mode、Textile、Jira Wiki、Man Page、纯文本。导出流水线：LaTeX → latex2mathml 生成 MathML → 可选 Pandoc 转换 → 目标格式。'
  },
  {
    id: 'card-5',
    title: '本地模型',
    brief: 'MathCraft ONNX 五模型引擎，离线高精度公式识别。',
    detail: '独立包 mathcraft_ocr/ 实现，基于 ONNX Runtime 推理，不依赖 PyTorch。内置五个 ONNX 模型：mathcraft-formula-det（公式检测）、mathcraft-formula-rec（公式识别，encoder-decoder 架构）、mathcraft-text-det（中文文本检测，PP-OCRv5）、mathcraft-text-rec（中文文本识别，PP-OCRv5）、mathcraft-text-det-lite-en / mathcraft-text-rec-lite-en（英文轻量备选）。支持 formula（仅公式）和 mixed（公式 + 中文文本混合排版）两种运行时配置。进程级 ONNX session 缓存，JSONL 常驻工作进程，完整 CLI 和 doctor 诊断工具。最大输入 2400px 边限 / 400 万像素。'
  },
  {
    id: 'card-6',
    title: '外部模型',
    brief: '可配置 API 接入，支持任意远程识别引擎。',
    detail: '通过 ExternalModelClient 调用远程 API，设置中可配置 API URL、API Key、提示词模板（Prompt Template）和输出模式，灵活对接 Mathpix、SimpleTex 等任意第三方公式识别服务，满足不同精度和使用场景需求。'
  },
  {
    id: 'card-7',
    title: '多平台',
    brief: 'Windows / Linux / macOS 三平台原生体验。',
    detail: '全面支持 Windows、Linux、macOS 三大桌面平台，各平台独立 PyInstaller 打包配置（三个 .spec 文件）。Windows 为主力平台，支持 Inno Setup 安装程序打包和 Microsoft Store MSIX 分发；Linux 通过 Debian 包（packaging/debian/）分发，Qt overlay 截图为截图主力，Wayland/X11 CLI 工具为备选；macOS 通过 .dmg 构建脚本分发，兼容原生截图备选方案。所有平台共享同一套 Fluent Design 风格 UI（PyQt6 + qfluentwidgets），体验一致。内置平台能力注册（PlatformCapabilityRegistry）统一热键、截图、系统服务、托盘菜单接口。'
  },
  {
    id: 'card-8',
    title: '双语 PDF 翻译',
    brief: '基于 Argos Translate 的离线 PDF 原文/译文对照翻译。',
    detail: '双语 PDF 翻译窗口（BilingualPdfWindow）通过子进程启动独立的 Argos Translate 离线神经机器翻译引擎，支持 PDF 页面原文与译文分栏对比查看。使用 fitz（PyMuPDF）或 poppler 作为 PDF 渲染引擎，离线翻译无需联网，保护文档隐私安全。'
  }
]

export default function App() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div className="app">
      <MathBackground />
      <ScrollProgress />
      <Header />
      <main>
        <HeroSection />
        {CARDS.map(card => (
          <CardSlide key={card.id} card={card} isMobile={isMobile} />
        ))}
        <EndingSection />
      </main>
      <footer className="site-footer">
        <div className="container">© 2026 LaTeXSnipper — 开源项目</div>
      </footer>
      <SectionIndicator />
      <BackToTop />
    </div>
  )
}
