import { landingImages } from '../../data/landingScenes';
import styles from './Scenes.module.css';

export default function WorkspaceSection() {
  return (
    <section
      id="workspace"
      className={styles.scene}
      aria-labelledby="workspace-title"
    >
      <div className={styles.container}>
        <div className={styles.workspaceGrid}>
          <div className={styles.workspaceCopy}>
            <span className={styles.workspaceLabel}>Workspace</span>
            <h2 id="workspace-title">一个引擎，多个数学工作流。</h2>
            <p>OCR、编辑、计算和转换围绕同一份数学内容协作。你不需要在一次识别后重新开始。</p>
            <div className={styles.workspaceLinks}>
              <a href="/user_manual.html">查看工作台</a>
              <a href="/ocr.html">体验在线识别</a>
            </div>
          </div>
          <figure className={styles.productFigure}>
            <img
              src={landingImages.workspace}
              width="1600"
              height="1000"
              loading="lazy"
              decoding="async"
              alt="LaTeXSnipper 数学工作台和公式编辑器"
            />
            <figcaption>真实产品界面，包含编辑、计算和多格式输出工作流。</figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
