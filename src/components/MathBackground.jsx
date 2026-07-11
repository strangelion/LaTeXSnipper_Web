import React, { useEffect, useRef } from 'react'

// Module-level constants to avoid re-creating arrays on every render
const MATH_SYMBOLS = [
  '∑', '∫', '∂', '∇', '√', 'π', '∞', '≈', '≠', '≤', '≥', 'Δ', 'Σ',
  'λ', 'θ', 'α', 'β', 'γ', 'δ', 'ε', 'μ', 'σ', 'τ', 'ω', 'φ', 'ψ',
  '×', '÷', '±', '∓', '∠', '⊥', '∈', '∩', '∪', '⊂', '⊃',
  '∀', '∃', '∧', '∨', '⊕', '⊗', '∴', '∵', '∼', '≅', '≡',
  'ℕ', 'ℤ', 'ℚ', 'ℝ', 'ℂ', 'ℵ',
]

const FORMULAS = [
  { type: 'text', content: 'e^{iπ}+1=0' },
  { type: 'text', content: '∫e^{-x²}dx' },
  { type: 'text', content: '∑1/n²' },
  { type: 'text', content: '∇·F=0' },
  { type: 'text', content: 'a²+b²=c²' },
  { type: 'text', content: '∂u/∂t=∇²u' },
  { type: 'text', content: 'lim x→∞' },
  { type: 'text', content: 'Δ=b²-4ac' },
  { type: 'text', content: 'φ=(1+√5)/2' },
  { type: 'text', content: 'i²=-1' },
  { type: 'text', content: 'sin²θ+cos²θ=1' },
  { type: 'text', content: 'tanθ=sinθ/cosθ' },
  { type: 'text', content: 'F=Gm₁m₂/r²' },
  { type: 'text', content: 'E=mc²' },
  { type: 'text', content: 'F=ma' },
  { type: 'text', content: 'E=hf' },
  { type: 'text', content: 'ΔxΔp≥ℏ/2' },
  { type: 'text', content: 'PV=nRT' },
  { type: 'text', content: 'F=q(E+v×B)' },
  { type: 'text', content: 'I=V/R' },
  { type: 'text', content: 'S=k·ln(W)' },
  // Fraction templates (lower drawing complexity)
  { type: 'frac', num: 'dv', den: 'dt' },
  { type: 'frac', num: 'Δx', den: 'Δt' },
  { type: 'frac', num: '∂ψ', den: '∂t' },
  { type: 'frac', num: 'ρ', den: 'ε₀' },
  // Dynamic formulas (fewer values for faster switching)
  { type: 'dynamic', template: 'sin({n}π)', values: ['0', '½', '1', '3/2'] },
  { type: 'dynamic', template: 'x^{n}', values: ['0', '1', '2', '3'] },
  { type: 'dynamic', template: '√{n}', values: ['0', '2', '4', '9'] },
  { type: 'dynamic', template: 'n!={n}', values: ['1', '2', '6', '24'] },
]

const MATRIX_TEMPLATES = [
  { type: 'matrix', rows: [['a', 'b'], ['c', 'd']] },
  { type: 'matrix', rows: [['1', '0'], ['0', '1']] },
  { type: 'matrix', rows: [['x₁', 'x₂'], ['y₁', 'y₂']] },
  { type: 'matrix', rows: [['a', 'b', 'c'], ['d', 'e', 'f'], ['g', 'h', 'i']] },
]

export default function MathBackground() {
  const canvasRef = useRef(null)
  const animationRef = useRef(null)
  const mouseRef = useRef({ x: -100, y: -100 })
  const trailRef = useRef([])
  const formulasRef = useRef([])
  const frameRef = useRef(0)
  const lastMoveTimeRef = useRef(Date.now())
  const isPageVisibleRef = useRef(true)
  const resizeTimerRef = useRef(null)
  const isTouchingRef = useRef(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Accessibility: detect reduced motion and coarse pointer
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    const coarsePointer = window.matchMedia(
      '(pointer: coarse)',
    ).matches

    const isDarkMode = () => {
      return document.documentElement.getAttribute('data-theme') === 'dark' ||
        (!document.documentElement.getAttribute('data-theme') &&
          window.matchMedia('(prefers-color-scheme: dark)').matches)
    }

    let checkerboardCache = null
    let cachedTheme = ''

    const buildCheckerboardCache = () => {
      if (!canvas) return
      const w = canvas.width, h = canvas.height
      const currentTheme = isDarkMode() ? 'dark' : 'light'
      // 缓存大小和主题都不变时不重建
      if (checkerboardCache && checkerboardCache.width === w && checkerboardCache.height === h && cachedTheme === currentTheme) return
      cachedTheme = currentTheme
      checkerboardCache = document.createElement('canvas')
      checkerboardCache.width = w
      checkerboardCache.height = h
      const cctx = checkerboardCache.getContext('2d')
      if (!cctx) return
      const dark = isDarkMode()

      // 底色
      cctx.fillStyle = dark ? '#0f111a' : '#f6fbff'
      cctx.fillRect(0, 0, w, h)

      // 数学方格纸网格：小格 20px，粗格 100px
      const smallSize = 20
      const bigSize = 100

      // 小网格线（浅）
      cctx.strokeStyle = dark ? 'rgba(200, 220, 255, 0.05)' : 'rgba(60, 120, 200, 0.08)'
      cctx.lineWidth = 1
      for (let x = 0; x <= w; x += smallSize) {
        if (x % bigSize !== 0) {
          cctx.beginPath()
          cctx.moveTo(x + 0.5, 0)
          cctx.lineTo(x + 0.5, h)
          cctx.stroke()
        }
      }
      for (let y = 0; y <= h; y += smallSize) {
        if (y % bigSize !== 0) {
          cctx.beginPath()
          cctx.moveTo(0, y + 0.5)
          cctx.lineTo(w, y + 0.5)
          cctx.stroke()
        }
      }

      // 粗网格线（略深）
      cctx.strokeStyle = dark ? 'rgba(200, 220, 255, 0.12)' : 'rgba(60, 120, 200, 0.15)'
      cctx.lineWidth = 1
      for (let x = 0; x <= w; x += bigSize) {
        cctx.beginPath()
        cctx.moveTo(x + 0.5, 0)
        cctx.lineTo(x + 0.5, h)
        cctx.stroke()
      }
      for (let y = 0; y <= h; y += bigSize) {
        cctx.beginPath()
        cctx.moveTo(0, y + 0.5)
        cctx.lineTo(w, y + 0.5)
        cctx.stroke()
      }
    }

    const resizeCanvas = () => {
      // 背景效果使用 1x 分辨率即可（高 DPI 下肉眼几乎看不出差异）
      const dpr = 1
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      canvas.style.width = window.innerWidth + 'px'
      canvas.style.height = window.innerHeight + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      buildCheckerboardCache()
    }
    resizeCanvas()

    const debouncedResize = () => {
      clearTimeout(resizeTimerRef.current)
      resizeTimerRef.current = setTimeout(resizeCanvas, 150)
    }
    window.addEventListener('resize', debouncedResize)

    const spawnTrailParticle = (cx, cy, prevX, prevY, fromTouch = false) => {
      const dx = cx - prevX
      const dy = cy - prevY
      const speed = Math.sqrt(dx * dx + dy * dy)
      const isMoving = speed > 2

      // 触摸/移动时沿运动方向散开；静止时向下散落
      const spreadX = isMoving
        ? dx * 0.18 + (Math.random() - 0.5) * 1.5
        : (Math.random() - 0.5) * 1.2
      const spreadY = isMoving
        ? dy * 0.18 + (Math.random() - 0.5) * 1.5
        : Math.random() * 0.6 + 0.4

      trailRef.current.push({
        x: cx + (Math.random() - 0.5) * 8,
        y: cy + (Math.random() - 0.5) * 8,
        symbol: MATH_SYMBOLS[Math.floor(Math.random() * MATH_SYMBOLS.length)],
        life: 1,
        size: Math.random() * 8 + (fromTouch ? 16 : 14),
        vx: spreadX,
        vy: spreadY,
      })
      // 尾翼粒子最大数量
      const maxTrail = fromTouch ? 15 : 25
      if (trailRef.current.length > maxTrail) {
        trailRef.current.splice(0, trailRef.current.length - maxTrail)
      }
    }

    const handleMouseMove = (e) => {
      const prev = mouseRef.current
      mouseRef.current = { x: e.clientX, y: e.clientY }
      spawnTrailParticle(e.clientX, e.clientY, prev.x, prev.y, false)
      lastMoveTimeRef.current = Date.now()
    }
    // Only track mouse on non-touch devices without reduced motion
    if (!reducedMotion && !coarsePointer) {
      window.addEventListener('mousemove', handleMouseMove)
    }

    // Touch events - skip entirely when reduced motion is preferred
    const handleTouchStart = (e) => {
      if (e.touches.length === 0) return
      isTouchingRef.current = true
      const t = e.touches[0]
      mouseRef.current = { x: t.clientX, y: t.clientY }
      // 触摸开始瞬间生成一簇粒子
      for (let i = 0; i < 5; i++) {
        spawnTrailParticle(t.clientX, t.clientY, t.clientX - 10, t.clientY, true)
      }
      lastMoveTimeRef.current = Date.now()
    }

    const handleTouchMove = (e) => {
      if (e.touches.length === 0) return
      const t = e.touches[0]
      const prev = mouseRef.current
      mouseRef.current = { x: t.clientX, y: t.clientY }
      spawnTrailParticle(t.clientX, t.clientY, prev.x, prev.y, true)
      lastMoveTimeRef.current = Date.now()
    }

    const handleTouchEnd = () => {
      isTouchingRef.current = false
    }

    if (!reducedMotion) {
      window.addEventListener('touchstart', handleTouchStart, { passive: true })
      window.addEventListener('touchmove', handleTouchMove, { passive: true })
      window.addEventListener('touchend', handleTouchEnd)
    }

    const initFormulas = () => {
      formulasRef.current = []
      // Reduced motion: no floating formulas at all
      const density = reducedMotion
        ? Number.POSITIVE_INFINITY
        : window.innerWidth < 768
          ? 180000
          : 90000
      const count = reducedMotion
        ? 0
        : Math.max(6, Math.min(20, Math.floor((canvas.width * canvas.height) / density)))
      for (let i = 0; i < count; i++) {
        formulasRef.current.push(createFormula(canvas))
      }
    }

    const createFormula = (canvas) => {
      const useMatrix = Math.random() > 0.7
      const def = useMatrix
        ? MATRIX_TEMPLATES[Math.floor(Math.random() * MATRIX_TEMPLATES.length)]
        : FORMULAS[Math.floor(Math.random() * FORMULAS.length)]
      
      const base = {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 14 + 16,
        opacity: 0,
        targetOpacity: Math.random() * 0.3 + 0.25,
        fadeSpeed: Math.random() * 0.008 + 0.003,
        life: Math.random() * 600 + 300,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        phase: 'in',
      }
      
      if (def.type === 'frac') {
        return { ...base, type: 'frac', num: def.num, den: def.den, content: '' }
      } else if (def.type === 'matrix') {
        return { ...base, type: 'matrix', rows: def.rows, content: '' }
      } else if (def.type === 'dynamic') {
        return {
          ...base,
          type: 'dynamic',
          template: def.template,
          values: def.values,
          valueIndex: Math.floor(Math.random() * def.values.length),
          switchTimer: Math.floor(Math.random() * 100) + 60,
          content: def.template.replace('{n}', def.values[0])
        }
      } else {
        return { ...base, type: 'text', content: def.content }
      }
    }

    initFormulas()

    const drawCheckerboard = () => {
      if (checkerboardCache && checkerboardCache.width > 0 && checkerboardCache.height > 0) {
        ctx.drawImage(checkerboardCache, 0, 0)
      }
    }

    const drawFraction = (ctx, x, y, num, den, size, color) => {
      const fontSize = size * 0.65
      ctx.font = `${fontSize}px "Times New Roman", serif`
      ctx.textAlign = 'center'
      ctx.fillStyle = color

      const nw = ctx.measureText(num).width
      const dw = ctx.measureText(den).width
      const lw = Math.max(nw, dw) + 8
      const ly = y + 2

      ctx.textBaseline = 'bottom'
      ctx.fillText(num, x, ly - 3)

      ctx.strokeStyle = color
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(x - lw / 2, ly)
      ctx.lineTo(x + lw / 2, ly)
      ctx.stroke()

      ctx.textBaseline = 'top'
      ctx.fillText(den, x, ly + 4)
      ctx.textBaseline = 'middle'
    }

    const drawMatrix = (ctx, x, y, rows, size, color) => {
      const fontSize = size * 0.55
      ctx.font = `${fontSize}px "Times New Roman", serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = color
      ctx.strokeStyle = color

      const r = rows.length
      const c = rows[0].length
      const cellW = fontSize * 1.5
      const cellH = fontSize * 1.4
      const padding = 4

      const matrixW = c * cellW
      const matrixH = r * cellH

      ctx.lineWidth = 2
      // 左括号
      const lx = x - matrixW / 2 - padding - 6
      ctx.beginPath()
      ctx.moveTo(lx + 4, y - matrixH / 2 - 2)
      ctx.lineTo(lx, y - matrixH / 2 - 2)
      ctx.lineTo(lx, y + matrixH / 2 + 2)
      ctx.lineTo(lx + 4, y + matrixH / 2 + 2)
      ctx.stroke()

      // 右括号
      const rx = x + matrixW / 2 + padding + 6
      ctx.beginPath()
      ctx.moveTo(rx - 4, y - matrixH / 2 - 2)
      ctx.lineTo(rx, y - matrixH / 2 - 2)
      ctx.lineTo(rx, y + matrixH / 2 + 2)
      ctx.lineTo(rx - 4, y + matrixH / 2 + 2)
      ctx.stroke()

      for (let i = 0; i < r; i++) {
        for (let j = 0; j < c; j++) {
          ctx.fillText(rows[i][j], x + (j - (c - 1) / 2) * cellW, y + (i - (r - 1) / 2) * cellH)
        }
      }
    }

    const drawFormulas = () => {
      const dark = isDarkMode()
      const color = dark ? 'rgba(180, 200, 240, 0.85)' : 'rgba(40, 50, 80, 0.7)'
      const skipOutOfBounds = (f) =>
        f.x < -100 || f.x > canvas.width + 100 ||
        f.y < -50 || f.y > canvas.height + 50

      for (let i = 0; i < formulasRef.current.length; i++) {
        const f = formulasRef.current[i]

        // 生命周期阶段管理（已移至 animate 更新位置）
        if (f.phase === 'in') {
          f.opacity += f.fadeSpeed
          if (f.opacity >= f.targetOpacity) f.phase = 'hold'
        } else if (f.phase === 'hold') {
          if (f.life < 80) f.phase = 'out'
        } else if (f.phase === 'out') {
          f.opacity -= f.fadeSpeed
        }

        if (f.life <= 0 || f.opacity <= 0 || skipOutOfBounds(f)) {
          formulasRef.current[i] = createFormula(canvas)
          continue
        }
        if (f.opacity < 0.02) continue

        // 动态公式切换
        if (f.type === 'dynamic') {
          f.switchTimer--
          if (f.switchTimer <= 0) {
            f.valueIndex = (f.valueIndex + 1) % f.values.length
            f.content = f.template.replace('{n}', f.values[f.valueIndex])
            f.switchTimer = Math.floor(Math.random() * 150) + 100
          }
        }

        // 使用浮点坐标让 canvas 亚像素抗锯齿平滑渲染
        const drawX = f.x
        const drawY = f.y

        ctx.save()
        ctx.globalAlpha = Math.max(0, f.opacity)

        if (f.type === 'frac') {
          drawFraction(ctx, drawX, drawY, f.num, f.den, f.size, color)
        } else if (f.type === 'matrix') {
          drawMatrix(ctx, drawX, drawY, f.rows, f.size, color)
        } else {
          ctx.fillStyle = color
          ctx.font = `${f.size}px "Times New Roman", serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(f.content, drawX, drawY)
        }

        ctx.restore()
      }
    }

    const drawTrail = () => {
      const dark = isDarkMode()
      const color = dark ? 'rgba(96, 165, 250, 0.95)' : 'rgba(37, 99, 235, 0.9)'

      for (let i = trailRef.current.length - 1; i >= 0; i--) {
        const p = trailRef.current[i]
        p.life -= 0.007
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.055
        p.vx *= 0.993

        if (p.life <= 0) {
          trailRef.current.splice(i, 1)
          continue
        }

        // 整数坐标（减少计算量）
        const drawPx = Math.floor(p.x)
        const drawPy = Math.floor(p.y)

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
      // 鼠标/手指静止超过 1s 时生成下落粒子
      if (Date.now() - lastMoveTimeRef.current < 1000) return
      const mx = mouseRef.current.x
      if (mx < 0) return

      const isTouch = isTouchingRef.current
      trailRef.current.push({
        x: mx + (Math.random() - 0.5) * 30,
        y: mouseRef.current.y + (Math.random() - 0.5) * 20,
        symbol: MATH_SYMBOLS[Math.floor(Math.random() * MATH_SYMBOLS.length)],
        life: 1,
        size: Math.random() * 6 + (isTouch ? 14 : 12),
        vx: (Math.random() - 0.5) * 0.3,
        vy: Math.random() * 0.6 + 0.4,
      })
      const maxTrail = isTouch ? 15 : 25
      if (trailRef.current.length > maxTrail) {
        trailRef.current.splice(0, trailRef.current.length - maxTrail)
      }
    }

    const animate = () => {
      frameRef.current++

      if (!isPageVisibleRef.current || document.hidden) {
        animationRef.current = requestAnimationFrame(animate)
        return
      }

      drawCheckerboard()

      // 偶数帧更新粒子位置并绘制，奇数帧仅绘制（减少一半计算量）
      const updatePhysics = frameRef.current % 2 === 0
      if (updatePhysics) {
        for (let i = 0; i < formulasRef.current.length; i++) {
          const f = formulasRef.current[i]
          f.x += f.vx
          f.y += f.vy
          f.life--
        }
      }
      drawFormulas()

      // 每 ~30 帧尝试生成静止粒子
      if (frameRef.current % 30 === 0) {
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

    const themeObserver = new MutationObserver(() => {
      buildCheckerboardCache()
    })
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })

    return () => {
      window.removeEventListener('resize', debouncedResize)
      clearTimeout(resizeTimerRef.current)
      if (!reducedMotion && !coarsePointer) {
        window.removeEventListener('mousemove', handleMouseMove)
      }
      if (!reducedMotion) {
        window.removeEventListener('touchstart', handleTouchStart)
        window.removeEventListener('touchmove', handleTouchMove)
        window.removeEventListener('touchend', handleTouchEnd)
      }
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
