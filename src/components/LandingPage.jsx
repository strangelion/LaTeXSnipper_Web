import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { useProjectStats } from "../hooks/useProjectStats";
import useScrollReveal from "../hooks/useScrollReveal";
import {
  GitHubStarCount,
  HeroCounters,
  ProjectStatsStrip,
} from "./ProjectCounters";
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

// three.js only draws the hero backdrop: keep it out of the initial bundle.
const MathWorld = lazy(() => import("../three/MathWorld"));

const GITHUB_URL = "https://github.com/SakuraMathcraft/LaTeXSnipper";

const mascot = {
  src: "/assets/brand/snipper-girl.webp",
  srcSet:
    "/assets/brand/snipper-girl-640.webp 640w, /assets/brand/snipper-girl-960.webp 960w",
  sizes: "(min-width: 1200px) 30vw, (min-width: 780px) 28vw, 52vw",
  enabled: true,
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
    const query = window.matchMedia("(max-width: 1040px)");
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
            <a href="/remote.html" onClick={closeMenu}>
              远程连接
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
      <Suspense fallback={null}>
        <MathWorld />
      </Suspense>
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
          <a href="/remote.html">远程连接</a>
          <a href="/user_manual.html">用户手册</a>
          <a href="/open-source.html">开源许可</a>
        </nav>
        <p className="footer-note">
          各项目作者与许可证分别标注。
          <br />
          Desktop GPL-3.0 · Lite GPL-3.0 · Core / Office / Mobile AGPL-3.0
        </p>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  const counters = useProjectStats();
  useScrollReveal();

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
