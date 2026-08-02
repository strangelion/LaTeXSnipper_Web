import heroWorkspaceImage from '../../assets/images/product/hero-workspace.webp';
import ocrResultImage from '../../assets/images/product/ocr-result.webp';
import officeWordImage from '../../assets/images/product/office-word.webp';

export const productImages = {
  heroWorkspace: heroWorkspaceImage,
  ocrResult: ocrResultImage,
  officeWord: officeWordImage,
};

export const FALLBACK_RELEASE = {
  version: '2.6.0',
  channel: 'LTS',
  publishedAt: '',
  releaseNotesUrl:
    'https://github.com/SakuraMathcraft/LaTeXSnipper/releases/tag/v2.6.0-LTS',
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
    image: productImages.ocrResult,
    width: 1440,
    height: 900,
    alt: 'LaTeXSnipper MathCraft OCR 识别结果',
    href: '/ocr.html',
    cta: '体验网页单公式识别',
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
    image: productImages.heroWorkspace,
    width: 1600,
    height: 1000,
    alt: 'LaTeXSnipper 数学工作台',
    href: '/user_manual.html',
    cta: '查看用户手册',
  },
  {
    id: 'office',
    eyebrow: 'Desktop 随附 VSTO 插件',
    title: '在 Word 和 PowerPoint 中插入并维护公式',
    description:
      '这是 SakuraMathcraft/LaTeXSnipper 桌面仓库随附的 Windows 插件：Word 支持 OLE 与原生 OMML，PowerPoint 支持 OLE 与 PNG。',
    points: [
      'Word：OLE 与原生 OMML',
      'PowerPoint：OLE 与 PNG',
      '加载、更新和删除托管公式',
      '通过本地 Bridge 调用截图 OCR',
    ],
    image: productImages.officeWord,
    width: 1440,
    height: 900,
    alt: 'LaTeXSnipper Microsoft Word 插件',
    href:
      'https://github.com/SakuraMathcraft/LaTeXSnipper/blob/main/office_plugin/README.md',
    cta: '查看 Office 插件说明',
  },
];

export const ecosystemProjects = [
  {
    name: 'LaTeXSnipper Desktop',
    scope: '桌面数学工作台',
    version: 'v2.6.0 LTS',
    status: '稳定发布',
    author: 'SakuraMathcraft',
    license: 'GPL-3.0',
    repository: 'SakuraMathcraft/LaTeXSnipper',
    description:
      '围绕截图、图片、PDF 与手写输入，提供 MathCraft OCR、MathLive 编辑、数学计算和 20 种导出格式。',
    points: [
      'Windows 为主要发布平台',
      'Linux / macOS 通过平台 Provider 支持',
      '随附 Word / PowerPoint Windows VSTO 插件',
    ],
    requirement:
      'Windows 10/11；Linux 与 macOS 的可选依赖环境需要 Python >=3.10,<3.13。',
    href: 'https://github.com/SakuraMathcraft/LaTeXSnipper',
  },
  {
    name: 'LaTeXSnipper Mobile',
    scope: '移动端 OCR',
    version: '代码版本 v1.3.0',
    status: '独立仓库',
    author: 'strangelion',
    license: 'AGPL-3.0',
    repository: 'strangelion/LaTeXSnipper_mobile',
    description:
      'Capacitor 移动应用；Android 通过 Java ONNX Runtime 在本机执行公式、文字和混合 OCR。',
    points: [
      '图片、PDF、拍照与手写输入',
      'MathLive 编辑、历史记录与多格式导出',
      '模型按需下载、断点续传与 SHA-256 校验',
    ],
    requirement:
      'Android minSdk 24（Android 7.0+）；iOS 构建需要 macOS、Xcode 与签名，当前本地 OCR 原生桥接以 Android 为主。',
    href: 'https://github.com/strangelion/LaTeXSnipper_mobile',
  },
  {
    name: 'LaTeXSnipper Office',
    scope: '公式编辑与插件生态',
    version: '代码版本 v1.4.2',
    status: '独立仓库',
    author: 'strangelion',
    license: 'AGPL-3.0',
    repository: 'strangelion/LaTeXSnipper-Office',
    description:
      '独立公式编辑器，以及 Native Office、Office.js、Obsidian、WPS、VS Code 和浏览器扩展。',
    points: [
      'Windows：Word / Excel / PowerPoint，Visio Beta',
      'macOS 12+ / Linux：Tauri 桌面编辑器',
      'Obsidian、WPS、VS Code、Chrome / Edge / Firefox',
    ],
    requirement:
      'Native VSTO / OLE 仅限 Windows；macOS 与 Office Web 使用 Office.js 或复制粘贴工作流。',
    href: 'https://github.com/strangelion/LaTeXSnipper-Office',
  },
  {
    name: 'LaTeXSnipper Core',
    scope: 'Rust 文档理解核心',
    version: 'v3.0.1',
    status: 'Core 3 稳定契约',
    author: 'strangelion',
    license: 'AGPL-3.0',
    repository: 'strangelion/latexsnipper-core',
    description:
      '提供统一 Document AST、OCR 流水线、多格式转换、CLI、Rust SDK、插件基础设施与 WASM 接口。',
    points: [
      '原生 ONNX Runtime 与浏览器 Tract / WASM',
      'LaTeX、Markdown、Typst、MathML、OMML 等语义转换',
      '能力注册表按运行时和模型报告真实 readiness',
    ],
    requirement:
      'Rust MSRV 1.88；支持 Windows、Linux、macOS 与 WASM。WASM 语义转换稳定，WASM OCR 仍按模型能力分级。',
    href: 'https://github.com/strangelion/latexsnipper-core',
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
      'Python >=3.10,<3.13，venv/pip 可用',
  },
  {
    name: 'macOS',
    status: 'Provider 层支持',
    capability:
      '原生快捷键、Qt 截图、screencapture 回退',
    requirement:
      'Python >=3.10,<3.13；截图需屏幕录制权限',
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
      'Windows Office 2019/2021/2024/LTSC/Microsoft 365；32/64 位',
  },
  {
    host: 'Microsoft PowerPoint',
    status: '已发布',
    insert: 'OLE、PNG',
    manage:
      '加载、更新、删除、OLE/PNG 转换、保留缩放',
    requirement:
      'Windows Office 2019/2021/2024/LTSC/Microsoft 365；32/64 位',
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
      '需要区分两个项目：SakuraMathcraft/LaTeXSnipper 随附的稳定 Windows VSTO 插件支持 Word 和 PowerPoint；strangelion/LaTeXSnipper-Office 是独立生态仓库，包含 Word、Excel、PowerPoint、Visio Beta、Office.js、WPS、Obsidian、VS Code 和浏览器扩展。',
  },
  {
    question: '是否支持外部模型？',
    answer:
      '桌面版支持 OpenAI-compatible、Ollama 和 MinerU Local，并支持公式、Markdown、纯文本等提示词输出模式。',
  },
  {
    question: '这些 LaTeXSnipper 项目是同一位作者吗？',
    answer:
      '不是。LaTeXSnipper Desktop 的作者是 SakuraMathcraft；LaTeXSnipper Mobile、LaTeXSnipper Office 与 LaTeXSnipper Core 的仓库作者和维护者标记为 strangelion。各项目的版本、稳定性与许可证也分别以各自仓库为准。',
  },
];
