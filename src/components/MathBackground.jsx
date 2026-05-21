import React, { useEffect, useRef, useState } from 'react'

export default function MathBackground() {
  const canvasRef = useRef(null)
  const animationRef = useRef(null)
  const particlesRef = useRef([])
  const formulasRef = useRef([])
  const timeRef = useRef(0)
  const [canvasSupported, setCanvasSupported] = useState(true)

  // 常用数学公式和符号
  const MATH_SYMBOLS = ['∑', '∫', '∂', '∇', '√', 'π', 'e', 'i', 'Δ', 'Σ', '∞', '≈', '≠', '≤', '≥']
  const MATH_FORMULAS = [
    'e^(iπ) + 1 = 0',
    '∫ e^(-x²) dx',
    '∑ 1/n²',
    '∇ · F = 0',
    'F = ma',
    'E = mc²',
    'a² + b² = c²',
    '∂u/∂t = ∇²u',
    'det(A) ≠ 0',
    'lim(x→∞)',
  ]

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      setCanvasSupported(false)
      return
    }

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // 初始化粒子（数学符号）
    const initParticles = () => {
      particlesRef.current = []
      const particleCount = Math.floor((canvas.width * canvas.height) / 15000)
      for (let i = 0; i < particleCount; i++) {
        particlesRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          symbol: MATH_SYMBOLS[Math.floor(Math.random() * MATH_SYMBOLS.length)],
          size: Math.random() * 12 + 8,
          opacity: Math.random() * 0.4 + 0.2,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.02,
        })
      }
    }
    initParticles()

    // 初始化浮动公式
    const initFormulas = () => {
      formulasRef.current = []
      const formulaCount = 5
      for (let i = 0; i < formulaCount; i++) {
        formulasRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.1,
          vy: (Math.random() - 0.5) * 0.1,
          formula: MATH_FORMULAS[Math.floor(Math.random() * MATH_FORMULAS.length)],
          size: Math.random() * 14 + 12,
          opacity: Math.random() * 0.3 + 0.1,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.005,
        })
      }
    }
    initFormulas()

    const getThemeColors = () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark' ||
        (!document.documentElement.getAttribute('data-theme') && 
         window.matchMedia('(prefers-color-scheme: dark)').matches)
      
      if (isDark) {
        return {
          bg1: '#0f111a',
          bg2: '#1e293b',
          bg3: '#334155',
          grid: 'rgba(148, 163, 184, 0.05)',
          symbol: 'rgba(148, 163, 184, 0.4)',
          formula: 'rgba(100, 116, 139, 0.3)',
        }
      } else {
        return {
          bg1: '#f8fafc',
          bg2: '#e2e8f0',
          bg3: '#cbd5e1',
          grid: 'rgba(100, 116, 139, 0.05)',
          symbol: 'rgba(100, 116, 139, 0.3)',
          formula: 'rgba(100, 116, 139, 0.2)',
        }
      }
    }

    const drawGradient = (time) => {
      const colors = getThemeColors()
      const gradient = ctx.createLinearGradient(
        0, 0,
        Math.cos(time * 0.0001) * canvas.width,
        Math.sin(time * 0.0001) * canvas.height
      )
      gradient.addColorStop(0, colors.bg1)
      gradient.addColorStop(0.5, colors.bg2)
      gradient.addColorStop(1, colors.bg3)
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }

    const drawGrid = () => {
      const colors = getThemeColors()
      ctx.strokeStyle = colors.grid
      ctx.lineWidth = 0.5
      const gridSize = 80
      
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, canvas.height)
        ctx.stroke()
      }
      
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(canvas.width, y)
        ctx.stroke()
      }
    }

    const drawSymbols = () => {
      const colors = getThemeColors()
      particlesRef.current.forEach((particle) => {
        particle.x += particle.vx
        particle.y += particle.vy
        particle.rotation += particle.rotationSpeed
        
        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1
        
        particle.x = Math.max(0, Math.min(canvas.width, particle.x))
        particle.y = Math.max(0, Math.min(canvas.height, particle.y))
        
        ctx.save()
        ctx.translate(particle.x, particle.y)
        ctx.rotate(particle.rotation)
        ctx.fillStyle = colors.symbol
        ctx.globalAlpha = particle.opacity
        ctx.font = `${particle.size}px serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(particle.symbol, 0, 0)
        ctx.restore()
      })
    }

    const drawFormulas = () => {
      const colors = getThemeColors()
      formulasRef.current.forEach((formula) => {
        formula.x += formula.vx
        formula.y += formula.vy
        formula.rotation += formula.rotationSpeed
        
        if (formula.x < -200 || formula.x > canvas.width + 200) formula.vx *= -1
        if (formula.y < -100 || formula.y > canvas.height + 100) formula.vy *= -1
        
        ctx.save()
        ctx.translate(formula.x, formula.y)
        ctx.rotate(formula.rotation)
        ctx.fillStyle = colors.formula
        ctx.globalAlpha = formula.opacity
        ctx.font = `${formula.size}px monospace`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(formula.formula, 0, 0)
        ctx.restore()
      })
    }

    const animate = () => {
      timeRef.current += 1
      
      drawGradient(timeRef.current)
      drawGrid()
      drawSymbols()
      drawFormulas()
      
      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    const themeObserver = new MutationObserver(() => {})
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
      themeObserver.disconnect()
    }
  }, [])

  return (
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
  )
}
