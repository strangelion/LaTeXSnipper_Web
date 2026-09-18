import DemosSection from '../DemosSection';
import { landingImages, recognitionStages } from '../../data/landingScenes';
import styles from './Scenes.module.css';

export default function RecognizeSection() {
  return (
    <section
      id="recognize"
      className={`${styles.scene} ${styles.sceneAlt}`}
      aria-labelledby="recognize-title"
    >
      <div className={styles.container}>
        <header className={styles.heading}>
          <span className={styles.eyebrow}>Recognize</span>
          <h2 id="recognize-title">从像素到公式。</h2>
          <p>识别不是黑箱结果。区域、符号关系和表达式会依次进入可检查的数学流程。</p>
        </header>
        <div className={styles.recognizeGrid}>
          <figure className={styles.recognitionVisual}>
            <img
              src={landingImages.ocrResult}
              width="1440"
              height="900"
              loading="lazy"
              decoding="async"
              alt="LaTeXSnipper OCR 识别结果界面"
            />
            <figcaption>真实产品界面。扫描线仅为流程示意，不代表实时模型推理。</figcaption>
          </figure>
          <div className={styles.recognitionFlow}>
            <ol className={styles.recognitionList}>
              {recognitionStages.map((stage) => (
                <li className={styles.recognitionItem} key={stage.id}>
                  <strong>{stage.title}</strong>
                  <p>{stage.description}</p>
                </li>
              ))}
            </ol>
            <p className={styles.illustrativeNote}>此流程图是静态演示，不展示或伪造模型置信度。</p>
          </div>
        </div>
        <DemosSection embedded />
      </div>
    </section>
  );
}
