import React, { useState, useEffect, useRef } from 'react'

export default function HeroSection() {
  const [typed, setTyped] = useState('')
  const words = ['快速插入', '实时预览', '智能识别']
  const [wordIndex, setWordIndex] = useState(0)
  const [charIndex, setCharIndex] = useState(0)
  const [isForward, setIsForward] = useState(true)

  const sectionRef = useRef(null)
  const innerRef = useRef(null)

  // 打字效果
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

  // 滚动驱动缩放动画：进入时 2×，向下滚动缩小至 1×
  useEffect(() => {
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
    const lerp = (a, b, t) => a + (b - a) * t

    const isMobile = window.innerWidth < 768
    let raf = null

    const update = () => {
      raf = null
      const section = sectionRef.current
      const inner = innerRef.current
      if (!section || !inner) return

      if (isMobile) {
        const rect = section.getBoundingClientRect()
        const vh = window.innerHeight
        const p = clamp(1 - (rect.top + rect.height) / (vh + rect.height), 0, 1)
        inner.style.opacity = Math.min(1, (1 - p) * 4).toFixed(4)
        inner.style.transform = 'none'
      } else {
        const range = section.offsetHeight
        const raw = clamp(window.scrollY / range, 0, 1)
        // Cinematic ease — power 2.5 curve for snappier reveal
        const easeZ = 1 - Math.pow(1 - raw, 2.5)
        const scale = lerp(2, 1, clamp(easeZ / 0.5, 0, 1))
        const opacity = easeZ < 0.5 ? 1 : clamp(1 - (easeZ - 0.5) / 0.5, 0, 1)

        inner.style.transform = `scale(${scale.toFixed(4)})`
        inner.style.opacity = opacity.toFixed(4)
      }
    }

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    update()

    return () => {
      window.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <section className="slide-section" data-slide="hero" ref={sectionRef}>
      <div className="slide-scroll">
        <div className="slide-inner hero-layout" ref={innerRef}>
          <h1 className="hero-title">数学内容一站式工作空间</h1>
          <p className="hero-sub">
            截取识别 → 手写输入 → 编辑计算 → 导出结果 — <span id="typed">{typed}</span>
          </p>
          <div className="hero-ctas">
            <a className="btn primary" href="manual.html">阅读用户手册</a>
            <a className="btn" href="https://github.com/SakuraMathcraft/LaTeXSnipper" target="_blank" rel="noopener">查看源码</a>
          </div>
        </div>
      </div>
    </section>
  )
}
