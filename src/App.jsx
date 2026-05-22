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
    brief: '按快捷键截图，自动识别公式，全程离线。',
    detail: '按下快捷键（默认 Ctrl+F）或右键托盘图标，屏幕会变暗出现截图框，选中公式区域后松开，软件自动识别出 LaTeX 代码。识别全程在电脑本地完成，不需要联网，不用担心隐私泄露。支持印刷体公式、手写公式、图片里的公式，甚至能同时识别公式和旁边的中文文字。识别结果会弹出小窗口显示，可以直接修改，插入到编辑器或直接导出。也支持直接把图片或 PDF 文件拖进窗口识别。'
  },
  {
    id: 'card-1',
    title: '数学工作台',
    brief: '一个能算数学题的编辑窗口，化简、求解、展开都能做。',
    detail: '数学工作台可以帮你处理数学表达式：求值、化简、展开、因式分解、解方程、转成小数，六种常用功能一键调用。内置常用符号面板，分式、根号、求和、积分、矩阵等模板一插即用，支持 LaTeX 写法。算好的结果可以直接插入到主编辑器或复制出来用。'
  },
  {
    id: 'card-2',
    title: '手写识别',
    brief: '鼠标或触控笔写公式，松手自动识别。',
    detail: '打开"手写识别"后，左侧是手写板，可以用鼠标或触控笔直接写公式。支持三种工具：笔（正常书写）、橡皮（擦除写错的部分）、圈选修正（圈出要修改的区域）。写完后停笔稍等，软件自动识别成 LaTeX，右侧实时显示预览效果。还可以自动排版——把多行手写内容按段落整理成一篇完整的文章。'
  },
  {
    id: 'card-3',
    title: '自动排版文档',
    brief: '完整的 LaTeX 编辑环境，写文档、插公式、导出一条龙。',
    detail: '从手写窗口可以打开自动排版功能，进入一个完整的 LaTeX 编辑器。左侧编辑源码，支持显示行号、缩放、当前行高亮。右侧可以直接插入分式、上下标、根号、求和、积分、矩阵等常见公式模板。编辑完成后可以导出为 .tex 文件或编译成 PDF。'
  },
  {
    id: 'card-4',
    title: '多格式导出',
    brief: '30 多种导出格式，复制粘贴就能用。',
    detail: '识别出的公式可以导出为各种格式。常用的有：LaTeX（行内/展示/带编号）、Markdown（行内/块级）、MathML、HTML、Word 公式、SVG 图片等。如果安装了 Pandoc，还能导出 Word 文档、EPUB 电子书、Typst、GitHub Markdown、Wiki 语法等 20 多种格式。不管是写论文、做博客、写书，总有一种格式适合你。'
  },
  {
    id: 'card-5',
    title: '本地模型',
    brief: '内置强大识别引擎，不联网也能用。',
    detail: 'LaTeXSnipper 内置了一套完整的离线识别引擎，包含五个专用模型：检测公式位置、识别公式内容、识别中英文文字。支持纯公式识别和图文混合识别两种模式。首次使用会自动下载模型，之后全程离线运行，速度快、零延迟。还有命令行工具和诊断工具，方便高级用户排查问题。'
  },
  {
    id: 'card-6',
    title: '外部模型',
    brief: '想用云端 API 也可以，灵活切换。',
    detail: '如果想要更高的识别精度，也可以在设置里配置第三方云端识别服务，比如 MinerU , Ollama , OpenAl-compatible 等。填入接口地址和密钥就能用，随时可以切换回本地模型，非常灵活。'
  },
  {
    id: 'card-7',
    title: '多平台',
    brief: 'Windows / Linux / macOS 都能用。',
    detail: 'LaTeXSnipper 支持三大桌面系统。Windows 上可以用SignPath Foundation 提供的代码签名的安装包；Linux 上提供 Deb 包；macOS 上用 DMG 镜像安装。三个平台的界面和操作方式完全一致，都是现代化的 Fluent Design 风格。不管用什么系统，体验都一样好。'
  },
  {
    id: 'card-8',
    title: '双语 PDF 翻译',
    brief: '离线翻译 PDF，原文译文对照看。',
    detail: '内置 PDF 翻译功能，选中 PDF 后可以一边看原文、一边看译文，左右对照。翻译在本地完成，不需要联网，不用担心文档内容泄露。支持选页翻译，也支持整篇翻译。'
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
