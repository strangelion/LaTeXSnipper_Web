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
        <nav className="main-nav" aria-label="主导航">
          <a href="download.html">下载</a>
          <a href="user_manual.html">用户手册</a>
          <a href="https://github.com/SakuraMathcraft/LaTeXSnipper" target="_blank" rel="noopener noreferrer">GitHub</a>
          <button
            className="theme-toggle"
            id="themeToggle"
            title="切换日/夜模式"
            aria-label={isDark ? "切换到亮色模式" : "切换到暗色模式"}
            onClick={handleThemeToggle}
          >
            {isDark ? (
              <>
                <svg className="theme-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"/>
                  <line x1="12" y1="1" x2="12" y2="3"/>
                  <line x1="12" y1="21" x2="12" y2="23"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                  <line x1="1" y1="12" x2="3" y2="12"/>
                  <line x1="21" y1="12" x2="23" y2="12"/>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
                <span className="theme-label">白天</span>
              </>
            ) : (
              <>
                <svg className="theme-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
                <span className="theme-label">黑夜</span>
              </>
            )}
          </button>
        </nav>
      </div>
    </header>
  )
}
