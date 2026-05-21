import React, { useState, useEffect } from 'react'
import { parseTypst } from '../utils/typstParser'
import './TypstEditor.css'

export default function TypstEditor({ filePath = null }) {
  const [source, setSource] = useState('')
  const [html, setHtml] = useState('')
  const [fileName, setFileName] = useState('document.typ')

  useEffect(() => {
    if (filePath) {
      loadTypstFile(filePath)
    }
  }, [filePath])

  useEffect(() => {
    // 实时转换
    const converted = parseTypst(source)
    setHtml(converted)
  }, [source])

  const loadTypstFile = async (path) => {
    try {
      const response = await fetch(path)
      const text = await response.text()
      setSource(text)
      setFileName(path.split('/').pop())
    } catch (error) {
      console.error('Failed to load Typst file:', error)
    }
  }

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (event) => {
      setSource(event.target?.result || '')
    }
    reader.readAsText(file)
  }

  const downloadHtml = () => {
    const element = document.createElement('a')
    const file = new Blob([html], { type: 'text/html' })
    element.href = URL.createObjectURL(file)
    element.download = fileName.replace('.typ', '.html')
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  return (
    <div className="typst-editor">
      <div className="editor-header">
        <h2>Typst 编辑器</h2>
        <div className="editor-controls">
          <label className="file-input-label">
            上传 Typst 文件
            <input
              type="file"
              accept=".typ"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </label>
          <button onClick={downloadHtml} className="btn-download">
            下载 HTML
          </button>
        </div>
      </div>

      <div className="editor-container">
        <div className="editor-panel">
          <h3>源代码</h3>
          <textarea
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="输入或粘贴 Typst 代码..."
            className="editor-textarea"
          />
        </div>

        <div className="preview-panel">
          <h3>预览</h3>
          <div
            className="preview-content"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>
    </div>
  )
}
