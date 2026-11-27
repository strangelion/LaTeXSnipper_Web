import styles from './Scenes.module.css';
import LiquidGlassSurface from '../LiquidGlassSurface';
import AmbientParticles from '../../p5/AmbientParticles';

export default function FinalCta() {
  return (
    <section
      className={`${styles.scene} ${styles.ctaScene}`}
      aria-labelledby="final-cta-title"
    >
      <AmbientParticles className={styles.ctaBackdrop} />
      <div className={styles.container}>
        <LiquidGlassSurface className={styles.ctaPanel} thickness="panel">
          <div data-reveal="blur">
            <span className={styles.eyebrow}>Get Started</span>
            <h2 id="final-cta-title">
              你的数学，<span className="cjk-word">进入</span>你的工作流。
            </h2>
            <p>从本地优先的数学识别出发，自由延伸至 Desktop、Office、Mobile、Obsidian 与浏览器工作区。</p>
          </div>
          <div className={styles.ctaActions} data-reveal="scale">
            <a href="/download.html">下载 LaTeXSnipper</a>
            <a href="/ocr.html">在线识别</a>
            <a href="/remote.html">远程连接</a>
            <a href="/user_manual.html">用户手册</a>
            <a
              href="https://github.com/SakuraMathcraft/LaTeXSnipper"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
          </div>
        </LiquidGlassSurface>
      </div>
    </section>
  );
}
