import handwritingImage from '../../assets/images/product/handwriting.webp';
import ocrResultImage from '../../assets/images/product/ocr-result.webp';
import workspaceImage from '../../assets/images/product/hero-workspace.webp';
import { DESKTOP_RELEASE_LABEL } from './siteContent';

export const landingImages = {
  handwriting: handwritingImage,
  ocrResult: ocrResultImage,
  workspace: workspaceImage,
};

export const captureSources = [
  {
    id: 'screenshot',
    index: '01',
    title: '全局截图',
    description: 'Ctrl+F / Cmd+F 一键框选屏幕区域，识别结果直接送入工作台。',
  },
  {
    id: 'image',
    index: '02',
    title: '本地图片',
    description: '支持 PNG、JPEG、WebP、TIFF 等多格式，轻松提取教材与论文公式。',
  },
  {
    id: 'pdf',
    index: '03',
    title: '按页 PDF',
    description: '逐页解析论文与讲义，按版面顺序保留公式与正文混排结构。',
  },
  {
    id: 'handwriting',
    index: '04',
    title: '手写画布',
    description: '手写推导即刻转写为可编辑公式，继续在 MathLive 中精修。',
  },
  {
    id: 'clipboard',
    index: '05',
    title: '剪贴板与远程',
    description: 'Ctrl+V 粘贴截图，或由手机通过远程桥接把照片直传电脑算力。',
  },
];

export const recognitionStages = [
  {
    id: 'frame',
    index: '01',
    title: '定位公式与版面区域',
    description: '独立公式检测与文字检测模型区分行内公式、块级公式与正文段落。',
  },
  {
    id: 'symbols',
    index: '02',
    title: '解析二维符号关系',
    description: 'ONNX 本地推理保留上下标、分式、矩阵与微积分算子的空间层次。',
  },
  {
    id: 'expression',
    index: '03',
    title: '重建可编辑数学结构',
    description: '输出结构化表达式，直接进入 MathLive 编辑、符号计算与多格式导出。',
  },
];

export const formulaExample = {
  visual: '∫₀∞ e⁻ˣ² dx',
  latex: '\\int_0^\\infty e^{-x^2}\\,dx',
  description: '从零到无穷的高斯积分',
};

export const astNodes = [
  {
    id: 'formula',
    title: 'Formula',
    detail: '一个完整的数学表达式，可被多个工作流共同引用。',
    token: '∫₀∞ e⁻ˣ² dx',
  },
  {
    id: 'integral',
    title: 'Integral',
    detail: '积分算子将上下界、被积函数和微分项组织为一个结构节点。',
    token: '∫',
  },
  {
    id: 'bounds',
    title: 'Bounds',
    detail: '下界为 0，上界为 ∞。这些值不是普通文本，而是结构化子节点。',
    token: '₀∞',
  },
  {
    id: 'power',
    title: 'Exponential',
    detail: '指数关系保留了底数 e、负号、变量 x 与平方之间的语义。',
    token: 'e⁻ˣ²',
  },
  {
    id: 'differential',
    title: 'Differential',
    detail: '微分项 dx 连接积分变量与积分运算。',
    token: 'dx',
  },
];

export const conversionFormats = [
  {
    id: 'latex',
    label: 'LaTeX',
    code: '\\int_0^\\infty e^{-x^2}\\,dx',
    description: '论文、讲义、Obsidian 与 MathLive 编辑器的通用源码格式。',
  },
  {
    id: 'typst',
    label: 'Typst',
    code: '$ integral_0^infinity e^(-x^2) dif x $',
    description: '直接贴合 Typst 现代排版与自动化文档构建流程。',
  },
  {
    id: 'mathml',
    label: 'MathML',
    code: '<math><msubsup><mo>∫</mo><mn>0</mn><mo>∞</mo></msubsup><msup><mi>e</mi><mrow><mo>-</mo><msup><mi>x</mi><mn>2</mn></msup></mrow></msup><mi>d</mi><mi>x</mi></math>',
    description: '为网页渲染、无障碍阅读与 Word 剪贴板粘贴保留完整语义树。',
  },
  {
    id: 'omml',
    label: 'OMML',
    code: '<m:oMath><m:int><m:intPr><m:limLow><m:e><m:r><m:t>0</m:t></m:r></m:e></m:limLow><m:limUpp><m:e><m:r><m:t>∞</m:t></m:r></m:e></m:limUpp></m:intPr></m:int></m:oMath>',
    description: '直通 Microsoft Word 原生公式对象，并支持与 OLE / MathType 互转。',
  },
];

export const ecosystemCoreNode = {
  id: 'core',
  name: 'latexsnipper-core',
  badge: 'Core 3 · v3.2.1',
  license: 'AGPL-3.0',
  role: 'SHARED MATH ENGINE',
  repository: 'strangelion/latexsnipper-core',
  summary:
    '37-crate Rust 文档理解内核，以统一 Document AST（schema 1.0.0）串联原生 ONNX / 浏览器 WASM 推理与跨格式语义转换。',
  highlights: [
    '支持 19 种输入与 14 种输出，含 AsciiMath / UnicodeMath 单公式互转',
    '提供 CLI、Rust SDK、C FFI、PyO3、WASI 插件宿主与浏览器 WASM',
    '内置离线绘图消毒管线（SVG / TikZ / PGFPlots / Graphviz）与自定义符号包',
  ],
  href: 'https://github.com/strangelion/latexsnipper-core',
  siteRoute: '/open-source.html',
  siteLabel: '查看开源许可与运行时',
};

export const ecosystemNodes = [
  {
    id: 'desktop',
    name: 'Desktop',
    fullName: 'LaTeXSnipper Desktop',
    badge: DESKTOP_RELEASE_LABEL,
    license: 'GPL-3.0',
    role: 'FLAGSHIP WORKBENCH',
    repository: 'SakuraMathcraft/LaTeXSnipper',
    summary:
      '旗舰桌面数学工作台，提供自包含离线安装包（Windows / Linux / macOS），内置 MathCraft OCR、MathLive 计算工作台与 Word / PowerPoint VSTO 插件。',
    highlights: [
      '自包含离线部署：内置运行环境与模型，无需首次联网配置',
      '20 种导出格式（12 内置 + 8 Pandoc），支持 OLE 与 MathType 双向互转',
      '内置 Automation API v1（端口 28765），串联 Office 插件与远程网页端',
    ],
    href: 'https://github.com/SakuraMathcraft/LaTeXSnipper',
    siteRoute: '/download.html',
    siteLabel: '下载桌面版',
  },
  {
    id: 'office',
    name: 'Office',
    fullName: 'LaTeXSnipper Office',
    badge: 'v1.7.2',
    license: 'AGPL-3.0',
    role: 'EDITOR & PLUGINS',
    repository: 'strangelion/LaTeXSnipper-Office',
    summary:
      'Tauri 2.0 独立公式与离线绘图套件，直接嵌入 Core 3 内核，覆盖 Word、Excel、PowerPoint、Visio、WPS、VS Code 与主流浏览器扩展。',
    highlights: [
      '5 大工作区：公式编辑、Core OCR 识别、2,100+ 预设公式库、Office 桥接与诊断',
      '内置离线 SVG / TikZ / PGFPlots / Graphviz / Mermaid 绘图与自定义符号合成器',
      'Windows 原生 VSTO/OLE 命名管道 + 跨平台本地桥接服务',
    ],
    href: 'https://github.com/strangelion/LaTeXSnipper-Office',
    siteRoute: '/download.html#projectBoundaryTitle',
    siteLabel: '查看生态入口',
  },
  {
    id: 'mobile',
    name: 'Mobile',
    fullName: 'LaTeXSnipper Mobile',
    badge: 'v1.3.1',
    license: 'AGPL-3.0',
    role: 'OFFLINE ANDROID OCR',
    repository: 'strangelion/LaTeXSnipper_mobile',
    summary:
      '基于 Capacitor 的移动端离线数学识别应用，Android 通过 Java ONNX Runtime（NNAPI 加速）在本地运行公式、文字与混合 OCR。',
    highlights: [
      '拍照、相册、PDF 与手写识别，按需下载模型包并校验 SHA-256',
      '集成 MathLive 编辑、KaTeX / MathJax 双渲染引擎与 7 套视觉主题',
      '内嵌 Core WASM 完成 AST 校验与 9 种格式语义导出',
    ],
    href: 'https://github.com/strangelion/LaTeXSnipper_mobile',
    siteRoute: '/download.html',
    siteLabel: '获取 Android APK',
  },
  {
    id: 'obsidian',
    name: 'Obsidian',
    fullName: 'Obsidian Formula Library',
    badge: 'v1.6.3',
    license: 'AGPL-3.0',
    role: 'KNOWLEDGE BASE PLUGIN',
    repository: 'strangelion/obsidian-formula-library',
    summary:
      '零外部服务依赖的独立 Obsidian 社区插件（桌面与移动双端可用），内嵌 Core WASM 实现单公式 6×6 跨格式互转。',
    highlights: [
      '内置 2,216 条公式（19 分类）、拼音/别名模糊搜索与 19 类参数化模板',
      '支持矩阵数据粘贴、交互式函数绘图（滑块调参）与 Mermaid 图形编辑器',
      '36 条单公式互转路线（LaTeX / Typst / MathML / OMML / AsciiMath / UnicodeMath）',
    ],
    href: 'https://github.com/strangelion/obsidian-formula-library',
    siteRoute: '/open-source.html#ecosystemMatrix',
    siteLabel: '查看仓库详情',
  },
  {
    id: 'web',
    name: 'Web',
    fullName: 'LaTeXSnipper Web',
    badge: 'Core WASM',
    license: 'Self-Hosted',
    role: 'BROWSER WORKSPACE',
    repository: 'strangelion/LaTeXSnipper_Web',
    summary:
      '当前所在站点：提供浏览器本地 Core WASM 单公式识别工作区、直连桌面版算力的远程桥接页，以及完整版本下载与用户手册。',
    highlights: [
      '/ocr.html：WASM / Tract 本地单公式推理，模型按需缓存、图片不上传',
      '/remote.html：通过安全隧道或 HTTPS 直连桌面端 Automation API v1',
      '/user_manual.html：Typst 自动构建的完整双端阅读版用户手册',
    ],
    href: 'https://github.com/strangelion/LaTeXSnipper_Web',
    siteRoute: '/ocr.html',
    siteLabel: '打开在线识别',
  },
];
