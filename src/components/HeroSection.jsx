import React, { useState, useEffect } from 'react'

export default function HeroSection() {
  const [typed, setTyped] = useState('')
  const words = ['快速插入', '实时预览', '智能识别']
  const [wordIndex, setWordIndex] = useState(0)
  const [charIndex, setCharIndex] = useState(0)
  const [isForward, setIsForward] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      const word = words[wordIndex]
      if (isForward) {
        if (charIndex < word.length) {
          setTyped(word.slice(0, charIndex + 1))
          setCharIndex(charIndex + 1)
        } else {
          setIsForward(false)
        }
      } else {
        if (charIndex > 0) {
          setTyped(word.slice(0, charIndex - 1))
          setCharIndex(charIndex - 1)
        } else {
          setIsForward(true)
          setWordIndex((wordIndex + 1) % words.length)
        }
      }
    }, isForward ? 80 : 40)

    return () => clearTimeout(timer)
  }, [typed, wordIndex, charIndex, isForward, words])

  return (
    <section className="slide-section" data-slide="hero">
      <div className="slide-scroll">
        <div className="slide-inner hero-layout">
          <h1 className="hero-title">数学内容一站式工作空间</h1>
          <p className="hero-sub">
            截取识别 → 手写输入 → 编辑计算 → 导出结果 — <span id="typed">{typed}</span>
          </p>
          <div className="hero-ctas">
            <a className="btn primary" href="user_manual.html">阅读用户手册</a>
            <a className="btn" href="https://github.com/SakuraMathcraft/LaTeXSnipper" target="_blank" rel="noopener">查看源码</a>
          </div>
        </div>
      </div>
    </section>
  )
}
