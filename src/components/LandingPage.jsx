import React, { useEffect, useRef, useState } from "react";
import {
  ecosystemProjects,
  faqs,
  featureShowcases,
  productImages,
  workflowSteps,
} from "../data/siteContent";
import { useReleaseInfo } from "../hooks/useReleaseInfo";
import { useProjectStats } from "../hooks/useProjectStats";
import {
  GitHubStarCount,
  HeroCounters,
  ProjectStatsStrip,
} from "./ProjectCounters";
import MathWorld from "../three/MathWorld";
import MathPlayground from "../p5/MathPlayground";
import LiquidGlassSurface from "./LiquidGlassSurface";
import AstSection from "./scenes/AstSection";
import CaptureSection from "./scenes/CaptureSection";
import EcosystemScene from "./scenes/EcosystemSection";
import FinalCta from "./scenes/FinalCta";
import RecognizeSection from "./scenes/RecognizeSection";
import TransformSection from "./scenes/TransformSection";
import WorkspaceSection from "./scenes/WorkspaceSection";
import "../styles/landing.css";

const GITHUB_URL = "https://github.com/SakuraMathcraft/LaTeXSnipper";

const mascot = {
  src: "/assets/brand/snipper-girl.webp",
  srcSet:
    "/assets/brand/snipper-girl-640.webp 640w, /assets/brand/snipper-girl-960.webp 960w",
  sizes: "(min-width: 1200px) 30vw, (min-width: 780px) 28vw, 52vw",
  enabled: true,
};

const conversionExamples = {
  LaTeX: String.raw`\int_0^\infty e^{-x^2}\,dx`,
  Typst: String.raw`$ integral_0^infinity e^(-x^2) dif x $`,
  Markdown: String.raw`$$\int_0^\infty e^{-x^2}\,dx$$`,
  MathML: "<math><msubsup><mo>∫</mo><mn>0</mn><mo>∞</mo></msubsup></math>",
  OMML: "<m:oMath><m:int>…</m:int></m:oMath>",
};

function useTheme() {
  const resolveTheme = () => {
    try {
      const saved = localStorage.getItem("latexSnipper-theme");
      if (saved === "dark" || saved === "light") return saved;
    } catch {
      // Fall through to the system preference.
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  };

  const [theme, setTheme] = useState(resolveTheme);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const next = resolveTheme();
    document.documentElement.setAttribute("data-theme", next);
    setTheme(next);

    const onSystemTheme = () => {
      let saved = null;
      try {
        saved = localStorage.getItem("latexSnipper-theme");
      } catch {}
      if (saved === "dark" || saved === "light") return;
      const systemTheme = media.matches ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", systemTheme);
      setTheme(systemTheme);
    };
    media.addEventListener("change", onSystemTheme);
    return () => media.removeEventListener("change", onSystemTheme);
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("latexSnipper-theme", next);
    } catch {}
    setTheme(next);
  }

  return { theme, toggleTheme };
}

function ThemeIcon({ theme }) {
  return theme === "dark" ? (
    <svg
      viewBox="0 0 24 24"
      width="19"
      height="19"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  ) : (
    <svg
      viewBox="0 0 24 24"
      width="19"
      height="19"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  );
}

function GaussianIntegralFormula() {
  return (
    <svg
      className="formula-gaussian-integral"
      viewBox="0 0 620 150"
      role="img"
      aria-label="从零到无穷的 e 的负 x 平方积分，等于根号派除以二"
    >
      <g
        fill="currentColor"
        fontFamily="STIX Two Math, Cambria Math, Latin Modern Math, Times New Roman, serif"
      >
        <text x="28" y="108" fontSize="88">
          ∫
        </text>
        <text x="83" y="44" fontSize="27">
          ∞
        </text>
        <text x="85" y="125" fontSize="27">
          0
        </text>
        <text x="118" y="101" fontSize="66" fontStyle="italic">
          e
        </text>
        <text x="161" y="58" fontSize="30">
          −x²
        </text>
        <text x="231" y="101" fontSize="64" fontStyle="italic">
          dx
        </text>
        <text x="328" y="100" fontSize="60">
          =
        </text>
        <path
          d="M399 76h13l10 20 16-52h76"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <text x="452" y="91" fontSize="55">
          π
        </text>
        <path
          d="M398 105h128"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <text x="451" y="140" fontSize="37">
          2
        </text>
      </g>
    </svg>
  );
}

function SiteHeader({ counters }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileMenuMaterial, setMobileMenuMaterial] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const headerRef = useRef(null);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 720px)");
    const sync = () => {
      setMobileMenuMaterial(query.matches);
      setMenuOpen(false);
    };
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    const closeOnOrientationChange = () => setMenuOpen(false);
    const closeOnOutsidePointer = (event) => {
      if (menuOpen && !headerRef.current?.contains(event.target))
        setMenuOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    window.addEventListener("orientationchange", closeOnOrientationChange);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      window.removeEventListener("orientationchange", closeOnOrientationChange);
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header
      ref={headerRef}
      className="site-header"
    >
      <LiquidGlassSurface
        className="ls-container site-header-inner"
        thickness="navigation"
      >
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
          <span />
          <span />
          <span />
        </button>
        {menuOpen && (
          <button
            className="site-navigation-scrim"
            type="button"
            aria-label="关闭导航"
            onClick={closeMenu}
          />
        )}
        <nav
          id="site-navigation"
          data-menu-owner="react"
          className={`site-navigation ${mobileMenuMaterial ? "lg-surface lg-surface--panel" : ""} ${menuOpen ? "is-open" : ""}`.trim()}
          aria-label="主导航"
        >
          <span className="lg-backdrop" aria-hidden="true" />
          <span className="lg-optics" aria-hidden="true">
            <span className="lg-caustic" />
            <span className="lg-specular" />
            <span className="lg-rim" />
          </span>
          <div className="lg-content">
            <a href="#workspace" onClick={closeMenu}>
              产品
            </a>
            <a href="#capture" onClick={closeMenu}>
              工作流
            </a>
            <a href="#ecosystem" onClick={closeMenu}>
              生态
            </a>
            <a href="/user_manual.html" onClick={closeMenu}>
              文档
            </a>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="site-github-link"
              onClick={closeMenu}
            >
              GitHub
              <GitHubStarCount counters={counters} />
            </a>
            <LiquidGlassSurface
              as="button"
              contentAs="span"
              thickness="control"
              className="theme-icon-button"
              data-lg-inset
              interactive
              type="button"
              onClick={toggleTheme}
              aria-label={
                theme === "dark" ? "切换到亮色模式" : "切换到暗色模式"
              }
            >
              <ThemeIcon theme={theme} />
            </LiquidGlassSurface>
            <a
              className="site-download-link"
              href="/download.html"
              onClick={closeMenu}
            >
              下载
            </a>
          </div>
        </nav>
      </LiquidGlassSurface>
    </header>
  );
}

function HeroSection({ counters }) {
  return (
    <section className="hero-section" aria-labelledby="hero-title">
      <MathWorld />
      <div className="ls-container hero-grid">
        <div className="hero-copy reveal">
          <span className="scene-index">LOCAL-FIRST MATHEMATICAL WORKSPACE</span>
          <h1 id="hero-title">把数学，从图像重新变成知识。</h1>
          <p className="hero-description">
            从截图、图片、PDF 与手写输入开始，识别、理解并转入你的数学工作流。
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href="/download.html">
              下载 LaTeXSnipper
            </a>
            <a className="button button-secondary" href="/ocr.html">
              在线识别
            </a>
            <HeroCounters counters={counters} />
          </div>
        </div>

        <div
          className={`hero-visual reveal ${mascot.enabled ? "has-mascot" : "is-math-only"}`}
          aria-label="LaTeXSnipper 数学内容工作流示意"
        >
          <div className="hero-character-glow" aria-hidden="true" />
          {mascot.enabled && (
            <picture className="hero-mascot">
              <source
                srcSet={mascot.srcSet}
                sizes={mascot.sizes}
                type="image/webp"
              />
              <img
                src={mascot.src}
                sizes={mascot.sizes}
                alt="Snipper娘在公式工作区旁使用手写笔"
                decoding="async"
                fetchpriority="high"
              />
            </picture>
          )}
          <div className="hero-math-layer">
            <LiquidGlassSurface className="formula-sheet" thickness="panel">
              <span className="formula-sheet-label">DOCUMENT AST</span>
              <div className="formula-display">
                <GaussianIntegralFormula />
              </div>
              <div className="formula-source">
                \int_0^\infty e^&#123;-x^2&#125;\,dx
              </div>
              <div className="formula-sheet-status">
                <span /> Editable mathematical semantics
              </div>
            </LiquidGlassSurface>
            <LiquidGlassSurface
              as="span"
              thickness="clear"
              interactive
              className="format-node node-latex"
            >
              LaTeX
            </LiquidGlassSurface>
            <LiquidGlassSurface
              as="span"
              thickness="clear"
              interactive
              className="format-node node-typst"
            >
              Typst
            </LiquidGlassSurface>
            <LiquidGlassSurface
              as="span"
              thickness="clear"
              interactive
              className="format-node node-omml"
            >
              OMML
            </LiquidGlassSurface>
            <LiquidGlassSurface
              thickness="floating"
              interactive
              className="hero-float-card float-ocr"
            >
              <strong>MathCraft OCR</strong>
              <span>Local-first recognition</span>
            </LiquidGlassSurface>
            <LiquidGlassSurface
              thickness="floating"
              interactive
              className="hero-float-card float-core"
            >
              <strong>Core 3</strong>
              <span>Unified Document AST</span>
            </LiquidGlassSurface>
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionHeading({ eyebrow, title, description, scene }) {
  return (
    <header className="section-heading reveal">
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </header>
  );
}

function ProductStage() {
  return (
    <section
      id="product"
      className="product-stage section-space"
      aria-labelledby="product-stage-title"
    >
      <div className="ls-container product-stage-grid">
        <SectionHeading
          scene="05 · WORKSPACE"
          eyebrow="真实工作台"
          title="从识别开始，在同一处完成数学工作。"
          description="截图识别、公式编辑、数学计算与格式导出位于一个真实的桌面工作区。"
        />
        <figure className="workspace-frame reveal">
          <div className="workspace-toolbar" aria-hidden="true">
            <span>
              <i />
              <i />
              <i />
            </span>
            <em>LaTeXSnipper / Workspace</em>
            <small>Local-first</small>
          </div>
          <img
            src={productImages.heroWorkspace}
            width="1600"
            height="1000"
            alt="LaTeXSnipper 数学工作台主界面"
            loading={mascot.enabled ? "lazy" : undefined}
            decoding="async"
            fetchpriority={mascot.enabled ? "auto" : "high"}
          />
          <figcaption>
            不是一张结果图片：每一步都保留可以继续编辑与使用的数学内容。
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

function WorkflowSection() {
  return (
    <section id="workflow" className="section-space workflow-section">
      <div className="ls-container">
        <SectionHeading
          scene="02 · THE PIPELINE"
          title="捕获、理解、编辑、交付。"
        />
        <ol className="workflow-rail reveal">
          {workflowSteps.map((step) => (
            <li key={step.number}>
              <span className="workflow-number">{step.number}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function ProductStories() {
  return (
    <section
      className="section-space stories-section"
      aria-labelledby="stories-title"
    >
      <div className="ls-container">
        <SectionHeading
          eyebrow="三个核心故事"
          title="识别之后，数学工作才刚刚开始。"
        />
        <div className="story-list">
          {featureShowcases.map((feature, index) => (
            <article
              className={`story-card reveal ${index % 2 ? "is-reversed" : ""}`}
              key={feature.id}
            >
              <div className="story-image">
                <img
                  src={feature.image}
                  width={feature.width}
                  height={feature.height}
                  alt={feature.alt}
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className="story-copy">
                <span>{feature.eyebrow}</span>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
                <ul>
                  {feature.points.slice(0, 3).map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
                <a className="text-link" href={feature.href}>
                  {feature.cta} <svg className="arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ConversionUniverse() {
  const [format, setFormat] = useState("LaTeX");

  return (
    <section
      className="conversion-section section-space"
      aria-labelledby="conversion-title"
    >
      <div className="ls-container conversion-grid">
        <div className="reveal">
          <SectionHeading
            scene="04 · TRANSFORM"
            eyebrow="一种数学，多种表达"
            title="让同一公式进入真正的工作流。"
            description="此处是格式示例；实际可用格式与稳定性由 Desktop 和 Core 的运行时能力决定。"
          />
          <div className="format-selector" aria-label="选择一个格式示例">
            {Object.keys(conversionExamples).map((item) => (
              <button
                key={item}
                type="button"
                className={format === item ? "is-active" : ""}
                onClick={() => setFormat(item)}
                aria-pressed={format === item}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <LiquidGlassSurface
          className="conversion-console reveal"
          thickness="panel"
        >
          <div>
            <span>Example output</span>
            <strong>{format}</strong>
          </div>
          <pre>
            <code>{conversionExamples[format]}</code>
          </pre>
          <p>
            语义转换以统一 Document AST
            为中心；不同格式有明确的稳定性与保真度等级。
          </p>
        </LiquidGlassSurface>
      </div>
    </section>
  );
}

function StatusBadge({ children }) {
  return (
    <span className="status-badge">
      <svg
        className="status-dot"
        width="8"
        height="8"
        viewBox="0 0 8 8"
        aria-hidden="true"
      >
        <circle cx="4" cy="4" r="3" fill="currentColor" />
      </svg>
      {children}
    </span>
  );
}

function EcosystemSection() {
  return (
    <section
      id="ecosystem"
      className="section-space ecosystem-section"
      aria-labelledby="ecosystem-title"
    >
      <div className="ls-container">
        <SectionHeading
          scene="06 · ECOSYSTEM"
          eyebrow="清楚的生态边界"
          title="一个工作空间，四个独立项目。"
          description="版本、维护者和许可证分别标注；不将独立项目的能力混入 Desktop 描述。"
        />
        <div className="ecosystem-list">
          {ecosystemProjects.map((project) => (
            <article className="ecosystem-row reveal" key={project.repository}>
              <div className="ecosystem-id">
                <h3>{project.name}</h3>
                <span className="ecosystem-scope">{project.scope}</span>
              </div>
              <div className="ecosystem-body">
                <p>{project.description}</p>
                <dl className="ecosystem-meta">
                  <div>
                    <dt>版本</dt>
                    <dd>{project.version}</dd>
                  </div>
                  <div>
                    <dt>维护者</dt>
                    <dd>{project.author}</dd>
                  </div>
                  <div>
                    <dt>许可证</dt>
                    <dd>{project.license}</dd>
                  </div>
                </dl>
              </div>
              <div className="ecosystem-action">
                <StatusBadge>{project.status}</StatusBadge>
                <a
                  className="text-link"
                  href={project.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  查看仓库 <svg className="arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9" /></svg>
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function PrivacySection() {
  return (
    <section
      className="privacy-section section-space"
      aria-labelledby="privacy-title"
    >
      <div className="ls-container privacy-grid reveal">
        <div>
          <h2 id="privacy-title">
            你的数学内容，
            <br />
            默认留在你的设备上。
          </h2>
        </div>
        <div className="privacy-copy">
          <p>
            MathCraft OCR
            与部分数学处理可以在本地运行。只有主动配置并使用第三方或外部服务时，相关内容才会按照该服务的配置发送。
          </p>
          <ul>
            <li>本地模型与本地处理</li>
            <li>用户控制的外部服务</li>
            <li>开源项目的透明边界</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

function DownloadCta() {
  const { release } = useReleaseInfo();
  return (
    <section className="section-space download-cta">
      <LiquidGlassSurface
        className="ls-container download-cta-panel reveal"
        thickness="panel"
      >
        <div>
          <span>DESKTOP {release.version} {release.channel}</span>
          <h2>从下载中心开始，选择适合你的平台。</h2>
          <p>
            下载中心只显示经过 release manifest
            验证的实际资产，并保留独立生态项目的边界。
          </p>
        </div>
        <a className="button button-primary" href="/download.html">
          前往下载中心
        </a>
      </LiquidGlassSurface>
    </section>
  );
}

function FaqSection() {
  return (
    <section className="section-space faq-section">
      <div className="ls-container">
        <SectionHeading eyebrow="常见问题" title="开始之前，先说明边界。" />
        <div className="faq-list reveal">
          {faqs.slice(0, 3).map((item) => (
            <details key={item.question}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="ls-container footer-grid">
        <div>
          <a className="site-brand" href="/">
            <img
              src="/assets/images/icon-96.png"
              width="28"
              height="28"
              alt=""
            />
            <span>LaTeXSnipper</span>
          </a>
          <p>本地优先的数学识别、编辑与转换工作空间。</p>
        </div>
        <nav aria-label="站点链接">
          <a href="/download.html">下载</a>
          <a href="/ocr.html">在线识别</a>
          <a href="/user_manual.html">用户手册</a>
          <a href="/open-source.html">开源许可</a>
        </nav>
        <p className="footer-note">
          各项目作者与许可证分别标注。
          <br />
          Desktop GPL-3.0 · Core / Office / Mobile AGPL-3.0
        </p>
      </div>
    </footer>
  );
}

// Scene 04 — Understand: the Unidentified Document AST, dressed as a live tree.
function UnderstandSection() {
  return (
    <section
      id="understand"
      className="section-space understand-section"
      aria-labelledby="understand-title"
    >
      <div className="ls-container">
        <SectionHeading
          scene="03 · UNDERSTAND"
          title="识别出的不是一行字符串，而是结构。"
          description="每个公式都组织成有语义的 Document AST：节点可悬停、可展开，任一下标都与整棵结构联动。"
        />
        <div className="ast-stage reveal">
          <LiquidGlassSurface className="ast-sheet" thickness="panel">
            <span className="ast-sheet-label">DOCUMENT AST</span>
            <div className="ast-formula">
              <GaussianIntegralFormula />
            </div>
            <div className="ast-tree" role="img" aria-label="积分公式的文档 AST 结构">
              <span className="ast-node ast-node--root">Integral</span>
              <span className="ast-branch" />
              <span className="ast-node ast-node--child">LowerBound · 0</span>
              <span className="ast-node ast-node--child">UpperBound · ∞</span>
              <span className="ast-node ast-node--child">
                Exponential · e<sup>−x²</sup>
              </span>
              <span className="ast-node ast-node--child">Differential · dx</span>
            </div>
          </LiquidGlassSurface>
          <div className="ast-copy">
            <p>
              结构在，才能继续编辑、计算与转换：同一棵 AST 能输出 LaTeX、Typst、MathML、OMML、SVG 或 Markdown。
            </p>
            <a className="text-link" href="/user_manual.html">
              查看文档模型 <svg className="arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function LandingPage() {
  const counters = useProjectStats();

  useEffect(() => {
    const els = document.querySelectorAll(".reveal, .hero-copy");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in-view");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <>
      <SiteHeader counters={counters} />
      <main id="main-content">
        <HeroSection counters={counters} />
        <ProjectStatsStrip counters={counters} />
        <CaptureSection />
        <RecognizeSection />
        <AstSection />
        <TransformSection />
        <WorkspaceSection />
        <MathPlayground />
        <EcosystemScene />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}
