# LaTeXSnipper Web Interactive Redesign Plan

> Version: 1.0
> Target repository: `strangelion/LaTeXSnipper_Web`
> Goal: 在不破坏现有产品能力、部署链路和可访问性的前提下，将 LaTeXSnipper Web 升级为一个“数学计算工作空间”的交互式产品官网。

---

## 0. 核心结论

### 0.1 产品定位

LaTeXSnipper Web 不应被设计成单纯的：

- OCR 官网
- Three.js 炫技页面
- 动漫角色展示页
- 普通 SaaS Landing Page

新的核心定位：

> **LaTeXSnipper 是一个把数学从图像、文档和手写输入中提取出来，理解为结构化数学，再转换到不同工作流的数学计算入口。**

核心叙事统一为：

```text
Capture → Understand → Transform → Integrate
```

中文叙事：

```text
捕获 → 理解 → 转换 → 融入工作流
```

### 0.2 技术定位

采用分层方案：

```text
React/Vite
    │
    ├── DOM / SEO / Accessibility / UI
    │
    ├── Three.js
    │      └── 3D 数学空间、AST、转换关系、空间化产品展示
    │
    ├── p5.js
    │      └── 数学生成艺术、实验性可视化、Explore Playground
    │
    ├── MathJax / KaTeX
    │      └── 可读、可访问、真实数学公式
    │
    └── LaTeXSnipper Core WASM
           └── 真正 OCR / AST / Conversion / Browser Capability
```

**原则：Three.js 和 p5.js 是视觉层，不承担产品业务逻辑。**

---

# 1. 现有项目约束

当前项目已经具有：

- React + Vite 首页
- `/download.html`
- `/ocr.html`
- `/user_manual.html`
- Cloudflare Worker + Static Assets 部署
- Core WASM / OCR / MathJax / PDF.js / ONNX Runtime 等资产链路
- Liquid Glass UI
- `HeroSection`
- `MathBackground`
- `ProductStage`
- `DemosSection`
- `CardCarousel`
- `SectionIndicator`
- `ScrollProgress`
- `BackToTop`
- Snipper 娘透明 WebP 素材

这些现有能力原则上保留，不做没有必要的大规模删除。

### 1.1 不允许破坏的部分

以下内容属于工程边界：

1. 不改变现有 Cloudflare 部署结构。
2. 不删除或绕过 Core WASM 校验、release manifest、SHA-256 验证逻辑。
3. 不将敏感信息加入前端源码。
4. 不把现有 `/download.html`、`/ocr.html`、`/user_manual.html` 重新做成 canvas-only 页面。
5. 不使用生成式重绘替换现有品牌角色素材。
6. 不把整个网页做成单一 Three.js Canvas。
7. 不让 Three.js 场景承担 SEO 文本、关键导航和表单交互。
8. 必须支持 `prefers-reduced-motion`。

---

# 2. 新首页信息架构

首页分成 8 个主要 Scene：

```text
01 Hero / Math Universe
        ↓
02 Capture
        ↓
03 Recognize
        ↓
04 Understand / AST
        ↓
05 Transform / Conversion
        ↓
06 Workspace / Product
        ↓
07 Ecosystem
        ↓
08 Download / CTA
```

顶部导航保持简洁：

```text
LaTeXSnipper

Product   Workflow   Ecosystem   Docs   GitHub
                                           Download
```

移动端使用独立的 Drawer / Bottom Navigation，不直接压缩桌面导航。

---

# 3. Visual Direction

## 3.1 关键词

```text
Scientific Visualization
Mathematical Computing
Spatial UI
Editorial / Swiss Typography
Liquid Glass
Developer Tool
Technical Illustration
```

避免：

```text
Cyberpunk
游戏 HUD
过度霓虹
纯 AI 视觉
全屏玻璃
星际科幻
```

## 3.2 视觉比例

目标比例：

```text
70% 数学/产品内容
20% UI / 信息层
10% 装饰与动态效果
```

## 3.3 颜色

### Light

```css
--bg: #F6F7F9;
--surface: #FFFFFF;
--text: #111318;
--muted: #68707D;
--accent: #6C63FF;
--success: #00A878;
--border: rgba(17, 19, 24, 0.10);
```

### Dark

```css
--bg: #080A0F;
--surface: #10131A;
--text: #F5F7FA;
--muted: #8D95A5;
--accent: #8B7CFF;
--success: #25C98A;
--border: rgba(255, 255, 255, 0.10);
```

不要大量使用渐变；渐变只承担光学层和强调层。

---

# 4. Scene 01 — Hero / Math Universe

## 4.1 目标

Hero 必须在 5 秒内说明三件事：

1. 这是 LaTeXSnipper。
2. 它处理数学内容。
3. 它可以从图像进入结构化工作流。

## 4.2 DOM 文案

推荐：

### Eyebrow

`LOCAL-FIRST MATHEMATICAL WORKSPACE`

### H1

> 把数学，从图像重新变成知识。

### Supporting

> 从截图、图片、PDF 与手写输入开始，识别数学内容，在工作台中编辑与转换，再导出到文档、代码与 Office 工作流。

### CTA

- 下载 LaTeXSnipper
- 在线识别

### Trust line

- 本地优先
- Browser OCR
- Open Source

## 4.3 Three.js 场景

场景对象：

```text
MathUniverse
├── FormulaObjects
├── MathParticles
├── OrbitLines
├── AmbientGrid
├── CameraRig
├── InteractionField
└── PostFX
```

数学对象包括：

```text
∫  Σ  √  π  ∞  λ  θ  ∂  Δ  ∇
x²  aⁿ  α  β  γ  lim  det  log
```

对象不得是完全随机噪声，应带有数学语义分类。

例如：

```text
IntegralGroup
OperatorGroup
SymbolGroup
VariableGroup
GeometryGroup
```

## 4.4 交互

鼠标移动：

- Camera parallax
- 数学对象轻微避让
- 光源方向改变
- 最近对象进入 focus

Hover：

```text
symbol
  ↓
label
  ↓
semantic category
```

示例：

```text
∫
INTEGRAL
```

Scroll：

```text
0–20%   漂浮
20–45%  聚合
45–65%  结构化
65–85%  转换
85–100% workspace
```

## 4.5 不应该出现

- 无限粒子墙
- 过密公式
- 强烈镜头晃动
- 依赖鼠标才能理解的核心内容

---

# 5. Scene 02 — Capture

## 5.1 核心信息

> Any image can become editable mathematics.

## 5.2 输入类型

```text
Screenshot
Image
PDF
Handwriting
Clipboard
```

## 5.3 视觉流程

```text
Input Artifact
      ↓
Detection Frame
      ↓
Scan Line
      ↓
Symbol Segmentation
```

输入对象从多个方向进入中央识别区域。

## 5.4 交互

用户滚动到本 section 时：

1. 输入文档出现。
2. 识别框定位公式。
3. 扫描线经过公式。
4. 公式拆成 symbol tokens。
5. token 重新组成数学表达式。

---

# 6. Scene 03 — Recognize

标题：

> 从像素到公式。

核心动画：

```text
Image
 ↓
Bounding Region
 ↓
Symbol Tokens
 ↓
Mathematical Expression
```

展示真实数学内容：

```latex
\int_0^\infty e^{-x^2}\,dx
```

同时展示：

```text
Confidence
Structure
Detected symbols
```

不要伪造“AI 置信度数字”冒充真实模型结果；如果没有真实推理数据，明确标注为 demo visualization。

---

# 7. Scene 04 — Understand / AST

这是整个新官网最重要的技术展示之一。

## 7.1 核心标题

> OCR 只是开始。真正有价值的是结构。

## 7.2 AST 结构

示例：

```text
Formula
│
├── Integral
│   ├── LowerBound: 0
│   └── UpperBound: ∞
│
├── Exponential
│   └── Power
│       ├── Base: x
│       └── Exponent: 2
│
└── Differential: dx
```

## 7.3 Three.js 交互

AST 节点是 3D node graph。

支持：

- Hover node
- Focus node
- Expand / Collapse
- Relationship highlight
- Formula ↔ AST 双向高亮

例如用户 Hover `x²`：

```text
AST x²
 ↓
formula x² 高亮
 ↓
LaTeX x^2 高亮
```

## 7.4 不使用纯 3D canvas 作为唯一信息载体

必须有同步 DOM / accessible representation。

---

# 8. Scene 05 — Transform / Conversion Lab

## 8.1 核心定位

不是简单展示“导出按钮”，而是：

> One mathematical structure, many representations.

## 8.2 中央对象

```text
              Math AST
                 │
       ┌─────────┼─────────┐
       │         │         │
     LaTeX     Typst     MathML
       │         │         │
       └─────────┼─────────┘
                 │
               OMML
```

## 8.3 UI

点击任意 representation：

右侧显示：

```text
Format
Code
Copy
```

3D 视觉上表现为：

```text
AST Object
   ↓
morph
   ↓
Representation Object
```

## 8.4 必须保证

如果展示真实 conversion：调用真实 Core。

如果没有调用 Core：必须标记为静态演示数据。

不能让假的数据看起来像实时计算。

---

# 9. Scene 06 — Workspace / Product

核心标题：

> One engine. Multiple workflows.

展示一个空间化工作台：

```text
              Core
               │
      ┌────────┼────────┐
      │        │        │
    OCR     Editor   Converter
      │        │        │
      └────────┼────────┘
               │
       Desktop / Web / Office
```

产品卡片仍使用 DOM，而不是完全依赖 3D。

Three.js 只提供产品关系的视觉层。

---

# 10. Scene 07 — Ecosystem

## 10.1 信息层级

中心必须是：

```text
latexsnipper-core
```

周围：

```text
Web
Desktop
Office
Mobile
```

## 10.2 视觉

不是普通四张卡片。

而是：

```text
                 Web
                  ●
                 / \
                /   \
       Mobile ●  Core  ● Desktop
                \   /
                 \ /
                 ●
               Office
```

可交互：

- Hover project → Core relationship highlight
- Click → 项目页面
- Keyboard focus → 同步 highlight

## 10.3 文案策略

不要只写产品名。

应该写：

```text
Web
Browser-first mathematical workspace

Desktop
Full desktop workflow

Office
Document-oriented integration

Mobile
Capture and quick conversion
```

---

# 11. Scene 08 — Final CTA

视觉：

```text
YOUR MATH
    ↓
LaTeXSnipper
    ↓
Your Workflow
```

标题：

> Your math. Your workflow.

按钮：

- Download
- Try OCR
- GitHub

保留现有下载中心真实 release manifest 逻辑，不在 landing page 里硬编码版本和文件链接。

---

# 12. p5.js 规划

## 12.1 初版不要依赖 p5.js

V1 先完成 Three.js 主体验。

## 12.2 V2 加入 Explore

增加独立入口：

```text
Explore Mathematics
```

页面包含：

```text
Fourier
Fractals
Vector Fields
Lissajous Curves
Parametric Geometry
Probability
Matrix Visualization
```

## 12.3 每个实验的统一接口

```text
Experiment
├── title
├── description
├── equation
├── renderer
├── parameters
├── reset
└── export
```

可提供：

```text
Copy LaTeX
Capture
Export Image
```

---

# 13. React / Three.js 架构

建议目录：

```text
src/
├── components/
│   ├── Header.jsx
│   ├── HeroSection.jsx
│   ├── CaptureSection.jsx
│   ├── RecognizeSection.jsx
│   ├── ASTSection.jsx
│   ├── TransformSection.jsx
│   ├── WorkspaceSection.jsx
│   ├── EcosystemSection.jsx
│   └── CTASection.jsx
│
├── scenes/
│   ├── MathUniverse/
│   │   ├── MathUniverse.jsx
│   │   ├── mathObjects.js
│   │   ├── camera.js
│   │   ├── interaction.js
│   │   └── materials.js
│   │
│   ├── AST/
│   │   ├── ASTScene.jsx
│   │   ├── nodeFactory.js
│   │   ├── edgeFactory.js
│   │   └── interaction.js
│   │
│   └── Conversion/
│       ├── ConversionScene.jsx
│       ├── morphs.js
│       └── formatNodes.js
│
├── experiments/
│   └── p5/
│       ├── Fourier.js
│       ├── Fractal.js
│       └── VectorField.js
│
├── hooks/
│   ├── useReducedMotion.js
│   ├── useSceneVisibility.js
│   ├── usePointerField.js
│   └── useScrollProgress.js
│
└── styles/
    ├── landing.css
    ├── scenes.css
    └── tokens.css
```

---

# 14. 推荐技术栈

```text
React
Vite
Three.js
@react-three/fiber
@react-three/drei
p5.js
GSAP 或 Motion
MathJax / KaTeX
```

不要同时引入过多动画框架。

推荐选择：

```text
DOM transition → CSS / Motion
Scroll choreography → GSAP 或 Motion，二选一
3D → Three.js / R3F
Generative → p5.js
```

---

# 15. 3D 性能策略

## 15.1 Desktop

目标：

```text
60 FPS
```

## 15.2 Laptop / low-power

自动降低：

- particle count
- shadow quality
- postprocessing
- device pixel ratio

## 15.3 Mobile

优先：

```text
30–45 FPS
```

可以关闭：

- complex postprocessing
- expensive shadows
- excessive particles

## 15.4 页面可见性

使用 `IntersectionObserver`：

```text
section visible
    ↓
render loop active

section invisible
    ↓
pause / reduce loop
```

## 15.5 prefers-reduced-motion

启用时：

```text
静态数学背景
简单 opacity
轻量 transform
无持续摄像机运动
```

---

# 16. Accessibility

必须遵循：

```text
DOM first
Canvas second
```

所有核心内容都应该存在于 DOM：

- H1
- section heading
- CTA
- navigation
- product descriptions
- ecosystem links
- formula descriptions

Canvas 是 enhancement，不是唯一信息源。

必须支持：

- Keyboard navigation
- Focus visible
- Escape closes overlays
- Skip link
- Screen reader labels
- Reduced motion
- Contrast

---

# 17. SEO

首页必须有：

```html
<title>LaTeXSnipper — Mathematical OCR & Workspace</title>
<meta name="description" ... />
```

H1 只能有一个核心语义标题。

主要 section 使用：

```html
<section aria-labelledby="...">
```

数学内容不要只渲染为 canvas。

---

# 18. Loading 策略

不要首屏立即加载所有 3D 场景。

### 首屏优先级

```text
HTML
CSS
Hero DOM
Brand image
Hero Three.js
```

延迟：

```text
AST Scene
Conversion Scene
p5 experiments
```

使用 lazy / dynamic import。

---

# 19. Fallback 策略

如果 WebGL 不可用：

```text
Hero  → 静态数学 SVG
AST   → 2D DOM diagram
Transform → 普通卡片
```

用户依然可以使用：

- OCR
- Download
- Docs
- GitHub

绝不能因为 Three.js 失败导致整个首页不可用。

---

# 20. 现有组件迁移策略

## 保留

```text
Header
LiquidGlassSurface
BackToTop
ScrollProgress
SectionIndicator
DemosSection
```

## 改造

```text
HeroSection
MathBackground
ProductStage
CardCarousel
LandingPage
```

## 新增

```text
CaptureSection
RecognizeSection
ASTSection
TransformSection
EcosystemScene
MathUniverse
```

## 不建议

一次性删除大量现有组件然后重新写一套。

---

# 21. 数据层

不要把产品数据散落在 JSX。

建议：

```text
src/data/
├── siteContent.js
├── ecosystem.js
├── workflow.js
├── formulas.js
└── experiments.js
```

数学示例统一从 data 层进入。

---

# 22. Demo 数据真实性规则

所有视觉演示分为两类：

### Real

真实调用：

```text
Core WASM
OCR runtime
conversion engine
release manifest
```

### Illustrative

纯视觉动画。

必须通过内部注释和开发文档明确：

```text
illustrative demo / static visualization
```

禁止视觉上伪装成真实推理数据。

---

# 23. 交互设计规范

## Hover

最多使用：

```text
scale 1.01–1.03
translate 2–8px
opacity change
light response
```

避免巨大跳动。

## Click

必须有明确状态：

```text
idle
hover
focus
active
success
error
```

## Scroll

滚动动画必须可跳过。

不要把用户锁死在固定 scroll timeline。

---

# 24. Typography

推荐层级：

```text
Display   64–120px
H1        52–88px
H2        36–56px
H3        24–32px
Body      16–20px
Caption   12–14px
Code      13–16px
```

大标题使用简洁无衬线。

数学公式使用数学字体：

```text
STIX Two Math
Cambria Math
Latin Modern Math
```

---

# 25. Motion System

统一三个速度层级：

```text
Micro: 120–220ms
UI:    220–420ms
Scene: 600–1400ms
```

所有动效使用 easing。

避免无限循环的大幅度动画。

---

# 26. 第一阶段实现顺序

## Phase 1 — Information Architecture

目标：页面结构正确。

任务：

- 重构 LandingPage
- 添加 8 个 Scene
- 保留原有 Header / Footer / CTA
- 保持所有现有 route 工作
- 完成 light/dark

验收：

```text
npm test
npm run build
```

---

## Phase 2 — Hero Three.js

任务：

- MathUniverse
- Formula objects
- Pointer field
- Scroll progress
- Reduced-motion fallback
- WebGL fallback

验收：

- Desktop 60 FPS target
- Mobile 无崩溃
- 无 canvas-only 内容

---

## Phase 3 — AST Scene

任务：

- 3D node graph
- Formula/AST highlight
- keyboard accessible fallback
- DOM representation

---

## Phase 4 — Conversion Scene

任务：

- representation nodes
- morph animation
- actual Core integration where available
- copy actions

---

## Phase 5 — Ecosystem

任务：

- Core center node
- Web/Desktop/Office/Mobile
- project descriptions
- links

---

## Phase 6 — p5 Explore

只在前五阶段稳定后执行。

---

# 27. QA Checklist

## Function

- [ ] Header works
- [ ] Mobile menu works
- [ ] Theme switch works
- [ ] Download route works
- [ ] OCR route works
- [ ] Manual route works
- [ ] GitHub link works
- [ ] Ecosystem links work

## Accessibility

- [ ] Keyboard navigation
- [ ] Skip link
- [ ] Focus visibility
- [ ] Reduced motion
- [ ] Screen reader content

## Performance

- [ ] No unnecessary continuous render loops
- [ ] Three.js scene pauses when hidden
- [ ] Mobile quality reduction
- [ ] WebGL fallback
- [ ] Lazy loading

## SEO

- [ ] Correct title
- [ ] Correct description
- [ ] One primary H1
- [ ] Semantic sections
- [ ] No important text hidden in canvas

## Release

- [ ] `npm test`
- [ ] `npm run validate:release`
- [ ] `npm run build`
- [ ] Cloudflare deploy dry-run

---

# 28. 明确禁止事项

1. 不要把首页全部改成 WebGL。
2. 不要移除现有浏览器 OCR。
3. 不要删除下载中心 manifest 驱动逻辑。
4. 不要硬编码 Desktop release 文件 URL。
5. 不要在 UI 中伪造真实模型置信度。
6. 不要用大规模粒子替代实际内容。
7. 不要把品牌角色做成唯一视觉中心。
8. 不要在移动端强行保持桌面级 3D 效果。
9. 不要引入多个互相重叠的 animation libraries。
10. 不要让 React state 高频率驱动每一帧 Three.js 对象更新。

---

# 29. 最终页面体验目标

用户打开首页：

```text
数学空间
   ↓
我看到了公式
   ↓
我看到它可以从图像中提取
   ↓
我看到它被理解成结构
   ↓
我看到它可以转换
   ↓
我知道它最终能进入 Desktop / Office / Web
   ↓
我知道应该去哪里下载 / 尝试 OCR
```

最终形成完整产品故事：

```text
                    LA TEXSNIPPER
                           │
              ┌────────────┴────────────┐
              │                         │
           CAPTURE                  WORKFLOW
              │                         │
      Image / PDF / Handwriting         │
              │                         │
              ▼                         │
          RECOGNIZE                     │
              │                         │
              ▼                         │
          UNDERSTAND                    │
              │                         │
              ▼                         │
             AST                        │
              │                         │
              ▼                         │
          TRANSFORM                     │
              │                         │
      LaTeX / Typst / MathML / OMML     │
              │                         │
              └───────────┬─────────────┘
                          ▼
                    ECOSYSTEM
                          │
        ┌─────────┬───────┼───────┬─────────┐
        ▼         ▼       ▼       ▼         
       Web     Desktop   Office  Mobile
```

---

# 30. 给 Coding Agent 的执行原则

执行时必须遵循：

```text
先读现有代码
→ 建立组件/路由/依赖地图
→ 小步修改
→ 每阶段运行测试
→ 不破坏已有 route
→ 不删除旧功能
→ 不假设资产存在
→ 不伪造业务数据
→ 最后做 build + deploy dry-run
```

不要一次修改整个仓库。

建议每个 Phase 单独提交：

```text
feat(web): redesign information architecture
feat(web): add threejs math universe
feat(web): add ast visualization
feat(web): add conversion scene
feat(web): redesign ecosystem
feat(web): add math playground
```

---

# 31. Definition of Done

当满足以下条件，才认为新版完成：

- 首页叙事清晰。
- Three.js 场景成为增强层，而不是页面主体。
- OCR / AST / Conversion 三个核心能力被视觉化表达。
- Core 成为生态关系中心。
- Web / Desktop / Office / Mobile 关系清晰。
- 现有 OCR / Download / Manual / deployment 完整保留。
- Desktop 和 Mobile 都有合理体验。
- Reduced motion 和 WebGL fallback 正常。
- SEO / Accessibility 完整。
- 测试、构建、release validation 全部通过。

最终效果应当是：

> **“这是一个数学计算产品的空间化官网。”**
>
> 而不是：
>
> **“这是一个加了 Three.js 的官网。”**
