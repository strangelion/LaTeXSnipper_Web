import React, { useEffect, useRef } from 'react'

export default function EndingSection() {
  const sectionRef = useRef(null)
  const innerRef = useRef(null)

  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current || !innerRef.current) return

      const rect = sectionRef.current.getBoundingClientRect()
      const vh = window.innerHeight
      const progress = Math.max(0, Math.min(1, 1 - (rect.top + rect.height) / (vh + rect.height)))

      const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
      const lerp = (a, b, t) => a + (b - a) * t
      const segment = (p, a, b) => clamp((p - a) / (b - a), 0, 1)

      const f = segment(progress, 0.1, 0.6)
      innerRef.current.style.opacity = f.toFixed(4)
      innerRef.current.style.transform = `scale(${lerp(0.8, 1, f).toFixed(4)})`
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <section className="slide-section" data-slide="ending" ref={sectionRef}>
      <div className="slide-scroll">
        <div className="slide-inner ending-layout" ref={innerRef}>
          <p>更多信息请查看用户手册或直接前往 GitHub 提交 Issue。</p>
        </div>
      </div>
    </section>
  )
}
