/**
 * Typst to HTML converter
 * 将 Typst 标记转换为 HTML
 */

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function convertInlineMarkup(text) {
  // 粗体
  text = text.replace(/\*(.+?)\*/g, '<strong>$1</strong>')
  // 代码
  text = text.replace(/`(.+?)`/g, '<code>$1</code>')
  // 链接
  text = text.replace(/#link\(<([^>]+)>\)\[([^\]]*)\]/g, '<a href="#$1">$2</a>')
  // 文本样式
  text = text.replace(/#text\(\s*weight:\s*"bold"\s*\)\[([^\]]*)\]/g, '<strong>$1</strong>')
  return text
}

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

    // 标题 (== 或 ===)
    const headingMatch = line.match(/^(={2,})\s*(.+)$/)
    if (headingMatch) {
      const level = headingMatch[1].length
      const title = headingMatch[2].replace(/\s*<([^>]+)>\s*$/, '')
      output.push(`<h${level}>${convertInlineMarkup(escapeHtml(title))}</h${level}>`)
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
      const code = codeLines.join('\n').trim()
      const langAttr = lang ? ` class="language-${escapeHtml(lang)}"` : ''
      output.push(
        `<div class="code-block"><pre${langAttr}><button class="copy-btn" onclick="copyCode(this)">复制</button><code>${escapeHtml(code)}</code></pre></div>`
      )
      i++
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
        items.push(`<li>${convertInlineMarkup(escapeHtml(content))}</li>`)
        i++
      }
      const tag = marker === '+' ? 'ol' : 'ul'
      output.push(`<${tag}>\n${items.join('\n')}\n</${tag}>`)
      continue
    }

    // 普通段落
    output.push(`<p>${convertInlineMarkup(escapeHtml(line))}</p>`)
    i++
  }

  return output.join('\n')
}

export default parseTypst
