import { useState } from 'react';
import { astNodes, formulaExample } from '../../data/landingScenes';
import SemanticGraph from '../../three/SemanticGraph';
import LiquidGlassSurface from '../LiquidGlassSurface';
import { GaussianIntegralExpr } from '../MathFormulaSvg';
import styles from './Scenes.module.css';

// The scene data stores the integral's upper bound as a plain "∞" character, which would
// render full size on the baseline. Render it as a raised script glyph instead.
function renderUpperBounds(text, className) {
  const chunks = String(text).split('∞');
  return chunks.flatMap((chunk, index) =>
    index === chunks.length - 1
      ? [chunk]
      : [chunk, <span className={className} key={index}>{'∞'}</span>],
  );
}

export default function AstSection() {
  const [selectedNodeId, setSelectedNodeId] = useState('formula');
  const selectedNode = astNodes.find((node) => node.id === selectedNodeId) || astNodes[0];

  return (
    <section
      id="understand"
      className={`${styles.scene} ${styles.sceneSpotlight}`}
      aria-labelledby="understand-title"
    >
      <div className={styles.container}>
        <header className={styles.heading} data-reveal="blur">
          <span className={styles.eyebrow}>03 · 结构理解</span>
          <h2 id="understand-title">
            OCR 只是开始，<span className="cjk-word">真正</span>有价值的是结构。
          </h2>
          <p>Core 3 以统一 Document AST（schema 1.0.0）组织表达式节点与关系，让结果可持续编辑、计算与无损转换。</p>
        </header>
        <div className={styles.astLayout}>
          <div className={styles.astVisualStack} data-reveal="mask">
            <LiquidGlassSurface className={styles.formulaPanel} thickness="panel">
              <span className={styles.formulaLabel}>Document AST 结构示意</span>
              <div className={styles.formulaDisplayWrap}>
                <GaussianIntegralExpr className={styles.formulaSvg} />
              </div>
              <code className={styles.formulaCode}>{formulaExample.latex}</code>
              <div className={styles.tokenRow} aria-label="公式组成部分">
                {astNodes.map((node) => (
                  <button
                    type="button"
                    className={styles.token}
                    data-lg-solid
                    data-selected={node.id === selectedNodeId}
                    aria-pressed={node.id === selectedNodeId}
                    key={node.id}
                    onClick={() => setSelectedNodeId(node.id)}
                  >
                    {renderUpperBounds(node.token, styles.upperBound)}
                  </button>
                ))}
              </div>
            </LiquidGlassSurface>
            <SemanticGraph
              variant="ast"
              surface="dark"
              activeId={selectedNodeId}
              onSelect={setSelectedNodeId}
            />
          </div>
          <div>
            <div className={styles.astList} data-reveal-group aria-label="公式结构节点">
              {astNodes.map((node) => (
                <button
                  className={styles.astNode}
                  data-reveal="fade"
                  data-selected={node.id === selectedNodeId}
                  key={node.id}
                  type="button"
                  aria-pressed={node.id === selectedNodeId}
                  onClick={() => setSelectedNodeId(node.id)}
                >
                  {node.title}
                </button>
              ))}
            </div>
            <div className={styles.astDetail} data-reveal="fade" aria-live="polite">
              <strong>{selectedNode.title}</strong>
              <p>{selectedNode.detail}</p>
            </div>
          </div>
        </div>
        <p className={styles.illustrativeNote}>静态结构示例，展示 Core 3 的 Document AST 语义层次。</p>
      </div>
    </section>
  );
}
