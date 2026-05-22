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

  const MATH_SYMBOLS = [
    '∑', '∫', '∂', '∇', '√', 'π', '∞', '≈', '≠', '≤', '≥', 'Δ', 'Σ',
    'λ', 'θ', 'α', 'β', 'γ', 'δ', 'ε', 'μ', 'σ', 'τ', 'ω', 'φ', 'ψ', 'η', 'κ', 'ρ',
    '×', '÷', '±', '∓', '∝', '∠', '⊥', '∥', '∩', '∪', '⊂', '⊃', '∈', '∉',
    '∀', '∃', '∧', '∨', '⊕', '⊗', '∴', '∵', '∼', '≅', '≡', '≪', '≫',
    '∏', '∐', '∛', '∜', 'ℕ', 'ℤ', 'ℚ', 'ℝ', 'ℂ', 'ℵ', 'ℶ',
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
  ]
  
  const FORMULAS = [
    // 数学公式
    { type: 'text', content: 'e^{iπ}+1=0' },
    { type: 'text', content: '∫e^{-x²}dx' },
    { type: 'text', content: '∑1/n²' },
    { type: 'text', content: '∇·F=0' },
    { type: 'text', content: 'a²+b²=c²' },
    { type: 'text', content: '∂u/∂t=∇²u' },
    { type: 'text', content: 'det(A)≠0' },
    { type: 'text', content: 'lim x→∞' },
    { type: 'text', content: 'Δ=b²-4ac' },
    { type: 'text', content: 'φ=(1+√5)/2' },
    { type: 'text', content: 'i²=-1' },
    { type: 'text', content: '∫₀^∞' },
    { type: 'text', content: '∑_{n=0}^∞' },
    { type: 'text', content: "f'(x)=lim" },
    { type: 'text', content: '∮ E·dl' },
    // 三角函数
    { type: 'text', content: 'sin²θ+cos²θ=1' },
    { type: 'text', content: 'sin(2θ)=2sinθcosθ' },
    { type: 'text', content: 'cos(2θ)=cos²θ-sin²θ' },
    { type: 'text', content: 'tanθ=sinθ/cosθ' },
    { type: 'text', content: 'cscθ=1/sinθ' },
    { type: 'text', content: 'secθ=1/cosθ' },
    { type: 'text', content: 'cotθ=1/tanθ' },
    { type: 'text', content: 'sin(π/2-θ)=cosθ' },
    { type: 'text', content: 'sin(π+θ)=-sinθ' },
    { type: 'text', content: 'sin(α±β)=sinαcosβ±cosαsinβ' },
    { type: 'text', content: 'cos(α±β)=cosαcosβ∓sinαsinβ' },
    { type: 'text', content: 'sinh x=(eˣ-e⁻ˣ)/2' },
    { type: 'text', content: 'cosh x=(eˣ+e⁻ˣ)/2' },
    { type: 'text', content: 'arcsin x' },
    { type: 'text', content: 'arccos x' },
    { type: 'text', content: 'arctan x' },
    // 物理公式
    { type: 'text', content: 'F=q(E+v×B)' },
    { type: 'text', content: 'PV=nRT' },
    { type: 'text', content: 'F=Gm₁m₂/r²' },
    { type: 'text', content: 'E=hf' },
    { type: 'text', content: 'KE=½mv²' },
    { type: 'text', content: 'PE=mgh' },
    { type: 'text', content: 'ΔxΔp≥ℏ/2' },
    { type: 'text', content: 'v=fλ' },
    { type: 'text', content: 'I=V/R' },
    { type: 'text', content: 'P=IV' },
    { type: 'text', content: 'F=kx' },
    { type: 'text', content: 'W=Fd' },
    { type: 'text', content: 'p=mv' },
    { type: 'text', content: 'F=BIL' },
    { type: 'text', content: 'c=λf' },
    { type: 'text', content: 'τ=r×F' },
    { type: 'text', content: 'S=k·ln(W)' },
    { type: 'text', content: 'F=ma' },
    { type: 'text', content: 'E=mc²' },
    { type: 'text', content: 'KE=½Iω²' },
    { type: 'text', content: 'E₀=mc²' },
    { type: 'text', content: 'Γ(n)=(n-1)!!' },
    { type: 'text', content: '∇·B=0' },
    { type: 'text', content: '∇×E=-∂B/∂t' },
    { type: 'text', content: 'E=ℏω' },
    { type: 'text', content: 'p=ℏk' },
    // 分式公式
    { type: 'frac', num: 'dv', den: 'dt' },
    { type: 'frac', num: 'Δx', den: 'Δt' },
    { type: 'frac', num: 'F', den: 'm' },
    { type: 'frac', num: '∂ψ', den: '∂t' },
    { type: 'frac', num: 'ΔQ', den: 'Δt' },
    { type: 'frac', num: 'ρ', den: 'ε₀' },
    { type: 'frac', num: '∂u', den: '∂t' },
    // 动态数值公式（数值会随时间切换）
    { type: 'dynamic', template: 'sin({n}π)', values: ['0', '¼', '½', '¾', '1', '3/2', '2'] },
    { type: 'dynamic', template: 'cos({n}°)', values: ['0', '30', '45', '60', '90', '120', '180'] },
    { type: 'dynamic', template: 'tan({n}°)', values: ['0', '30', '45', '60'] },
    { type: 'dynamic', template: 'x={n}', values: ['0', '1', '2', '3', '4', '5'] },
    { type: 'dynamic', template: 'x^{n}', values: ['0', '1', '2', '3', '4'] },
    { type: 'dynamic', template: '√{n}', values: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'] },
    { type: 'dynamic', template: 'log_{n}x', values: ['2', '3', '4', '5', '10'] },
    { type: 'dynamic', template: 'E_n=-{n}/n²', values: ['13.6', '3.4', '1.51', '0.85'] },
    { type: 'dynamic', template: 'n!={n}', values: ['1', '2', '6', '24', '120', '720'] },
    { type: 'dynamic', template: 'e^{n}', values: ['0', '1', '2', '3'] },
  ]

  const MATRIX_TEMPLATES = [
    { type: 'matrix', rows: [['a', 'b'], ['c', 'd']] },
    { type: 'matrix', rows: [['1', '0'], ['0', '1']] },
    { type: 'matrix', rows: [['x₁', 'x₂'], ['y₁', 'y₂']] },
    { type: 'matrix', rows: [['a', 'b', 'c'], ['d', 'e', 'f'], ['g', 'h', 'i']] },
    { type: 'matrix', rows: [['1', '0', '0'], ['0', '1', '0'], ['0', '0', '1']] },
    { type: 'matrix', rows: [['σ₁', '0'], ['0', 'σ₂']] },
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
      if (trailRef.current.length > 30) {
        trailRef.current.splice(0, trailRef.current.length - 30)
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

    const drawFraction = (ctx, x, y, num, den, size, color) => {
      const fontSize = size * 0.65
      ctx.font = `${fontSize}px "Times New Roman", serif`
      ctx.textAlign = 'center'
      ctx.fillStyle = color

      const numWidth = ctx.measureText(num).width
      const denWidth = ctx.measureText(den).width
      const lineWidth = Math.max(numWidth, denWidth) + 8
      const lineY = y + 2

      ctx.textBaseline = 'bottom'
      ctx.fillText(num, x, lineY - 3)

      ctx.strokeStyle = color
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(x - lineWidth / 2, lineY)
      ctx.lineTo(x + lineWidth / 2, lineY)
      ctx.stroke()

      ctx.textBaseline = 'top'
      ctx.fillText(den, x, lineY + 4)
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

        // 动态公式：周期性切换数值
        if (f.type === 'dynamic') {
          f.switchTimer--
          if (f.switchTimer <= 0) {
            f.valueIndex = (f.valueIndex + 1) % f.values.length
            f.content = f.template.replace('{n}', f.values[f.valueIndex])
            f.switchTimer = Math.floor(Math.random() * 80) + 50
          }
        }

        // 四舍五入坐标到 0.5px，消除亚像素抖动
        const drawX = Math.round(f.x * 2) / 2
        const drawY = Math.round(f.y * 2) / 2

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
