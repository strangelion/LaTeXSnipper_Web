import { useState } from 'react';
import { astNodes, formulaExample } from '../../data/landingScenes';
import styles from './Scenes.module.css';

export default function AstSection() {
  const [selectedNodeId, setSelectedNodeId] = useState('formula');
  const selectedNode = astNodes.find((node) => node.id === selectedNodeId) || astNodes[0];

  return (
    <section
      id="understand"
      className={styles.scene}
      aria-labelledby="understand-title"
    >
      <div className={styles.container}>
        <header className={styles.heading}>
          <h2 id="understand-title">OCR 只是开始，真正有价值的是结构。</h2>
          <p>同一表达式由节点和关系组成，因此可以继续编辑、计算和转换。</p>
        </header>
        <div className={styles.astLayout}>
          <div className={styles.formulaPanel}>
            <span className={styles.formulaLabel}>Static AST visualization</span>
            <p className={styles.formulaText} aria-label={formulaExample.description}>
              {formulaExample.visual}
            </p>
            <code className={styles.formulaCode}>{formulaExample.latex}</code>
            <div className={styles.tokenRow} aria-label="公式组成部分">
              {astNodes.map((node) => (
                <span
                  className={styles.token}
                  data-selected={node.id === selectedNodeId}
                  key={node.id}
                >
                  {node.token}
                </span>
              ))}
            </div>
          </div>
          <div>
            <div className={styles.astList} aria-label="公式结构节点">
              {astNodes.map((node) => (
                <button
                  className={styles.astNode}
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
            <div className={styles.astDetail} aria-live="polite">
              <strong>{selectedNode.title}</strong>
              <p>{selectedNode.detail}</p>
            </div>
          </div>
        </div>
        <p className={styles.illustrativeNote}>静态结构示例用于说明 Document AST 的语义层，不代表一次实时 OCR 推理。</p>
      </div>
    </section>
  );
}
