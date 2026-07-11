export const FALLBACK_RELEASE = {
  version: '2.4.0',
  channel: 'LTS',
  publishedAt: '',
  releaseNotesUrl:
    'https://github.com/SakuraMathcraft/LaTeXSnipper/releases/tag/v2.4.0-LTS',
  downloads: {
    windows: {
      label: 'Windows',
      architecture: 'x86_64',
      requirements: 'Windows 10 / 11',
      href: '/dl/LaTeXSnipperSetup-2.4.0.exe',
      sha256: '',
      size: '',
    },
    linux: {
      label: 'Linux',
      architecture: 'x86_64',
      requirements: 'Debian / Ubuntu 及兼容发行版',
      href: '/dl/LaTeXSnipper_2.4.0_amd64.deb',
      sha256: '',
      size: '',
    },
    macos: {
      label: 'macOS',
      architecture: 'Apple Silicon',
      requirements: 'macOS 11 或更高版本',
      href: '/dl/LaTeXSnipper_2.4.0_arm64.dmg',
      sha256: '',
      size: '',
    },
  },
};

export const trustItems = [
  {
    title: '本地优先',
    description: '默认使用本地模型处理图片和公式',
  },
  {
    title: '免费开源',
    description: '核心功能与桌面应用开放源代码',
  },
  {
    title: '多平台',
    description: '支持 Windows、Linux 和 macOS',
  },
  {
    title: '多格式',
    description: 'LaTeX、Markdown、OMML、Typst、SVG 等',
  },
];

export const workflowSteps = [
  {
    number: '01',
    title: '捕获内容',
    description:
      '截图选区、拖入图片或 PDF，也可以直接使用鼠标与触控笔书写公式。',
  },
  {
    number: '02',
    title: '识别与解析',
    description:
      '本地模型识别公式、文字与版面结构，并保留可继续编辑的数学语义。',
  },
  {
    number: '03',
    title: '编辑与计算',
    description:
      '检查 LaTeX、预览公式、修正识别结果，并进行化简、求值或格式转换。',
  },
  {
    number: '04',
    title: '插入与导出',
    description:
      '复制到 Markdown、Typst、Word、Office/WPS，或导出 SVG、PNG、PDF。',
  },
];

export const featureShowcases = [
  {
    id: 'ocr',
    eyebrow: '公式与文档识别',
    title: '从屏幕或文档中提取可编辑的数学内容',
    description:
      '支持截图、图片、PDF 与图文混合内容。识别结果不只是图片，而是能够继续修改、复制和导出的结构化数学表达式。',
    points: [
      '截图区域快速识别',
      '印刷体和手写公式',
      '公式与中英文混合内容',
      '图片和 PDF 文件导入',
    ],
    image: '/assets/images/product/ocr-result.webp',
    alt: 'LaTeXSnipper 公式识别结果界面',
    href: '/ocr_demo.html',
    cta: '在浏览器中体验',
  },
  {
    id: 'workspace',
    eyebrow: '数学工作台',
    title: '识别、预览、计算和转换集中在一个窗口',
    description:
      '编辑器提供公式预览、常用符号、数学操作和格式转换，减少在多个应用之间来回复制的步骤。',
    points: [
      'LaTeX 实时预览',
      '求值、化简、展开和因式分解',
      '矩阵、积分、根号和分式模板',
      '识别结果一键回填',
    ],
    image: '/assets/images/product/hero-workspace.webp',
    alt: 'LaTeXSnipper 数学工作台',
    href: '/user_manual.html',
    cta: '查看工作台说明',
  },
  {
    id: 'handwriting',
    eyebrow: '手写输入',
    title: '使用鼠标或触控笔书写公式',
    description:
      '通过手写板输入复杂公式，支持橡皮、撤销、圈选修正，并将书写内容转换为可编辑的 LaTeX。',
    points: [
      '鼠标与触控笔输入',
      '撤销、清除和橡皮工具',
      '局部圈选修正',
      '自动生成公式预览',
    ],
    image: '/assets/images/product/handwriting.webp',
    alt: 'LaTeXSnipper 手写公式识别界面',
  },
  {
    id: 'office',
    eyebrow: 'Office 与编辑器集成',
    title: '把识别结果直接送入常用写作环境',
    description:
      '针对不同平台采用合适的接入方式。Windows Office 以原生 COM/VSTO 加载项为主，macOS 与网页版 Office 使用 Office.js；WPS 和其他编辑器通过各自插件接入。',
    points: [
      'Windows Word / Excel / PowerPoint 原生加载项',
      'macOS 与 Web Office.js 接入',
      'LaTeX 与 OMML 双向转换',
      'WPS、Obsidian 和浏览器扩展逐步接入',
    ],
    image: '/assets/images/product/office-word.webp',
    alt: 'LaTeXSnipper Word 加载项',
  },
  {
    id: 'export',
    eyebrow: '格式转换与导出',
    title: '一次识别，适配不同写作与发布平台',
    description:
      '无需为不同编辑器重复整理公式。识别结果可以转换成常用标记语言、Office 公式或矢量图。',
    points: [
      'LaTeX、Markdown 和 MathML',
      'Word OMML 与 HTML',
      'Typst、SVG、PNG 和 PDF',
      '可选 Pandoc 扩展格式',
    ],
    image: '/assets/images/product/export-formats.webp',
    alt: 'LaTeXSnipper 多格式导出界面',
  },
];

export const ecosystems = [
  {
    name: 'Desktop',
    status: '稳定',
    description: 'Windows、Linux 和 macOS 桌面应用。',
  },
  {
    name: 'Windows Office',
    status: 'Beta',
    description: 'Word、Excel、PowerPoint 的 COM/VSTO 集成。',
  },
  {
    name: 'Office.js',
    status: '开发中',
    description: '面向 macOS、Web 与跨平台 Office。',
  },
  {
    name: 'WPS',
    status: '开发中',
    description: '面向 WPS Word、表格和演示。',
  },
  {
    name: 'Obsidian',
    status: '规划中',
    description: '从笔记中读取和插入公式内容。',
  },
  {
    name: 'CLI / Core',
    status: '开发中',
    description: 'Rust Core、命令行与第三方集成能力。',
  },
];

export const formatGroups = [
  {
    title: '数学标记',
    formats: ['LaTeX', 'MathML', 'AsciiMath', 'Unicode Math'],
  },
  {
    title: '文档写作',
    formats: ['Markdown', 'Typst', 'HTML', 'GitHub Markdown'],
  },
  {
    title: 'Office',
    formats: ['OMML', 'Word', 'Excel', 'PowerPoint'],
  },
  {
    title: '图像',
    formats: ['SVG', 'PNG', 'PDF'],
  },
  {
    title: '扩展转换',
    formats: ['Pandoc', 'EPUB', 'Wiki', '自定义模板'],
  },
];

export const faqs = [
  {
    question: '识别时会把图片上传到服务器吗？',
    answer:
      '默认本地模型不会上传图片。浏览器 OCR Demo 也在浏览器中执行推理。只有用户主动选择第三方 API 或云端模型时，相应内容才会发送到所配置的服务。',
  },
  {
    question: '为什么首次使用可能需要联网？',
    answer:
      '应用本身可以离线工作，但部分模型需要在首次使用时下载。模型下载完成后，本地识别不再依赖网络。',
  },
  {
    question: 'Office 加载项在不同平台上是否相同？',
    answer:
      '不是。Windows 桌面 Office 优先使用 COM/VSTO，以获得更完整的公式和对象访问能力；macOS 和网页版 Office 使用 Office.js。',
  },
  {
    question: '是否支持自定义模型或 API？',
    answer:
      '支持配置本地模型以及兼容 OpenAI API 形式的外部服务。启用外部服务时，网站和应用应明确提示联网边界。',
  },
  {
    question: 'LaTeXSnipper 是否收费？',
    answer:
      '项目以免费开源为主。下载、核心识别和常用格式转换不需要订阅。',
  },
];
