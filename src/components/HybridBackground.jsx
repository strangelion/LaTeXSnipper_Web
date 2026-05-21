import React, { useEffect, useRef, useState } from 'react'

export default function HybridBackground() {
  const canvasRef = useRef(null)
  const animationRef = useRef(null)
  const particlesRef = useRef([])
  const timeRef = useRef(0)
  const [canvasSupported, setCanvasSupported] = useState(true)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      setCanvasSupported(false)
      return
    }

    // 设置 canvas 大小
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // 初始化粒子
    const initParticles = () => {
      particlesRef.current = []
      const particleCount = Math.floor((canvas.width * canvas.height) / 10000)
      for (let i = 0; i < particleCount; i++) {
        particlesRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          radius: Math.random() * 1.5 + 0.5,
          opacity: Math.random() * 0.5 + 0.2,
        })
      }
    }
    initParticles()

    // 获取主题颜色
    const getThemeColors = () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark' ||
        (!document.documentElement.getAttribute('data-theme') && 
         window.matchMedia('(prefers-color-scheme: dark)').matches)
      
      if (isDark) {
        return {
          color1: '#0f111a',
          color2: '#1e293b',
          color3: '#334155',
          particleColor: 'rgba(148, 163, 184, 0.3)',
        }
      } else {
        return {
          color1: '#f8fafc',
          color2: '#e2e8f0',
          color3: '#cbd5e1',
          particleColor: 'rgba(100, 116, 139, 0.2)',
        }
      }
    }

    // 绘制流动渐变
    const drawGradient = (time) => {
      const colors = getThemeColors()
      
      const gradient = ctx.createLinearGradient(
        0, 0,
        Math.cos(time * 0.0001) * canvas.width,
        Math.sin(time * 0.0001) * canvas.height
      )
      
      gradient.addColorStop(0, colors.color1)
      gradient.addColorStop(0.5, colors.color2)
      gradient.addColorStop(1, colors.color3)
      
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }

    // 绘制粒子
    const drawParticles = (time) => {
      const colors = getThemeColors()
      
      particlesRef.current.forEach((particle) => {
        particle.x += particle.vx
        particle.y += particle.vy
        
        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1
        
        particle.x = Math.max(0, Math.min(canvas.width, particle.x))
        particle.y = Math.max(0, Math.min(canvas.height, particle.y))
        
        ctx.fillStyle = colors.particleColor
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2)
        ctx.fill()
      })
    }

    // 绘制连接线
    const drawConnections = () => {
      const colors = getThemeColors()
      const maxDistance = 150
      
      for (let i = 0; i < particlesRef.current.length; i++) {
        for (let j = i + 1; j < particlesRef.current.length; j++) {
          const p1 = particlesRef.current[i]
          const p2 = particlesRef.current[j]
          
          const dx = p1.x - p2.x
          const dy = p1.y - p2.y
          const distance = Math.sqrt(dx * dx + dy * dy)
          
          if (distance < maxDistance) {
            const opacity = (1 - distance / maxDistance) * 0.2
            ctx.strokeStyle = colors.particleColor.replace('0.3', opacity.toString())
            ctx.lineWidth = 0.5
            ctx.beginPath()
            ctx.moveTo(p1.x, p1.y)
            ctx.lineTo(p2.x, p2.y)
            ctx.stroke()
          }
        }
      }
    }

    // 动画循环
    const animate = () => {
      timeRef.current += 1
      
      drawGradient(timeRef.current)
      drawParticles(timeRef.current)
      drawConnections()
      
      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    // 监听主题变化
    const themeObserver = new MutationObserver(() => {
      // 主题变化时，下一帧会自动使用新颜色
    })
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      themeObserver.disconnect()
    }
  }, [])

  return (
    <>
      {/* Canvas 动画背景（主要） */}
      {canvasSupported && (
        <canvas
          ref={canvasRef}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: -2,
            pointerEvents: 'none',
          }}
          aria-hidden="true"
        />
      )}
      
      {/* 视频已移除（原为 canvas 不支持时的备选） */}
    </>
  )
}
