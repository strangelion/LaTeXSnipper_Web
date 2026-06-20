import React, { useState, useEffect, useCallback, useRef } from 'react'

const DOT_ICONS = {
  'card-0': 'camera',
  'card-1': 'sigma',
  'card-2': 'pen',
  'card-3': 'file',
  'card-4': 'download',
  'card-5': 'monitor',
  'card-6': 'cloud',
  'card-7': 'layers',
  'card-8': 'book',
  'card-9': 'puzzle',
}

function DotIcon({ name }) {
  const p = { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }
  switch (name) {
    case 'camera':   return <svg {...p}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
    case 'sigma':    return <svg {...p}><path d="M18 7V4H6l6 8-6 8h12v-3"/></svg>
    case 'pen':      return <svg {...p}><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
    case 'file':     return <svg {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
    case 'download': return <svg {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
    case 'monitor':  return <svg {...p}><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
    case 'cloud':    return <svg {...p}><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>
    case 'layers':   return <svg {...p}><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
    case 'book':     return <svg {...p}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
    case 'puzzle':   return <svg {...p}><path d="M19.439 7.85c-.049.322.059.648.289.878l1.568 1.568c.47.47.706 1.087.706 1.704s-.235 1.233-.706 1.704l-1.611 1.611a.98.98 0 0 1-.837.276c-.47-.07-.802-.48-.968-.925a2.501 2.501 0 1 0-3.214 3.214c.446.166.855.497.925.968a.979.979 0 0 1-.276.837l-1.61 1.611a2.404 2.404 0 0 1-1.705.707 2.402 2.402 0 0 1-1.704-.706l-1.568-1.568a1.026 1.026 0 0 0-.877-.29c-.493.074-.84.504-1.02.968a2.5 2.5 0 1 1-3.237-3.237c.464-.18.894-.527.967-1.02a1.026 1.026 0 0 0-.289-.877l-1.568-1.568A2.402 2.402 0 0 1 1.998 12c0-.617.236-1.234.706-1.704L4.23 8.77c.24-.24.581-.353.917-.303.515.077.877.528 1.073 1.01a2.5 2.5 0 1 0 3.259-3.259c-.482-.196-.933-.558-1.01-1.073-.05-.336.062-.676.303-.917l1.525-1.525A2.402 2.402 0 0 1 12 2c.617 0 1.234.236 1.704.706l1.568 1.568c.23.23.556.338.877.29.493-.074.84-.504 1.02-.968a2.5 2.5 0 1 1 3.237 3.237c-.464.18-.894.527-.967 1.02Z"/></svg>
    default:         return null
  }
}

export default function CardCarousel({ cards }) {
  const [current, setCurrent] = useState(1) // start at index 1 (first real card)
  const [flipped, setFlipped] = useState({})
  const sectionRef = useRef(null)
  const wrapperRef = useRef(null)
  const trackRef = useRef(null)
  const isTransitioning = useRef(false)

  const total = cards.length
  // Build infinite loop array: [lastClone, ...realCards, firstClone]
  const loopCards = useRef([])

  // Initialize loopCards whenever cards change
  if (loopCards.current.length !== total + 2 || loopCards.current[1]?.id !== cards[0]?.id) {
    const lastCard = cards[total - 1]
    const firstCard = cards[0]
    // Clone with unique keys to avoid React duplicate-key warnings
    const cloneLast = { ...lastCard, id: lastCard.id + '-clone-last' }
    const cloneFirst = { ...firstCard, id: firstCard.id + '-clone-first' }
    loopCards.current = [cloneLast, ...cards, cloneFirst]
  }

  // Remove transition temporarily (for instant jump-back)
  const disableTransition = useCallback(() => {
    const track = trackRef.current
    if (!track) return
    track.style.transition = 'none'
    // Also disable card transitions to prevent scale/opacity animation on jump
    const cards = track.querySelectorAll('.carousel-card')
    for (const c of cards) c.style.transition = 'none'
    // Force reflow to ensure the style change takes effect immediately
    void track.offsetHeight
  }, [])

  // Re-enable transition
  const enableTransition = useCallback(() => {
    const track = trackRef.current
    if (!track) return
    track.style.transition = ''
    // Re-enable card transitions
    const cards = track.querySelectorAll('.carousel-card')
    for (const c of cards) c.style.transition = ''
  }, [])

  // After transition ends, check if we need to jump back to the real card
  const handleTransitionEnd = useCallback(() => {
    const track = trackRef.current
    if (!track) return

    if (current === 0) {
      // Landed on the clone of last card → jump to real last card (index total)
      disableTransition()
      setCurrent(total)
    } else if (current === total + 1) {
      // Landed on the clone of first card → jump to real first card (index 1)
      disableTransition()
      setCurrent(1)
    }
  }, [current, total, disableTransition])

  const goTo = useCallback((index) => {
    if (isTransitioning.current) return
    isTransitioning.current = true
    enableTransition() // restore CSS transition after a possible jump-back
    setCurrent(index)
    setFlipped({})
  }, [enableTransition])

  const goNext = useCallback(() => {
    goTo(current + 1)
  }, [current, goTo])

  const goPrev = useCallback(() => {
    goTo(current - 1)
  }, [current, goTo])

  const toggleFlip = (id) => {
    setFlipped(prev => ({ ...prev, [id]: !prev[id] }))
  }

  // Keyboard navigation
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev() }
      else if (e.key === 'ArrowRight') { e.preventDefault(); goNext() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [goPrev, goNext])

  // Drag/swipe support (mouse + touch)
  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    let startX = 0
    let startY = 0
    let isDragging = false
    let isHorizontalDrag = false

    const onPointerDown = (e) => {
      startX = 'touches' in e ? e.touches[0].clientX : e.clientX
      startY = 'touches' in e ? e.touches[0].clientY : e.clientY
      isDragging = true
      isHorizontalDrag = false
    }

    const onPointerMove = (e) => {
      if (!isDragging) return
      if (isHorizontalDrag) {
        e.preventDefault()
        return
      }
      const cx = 'touches' in e ? e.touches[0].clientX : e.clientX
      const cy = 'touches' in e ? e.touches[0].clientY : e.clientY
      const dx = cx - startX
      const dy = cy - startY
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8) {
        isHorizontalDrag = true
      }
    }

    const onPointerUp = (e) => {
      if (!isDragging) return
      isDragging = false
      if (!isHorizontalDrag) return
      const endX = 'changedTouches' in e ? e.changedTouches[0].clientX : e.clientX
      const dx = endX - startX
      if (dx > 50) goPrev()
      else if (dx < -50) goNext()
      isHorizontalDrag = false
    }

    // Touch events
    track.addEventListener('touchstart', onPointerDown, { passive: true })
    track.addEventListener('touchmove', onPointerMove, { passive: false })
    track.addEventListener('touchend', onPointerUp, { passive: true })

    // Mouse events
    track.addEventListener('mousedown', onPointerDown)
    track.addEventListener('mousemove', onPointerMove)
    track.addEventListener('mouseup', onPointerUp)
    // Prevent text selection while dragging
    const preventDrag = (e) => { if (isHorizontalDrag) e.preventDefault() }
    track.addEventListener('dragstart', preventDrag)

    return () => {
      track.removeEventListener('touchstart', onPointerDown)
      track.removeEventListener('touchmove', onPointerMove)
      track.removeEventListener('touchend', onPointerUp)
      track.removeEventListener('mousedown', onPointerDown)
      track.removeEventListener('mousemove', onPointerMove)
      track.removeEventListener('mouseup', onPointerUp)
      track.removeEventListener('dragstart', preventDrag)
    }
  }, [goPrev, goNext])

  // Scroll-driven entrance/exit
  useEffect(() => {
    const handleScroll = () => {
      const section = sectionRef.current
      const wrapper = wrapperRef.current
      if (!section || !wrapper) return

      const rect = section.getBoundingClientRect()
      const vh = window.innerHeight
      const sh = section.offsetHeight
      const scrollRange = Math.max(sh - vh, 1)
      const progress = Math.max(0, Math.min(1,
        1 - (rect.top + rect.height) / (vh + rect.height)
      ))

      const easeOut = (t) => 1 - Math.pow(1 - t, 3)
      const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
      const segment = (p, a, b) => clamp((p - a) / (b - a), 0, 1)
      const lerp = (a, b, t) => a + (b - a) * t

      // Entrance: 0-25% → 从侧面旋转进入
      // Active: 25-75% → 稳定
      // Exit: 75-100% → 旋转退出
      let rotation, opacity

      if (progress < 0.25) {
        const t = easeOut(segment(progress, 0, 0.25))
        rotation = lerp(-18, 0, t)
        opacity = t
      } else if (progress < 0.75) {
        rotation = 0
        opacity = 1
      } else {
        const t = easeOut(segment(progress, 0.75, 1))
        rotation = lerp(0, 18, t)
        opacity = 1 - t
      }

      wrapper.style.transform = `perspective(2000px) rotateY(${rotation.toFixed(1)}deg)`
      wrapper.style.opacity = opacity.toFixed(4)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Compute the real card index for display (dots / counter)
  const realIndex = ((current - 1) % total + total) % total

  // check and balance front/detail heights to prevent overflow when flipping
  useEffect(() => {
    const inners = document.querySelectorAll('.carousel-card-inner');
    inners.forEach((inner) => {
      const front = inner.querySelector('.carousel-front');
      const detail = inner.querySelector('.carousel-detail');
      if (front && detail) {
        const frontH = front.offsetHeight;
        const detailH = detail.scrollHeight;
        const minH = Math.max(frontH, detailH);
        inner.style.minHeight = minH + 'px';
      }
    });
  }, [flipped, current])

  // Listen for transition end to reset isTransitioning and handle loop jumps
  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const onEnd = () => {
      isTransitioning.current = false
      handleTransitionEnd()
    }
    track.addEventListener('transitionend', onEnd)
    return () => track.removeEventListener('transitionend', onEnd)
  }, [handleTransitionEnd])

  return (
    <section
      className="slide-section carousel-section"
      data-slide="carousel"
      ref={sectionRef}
    >
      <div className="slide-scroll">
        <div className="carousel-container" ref={wrapperRef}>
          {/* Track — uses loopCards for infinite seamless scrolling */}
          <div className="carousel-track" ref={trackRef} style={{ transform: `translateX(-${current * 100}%)` }}>
            {loopCards.current.map((card, i) => (
              <div key={card.id} className="carousel-slide">
                <div className={`carousel-card${i === current ? ' active' : ''}${flipped[card.id] ? ' show-detail' : ''}`}>
                  <div className="carousel-card-inner">
                    {/* Front face */}
                    <div className="carousel-front">
                      <h3>{card.title}</h3>
                      <p>{card.brief}</p>
                      <button
                        className="carousel-flip-btn"
                        onClick={() => toggleFlip(card.id)}
                      >
                        了解更多 →
                      </button>
                    </div>

                    {/* Detail face */}
                    <div className="carousel-detail">
                      <div className="carousel-detail-header">
                        <button
                          className="carousel-flip-btn back"
                          onClick={() => toggleFlip(card.id)}
                        >
                          ← 返回
                        </button>
                        <h4 className="carousel-detail-title">{card.title}</h4>
                      </div>
                      <div className="carousel-detail-inner">
                        <p>{card.detail}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Nav arrows (always visible for looping) */}
          <button className="carousel-arrow carousel-arrow-left" onClick={goPrev}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button className="carousel-arrow carousel-arrow-right" onClick={goNext}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          {/* Dots (mapped from real cards, not clones) */}
          <div className="carousel-dots">
            {cards.map((card, i) => (
              <button
                key={card.id}
                className={`carousel-dot ${i === realIndex ? 'active' : ''}`}
                onClick={() => goTo(i + 1)}
                title={card.title}
                aria-label={`第 ${i + 1} 张卡片`}
              >
                <DotIcon name={DOT_ICONS[card.id] || 'circle'} />
              </button>
            ))}
          </div>

          {/* Counter */}
          <div className="carousel-counter">
            {realIndex + 1} / {total}
          </div>
        </div>
      </div>
    </section>
  )
}
