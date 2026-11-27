import { useState } from 'react';
import { ecosystemCoreNode, ecosystemNodes } from '../../data/landingScenes';
import LiquidGlassSurface from '../LiquidGlassSurface';
import styles from './Scenes.module.css';

const allNodes = [ecosystemCoreNode, ...ecosystemNodes];

export default function EcosystemSection() {
  const [activeId, setActiveId] = useState('core');
  const activeNode = allNodes.find((node) => node.id === activeId) || ecosystemCoreNode;

  return (
    <section
      id="ecosystem"
      className={`${styles.scene} ${styles.sceneAlt}`}
      aria-labelledby="ecosystem-title"
    >
      <div className={styles.container}>
        <header className={styles.heading} data-reveal="blur">
          <span className={styles.eyebrow}>07 · Ecosystem</span>
          <h2 id="ecosystem-title">Core 是生态的共同数学层。</h2>
          <p>Desktop、Office、Mobile、Obsidian 与 Web 各司其职，以统一 Document AST、Core WASM 与 Automation API 紧密协作。</p>
        </header>
        <div className={styles.ecosystemStage}>
          <LiquidGlassSurface
            className={styles.ecosystemMap}
            data-reveal="scale"
            thickness="panel"
            aria-label="LaTeXSnipper 生态关系图"
          >
            <span className={styles.ecosystemAura} aria-hidden="true" />
            <svg
              className={styles.ecosystemEdges}
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <circle className={styles.ecosystemOrbit} cx="50" cy="50" r="34" />
              <path d="M50 50 L50 15 M50 50 L83 39 M50 50 L71 79 M50 50 L29 79 M50 50 L17 39" />
              <path className={styles.ecosystemEdgeOuter} d="M50 15 L83 39 L71 79 L29 79 L17 39 Z" />
            </svg>
            <button
              type="button"
              className={styles.ecosystemCore}
              data-selected={activeId === ecosystemCoreNode.id}
              aria-pressed={activeId === ecosystemCoreNode.id}
              onClick={() => setActiveId(ecosystemCoreNode.id)}
              onFocus={() => setActiveId(ecosystemCoreNode.id)}
              onMouseEnter={() => setActiveId(ecosystemCoreNode.id)}
            >
              <span>{ecosystemCoreNode.name}</span>
              <small>v3.2.1 · shared AST</small>
            </button>
            {ecosystemNodes.map((node) => (
              <button
                type="button"
                className={styles.ecosystemNode}
                data-node={node.id}
                data-selected={node.id === activeId}
                key={node.id}
                aria-pressed={node.id === activeId}
                onClick={() => setActiveId(node.id)}
                onFocus={() => setActiveId(node.id)}
                onMouseEnter={() => setActiveId(node.id)}
              >
                <span>{node.name}</span>
                <small>{node.badge}</small>
              </button>
            ))}
          </LiquidGlassSurface>
          <LiquidGlassSurface
            as="article"
            className={styles.ecosystemDetail}
            data-reveal="fade"
            thickness="panel"
            aria-live="polite"
          >
            <div className={styles.ecosystemMeta}>
              <span className={styles.ecosystemRole}>{activeNode.role}</span>
              <span className={styles.ecosystemPill}>{activeNode.badge}</span>
              <span className={styles.ecosystemPillMuted}>{activeNode.license}</span>
            </div>
            <h3>{activeNode.fullName || activeNode.name}</h3>
            <p className={styles.ecosystemSummary}>{activeNode.summary}</p>
            <ul className={styles.ecosystemHighlights}>
              {activeNode.highlights.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <div className={styles.ecosystemFooter}>
              <span className={styles.ecosystemRepository}>{activeNode.repository}</span>
              <div className={styles.ecosystemActions}>
                {activeNode.siteRoute && (
                  <a className={styles.ecosystemBtnPrimary} href={activeNode.siteRoute}>
                    {activeNode.siteLabel}
                  </a>
                )}
                <a
                  className={styles.ecosystemBtnGhost}
                  href={activeNode.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GitHub 仓库
                </a>
              </div>
            </div>
          </LiquidGlassSurface>
        </div>
        <div className={styles.ecosystemLite}>
          <span>轻量分支</span>
          <p>
            <a
              href="https://github.com/sigmalos/LaTeXSnipper-lite"
              target="_blank"
              rel="noopener noreferrer"
            >
              LaTeXSnipper Lite
            </a>
            （Rust + Tauri，安装包约 12 MB，OCR 模型按需下载）与合作计划
            <a href="/download.html#visualtex">VisualTeX</a>
            可在下载页一并查看。
          </p>
        </div>
      </div>
    </section>
  );
}
