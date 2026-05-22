import React, { useEffect, useState, useRef } from 'react'

const SECTIONS = [
  { id: 'hero', label: '首页', icon: 'home' },
  { id: 'card-0', label: '截取识别', icon: 'camera' },
  { id: 'card-1', label: '数学工作台', icon: 'sigma' },
  { id: 'card-2', label: '手写识别', icon: 'pen' },
  { id: 'card-3', label: '自动排版', icon: 'file' },
  { id: 'card-4', label: '多格式导出', icon: 'download' },
  { id: 'card-5', label: '本地模型', icon: 'monitor' },
  { id: 'card-6', label: '外部模型', icon: 'cloud' },
  { id: 'ending', label: '结尾', icon: 'clock' },
]

function Icon({ name, className }) {
  const p = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', className }
  switch (name) {
    case 'home':     return <svg {...p}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
    case 'camera':   return <svg {...p}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
    case 'sigma':    return <svg {...p}><path d="M18 7V4H6l6 8-6 8h12v-3"/></svg>
    case 'pen':      return <svg {...p}><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
    case 'file':     return <svg {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
    case 'download': return <svg {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
    case 'monitor':  return <svg {...p}><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
    case 'cloud':    return <svg {...p}><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>
    case 'clock':    return <svg {...p}><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
    default:         return null
  }
}

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
          <span className="dot-icon"><Icon name={sec.icon} /></span>
          {hoveredId === sec.id && (
            <span className="dot-label">{sec.label}</span>
          )}
        </button>
      ))}
    </nav>
  )
}
