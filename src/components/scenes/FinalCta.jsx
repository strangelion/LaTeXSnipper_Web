import styles from './Scenes.module.css';

export default function FinalCta() {
  return (
    <section className={styles.scene} aria-labelledby="final-cta-title">
      <div className={styles.container}>
        <div className={styles.ctaPanel}>
          <div>
            <h2 id="final-cta-title">你的数学，进入你的工作流。</h2>
            <p>从本地优先的数学识别开始，在需要时继续使用 Desktop、Web 与 Office 生态。</p>
          </div>
          <div className={styles.ctaActions}>
            <a href="/download.html">下载 LaTeXSnipper</a>
            <a href="/ocr.html">在线识别</a>
            <a
              href="https://github.com/SakuraMathcraft/LaTeXSnipper"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
