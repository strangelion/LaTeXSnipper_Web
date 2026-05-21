import React, { useEffect, useRef } from 'react'

export default function MathBackground() {
  const canvasRef = useRef(null)
  const animationRef = useRef(null)
  const mouseRef = useRef({ x: -100, y: -100 })
  const trailRef = useRef([])
  const formulasRef = useRef([])
  const timeRef = useRef(0)
  const lastMoveTimeRef = useRef(Date.now())
  const isPageVisibleRef = useRef(true)

  const MATH_SYMBOLS = ['∑', '∫', '∂', '∇', '√', 'π', '∞', '≈', '≠', '≤', '≥', 'Δ', 'Σ', 'λ', 'θ', 'α', 'β', 'γ']
  
  const FORMULAS = [
    'e^{iπ}+1=0',
    '∫e^{-x²}dx',
    '∑1/n²',
    '∇·F=0',
    'F=ma',
    'E=mc²',
    'a²+b²=c²',
    '∂u/∂t=∇²u',
    'det(A)≠0',
    'lim x→∞',
    'sin²θ+cos²θ=1',
    'Δ=b²-4ac',
    'φ=(1+√5)/2',
    'i²=-1',
    'dx/dt=v',
    '∫₀^∞',
    '∑_{n=0}^∞',
    'f\'(x)=lim',
    '∮ E·dl',
    '∇×B=μJ',
  ]

  const MATRIX_TEMPLATES = [
    '[ a b ]',
    '[ c d ]',
    '| x₁ x₂ |',
    '( 1 0 )',
    '( 0 1 )',
    '[ cosθ -sinθ ]',
    '[ sinθ cosθ ]',
  ]

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    const handleMouseMove = (e) => {
      const prev = mouseRef.current
      const dx = e.clientX - prev.x
      const dy = e.clientY - prev.y
      const speed = Math.sqrt(dx * dx + dy * dy)
      mouseRef.current = { x: e.clientX, y: e.clientY }

      // 速度越快，粒子越沿运动方向散开；静止时自然下落
      const isMoving = speed > 2
      const spreadX = isMoving ? dx * 0.15 + (Math.random() - 0.5) * 1.2 : (Math.random() - 0.5) * 1.0
      const spreadY = isMoving ? dy * 0.15 + (Math.random() - 0.5) * 1.2 : Math.random() * 0.8 + 0.3

      trailRef.current.push({
        x: e.clientX + (Math.random() - 0.5) * 6,
        y: e.clientY + (Math.random() - 0.5) * 6,
        symbol: MATH_SYMBOLS[Math.floor(Math.random() * MATH_SYMBOLS.length)],
        life: 1,
        size: Math.random() * 8 + 14,
        vx: spreadX,
        vy: spreadY,
      })
      if (trailRef.current.length > 18) {
        trailRef.current.splice(0, trailRef.current.length - 18)
      }
      lastMoveTimeRef.current = Date.now()
    }
    window.addEventListener('mousemove', handleMouseMove)

    const initFormulas = () => {
      formulasRef.current = []
      const count = Math.max(15, Math.floor((canvas.width * canvas.height) / 50000))
      for (let i = 0; i < count; i++) {
        formulasRef.current.push(createFormula(canvas))
      }
    }

    const createFormula = (canvas) => {
      const useMatrix = Math.random() > 0.6
      const content = useMatrix
        ? MATRIX_TEMPLATES[Math.floor(Math.random() * MATRIX_TEMPLATES.length)]
        : FORMULAS[Math.floor(Math.random() * FORMULAS.length)]
      
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        content,
        size: Math.random() * 14 + 16,
        opacity: 0,
        targetOpacity: Math.random() * 0.3 + 0.25,
        fadeSpeed: Math.random() * 0.008 + 0.003,
        life: Math.random() * 600 + 300,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        phase: 'in',
      }
    }

    initFormulas()

    const isDarkMode = () => {
      return document.documentElement.getAttribute('data-theme') === 'dark' ||
        (!document.documentElement.getAttribute('data-theme') &&
          window.matchMedia('(prefers-color-scheme: dark)').matches)
    }

    const drawCheckerboard = () => {
      const dark = isDarkMode()
      const size = 40

      // 背景色
      ctx.fillStyle = dark ? '#0f111a' : '#f6fbff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // 方格色：白底黑格，黑底白格（提高可见度）
      ctx.fillStyle = dark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.06)'
      for (let x = 0; x < canvas.width; x += size * 2) {
        for (let y = 0; y < canvas.height; y += size * 2) {
          ctx.fillRect(x, y, size, size)
          ctx.fillRect(x + size, y + size, size, size)
        }
      }
    }

    const drawFormulas = () => {
      const dark = isDarkMode()
      const color = dark ? 'rgba(180, 200, 240, 0.85)' : 'rgba(40, 50, 80, 0.7)'

      formulasRef.current.forEach((f, i) => {
        f.x += f.vx
        f.y += f.vy
        f.life--

        if (f.phase === 'in') {
          f.opacity += f.fadeSpeed
          if (f.opacity >= f.targetOpacity) {
            f.phase = 'hold'
          }
        } else if (f.phase === 'hold') {
          if (f.life < 80) {
            f.phase = 'out'
          }
        } else if (f.phase === 'out') {
          f.opacity -= f.fadeSpeed
        }

        if (f.life <= 0 || f.opacity <= 0) {
          formulasRef.current[i] = createFormula(canvas)
          return
        }

        if (f.x < -300 || f.x > canvas.width + 300 ||
            f.y < -50 || f.y > canvas.height + 50) {
          formulasRef.current[i] = createFormula(canvas)
          return
        }

        // 四舍五入坐标到 0.5px，消除亚像素抖动
        const drawX = Math.round(f.x * 2) / 2
        const drawY = Math.round(f.y * 2) / 2

        ctx.save()
        ctx.globalAlpha = Math.max(0, f.opacity)
        ctx.fillStyle = color
        ctx.font = `${f.size}px "Times New Roman", serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(f.content, drawX, drawY)
        ctx.restore()
      })
    }

    const drawTrail = () => {
      const dark = isDarkMode()
      const color = dark ? 'rgba(96, 165, 250, 0.9)' : 'rgba(37, 99, 235, 0.9)'

      for (let i = trailRef.current.length - 1; i >= 0; i--) {
        const p = trailRef.current[i]
        p.life -= 0.008
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.045
        p.vx *= 0.995

        if (p.life <= 0) {
          trailRef.current.splice(i, 1)
          continue
        }

        const drawPx = Math.round(p.x * 2) / 2
        const drawPy = Math.round(p.y * 2) / 2

        ctx.save()
        ctx.globalAlpha = Math.max(0, p.life * 0.8)
        ctx.fillStyle = color
        ctx.font = `${p.size}px serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(p.symbol, drawPx, drawPy)
        ctx.restore()
      }
    }

    const spawnIdleParticle = () => {
      // 鼠标静止超过 800ms 时，在鼠标当前位置附近生成下落粒子
      const idleTime = Date.now() - lastMoveTimeRef.current
      if (idleTime < 800) return

      const mx = mouseRef.current.x
      const my = mouseRef.current.y
      // 鼠标尚未移动过（还在默认位置），不生成
      if (mx < 0) return

      trailRef.current.push({
        x: mx + (Math.random() - 0.5) * 30,
        y: my + (Math.random() - 0.5) * 20,
        symbol: MATH_SYMBOLS[Math.floor(Math.random() * MATH_SYMBOLS.length)],
        life: 1,
        size: Math.random() * 6 + 12,
        vx: (Math.random() - 0.5) * 0.3,
        vy: Math.random() * 0.3 + 0.2,
      })
      if (trailRef.current.length > 30) {
        trailRef.current.splice(0, trailRef.current.length - 30)
      }
    }

    const animate = () => {
      timeRef.current++

      if (!isPageVisibleRef.current || document.hidden) {
        // 页面在后台，跳过渲染，继续请求下一帧以检测恢复
        animationRef.current = requestAnimationFrame(animate)
        return
      }

      drawCheckerboard()
      drawFormulas()
      // 每 ~20 帧尝试生成一个静止粒子
      if (timeRef.current % 20 === 0) {
        spawnIdleParticle()
      }
      drawTrail()
      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    // 页面可见性变化时暂停/恢复渲染
    const handleVisibilityChange = () => {
      isPageVisibleRef.current = !document.hidden
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    const themeObserver = new MutationObserver(() => {})
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      window.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
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
