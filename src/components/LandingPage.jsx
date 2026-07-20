import React, { useEffect, useState } from 'react';
import {
  ecosystemProjects,
  faqs,
  featureShowcases,
  productImages,
  workflowSteps,
} from '../data/siteContent';
import { useReleaseInfo } from '../hooks/useReleaseInfo';
import '../styles/landing.css';

const GITHUB_URL = 'https://github.com/SakuraMathcraft/LaTeXSnipper';

const mascot = {
  src: '/assets/brand/snipper-girl.webp',
  srcSet: '/assets/brand/snipper-girl-640.webp 640w, /assets/brand/snipper-girl-960.webp 960w',
  sizes: '(min-width: 1200px) 30vw, (min-width: 780px) 28vw, 0px',
  enabled: true,
};

const conversionExamples = {
  LaTeX: String.raw`\int_0^\infty e^{-x^2}\,dx`,
  Typst: String.raw`$ integral_0^infinity e^(-x^2) dif x $`,
  Markdown: String.raw`$$\int_0^\infty e^{-x^2}\,dx$$`,
  MathML: '<math><msubsup><mo>∫</mo><mn>0</mn><mo>∞</mo></msubsup></math>',
  OMML: '<m:oMath><m:int>…</m:int></m:oMath>',
};

function LiquidGlassSurface({ as: Tag = 'div', className = '', thickness = 'floating', children }) {
  const ContentTag = Tag === 'span' ? 'span' : 'div';
  return (
    <Tag className={`liquid-surface liquid-surface--${thickness} ${className}`.trim()}>
      <span className="liquid-glass__optics" aria-hidden="true">
        <span className="liquid-glass__tint" />
        <span className="liquid-glass__shine" />
        <span className="liquid-glass__edge" />
      </span>
      <ContentTag className="liquid-glass__content">{children}</ContentTag>
    </Tag>
  );
}

function LiquidGlassFilter() {
  return (
    <svg className="liquid-filter-defs" width="0" height="0" aria-hidden="true" focusable="false">
      <defs>
        <filter id="liquid-edge-refraction" x="-8%" y="-8%" width="116%" height="116%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.018" numOctaves="1" seed="7" result="edgeNoise" />
          <feDisplacementMap in="SourceGraphic" in2="edgeNoise" scale="1.6" xChannelSelector="R" yChannelSelector="B" />
        </filter>
      </defs>
    </svg>
  );
}

function useTheme() {
  const resolveTheme = () => {
    try {
      const saved = localStorage.getItem('latexSnipper-theme');
      if (saved === 'dark' || saved === 'light') return saved;
    } catch {
      // Fall through to the system preference.
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  const [theme, setTheme] = useState(resolveTheme);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const next = resolveTheme();
    document.documentElement.setAttribute('data-theme', next);
    setTheme(next);

    const onSystemTheme = () => {
      let saved = null;
      try { saved = localStorage.getItem('latexSnipper-theme'); } catch {}
      if (saved === 'dark' || saved === 'light') return;
      const systemTheme = media.matches ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', systemTheme);
      setTheme(systemTheme);
    };
    media.addEventListener('change', onSystemTheme);
    return () => media.removeEventListener('change', onSystemTheme);
  }, []);

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('latexSnipper-theme', next); } catch {}
    setTheme(next);
  }

  return { theme, toggleTheme };
}

function ThemeIcon({ theme }) {
  return theme === 'dark' ? (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></svg>
  ) : (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" /></svg>
  );
}

function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className={`site-header ${scrolled ? 'is-scrolled' : ''}`}>
      <LiquidGlassSurface className="ls-container site-header-inner" thickness="navigation">
        <a className="site-brand" href="/" aria-label="LaTeXSnipper 首页">
          <img src="/assets/images/icon-96.png" width="32" height="32" alt="" />
          <span>LaTeXSnipper</span>
        </a>
        <button
          className="site-menu-toggle"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="site-navigation"
          onClick={() => setMenuOpen((value) => !value)}
        >
          <span className="sr-only">打开或关闭导航</span>
          <span /><span /><span />
        </button>
        <nav id="site-navigation" className={`site-navigation ${menuOpen ? 'is-open' : ''}`} aria-label="主导航">
          <a href="#product" onClick={closeMenu}>产品</a>
          <a href="#workflow" onClick={closeMenu}>工作流</a>
          <a href="#ecosystem" onClick={closeMenu}>生态</a>
          <a href="/user_manual.html" onClick={closeMenu}>文档</a>
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">GitHub</a>
          <button className="theme-icon-button" type="button" onClick={toggleTheme} aria-label={theme === 'dark' ? '切换到亮色模式' : '切换到暗色模式'}>
            <ThemeIcon theme={theme} />
          </button>
          <a className="site-download-link" href="/download.html" onClick={closeMenu}>下载</a>
        </nav>
      </LiquidGlassSurface>
    </header>
  );
}

function HeroSection() {
  return (
    <section className="hero-section" aria-labelledby="hero-title">
      <div className="hero-wordmark" aria-hidden="true">MATHEMATICS</div>
      <div className="ls-container hero-grid">
        <div className="hero-copy reveal">
          <p className="hero-eyebrow">LOCAL-FIRST MATHEMATICAL WORKSPACE</p>
          <h1 id="hero-title">把数学，<br />从图像重新<br />变成知识。</h1>
          <p className="hero-kicker">Capture · Understand · Edit · Transform</p>
          <p className="hero-description">
            从截图、图片、PDF 与手写输入开始，识别数学内容，
            在工作台中编辑与计算，再导出到文档、代码与 Office 工作流。
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href="/download.html">下载 LaTeXSnipper</a>
            <a className="button button-secondary" href="/ocr.html">在线识别</a>
          </div>
          <p className="hero-trust">MathCraft OCR 可本地运行 · Windows 主平台 · 开源</p>
        </div>

        <div className={`hero-visual reveal ${mascot.enabled ? 'has-mascot' : 'is-math-only'}`} aria-label="LaTeXSnipper 数学内容工作流示意">
          <div className="hero-character-glow" aria-hidden="true" />
          {mascot.enabled && (
            <picture className="hero-mascot">
              <source srcSet={mascot.srcSet} sizes={mascot.sizes} type="image/webp" />
              <img src={mascot.src} sizes={mascot.sizes} alt="Snipper娘在公式工作区旁使用手写笔" decoding="async" fetchPriority="high" />
            </picture>
          )}
          <div className="hero-math-layer">
            <div className="hero-orbit hero-orbit-one" aria-hidden="true" />
            <div className="hero-orbit hero-orbit-two" aria-hidden="true" />
            <div className="formula-sheet standard-surface">
              <span className="formula-sheet-label">DOCUMENT AST</span>
              <div className="formula-display">
                <img src="/assets/formula-gaussian-integral.svg" alt="从零到无穷的 e 的负 x 平方积分，等于根号派除以二" />
              </div>
              <div className="formula-source">\int_0^\infty e^&#123;-x^2&#125;\,dx</div>
              <div className="formula-sheet-status"><span /> Editable mathematical semantics</div>
            </div>
            <LiquidGlassSurface as="span" thickness="control" className="format-node node-latex">LaTeX</LiquidGlassSurface>
            <LiquidGlassSurface as="span" thickness="control" className="format-node node-typst">Typst</LiquidGlassSurface>
            <LiquidGlassSurface as="span" thickness="control" className="format-node node-omml">OMML</LiquidGlassSurface>
            <LiquidGlassSurface thickness="floating" className="hero-float-card float-ocr"><strong>MathCraft OCR</strong><span>Local-first recognition</span></LiquidGlassSurface>
            <LiquidGlassSurface thickness="floating" className="hero-float-card float-core"><strong>Core 3</strong><span>Unified Document AST</span></LiquidGlassSurface>
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionHeading({ eyebrow, title, description }) {
  return (
    <header className="section-heading reveal">
      <span>{eyebrow}</span>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </header>
  );
}

function ProductStage() {
  return (
    <section id="product" className="product-stage section-space" aria-labelledby="product-stage-title">
      <div className="ls-container product-stage-grid">
        <SectionHeading eyebrow="真实工作台" title="从识别开始，在同一处完成数学工作。" description="截图识别、公式编辑、数学计算与格式导出位于一个真实的桌面工作区。" />
        <figure className="workspace-frame reveal">
          <div className="workspace-toolbar" aria-hidden="true"><span><i /><i /><i /></span><em>LaTeXSnipper / Workspace</em><small>Local-first</small></div>
          <img
            src={productImages.heroWorkspace}
            width="1600"
            height="1000"
            alt="LaTeXSnipper 数学工作台主界面"
            loading={mascot.enabled ? 'lazy' : undefined}
            decoding="async"
            fetchPriority={mascot.enabled ? 'auto' : 'high'}
          />
          <figcaption>不是一张结果图片：每一步都保留可以继续编辑与使用的数学内容。</figcaption>
        </figure>
      </div>
    </section>
  );
}

function WorkflowSection() {
  return (
    <section id="workflow" className="section-space workflow-section">
      <div className="ls-container">
        <SectionHeading eyebrow="一个清楚的路径" title="捕获、理解、编辑、交付。" />
        <ol className="workflow-rail reveal">
          {workflowSteps.map((step) => (
            <li key={step.number}>
              <span className="workflow-number">{step.number}</span>
              <div><h3>{step.title}</h3><p>{step.description}</p></div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function ProductStories() {
  return (
    <section className="section-space stories-section" aria-labelledby="stories-title">
      <div className="ls-container">
        <SectionHeading eyebrow="三个核心故事" title="识别之后，数学工作才刚刚开始。" />
        <div className="story-list">
          {featureShowcases.map((feature, index) => (
            <article className={`story-card reveal ${index % 2 ? 'is-reversed' : ''}`} key={feature.id}>
              <div className="story-image"><img src={feature.image} width={feature.width} height={feature.height} alt={feature.alt} loading="lazy" decoding="async" /></div>
              <div className="story-copy">
                <span>{feature.eyebrow}</span>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
                <ul>{feature.points.slice(0, 3).map((point) => <li key={point}>{point}</li>)}</ul>
                <a className="text-link" href={feature.href}>{feature.cta} <span aria-hidden="true">→</span></a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ConversionUniverse() {
  const [format, setFormat] = useState('LaTeX');

  return (
    <section className="conversion-section section-space" aria-labelledby="conversion-title">
      <div className="ls-container conversion-grid">
        <div className="reveal">
          <SectionHeading eyebrow="一种数学，多种表达" title="让同一公式进入真正的工作流。" description="此处是格式示例；实际可用格式与稳定性由 Desktop 和 Core 的运行时能力决定。" />
          <div className="format-selector" aria-label="选择一个格式示例">
            {Object.keys(conversionExamples).map((item) => <button key={item} type="button" className={format === item ? 'is-active' : ''} onClick={() => setFormat(item)} aria-pressed={format === item}>{item}</button>)}
          </div>
        </div>
        <div className="conversion-console standard-surface reveal">
          <div><span>Example output</span><strong>{format}</strong></div>
          <pre><code>{conversionExamples[format]}</code></pre>
          <p>语义转换以统一 Document AST 为中心；不同格式有明确的稳定性与保真度等级。</p>
        </div>
      </div>
    </section>
  );
}

function StatusBadge({ children }) {
  return <span className="status-badge"><span aria-hidden="true">●</span>{children}</span>;
}

function EcosystemSection() {
  return (
    <section id="ecosystem" className="section-space ecosystem-section" aria-labelledby="ecosystem-title">
      <div className="ls-container">
        <SectionHeading eyebrow="清楚的生态边界" title="一个工作空间，四个独立项目。" description="版本、维护者和许可证分别标注；不将独立项目的能力混入 Desktop 描述。" />
        <div className="ecosystem-grid">
          {ecosystemProjects.map((project) => (
            <article className="ecosystem-card standard-surface reveal" key={project.repository}>
              <div className="ecosystem-topline"><span>{project.scope}</span><StatusBadge>{project.status}</StatusBadge></div>
              <h3>{project.name}</h3>
              <p>{project.description}</p>
              <dl><div><dt>版本</dt><dd>{project.version}</dd></div><div><dt>维护者</dt><dd>{project.author}</dd></div><div><dt>许可证</dt><dd>{project.license}</dd></div></dl>
              <a className="text-link" href={project.href} target="_blank" rel="noopener noreferrer">查看仓库 <span aria-hidden="true">↗</span></a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function PrivacySection() {
  return (
    <section className="privacy-section section-space" aria-labelledby="privacy-title">
      <div className="ls-container privacy-grid reveal">
        <div><p className="hero-eyebrow">LOCAL-FIRST / PRIVACY</p><h2 id="privacy-title">你的数学内容，<br />默认留在你的设备上。</h2></div>
        <div className="privacy-copy"><p>MathCraft OCR 与部分数学处理可以在本地运行。只有主动配置并使用第三方或外部服务时，相关内容才会按照该服务的配置发送。</p><ul><li>本地模型与本地处理</li><li>用户控制的外部服务</li><li>开源项目的透明边界</li></ul></div>
      </div>
    </section>
  );
}

function DownloadCta() {
  const { release } = useReleaseInfo();
  return (
    <section className="section-space download-cta"><div className="ls-container download-cta-panel standard-surface reveal"><div><span>DESKTOP {release.version} {release.channel}</span><h2>从下载中心开始，选择适合你的平台。</h2><p>下载中心只显示经过 release manifest 验证的实际资产，并保留独立生态项目的边界。</p></div><a className="button button-primary" href="/download.html">前往下载中心</a></div></section>
  );
}

function FaqSection() {
  return (
    <section className="section-space faq-section"><div className="ls-container"><SectionHeading eyebrow="常见问题" title="开始之前，先说明边界。" /><div className="faq-list reveal">{faqs.slice(0, 3).map((item) => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</div></div></section>
  );
}

function SiteFooter() {
  return (
    <footer className="site-footer"><div className="ls-container footer-grid"><div><a className="site-brand" href="/"><img src="/assets/images/icon-96.png" width="28" height="28" alt="" /><span>LaTeXSnipper</span></a><p>本地优先的数学识别、编辑与转换工作空间。</p></div><nav aria-label="站点链接"><a href="/download.html">下载</a><a href="/ocr.html">在线识别</a><a href="/user_manual.html">用户手册</a><a href="/open-source.html">开源许可</a></nav><p className="footer-note">各项目作者与许可证分别标注。<br />Desktop GPL-3.0 · Core / Office / Mobile AGPL-3.0</p></div></footer>
  );
}

export default function LandingPage() {
  return (
    <>
      <LiquidGlassFilter />
      <SiteHeader />
      <main id="main-content"><HeroSection /><ProductStage /><WorkflowSection /><ProductStories /><ConversionUniverse /><EcosystemSection /><PrivacySection /><DownloadCta /><FaqSection /></main>
      <SiteFooter />
    </>
  );
}
