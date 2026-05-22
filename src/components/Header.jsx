import React, { useState, useEffect } from 'react'

export default function Header() {
  const [isDark, setIsDark] = useState(false)
  const [palette, setPalette] = useState('cool')
  const THEME_KEY = 'latexSnipper-theme'
  const PALETTE_KEY = 'latexSnipper-palette'

  useEffect(() => {
    const loadTheme = () => {
      try {
        const saved = localStorage.getItem(THEME_KEY)
        if (saved === 'dark' || saved === 'light') {
          document.documentElement.setAttribute('data-theme', saved)
          setIsDark(saved === 'dark')
        } else {
          document.documentElement.removeAttribute('data-theme')
          setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches)
        }
      } catch (e) {}
    }

    const loadPalette = () => {
      try {
        const saved = localStorage.getItem(PALETTE_KEY)
        if (saved === 'cool' || saved === 'warm' || saved === 'minimal') {
          document.documentElement.setAttribute('data-palette', saved)
          setPalette(saved)
        } else {
          document.documentElement.setAttribute('data-palette', 'cool')
          setPalette('cool')
        }
      } catch (e) {}
    }

    loadTheme()
    loadPalette()

    const darkMQ = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => loadTheme()
    darkMQ.addEventListener('change', handleChange)
    return () => darkMQ.removeEventListener('change', handleChange)
  }, [])

  const handleThemeToggle = () => {
    const root = document.documentElement
    const current = root.getAttribute('data-theme')
    const newTheme = current === 'dark' ? 'light' : 'dark'
    root.setAttribute('data-theme', newTheme)
    try {
      localStorage.setItem(THEME_KEY, newTheme)
    } catch (e) {}
    setIsDark(newTheme === 'dark')
  }

  const handlePaletteChange = (e) => {
    const newPalette = e.target.value
    document.documentElement.setAttribute('data-palette', newPalette)
    setPalette(newPalette)
    try {
      localStorage.setItem(PALETTE_KEY, newPalette)
    } catch (e) {}
  }

  return (
    <header className="hero-header">
      <div className="container hero-inner">
        <div className="brand">
          <img 
            className="brand-icon" 
            src="/assets/images/icon.png"
            alt="LaTeXSnipper"
          />
          <a href="index.html">LaTeXSnipper</a>
        </div>
        <nav className="main-nav">
          <a href="manual.html">用户手册</a>
          <a href="https://github.com/SakuraMathcraft/LaTeXSnipper" target="_blank" rel="noopener">GitHub</a>
          <button 
            className="theme-toggle" 
            id="themeToggle" 
            title="切换日/夜模式"
            onClick={handleThemeToggle}
          >
            {isDark ? '☀️' : '🌙'}
          </button>
        </nav>
      </div>
    </header>
  )
}
