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
        // 基于视口的滚动进度（元素底部触碰视口底部开始 → 元素顶部离开视口顶部结束）
        const raw = clamp(1 - rect.top / (vh + rect.height), 0, 1)
        // 缓动
        const easeOut = (t) => 1 - Math.pow(1 - t, 2.5)
        const p = easeOut(raw)
        // 淡入 + 上滑
        const opacity = Math.min(1, p * 1.8)
        const translateY = (1 - p) * 30
        inner.style.opacity = opacity.toFixed(4)
        inner.style.transform = `translateY(${translateY.toFixed(1)}px)`
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
          <div className="hero-badge">v2.4.0 LTS · 免费开源 · Windows / Linux / macOS</div>
          <div className="hero-ctas">
            <a className="btn primary" href="user_manual.html">阅读用户手册</a>
            <a className="btn" href="download.html">下载软件</a>
            <a className="btn" href="ocr_demo.html">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:4}}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              想要看下效果？
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
