import { useState } from 'react';
import { ecosystemNodes } from '../../data/landingScenes';
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
          <div className={styles.ecosystemMap} aria-label="LaTeXSnipper 生态关系图">
            <a
              className={styles.ecosystemCore}
              href={coreNode.href}
              target="_blank"
              rel="noopener noreferrer"
              onFocus={() => setActiveId(coreNode.id)}
              onMouseEnter={() => setActiveId(coreNode.id)}
            >
              {coreNode.name}
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
          </div>
          <article className={styles.ecosystemDetail} aria-live="polite">
            <h3>{activeNode.name}</h3>
            <p>{activeNode.summary}</p>
            <span className={styles.ecosystemRepository}>{activeNode.repository}</span>
          </article>
        </div>
      </div>
    </section>
  );
}
