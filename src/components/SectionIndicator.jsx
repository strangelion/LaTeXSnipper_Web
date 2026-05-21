import React, { useEffect, useState, useRef } from 'react'

const SECTIONS = [
  { id: 'hero', label: '首页' },
  { id: 'card-0', label: '截取识别' },
  { id: 'card-1', label: '数学工作台' },
  { id: 'card-2', label: '手写识别' },
  { id: 'card-3', label: '自动排版' },
  { id: 'card-4', label: '多格式导出' },
  { id: 'card-5', label: '本地模型' },
  { id: 'card-6', label: '外部模型' },
  { id: 'ending', label: '结尾' },
]

export default function SectionIndicator() {
  const [activeId, setActiveId] = useState('hero')
  const [isVisible, setIsVisible] = useState(false)
  const [hoveredId, setHoveredId] = useState(null)
  const rafRef = useRef(null)

  useEffect(() => {
    const update = () => {
      rafRef.current = null
      const scrollY = window.scrollY
      const vh = window.innerHeight

      // Show after scrolling past hero
      setIsVisible(scrollY > vh * 0.3)

      // Find which section is most in view
      let bestId = 'hero'
      let bestScore = -Infinity

      for (const sec of SECTIONS) {
        const el = document.querySelector(`[data-slide="${sec.id}"]`)
        if (!el) continue
        const rect = el.getBoundingClientRect()
        const center = rect.top + rect.height / 2
        // Score: how close the section center is to viewport center
        const score = -Math.abs(center - vh / 2)
        if (score > bestScore) {
          bestScore = score
          bestId = sec.id
        }
      }

      setActiveId(bestId)
    }

    const onScroll = () => {
      if (!rafRef.current) rafRef.current = requestAnimationFrame(update)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    update()

    return () => {
      window.removeEventListener('scroll', onScroll)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const scrollTo = (id) => {
    const el = document.querySelector(`[data-slide="${id}"]`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <nav
      className={`section-indicator ${isVisible ? 'visible' : ''}`}
      aria-label="页面导航"
    >
      {SECTIONS.map((sec) => (
        <button
          key={sec.id}
          className={`section-dot ${activeId === sec.id ? 'active' : ''}`}
          onClick={() => scrollTo(sec.id)}
          onMouseEnter={() => setHoveredId(sec.id)}
          onMouseLeave={() => setHoveredId(null)}
          title={sec.label}
          aria-label={sec.label}
        >
          <span className="dot-circle" />
          {hoveredId === sec.id && (
            <span className="dot-label">{sec.label}</span>
          )}
        </button>
      ))}
    </nav>
  )
}
