import React, { useEffect, useState } from 'react';
import {
  ecosystems,
  faqs,
  featureShowcases,
  formatGroups,
  trustItems,
  workflowSteps,
} from '../data/siteContent';
import { usePreferredPlatform } from '../hooks/usePreferredPlatform';
import { useReleaseInfo } from '../hooks/useReleaseInfo';
import '../styles/landing.css';

const GITHUB_URL =
  'https://github.com/SakuraMathcraft/LaTeXSnipper';

function useTheme() {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    const saved = localStorage.getItem('latexSnipper-theme');
    const darkPreferred = window.matchMedia(
      '(prefers-color-scheme: dark)',
    ).matches;

    const initial =
      saved === 'dark' || saved === 'light'
        ? saved
        : darkPreferred
          ? 'dark'
          : 'light';

    document.documentElement.setAttribute('data-theme', initial);
    setTheme(initial);
  }, []);

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('latexSnipper-theme', next);
    setTheme(next);
  }

  return { theme, toggleTheme };
}

function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header className="ls-header">
      <div className="ls-container ls-header-inner">
        <a className="ls-brand" href="/" aria-label="LaTeXSnipper 首页">
          <img
            src="/assets/images/icon.png"
            width="32"
            height="32"
            alt=""
          />
          <span>LaTeXSnipper</span>
        </a>

        <button
          type="button"
          className="ls-menu-button"
          aria-expanded={menuOpen}
          aria-controls="primary-navigation"
          onClick={() => setMenuOpen((value) => !value)}
        >
          <span className="sr-only">打开或关闭导航</span>
          <span />
          <span />
          <span />
        </button>

        <nav
          id="primary-navigation"
          className={`ls-nav ${menuOpen ? 'is-open' : ''}`}
          aria-label="主导航"
        >
          <a href="#workflow" onClick={closeMenu}>
            工作流
          </a>
          <a href="#features" onClick={closeMenu}>
            功能
          </a>
          <a href="#ecosystem" onClick={closeMenu}>
            平台生态
          </a>
          <a href="#privacy" onClick={closeMenu}>
            隐私
          </a>
          <a href="/user_manual.html" onClick={closeMenu}>
            文档
          </a>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>

          <button
            type="button"
            className="ls-theme-button"
            onClick={toggleTheme}
            aria-label={
              theme === 'dark'
                ? '切换到亮色模式'
                : '切换到暗色模式'
            }
          >
            {theme === 'dark' ? '亮色' : '暗色'}
          </button>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  const preferred = usePreferredPlatform();
  const { release } = useReleaseInfo();

  return (
    <section className="ls-hero" aria-labelledby="hero-title">
      <div className="ls-container ls-hero-grid">
        <div className="ls-hero-copy">
          <div className="ls-release-pill">
            v{release.version} {release.channel}
          </div>

          <h1 id="hero-title">
            把数学内容从图片，
            <span>变成可以继续使用的公式。</span>
          </h1>

          <p className="ls-hero-description">
            截图识别、手写输入、数学编辑、格式转换和
            Office 集成，集中在一个本地优先的数学工作空间。
          </p>

          <div className="ls-hero-actions">
            <a
              className="ls-button ls-button-primary"
              href={preferred.downloadPageHref}
            >
              下载 {preferred.label} 版
            </a>

            <a
              className="ls-button ls-button-secondary"
              href="/ocr_demo.html"
            >
              在线体验 OCR
            </a>

            <a className="ls-text-link" href="/user_manual.html">
              阅读用户手册
            </a>
          </div>

          <p className="ls-hero-note">
            免费开源 · 默认本地识别 ·
            首次使用部分模型可能需要下载
          </p>
        </div>

        <div className="ls-product-frame">
          <picture>
            <source
              srcSet="/assets/images/product/hero-workspace.webp"
              type="image/webp"
            />
            <img
              src="/assets/images/LaTeXSnipper.png"
              width="1600"
              height="1000"
              alt="LaTeXSnipper 数学工作空间界面"
              fetchPriority="high"
            />
          </picture>

          <div className="ls-product-badge ls-product-badge-top">
            图片 → LaTeX
          </div>
          <div className="ls-product-badge ls-product-badge-bottom">
            LaTeX → Office / Typst / SVG
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustStrip() {
  return (
    <section className="ls-trust" aria-label="产品特点">
      <div className="ls-container ls-trust-grid">
        {trustItems.map((item) => (
          <article key={item.title}>
            <strong>{item.title}</strong>
            <span>{item.description}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function SectionHeading({ eyebrow, title, description }) {
  return (
    <header className="ls-section-heading">
      <span>{eyebrow}</span>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </header>
  );
}

function WorkflowSection() {
  return (
    <section id="workflow" className="ls-section">
      <div className="ls-container">
        <SectionHeading
          eyebrow="完整工作流"
          title="从捕获到导出，不再反复切换工具"
          description="每一步都保留可编辑的数学内容，而不是只生成一张不可修改的图片。"
        />

        <div className="ls-workflow-grid">
          {workflowSteps.map((step) => (
            <article className="ls-workflow-card" key={step.number}>
              <span className="ls-step-number">{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureShowcase() {
  return (
    <section
      id="features"
      className="ls-section ls-section-soft"
    >
      <div className="ls-container">
        <SectionHeading
          eyebrow="核心能力"
          title="展示真实界面，而不是只描述功能"
          description="每个模块都对应一个完整使用场景。"
        />

        <div className="ls-showcases">
          {featureShowcases.map((feature, index) => (
            <article
              className={`ls-showcase ${
                index % 2 === 1 ? 'is-reversed' : ''
              }`}
              key={feature.id}
            >
              <div className="ls-showcase-media">
                <img
                  src={feature.image}
                  alt={feature.alt}
                  width="1440"
                  height="900"
                  loading={index === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                />
              </div>

              <div className="ls-showcase-copy">
                <span className="ls-eyebrow">{feature.eyebrow}</span>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>

                <ul>
                  {feature.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>

                {feature.href && (
                  <a className="ls-text-link" href={feature.href}>
                    {feature.cta} →
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function EcosystemSection() {
  return (
    <section id="ecosystem" className="ls-section">
      <div className="ls-container">
        <SectionHeading
          eyebrow="平台生态"
          title="根据宿主能力选择正确的集成方式"
          description="官网明确区分稳定、Beta、开发中和规划中的功能。"
        />

        <div className="ls-ecosystem-grid">
          {ecosystems.map((item) => (
            <article className="ls-ecosystem-card" key={item.name}>
              <div>
                <h3>{item.name}</h3>
                <span
                  className={`ls-status ls-status-${item.status}`}
                >
                  {item.status}
                </span>
              </div>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function FormatSection() {
  return (
    <section className="ls-section ls-section-soft">
      <div className="ls-container">
        <SectionHeading
          eyebrow="格式支持"
          title="一份数学内容，进入不同写作环境"
        />

        <div className="ls-format-groups">
          {formatGroups.map((group) => (
            <article className="ls-format-group" key={group.title}>
              <h3>{group.title}</h3>
              <div>
                {group.formats.map((format) => (
                  <span key={format}>{format}</span>
                ))}
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
      id="privacy"
      className="ls-section ls-privacy-section"
    >
      <div className="ls-container ls-privacy-grid">
        <div>
          <SectionHeading
            eyebrow="隐私与联网边界"
            title={'本地优先，但不使用模糊的\u201c永不联网\u201d宣传'}
          />

          <p className="ls-privacy-intro">
            官网应该把模型下载、本地推理和外部 API
            三种情况分开说明，让用户知道什么时候发生网络请求。
          </p>
        </div>

        <div className="ls-privacy-cards">
          <article>
            <span>1</span>
            <div>
              <h3>首次准备</h3>
              <p>首次使用部分模型时，应用可能需要下载模型文件。</p>
            </div>
          </article>

          <article>
            <span>2</span>
            <div>
              <h3>本地识别</h3>
              <p>模型准备完成后，图片和公式默认在本机处理。</p>
            </div>
          </article>

          <article>
            <span>3</span>
            <div>
              <h3>外部服务</h3>
              <p>
                只有主动启用第三方 API
                时，内容才会发送到用户配置的服务。
              </p>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

function ReleaseSection() {
  const preferred = usePreferredPlatform();
  const { release, loading } = useReleaseInfo();

  return (
    <section className="ls-section">
      <div className="ls-container">
        <div className="ls-release-panel">
          <div>
            <span className="ls-eyebrow">当前稳定版本</span>
            <h2>
              LaTeXSnipper v{release.version} {release.channel}
            </h2>
            <p>
              {loading
                ? '正在读取版本信息……'
                : '适用于 Windows、Linux 与 macOS。'}
            </p>
          </div>

          <div className="ls-release-actions">
            <a
              className="ls-button ls-button-primary"
              href={preferred.downloadPageHref}
            >
              前往下载页
            </a>

            <a
              className="ls-button ls-button-secondary"
              href={release.releaseNotesUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              查看版本说明
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function FaqSection() {
  return (
    <section className="ls-section ls-section-soft">
      <div className="ls-container ls-faq-container">
        <SectionHeading
          eyebrow="常见问题"
          title="下载前最常见的几个问题"
        />

        <div className="ls-faq-list">
          {faqs.map((item) => (
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

function Footer() {
  return (
    <footer className="ls-footer">
      <div className="ls-container ls-footer-grid">
        <div>
          <a className="ls-brand" href="/">
            <img
              src="/assets/images/icon.png"
              width="28"
              height="28"
              alt=""
            />
            <span>LaTeXSnipper</span>
          </a>
          <p>面向数学内容的本地优先识别与转换工具。</p>
        </div>

        <nav aria-label="产品">
          <a href="/download.html">下载</a>
          <a href="/ocr_demo.html">OCR Demo</a>
          <a href="/user_manual.html">用户手册</a>
        </nav>

        <nav aria-label="开发">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          <a
            href={`${GITHUB_URL}/issues`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Issues
          </a>
          <a
            href={`${GITHUB_URL}/releases`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Release Notes
          </a>
        </nav>

        <nav aria-label="法律">
          <a
            href={`${GITHUB_URL}/blob/main/LICENSE`}
            target="_blank"
            rel="noopener noreferrer"
          >
            GPLv3
          </a>
        </nav>

        <p className="ls-copyright">
          &copy; 2026 LaTeXSnipper &middot; GPLv3
        </p>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <>
      <Header />
      <main id="main-content">
        <Hero />
        <TrustStrip />
        <WorkflowSection />
        <FeatureShowcase />
        <EcosystemSection />
        <FormatSection />
        <PrivacySection />
        <ReleaseSection />
        <FaqSection />
      </main>
      <Footer />
    </>
  );
}
