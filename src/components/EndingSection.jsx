import React, { useEffect, useRef } from 'react'

export default function EndingSection() {
  const sectionRef = useRef(null)
  const innerRef = useRef(null)
  const itemsRef = useRef([])

  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current || !innerRef.current) return

      const rect = sectionRef.current.getBoundingClientRect()
      const vh = window.innerHeight
      const progress = Math.max(0, Math.min(1, 1 - (rect.top + rect.height) / (vh + rect.height)))

      const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
      const lerp = (a, b, t) => a + (b - a) * t
      const segment = (p, a, b) => clamp((p - a) / (b - a), 0, 1)

      const f = segment(progress, 0.05, 0.5)
      innerRef.current.style.opacity = f.toFixed(4)
      innerRef.current.style.transform = `translateY(${lerp(40, 0, f).toFixed(1)}px)`

      // Stagger child items
      itemsRef.current.forEach((item, i) => {
        if (!item) return
        const delay = i * 0.08
        const itemF = segment(progress, 0.1 + delay, 0.55 + delay)
        item.style.opacity = itemF.toFixed(4)
        item.style.transform = `translateY(${lerp(24, 0, itemF).toFixed(1)}px)`
      })
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const setItemRef = (el, i) => { itemsRef.current[i] = el }

  return (
    <section className="slide-section" data-slide="ending" ref={sectionRef}>
      <div className="slide-scroll">
        <div className="slide-inner ending-layout" ref={innerRef}>
          <h2 className="ending-title">开始使用 LaTeXSnipper</h2>
          <p className="ending-sub">一站式解决你的数学公式工作流</p>

          <div className="ending-features">
            <div className="ending-feature" ref={(el) => setItemRef(el, 0)}>
              <span className="ending-icon">📸</span>
              <span>截图识别</span>
            </div>
            <div className="ending-feature" ref={(el) => setItemRef(el, 1)}>
              <span className="ending-icon">✏️</span>
              <span>手写输入</span>
            </div>
            <div className="ending-feature" ref={(el) => setItemRef(el, 2)}>
              <span className="ending-icon">🧮</span>
              <span>计算引擎</span>
            </div>
            <div className="ending-feature" ref={(el) => setItemRef(el, 3)}>
              <span className="ending-icon">📤</span>
              <span>30+ 导出</span>
            </div>
          </div>

          <div className="ending-ctas" ref={(el) => setItemRef(el, 4)}>
            <a className="btn primary" href="user_manual.html">阅读用户手册</a>
            <a className="btn" href="https://github.com/SakuraMathcraft/LaTeXSnipper" target="_blank" rel="noopener">GitHub</a>
          </div>

          <p className="ending-footer-note" ref={(el) => setItemRef(el, 5)}>
            遇到问题？欢迎在 GitHub 提交 Issue 或 PR。
          </p>
        </div>
      </div>
    </section>
  )
}
