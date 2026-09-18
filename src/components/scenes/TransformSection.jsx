import { useState } from 'react';
import { conversionFormats } from '../../data/landingScenes';
import styles from './Scenes.module.css';

export default function TransformSection() {
  const [selectedFormatId, setSelectedFormatId] = useState('latex');
  const [copyStatus, setCopyStatus] = useState('');
  const selectedFormat = conversionFormats.find(
    (format) => format.id === selectedFormatId,
  ) || conversionFormats[0];

  const handleCopy = async () => {
    try {
      if (!navigator.clipboard) {
        throw new Error('Clipboard API is unavailable.');
      }
      await navigator.clipboard.writeText(selectedFormat.code);
      setCopyStatus(`${selectedFormat.label} 示例已复制。`);
    } catch {
      setCopyStatus('浏览器未允许复制。请选中代码后手动复制。');
    }
  };

  return (
    <section
      id="transform"
      className={`${styles.scene} ${styles.sceneAlt}`}
      aria-labelledby="transform-title"
    >
      <div className={styles.container}>
        <header className={styles.heading}>
          <span className={styles.eyebrow}>Transform</span>
          <h2 id="transform-title">一种数学结构，多种表达方式。</h2>
          <p>让同一棵结构进入 LaTeX、Typst、MathML 与 Office 工作流。</p>
        </header>
        <div className={styles.formatTabs} role="tablist" aria-label="选择格式示例">
          {conversionFormats.map((format) => (
            <button
              className={styles.formatButton}
              id={`format-tab-${format.id}`}
              key={format.id}
              type="button"
              role="tab"
              aria-selected={format.id === selectedFormat.id}
              aria-controls="format-code-panel"
              onClick={() => {
                setSelectedFormatId(format.id);
                setCopyStatus('');
              }}
            >
              {format.label}
            </button>
          ))}
        </div>
        <div
          className={styles.conversionPanel}
          id="format-code-panel"
          role="tabpanel"
          aria-labelledby={`format-tab-${selectedFormat.id}`}
        >
          <span className={styles.conversionLabel}>Illustrative static format sample</span>
          <h3>{selectedFormat.label}</h3>
          <p>{selectedFormat.description}</p>
          <code className={styles.codeBlock}>{selectedFormat.code}</code>
          <div className={styles.copyRow}>
            <button className={styles.copyButton} type="button" onClick={handleCopy}>
              复制示例
            </button>
            <p className={styles.copyStatus} aria-live="polite">{copyStatus}</p>
          </div>
        </div>
        <p className={styles.illustrativeNote}>这些是静态格式示例。实际转换能力与保真度以 Core 和 Desktop 的运行时报告为准。</p>
      </div>
    </section>
  );
}
