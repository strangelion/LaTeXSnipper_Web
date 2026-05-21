import React, { useState, useEffect } from 'react'

export default function Header() {
  const [isDark, setIsDark] = useState(false)
  const STORAGE_KEY = 'latexSnipper-theme'

  useEffect(() => {
    const loadTheme = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved === 'dark' || saved === 'light') {
          document.documentElement.setAttribute('data-theme', saved)
          setIsDark(saved === 'dark')
        } else {
          document.documentElement.removeAttribute('data-theme')
          setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches)
        }
      } catch (e) {}
    }

    loadTheme()

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
      localStorage.setItem(STORAGE_KEY, newTheme)
    } catch (e) {}
    setIsDark(newTheme === 'dark')
  }

  return (
    <header className="hero-header">
      <div className="container hero-inner">
        <div className="brand">
          <img 
            className="brand-icon" 
            src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAApLSURBVFhHfZcJkBTVHcZnZu+TdZddNILGMhK5NF6lRanEKJLgIjdBECOKijAse3KIaKVyWBWPsBxqzKkklsaKigqsIHKDgIsgyCLswd7X9Fx99+v+keqeBQxZfFWv3sz/dff3ve//9f+99vm+017/RGHVRpXqGovVmwXVmwVrP7VYu8VmXY1gzWbhxdfVmKzdJKiuEVRvsqnebLF6k2DtZsHrG02qN1le/LUtFm/vFme/i9Fve2P9lvjrG8KUvGsx8mWFa1/Rua5acH21yfWrLYavEQxfZTHMi1kMWyUYucby5kassRi51uCG1YIb1giuf1kw6hXBdS8LRrxi8at/Ran5SnAx5v+0D7d1k1FukVVukVlqkLnIJCdokl1qkhXUSQ9qZCwyyFlsMKDEINftiw0yykyySk3ySg3ySi0GlBrklpnkluhcFjTILzEpWmpyxTKV2garfxInTytn0xZrpMxX8Q2r4bKVgqLnTS7/tcWg31gMfM6gYIVB/nJB0UqDoufcrpG/TCfvWZ38FTp5S1Tyl+oMfMZi4AqdAUt18pZqXP68TuaU0+SXm1yxUu6fgH/iMTIWKqTdtpecoEFqUCdnsU52qUGOt8LEyjNdhdzfJe5/jawKk8wS3VMto8Iis1KQWWmRWWGRVSXIqrDIrrTIKDUITGmgcInZP4HMUh3f9Aj+cvfhFmm3v+OBpC8ySJraiuMIrnryC5IfjdIQd84ebrcQwiTzqR7Sgio7jyukLoyRXiKTHlS89GQFZdJLNHLKVfKWOAx6Vqdw2SVSUFimk3zzfjIWCQ806+Y38T+lkDJqNbbtYNsWtuPgCIHlCJJmd6CagoLRr55N+ck/MGy8a4Rj89mRXoQtUE2DtzfWk75YIbvKYkClYPj06akX4/sKyzQCQ98n3ZWuxCTzrk04tsC0LDTLxBIWz6w9SF2XRdGsnehCYAqTtPv3k1J8kJDmeCrduuBz3v/0AGlzugjp8NIHHeQvNShcYZG31CSn3OKWW55MuRjfV7BYIXDTNi9/ibfAJKvcIKtUJ6/MIrvMJHuxGzPJKTPIWqR6bnc9kl1uerKnz20mOxgltyRK4VKNgVU6gyoNipZbDHT7CoucSoFvzJjki/F9BeUaKWP28qdPm/n71mbWb+9gw8FeNtSG2H5a4WCLytc9Fie6BaclmzbZpl1x6FQdJNMhbNpETYOYIYgbDlFbELcdosJGtkF2QNi2Z1LX8xfj+wrLVJLu2YWsOciyQFUsNNXp68KLR1SBpNpEVXfePt/da9xRUayLYn3/DQdNd9Adh9yllzDh4MoYgft2o3gPsomoGiFN6XuwjaTg5TmiCCQNL3YOTJFtVLf3XeuNqoymXiAUU2Dda+spWH4JAldWxEgatxtFx7tBUhXCqiCuOIRlk3BMJxa1icfdh1vEZRNFcdVKrF5T+1at6qiqjKKqXtc0wyPV1a2ydds+bnr2ZP8EBlcpBO7fjay6KxLomu2B+qaeIXlWD4FZvfh/2UngYYmkOWGS5vTin92Nb2YLqp4goSrCu/d8GjSBrptEohqHDjdy7EQTXx6p65/AkCUqgXE7UbVE7tzVNLZE8E+oo60zTluPycmmOCmPK1w2fQ+dvYK2jhiBaZ3oho3uknAVcxfQ5xHXO64y4ZDGb19YR0e3SkvM7p/AVVUyyeM/RzccFM290SFpdA3hmE1Yc5AUmz/8+RiBx7QLAJrwQAMT6/DP6EDX8LxQ+cI2FEUQlkyiMZ3GZolvTjZ55PKCrf0TGFIVJmncDlTN9kh4AIogItue6cIxh8BshbSHZS896TOOkzrzOLpqE3iwj4=" 
            alt="LaTeXSnipper"
          />
          <a href="index.html">LaTeXSnipper</a>
        </div>
        <nav className="main-nav">
          <a href="user_manual.html">用户手册</a>
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
