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
      requirements:
        '需要 Python 3.10–3.12、venv 与 pip',
      href: '/dl/LaTeXSnipper_2.4.0_amd64.deb',
      sha256: '',
      size: '',
    },
    macos: {
      label: 'macOS',
      architecture: 'Apple Silicon',
      requirements:
        'macOS 11+；需要 Python 3.10–3.12',
      href: '/dl/LaTeXSnipper_2.4.0_arm64.dmg',
      sha256: '',
      size: '',
    },
  },
};

export const trustItems = [
  {
    title: '本地优先',
    description:
      'MathCraft OCR 与数学计算可在本机运行',
  },
  {
    title: '公式、文字与混合识别',
    description:
      '针对公式、纯文字和图文页面提供独立模式',
  },
  {
    title: '20 种导出格式',
    description:
      '12 种内置格式与 8 种可选 Pandoc 格式',
  },
  {
    title: '桌面多平台',
    description:
      'Windows 为主要平台，Linux 与 macOS 通过 Provider 层支持',
  },
];

export const workflowSteps = [
  {
    number: '01',
    title: '捕获',
    description:
      '使用截图快捷键、图片、PDF 或手写画布输入内容。',
  },
  {
    number: '02',
    title: '识别',
    description:
      '选择公式、文字、混合 MathCraft OCR，或已配置的外部模型。',
  },
  {
    number: '03',
    title: '编辑与计算',
    description:
      '在 MathLive 编辑器中修正结果，并进行计算、化简、展开或求解。',
  },
  {
    number: '04',
    title: '导出与插入',
    description:
      '输出 LaTeX、Markdown、MathML、OMML、SVG、Typst 或 Office 文档。',
  },
];

export const featureShowcases = [
  {
    id: 'ocr',
    eyebrow: 'MathCraft OCR',
    title: '识别公式、文字和图文混排页面',
    description:
      '桌面端 MathCraft OCR 使用独立的公式检测、公式识别、文字检测和文字识别模型，并将结果按版面顺序合并。',
    points: [
      '截图和本地图片识别',
      '公式、纯文字和混合模式',
      '按页 PDF 识别',
      '输出 LaTeX、Markdown 或纯文本',
    ],
    image: '/assets/images/product/ocr-result.webp',
    alt: 'LaTeXSnipper MathCraft OCR 识别结果',
    href: '/ocr_demo.html',
    cta: '体验网页版公式识别',
  },
  {
    id: 'workspace',
    eyebrow: '数学工作台',
    title: '在同一窗口编辑、预览和计算公式',
    description:
      'MathLive 编辑器和虚拟数学键盘用于修正公式，数学工作台支持常见符号计算，并可把结果写回主编辑器。',
    points: [
      'MathLive math-field',
      'LaTeX 实时预览',
      '计算、化简与数值化',
      '展开、因式分解与求解',
    ],
    image: '/assets/images/product/hero-workspace.webp',
    alt: 'LaTeXSnipper 数学工作台',
    href: '/user_manual.html',
    cta: '查看用户手册',
  },
  {
    id: 'handwriting',
    eyebrow: '手写识别',
    title: '使用鼠标或触控笔输入数学内容',
    description:
      '独立手写窗口支持书写、橡皮、圈选修正、撤销和重做，识别结果可以继续编辑并实时预览。',
    points: [
      '鼠标与触控笔输入',
      '圈选修正并保留剩余笔段',
      '撤销、重做和清空',
      '识别结果编辑与实时预览',
    ],
    image: '/assets/images/product/handwriting.webp',
    alt: 'LaTeXSnipper 手写识别窗口',
  },
  {
    id: 'office',
    eyebrow: 'Windows Office 插件',
    title: '在 Word 和 PowerPoint 中维护公式',
    description:
      '已发布的 Windows VSTO 插件面向 Word 和 PowerPoint。Word 支持 OLE 与原生 OMML，PowerPoint 支持 OLE 与 PNG。',
    points: [
      'Word：OLE 与原生 OMML',
      'PowerPoint：OLE 与 PNG',
      '加载、更新和删除托管公式',
      '通过本地 Bridge 调用截图 OCR',
    ],
    image: '/assets/images/product/office-word.webp',
    alt: 'LaTeXSnipper Microsoft Word 插件',
    href:
      'https://github.com/SakuraMathcraft/LaTeXSnipper/blob/main/office_plugin/README.md',
    cta: '查看 Office 插件说明',
  },
  {
    id: 'export',
    eyebrow: '格式导出',
    title: '12 种内置格式，另有 8 种 Pandoc 格式',
    description:
      '内置格式覆盖 LaTeX、Markdown、MathML、HTML、Word OMML 和 SVG Code；安装 Pandoc 层后可导出文档格式。',
    points: [
      'LaTeX、Markdown、MathML',
      'HTML、Word OMML、SVG Code',
      'Word、ODT、PowerPoint、EPUB',
      'PDF、独立 HTML、Typst、纯文本',
    ],
    image: '/assets/images/product/export-formats.webp',
    alt: 'LaTeXSnipper 导出菜单',
  },
];

export const desktopPlatforms = [
  {
    name: 'Windows',
    status: '主要发布平台',
    capability:
      '原生全局快捷键、Qt 截图、桌面安装包',
    requirement: 'Windows 10 / 11',
  },
  {
    name: 'Linux',
    status: 'Provider 层支持',
    capability:
      'pynput 快捷键、Qt 截图、Wayland/X11/portal 回退',
    requirement:
      'Python 3.10–3.12，venv/pip 可用',
  },
  {
    name: 'macOS',
    status: 'Provider 层支持',
    capability:
      '原生快捷键、Qt 截图、screencapture 回退',
    requirement:
      'Python 3.10–3.12；可能需要屏幕录制权限',
  },
];

export const officePlatforms = [
  {
    host: 'Microsoft Word',
    status: '已发布',
    insert: 'OLE、原生 OMML',
    manage:
      '加载、更新、删除、编号、引用、OLE/OMML 转换',
    requirement:
      'Windows Office 2019+；32/64 位',
  },
  {
    host: 'Microsoft PowerPoint',
    status: '已发布',
    insert: 'OLE、PNG',
    manage:
      '加载、更新、删除、OLE/PNG 转换、保留缩放',
    requirement:
      'Windows Office 2019+；32/64 位',
  },
];

export const builtinExportFormats = [
  'LaTeX 行内',
  'LaTeX display',
  'LaTeX equation',
  'Markdown 行内',
  'Markdown 块级',
  'MathML',
  'MathML .mml',
  'MathML <m>',
  'MathML 属性形式',
  'HTML',
  'Word OMML',
  'SVG Code',
];

export const pandocExportFormats = [
  'Word .docx',
  'ODT .odt',
  'PowerPoint .pptx',
  'EPUB .epub',
  'PDF .pdf',
  '独立 HTML .html',
  'Typst .typ',
  '纯文本 .txt',
];

export const faqs = [
  {
    question: '识别内容会上传吗？',
    answer:
      '使用本地 MathCraft OCR 时，图片与公式在本机处理。启用 OpenAI-compatible、Ollama 或 MinerU Local 等外部服务时，数据流向由对应服务和配置决定。',
  },
  {
    question: '为什么首次使用需要联网？',
    answer:
      '依赖向导需要安装运行依赖并准备模型。模型和依赖准备完成后，本地 MathCraft OCR 可以离线运行。',
  },
  {
    question: '网页版 OCR 与桌面端完全相同吗？',
    answer:
      '不是。网页版优先提供公式识别体验；完整的公式检测、文字检测、混合布局、PDF 工作流和桌面集成以桌面版为准。',
  },
  {
    question: 'Office 插件支持哪些程序？',
    answer:
      '当前正式发布的是 Windows 桌面版 Microsoft Word 和 PowerPoint 插件，不应把 Excel、macOS Office.js 或 WPS 描述为当前稳定能力。',
  },
  {
    question: '是否支持外部模型？',
    answer:
      '桌面版支持 OpenAI-compatible、Ollama 和 MinerU Local，并支持公式、Markdown、纯文本等提示词输出模式。',
  },
];
