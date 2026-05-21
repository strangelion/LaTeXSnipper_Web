import React, { useState, useEffect } from 'react'
import Header from './components/Header'
import HeroSection from './components/HeroSection'
import CardSlide from './components/CardSlide'
import EndingSection from './components/EndingSection'
import BackToTop from './components/BackToTop'
import MathBackground from './components/MathBackground'
import './App.css'

const CARDS = [
  {
    id: 'card-0',
    title: '截取识别',
    brief: '一键截图并自动识别 LaTeX 公式，支持印刷与手写。',
    detail: '按下截图快捷键框选公式区域，内置 MathCraft ONNX 模型在本地完成 OCR 识别，无需上传任何数据到云端。支持印刷公式、手写体、图片内嵌公式等多场景识别，识别结果自动进入编辑区可供修改。'
  },
  {
    id: 'card-1',
    title: '数学工作台',
    brief: '编辑公式、调用计算引擎、结果一键写回编辑器。',
    detail: 'v2.0 数学工作台支持完整工作流：一键加载识别结果到工作区，使用 MathLive 数学字段编辑，配合虚拟键盘输入分数、积分、级数等复杂符号。内置计算引擎支持 Compute / Simplify / Numeric / Expand / Factor / Solve，复杂表达式自动回退到本地 SymPy/mpmath 引擎求解。计算结果可直接写回主编辑器或复制为 LaTeX / MathJSON。'
  },
  {
    id: 'card-2',
    title: '手写识别',
    brief: '手写公式画布，抬笔自动识别，实时预览转换结果。',
    detail: 'v2.1 手写识别窗口支持以下流程：打开"手写识别"后在独立画布上直接书写公式，MathCraft OCR 在抬笔后自动识别，右侧实时显示 LaTeX 输出和渲染预览。支持将识别结果直接复制或插入回主编辑器，实现手写输入到文档的完整闭环。'
  },
  {
    id: 'card-3',
    title: '自动排版文档',
    brief: '源级编辑与 PDF 同步预览，支持 SyncTeX 双向导航。',
    detail: 'v2.3.2 自动排版文档窗口支持源级编辑与同步预览：从手写窗口打开"自动排版"，在左侧 TeX 文档窗格编辑完整源码，内置公式编辑器可插入复杂表达式，一键编译并预览 PDF。通过 SyncTeX 可在源码和 PDF 之间双向导航跳转。完成编辑后导出 .tex 或 PDF 文件。'
  },
  {
    id: 'card-4',
    title: '多格式导出',
    brief: '30+ 导出格式，LaTeX / Markdown / MathML / Typst / Word 等。',
    detail: '主窗口和收藏窗口共享导出菜单。内置格式：LaTeX 行内、显示、方程；Markdown 行内和块；MathML 标准/.mml/<m>/属性形式；HTML、Word OMML、SVG 代码。安装 Pandoc 后可导出 Word .docx、ODT、EPUB、InDesign .icml、RTF、独立 HTML、LaTeX .tex、Typst .typ、GitHub Markdown、CommonMark、reStructuredText、MediaWiki、DokuWiki、Org-mode、Textile、Jira Wiki 等。'
  },
  {
    id: 'card-5',
    title: '本地模型',
    brief: 'MathCraft ONNX 引擎，离线可用，隐私安全。',
    detail: '内置 MathCraft ONNX 本地 OCR 模型（独立运行时和 CLI），无需联网即可完成高精度公式识别。模型自动下载部署，首次启动通过依赖向导完成配置，后续离线使用零延迟。识别涵盖公式、文字及混合内容。'
  },
  {
    id: 'card-6',
    title: '外部模型',
    brief: '支持 Mathpix、SimpleTex 等外部 API 引擎。',
    detail: '除本地模型外，支持接入外部 API 模型（如 Mathpix、SimpleTex 等）获得更高识别精度。在设置中配置 API Key 即可切换使用外部引擎，满足不同精度需求的使用场景。'
  },
  {
    id: 'card-7',
    title: '多平台',
    brief: '全面支持 Windows / Linux / macOS，体验一致。',
    detail: '全面支持 Windows、Linux、macOS 三大桌面平台。Windows 为主力发布目标，支持 GitHub/Inno 和 Store/MSIX 打包；Linux 通过 provider 层支持，Qt 截图为主，Wayland/X11 CLI 工具为备选；macOS 通过 provider 层支持相同的 Qt overlay 流程，兼容原生截图备选方案。Linux 和 macOS 都需要系统 Python 3.10+ 支持。'
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
      <BackToTop />
    </div>
  )
}
