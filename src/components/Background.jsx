import React, { useEffect, useRef } from 'react'

export default function Background() {
  const overlayRef = useRef(null)
  const ripplesRef = useRef(null)
  const autoTimerRef = useRef(null)
  const isPageVisibleRef = useRef(true)

  useEffect(() => {
    // 加载 WebGL Ripples 库
    const script = document.createElement('script')
    script.src = '/webgl-ripples.js'
    script.onload = initRipples
    document.body.appendChild(script)

    return () => {
      if (autoTimerRef.current) clearInterval(autoTimerRef.current)
      if (ripplesRef.current) ripplesRef.current.destroy()
    }
  }, [])

  const getGradientDataUrl = () => {
    if (!overlayRef.current) return null
    const cs = getComputedStyle(overlayRef.current)
    const bg = cs.backgroundImage
    const w = overlayRef.current.offsetWidth
    const h = overlayRef.current.offsetHeight
    if (!bg || bg === 'none' || !w || !h) return null
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const ctx = c.getContext('2d')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, w, h)
    return c.toDataURL()
  }

  const startAutoDrops = () => {
    if (autoTimerRef.current) clearInterval(autoTimerRef.current)
    autoTimerRef.current = setInterval(() => {
      if (!ripplesRef.current || !isPageVisibleRef.current) return
      const x = Math.random() * window.innerWidth
      const y = Math.random() * window.innerHeight
      ripplesRef.current.drop(x, y, 20 + Math.random() * 20, 0.02 + Math.random() * 0.02)
    }, 3000)
  }

  const stopAutoDrops = () => {
    if (autoTimerRef.current) {
      clearInterval(autoTimerRef.current)
      autoTimerRef.current = null
    }
  }

  const initRipples = () => {
    if (!overlayRef.current || typeof window.Ripples === 'undefined') return

    try {
      if (ripplesRef.current) ripplesRef.current.destroy()
      ripplesRef.current = new window.Ripples(overlayRef.current, {
        resolution: 256,
        dropRadius: 24,
        perturbance: 0.04,
        interactive: true,
        imageUrl: getGradientDataUrl()
      })

      document.addEventListener('mousemove', (e) => {
        if (ripplesRef.current && isPageVisibleRef.current) {
          ripplesRef.current.drop(e.clientX, e.clientY, 12, 0.035)
        }
      })

      document.addEventListener('touchmove', (e) => {
        const t = e.touches[0]
        if (ripplesRef.current && t && isPageVisibleRef.current) {
          ripplesRef.current.drop(t.clientX, t.clientY, 20, 0.05)
        }
      }, { passive: true })

      startAutoDrops()

      // 监听页面可见性变化
      document.addEventListener('visibilitychange', () => {
        isPageVisibleRef.current = !document.hidden
        if (isPageVisibleRef.current) {
          console.log('[Ripples] 页面回到前台，恢复水波纹')
          startAutoDrops()
        } else {
          console.log('[Ripples] 页面进入后台，暂停水波纹')
          stopAutoDrops()
        }
      })

      // 监听主题变化
      const themeObserver = new MutationObserver(() => {
        if (ripplesRef.current) {
          setTimeout(() => {
            ripplesRef.current.imageUrl = getGradientDataUrl()
            ripplesRef.current.loadImage()
          }, 50)
        }
      })
      themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme']
      })

      // 监听窗口大小变化
      window.addEventListener('resize', () => {
        if (ripplesRef.current) ripplesRef.current.updateSize()
      })
    } catch (e) {
      console.error('水波纹初始化失败:', e)
    }
  }

  return (
    <>
      <video
        id="bg-video-light"
        className="bg-video"
        src="https://video.interknot.dpdns.org/light_bg.mp4"
        preload="auto"
        autoPlay
        loop
        muted
        playsInline
        aria-hidden="true"
      />
      <video
        id="bg-video-dark"
        className="bg-video"
        src="https://video.interknot.dpdns.org/dark_bg.mp4"
        preload="auto"
        autoPlay
        loop
        muted
        playsInline
        aria-hidden="true"
      />
      <div id="bg-overlay" ref={overlayRef} aria-hidden="true" />
    </>
  )
}
