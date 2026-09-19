import { useState } from 'react';
import { ecosystemNodes } from '../../data/landingScenes';
import LiquidGlassSurface from '../LiquidGlassSurface';
import styles from './Scenes.module.css';

const coreNode = {
  id: 'core',
  name: 'latexsnipper-core',
  repository: 'strangelion/latexsnipper-core',
  summary: 'Unified Document AST, OCR pipelines, conversion and WASM capability.',
  href: 'https://github.com/strangelion/latexsnipper-core',
};

export default function EcosystemSection() {
  const [activeId, setActiveId] = useState('core');
  const activeNode = [coreNode, ...ecosystemNodes].find(
    (node) => node.id === activeId,
  ) || coreNode;

  return (
    <section
      id="ecosystem"
      className={`${styles.scene} ${styles.sceneAlt}`}
      aria-labelledby="ecosystem-title"
    >
      <div className={styles.container}>
        <header className={styles.heading}>
          <h2 id="ecosystem-title">Core 是生态的共同数学层。</h2>
          <p>Web、Desktop、Office 与 Mobile 以统一的结构和转换能力相连，同时保持各自清楚的项目边界。</p>
        </header>
        <div className={styles.ecosystemStage}>
          <LiquidGlassSurface
            className={styles.ecosystemMap}
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
              <path d="M50 50 L50 19 M50 50 L82 50 M50 50 L50 81 M50 50 L18 50" />
              <path className={styles.ecosystemEdgeOuter} d="M50 19 L82 50 L50 81 L18 50 Z" />
            </svg>
            <a
              className={styles.ecosystemCore}
              href={coreNode.href}
              target="_blank"
              rel="noopener noreferrer"
              onFocus={() => setActiveId(coreNode.id)}
              onMouseEnter={() => setActiveId(coreNode.id)}
            >
              <span>{coreNode.name}</span>
              <small>shared math layer</small>
            </a>
            {ecosystemNodes.map((node) => (
              <a
                className={styles.ecosystemNode}
                data-selected={node.id === activeId}
                href={node.href}
                key={node.id}
                target="_blank"
                rel="noopener noreferrer"
                onFocus={() => setActiveId(node.id)}
                onMouseEnter={() => setActiveId(node.id)}
              >
                {node.name}
              </a>
            ))}
          </LiquidGlassSurface>
          <LiquidGlassSurface
            as="article"
            className={styles.ecosystemDetail}
            thickness="panel"
            aria-live="polite"
          >
            <h3>{activeNode.name}</h3>
            <p>{activeNode.summary}</p>
            <span className={styles.ecosystemRepository}>{activeNode.repository}</span>
          </LiquidGlassSurface>
        </div>
      </div>
    </section>
  );
}
