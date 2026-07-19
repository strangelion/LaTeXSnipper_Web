import React, { useEffect, useState } from 'react';
import {
  builtinExportFormats,
  desktopPlatforms,
  faqs,
  featureShowcases,
  officePlatforms,
  pandocExportFormats,
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
      <div className="ls-container">
        <div className="ls-hero-grid">
          <div className="ls-hero-copy">
            <p className="hero-version">
              <span>Desktop OCR / Math workspace</span>
              <span>v{release.version} {release.channel}</span>
            </p>

            <h1 id="hero-title">
              把公式，
              <br />
              从像素里拿回来。
            </h1>

            <p className="ls-hero-description">
              LaTeXSnipper 是本地优先的桌面数学工作台：
              截图识别、手写输入、PDF 分页处理、公式编辑、
              计算与多格式导出在一处完成。
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
                href="/ocr.html"
              >
                试用网页单公式识别
              </a>
            </div>

            <p className="ls-hero-note">
              GPLv3 · Windows 为主要发布平台 · Linux / macOS Provider 支持
            </p>
          </div>

          <aside className="ls-hero-index" aria-label="产品工作流概览">
            <p>工作流索引</p>
            <ol>
              <li><span>01</span> 捕获截图与页面</li>
              <li><span>02</span> 本地识别结构</li>
              <li><span>03</span> 编辑与计算</li>
              <li><span>04</span> 导出或插入 Office</li>
            </ol>
            <a href="/user_manual.html">打开完整用户手册 ↗</a>
          </aside>
        </div>

        <figure className="ls-product-plate">
          <div className="ls-window-bar" aria-hidden="true">
            <span><i /><i /><i /></span>
            <code>LaTeXSnipper / Workspace</code>
            <em>Local-first</em>
          </div>
          <img
            src="/assets/images/product/hero-workspace.webp"
            width="1600"
            height="1000"
            alt="LaTeXSnipper 数学工作台主界面"
          />
          <figcaption>
            <span>截图识别、公式编辑、数学计算与格式导出位于同一工作区。</span>
            <span>Windows 10 / 11</span>
          </figcaption>
        </figure>
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

        <div className="workflow-rail">
          {workflowSteps.map((step, index) => (
            <article className="workflow-node" key={step.number}>
              <div className="workflow-index">
                {step.number}
              </div>

              <div className="workflow-node-copy">
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>

              {index < workflowSteps.length - 1 && (
                <span
                  className="workflow-connector"
                  aria-hidden="true"
                >
                  →
                </span>
              )}
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
          title="从截图到文档，公式始终可编辑"
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

function StatusBadge({ children }) {
  return (
    <span className="ls-status">
      {children}
    </span>
  );
}

function EcosystemSection() {
  return (
    <section id="ecosystem" className="ls-section">
      <div className="ls-container">
        <SectionHeading
          eyebrow="平台支持"
          title="桌面应用与 Office 插件"
          description="Windows 是主要发布平台；Linux 和 macOS 通过平台 Provider 层支持。"
        />

        <div className="ls-platform-block">
          <h3 className="ls-table-title">
            桌面应用
          </h3>

          <div className="ls-compat-table-wrap">
            <table className="ls-compat-table">
              <thead>
                <tr>
                  <th>平台</th>
                  <th>状态</th>
                  <th>能力</th>
                  <th>运行要求</th>
                </tr>
              </thead>
              <tbody>
                {desktopPlatforms.map((item) => (
                  <tr key={item.name}>
                    <td>{item.name}</td>
                    <td>
                      <StatusBadge>
                        {item.status}
                      </StatusBadge>
                    </td>
                    <td>{item.capability}</td>
                    <td>{item.requirement}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="ls-platform-block">
          <h3 className="ls-table-title">
            Windows Microsoft Office 插件
          </h3>

          <div className="ls-compat-table-wrap">
            <table className="ls-compat-table">
              <thead>
                <tr>
                  <th>宿主</th>
                  <th>状态</th>
                  <th>插入形式</th>
                  <th>管理能力</th>
                  <th>要求</th>
                </tr>
              </thead>
              <tbody>
                {officePlatforms.map((item) => (
                  <tr key={item.host}>
                    <td>{item.host}</td>
                    <td>
                      <StatusBadge>
                        {item.status}
                      </StatusBadge>
                    </td>
                    <td>{item.insert}</td>
                    <td>{item.manage}</td>
                    <td>{item.requirement}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="ls-table-note">
            Office 插件还需要 .NET Framework 4.8
            与 WebView2 Runtime。Office 2016
            不属于正式支持版本。
          </p>
        </div>
      </div>
    </section>
  );
}

function FormatList({
  title,
  note,
  formats,
}) {
  return (
    <article className="ls-export-group">
      <div className="ls-export-group-heading">
        <h3>{title}</h3>
        <p>{note}</p>
      </div>

      <ol>
        {formats.map((format) => (
          <li key={format}>{format}</li>
        ))}
      </ol>
    </article>
  );
}

function FormatSection() {
  return (
    <section className="ls-section ls-section-soft">
      <div className="ls-container">
        <SectionHeading
          eyebrow="格式支持"
          title="20 种桌面端导出格式"
          description="12 种格式内置可用；8 种文档格式需要安装 Pandoc 层。"
        />

        <div className="ls-format-examples">
          <div className="ls-format-example">
            <div className="ls-format-example-header">
              <span className="ls-format-example-lang">LaTeX</span>
            </div>
            <pre><code>{String.raw`\int_0^\infty e^{-x^2}\,dx`}</code></pre>
          </div>

          <div className="ls-format-example">
            <div className="ls-format-example-header">
              <span className="ls-format-example-lang">Typst</span>
            </div>
            <pre><code>{String.raw`$ integral_0^infinity e^(-x^2) dif x $`}</code></pre>
          </div>

          <div className="ls-format-example">
            <div className="ls-format-example-header">
              <span className="ls-format-example-lang">Markdown</span>
            </div>
            <pre><code>{String.raw`$$\int_0^\infty e^{-x^2}\,dx$$`}</code></pre>
          </div>

          <div className="ls-format-example">
            <div className="ls-format-example-header">
              <span className="ls-format-example-lang">OMML</span>
            </div>
            <pre><code>{String.raw`<m:oMath>
  <m:int>
    <m:lim><m:r>0</m:r></m:lim>
    <m:sup><m:r>∞</m:r></m:sup>
  </m:int>
  <m:r>e</m:r><m:sSup>
    <m:e><m:r>−x²</m:r></m:e>
  </m:sSup>
</m:oMath>`}</code></pre>
          </div>
        </div>

        <div className="ls-export-groups">
          <FormatList
            title="内置格式"
            note="不需要 Pandoc"
            formats={builtinExportFormats}
          />

          <FormatList
            title="Pandoc 格式"
            note="需要 Pandoc；PDF 还需要可用的 LaTeX PDF 引擎"
            formats={pandocExportFormats}
          />
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
            eyebrow="隐私"
            title="你的公式，默认留在本机"
          />

          <p className="ls-privacy-intro">
            本地模型准备完成后，截图、图片和公式默认在设备上处理。
            只有主动启用第三方服务时，内容才会发送到对应服务。
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
          <a href="/ocr.html">单公式识别</a>
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
          <a href="/open-source.html">
            开源许可
          </a>
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
      <main id="main-content" className="landing-main">
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
