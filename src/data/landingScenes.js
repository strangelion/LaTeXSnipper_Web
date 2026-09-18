import handwritingImage from '../../assets/images/product/handwriting.webp';
import ocrResultImage from '../../assets/images/product/ocr-result.webp';
import workspaceImage from '../../assets/images/product/hero-workspace.webp';

export const landingImages = {
  handwriting: handwritingImage,
  ocrResult: ocrResultImage,
  workspace: workspaceImage,
};

export const captureSources = [
  {
    id: 'screenshot',
    title: '截图',
    description: '把屏幕上的公式直接带入识别流程。',
  },
  {
    id: 'image',
    title: '图片',
    description: '从教材、论文或照片中提取可编辑内容。',
  },
  {
    id: 'pdf',
    title: 'PDF',
    description: '按页处理文档中的公式和混排文本。',
  },
  {
    id: 'handwriting',
    title: '手写',
    description: '从手写输入开始，继续在工作台中修正。',
  },
  {
    id: 'clipboard',
    title: '剪贴板',
    description: '在已有应用和数学工作空间之间快速切换。',
  },
];

export const recognitionStages = [
  {
    id: 'frame',
    title: '定位公式区域',
    description: '先识别页面中需要处理的数学内容。',
  },
  {
    id: 'symbols',
    title: '拆分符号关系',
    description: '保留上下标、分式和运算符之间的空间关系。',
  },
  {
    id: 'expression',
    title: '重建数学表达式',
    description: '让结果能够被继续检查、编辑和转换。',
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
    description: '适合论文、笔记和数学编辑器。',
  },
  {
    id: 'typst',
    label: 'Typst',
    code: '$ integral_0^infinity e^(-x^2) dif x $',
    description: '适合 Typst 文档工作流。',
  },
  {
    id: 'mathml',
    label: 'MathML',
    code: '<math><msubsup><mo>∫</mo><mn>0</mn><mo>∞</mo></msubsup><msup><mi>e</mi><mrow><mo>-</mo><msup><mi>x</mi><mn>2</mn></msup></mrow></msup><mi>d</mi><mi>x</mi></math>',
    description: '为网页和可访问性工具保留数学结构。',
  },
  {
    id: 'omml',
    label: 'OMML',
    code: '<m:oMath><m:int><m:intPr><m:limLow><m:e><m:r><m:t>0</m:t></m:r></m:e></m:limLow><m:limUpp><m:e><m:r><m:t>∞</m:t></m:r></m:e></m:limUpp></m:intPr></m:int></m:oMath>',
    description: '适合 Microsoft Office 文档集成。',
  },
];

export const ecosystemNodes = [
  {
    id: 'web',
    name: 'Web',
    repository: 'strangelion/LaTeXSnipper_Web',
    summary: 'Browser-first mathematical workspace',
    href: 'https://github.com/strangelion/LaTeXSnipper_Web',
  },
  {
    id: 'desktop',
    name: 'Desktop',
    repository: 'SakuraMathcraft/LaTeXSnipper',
    summary: 'Full desktop workflow',
    href: 'https://github.com/SakuraMathcraft/LaTeXSnipper',
  },
  {
    id: 'office',
    name: 'Office',
    repository: 'strangelion/LaTeXSnipper-Office',
    summary: 'Document-oriented integration',
    href: 'https://github.com/strangelion/LaTeXSnipper-Office',
  },
  {
    id: 'mobile',
    name: 'Mobile',
    repository: 'strangelion/LaTeXSnipper_mobile',
    summary: 'Capture and quick conversion',
    href: 'https://github.com/strangelion/LaTeXSnipper_mobile',
  },
];
