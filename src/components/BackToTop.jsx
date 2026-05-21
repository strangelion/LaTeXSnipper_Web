import React, { useState, useEffect } from 'react'

export default function BackToTop() {
  const [isVisible, setIsVisible] = useState(false)
  const [isFaded, setIsFaded] = useState(false)
  const fadeTimerRef = React.useRef(null)
  const FADE_DELAY = 4000

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setIsVisible(true)
        startFadeTimer()
      } else {
        setIsVisible(false)
        setIsFaded(false)
        clearFadeTimer()
      }
    }

    const startFadeTimer = () => {
      clearFadeTimer()
      fadeTimerRef.current = setTimeout(() => {
        setIsFaded(true)
      }, FADE_DELAY)
    }

    const clearFadeTimer = () => {
      if (fadeTimerRef.current) {
        clearTimeout(fadeTimerRef.current)
        fadeTimerRef.current = null
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      clearFadeTimer()
    }
  }, [])

  const handleClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleMouseEnter = () => {
    setIsFaded(false)
    if (fadeTimerRef.current) {
      clearTimeout(fadeTimerRef.current)
      fadeTimerRef.current = null
    }
  }

  const handleMouseLeave = () => {
    fadeTimerRef.current = setTimeout(() => {
      setIsFaded(true)
    }, FADE_DELAY)
  }

  return (
    <button
      className={`back-to-top ${isVisible ? 'visible' : ''} ${isFaded ? 'faded' : ''}`}
      id="backToTop"
      title="回到顶部"
      aria-label="回到顶部"
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <span className="btt-arrow">▲</span>
      <span className="btt-text">顶部</span>
    </button>
  )
}
