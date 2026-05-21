/**
 * Typst to HTML converter
 * 将 Typst 标记转换为 HTML，支持数学公式渲染
 */
import katex from 'katex'

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * 渲染 KaTeX 公式，返回 HTML 字符串
 */
function renderMath(formula, displayMode = false) {
  try {
    return katex.renderToString(formula, {
      displayMode,
      throwOnError: false,
      trust: true,
      strict: false,
      macros: {
        '\\RR': '\\mathbb{R}',
        '\\ZZ': '\\mathbb{Z}',
        '\\NN': '\\mathbb{N}',
        '\\CC': '\\mathbb{C}',
      },
    })
  } catch (e) {
    console.warn('[TypstParser] KaTeX 渲染失败:', formula, e.message)
    return `<span class="math-error" title="${escapeHtml(e.message)}">${escapeHtml(formula)}</span>`
  }
}

/**
 * 将 Typst 数学语法转换为 LaTeX 语法
 * Typst 使用不同的一些语法，如:
 *   sqrt(x) -> \sqrt{x}
 *   x^2 -> x^2
 *   attach(x, t: a, b: c) -> x_t^a_c
 *   frac(a, b) -> \frac{a}{b}
 *   vec(a, b) -> \begin{pmatrix}a\\b\end{pmatrix}
 *   mat(...) -> \begin{pmatrix}...\end{pmatrix}
 *   lim(x -> 0) -> \lim_{x \to 0}
 */
function typstToLatex(formula) {
  let result = formula

  // Typst 函数 -> LaTeX 命令
  result = result.replace(/\bsqrt\s*\(([^)]+)\)/g, '\\sqrt{$1}')
  result = result.replace(/\bfrac\s*\(([^,]+),\s*([^)]+)\)/g, '\\frac{$1}{$2}')
  result = result.replace(/\babs\s*\(([^)]+)\)/g, '\\left|$1\\right|')
  result = result.replace(/\bln\s*\(/g, '\\ln(')
  result = result.replace(/\blog\s*\(/g, '\\log(')
  result = result.replace(/\bsin\s*\(/g, '\\sin(')
  result = result.replace(/\bcos\s*\(/g, '\\cos(')
  result = result.replace(/\btan\s*\(/g, '\\tan(')

  // vec(a, b) -> pmatrix
  result = result.replace(/\bvec\s*\(([^)]+)\)/g, (_, inner) => {
    const items = inner.split(',').map(s => s.trim()).join('\\\\')
    return `\\begin{pmatrix}${items}\\end{pmatrix}`
  })

  // mat(a, b; c, d) -> matrix
  result = result.replace(/\bmat\s*\(([^)]+)\)/g, (_, inner) => {
    const rows = inner.split(';').map(r => r.split(',').map(s => s.trim()).join('&')).join('\\\\')
    return `\\begin{pmatrix}${rows}\\end{pmatrix}`
  })

  // sum(a, b) -> \sum_{a}^{b}
  result = result.replace(/\bsum\s*\(([^,]+),\s*([^)]+)\)/g, '\\sum_{$1}^{$2}')
  result = result.replace(/\bprod\s*\(([^,]+),\s*([^)]+)\)/g, '\\prod_{$1}^{$2}')
  result = result.replace(/\bint\s*\(([^,]+),\s*([^)]+)\)/g, '\\int_{$1}^{$2}')

  // lim(x -> 0) -> \lim_{x \to 0}
  result = result.replace(/\blim\s*\(\s*(\w+)\s*->\s*([^)]+)\)/g, '\\lim_{$1 \\to $2}')

  // -> \to, => \Rightarrow, != \neq, <= \leq, >= \geq, ... \ldots
  result = result.replace(/\s+->\s+/g, ' \\to ')
  result = result.replace(/\s+=>\s+/g, ' \\Rightarrow ')
  result = result.replace(/!=/g, '\\neq ')
  result = result.replace(/<=/g, '\\leq ')
  result = result.replace(/>=/g, '\\geq ')
  result = result.replace(/\.\.\./g, '\\ldots ')
  result = result.replace(/\btimes\b/g, '\\times ')
  result = result.replace(/\bdiv\b/g, '\\div ')
  result = result.replace(/\bforall\b/g, '\\forall ')
  result = result.replace(/\bexists\b/g, '\\exists ')
  result = result.replace(/\binf\b/g, '\\infty ')

  // 希腊字母
  const greekMap = {
    alpha: '\\alpha', beta: '\\beta', gamma: '\\gamma', delta: '\\delta',
    epsilon: '\\epsilon', zeta: '\\zeta', eta: '\\eta', theta: '\\theta',
    iota: '\\iota', kappa: '\\kappa', lambda: '\\lambda', mu: '\\mu',
    nu: '\\nu', xi: '\\xi', pi: '\\pi', rho: '\\rho',
    sigma: '\\sigma', tau: '\\tau', upsilon: '\\upsilon', phi: '\\phi',
    chi: '\\chi', psi: '\\psi', omega: '\\omega',
    Alpha: '\\Alpha', Beta: '\\Beta', Gamma: '\\Gamma', Delta: '\\Delta',
    Theta: '\\Theta', Lambda: '\\Lambda', Xi: '\\Xi', Pi: '\\Pi',
    Sigma: '\\Sigma', Phi: '\\Phi', Psi: '\\Psi', Omega: '\\Omega',
  }
  for (const [name, latex] of Object.entries(greekMap)) {
    result = result.replace(new RegExp(`\\b${name}\\b`, 'g'), latex)
  }

  return result
}

/**
 * 处理文本中的行内数学公式 $...$
 */
function processInlineMath(text) {
  // 匹配 $...$ (非贪婪)，排除 $$ 块级公式
  return text.replace(/(?<!\$)\$(?!\$)(.+?)(?<!\$)\$(?!\$)/g, (_, formula) => {
    const latex = typstToLatex(formula.trim())
    return renderMath(latex, false)
  })
}

/**
 * 将 Typst 标记转换为 HTML
 */
export function parseTypst(source) {
  const lines = source.split('\n')
  const output = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i].trim()

    // 跳过空行
    if (!line) {
      i++
      continue
    }

    // 跳过注释
    if (line.startsWith('//')) {
      i++
      continue
    }

    // === 块级数学公式 $$...$$ ===
    if (line.startsWith('$$')) {
      const mathLines = []
      // 单行块级: $$ ... $$
      if (line.endsWith('$$') && line.length > 4) {
        const formula = line.slice(2, -2).trim()
        const latex = typstToLatex(formula)
        output.push(`<div class="math-display">${renderMath(latex, true)}</div>`)
        i++
        continue
      }
      // 多行块级
      i++
      while (i < lines.length && !lines[i].trim().startsWith('$$')) {
        mathLines.push(lines[i])
        i++
      }
      if (i < lines.length) i++ // 跳过结束的 $$
      const formula = mathLines.join('\n').trim()
      const latex = typstToLatex(formula)
      output.push(`<div class="math-display">${renderMath(latex, true)}</div>`)
      continue
    }

    // === Typst 数学标记 $ ... $ (带空格) ===
    if (/^\$\s/.test(line) && line.trimEnd().endsWith('$')) {
      const formula = line.trim().slice(1, -1).trim()
      const latex = typstToLatex(formula)
      output.push(`<div class="math-display">${renderMath(latex, true)}</div>`)
      i++
      continue
    }

    // 标题 (== 或 ===)
    const headingMatch = line.match(/^(={2,})\s*(.+)$/)
    if (headingMatch) {
      const level = headingMatch[1].length
      const title = headingMatch[2].replace(/\s*<([^>]+)>\s*$/, '')
      const processedTitle = processInlineMath(escapeHtml(title))
      output.push(`<h${level}>${convertInlineMarkup(processedTitle)}</h${level}>`)
      i++
      continue
    }

    // 代码块
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim()
      const codeLines = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      if (i < lines.length) i++ // 跳过结束的 ```
      const code = codeLines.join('\n').trim()
      const langAttr = lang ? ` class="language-${escapeHtml(lang)}"` : ''
      output.push(
        `<div class="code-block"><pre${langAttr}><button class="copy-btn" onclick="copyCode(this)">复制</button><code>${escapeHtml(code)}</code></pre></div>`
      )
      continue
    }

    // 列表项
    if (line.startsWith('-') || line.startsWith('+')) {
      const marker = line[0]
      const items = []
      while (i < lines.length) {
        const currentLine = lines[i].trim()
        if (!currentLine.startsWith(marker)) break
        const content = currentLine.slice(1).trim()
        items.push(`<li>${processInlineMath(convertInlineMarkup(escapeHtml(content)))}</li>`)
        i++
      }
      const tag = marker === '+' ? 'ol' : 'ul'
      output.push(`<${tag}>\n${items.join('\n')}\n</${tag}>`)
      continue
    }

    // 普通段落（支持行内数学公式）
    const escaped = escapeHtml(line)
    const withMath = processInlineMath(escaped)
    output.push(`<p>${convertInlineMarkup(withMath)}</p>`)
    i++
  }

  return output.join('\n')
}

function convertInlineMarkup(text) {
  // 粗体
  text = text.replace(/\*(.+?)\*/g, '<strong>$1</strong>')
  // 代码
  text = text.replace(/`(.+?)`/g, '<code>$1</code>')
  // 链接
  text = text.replace(/#link\(<([^>]+)>\)\[([^\]]*)\]/g, '<a href="$1" target="_blank">$2</a>')
  // 文本样式
  text = text.replace(/#text\(\s*weight:\s*"bold"\s*\)\[([^\]]*)\]/g, '<strong>$1</strong>')
  return text
}

export default parseTypst
