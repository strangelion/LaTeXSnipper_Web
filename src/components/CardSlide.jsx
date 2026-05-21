import React, { useEffect, useRef } from 'react'

export default function CardSlide({ card, isMobile }) {
  const sectionRef = useRef(null)
  const wrapperRef = useRef(null)
  const frontRef = useRef(null)
  const detailRef = useRef(null)

  useEffect(() => {
    if (isMobile) return

    const handleScroll = () => {
      if (!sectionRef.current || !wrapperRef.current || !frontRef.current || !detailRef.current) return

      const rect = sectionRef.current.getBoundingClientRect()
      const vh = window.innerHeight
      const progress = Math.max(0, Math.min(1, 1 - (rect.top + rect.height) / (vh + rect.height)))

      const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
      const lerp = (a, b, t) => a + (b - a) * t
      const segment = (p, a, b) => clamp((p - a) / (b - a), 0, 1)

      const c = segment(progress, 0.1, 0.8)

      let wrapScale, wrapOpacity, frontWidth, detailLeft, briefOpacity

      if (c < 0.1) {
        const t = c / 0.1
        wrapScale = lerp(0.5, 1, t)
        wrapOpacity = t
        frontWidth = 100
        detailLeft = 100
        briefOpacity = 1
      } else if (c < 0.3) {
        wrapScale = 1
        wrapOpacity = 1
        frontWidth = 100
        detailLeft = 100
        briefOpacity = 1
      } else if (c < 0.46) {
        const t = (c - 0.3) / 0.16
        wrapScale = 1
        wrapOpacity = 1
        frontWidth = lerp(100, 30, t)
        detailLeft = lerp(100, 30, t)
        briefOpacity = lerp(1, 0, t)
      } else if (c < 0.66) {
        wrapScale = 1
        wrapOpacity = 1
        frontWidth = 30
        detailLeft = 30
        briefOpacity = 0
      } else if (c < 0.82) {
        const t = (c - 0.66) / 0.16
        wrapScale = 1
        wrapOpacity = 1
        frontWidth = lerp(30, 100, t)
        detailLeft = lerp(30, 100, t)
        briefOpacity = lerp(0, 1, t)
      } else {
        const t = (c - 0.82) / 0.18
        wrapScale = lerp(1, 0.4, t)
        wrapOpacity = 1 - t
        frontWidth = 100
        detailLeft = 100
        briefOpacity = 1
      }

      wrapperRef.current.style.transform = `scale(${wrapScale.toFixed(4)})`
      wrapperRef.current.style.opacity = wrapOpacity.toFixed(4)
      frontRef.current.style.width = `${frontWidth.toFixed(1)}%`
      detailRef.current.style.left = `${detailLeft.toFixed(1)}%`

      const brief = frontRef.current.querySelector('p')
      if (brief) brief.style.opacity = briefOpacity.toFixed(4)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [isMobile])

  return (
    <section className="slide-section card-slide" data-slide={card.id} ref={sectionRef}>
      <div className="slide-scroll">
        <div className="card-wrapper" ref={wrapperRef}>
          <div className="card-viewport">
            <div className="card-front" ref={frontRef}>
              <h3>{card.title}</h3>
              <p>{card.brief}</p>
            </div>
            <div className="card-detail" ref={detailRef}>
              <div className="card-detail-inner">
                <p>{card.detail}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
