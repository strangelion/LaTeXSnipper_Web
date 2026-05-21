import React, { useEffect, useRef, useState } from 'react'

export default function ScrollProgress() {
  const [progress, setProgress] = useState(0)
  const rafRef = useRef(null)

  useEffect(() => {
    const update = () => {
      rafRef.current = null
      const scrollH = document.documentElement.scrollHeight - window.innerHeight
      if (scrollH > 0) {
        setProgress(window.scrollY / scrollH)
      }
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

  return (
    <div className="scroll-progress-track" aria-hidden="true">
      <div
        className="scroll-progress-bar"
        style={{ transform: `scaleX(${progress})` }}
      />
    </div>
  )
}
