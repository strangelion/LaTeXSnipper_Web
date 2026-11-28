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
        <header className={styles.heading} data-reveal="blur">
          <span className={styles.eyebrow}>02 · 离线识别</span>
          <h2 id="recognize-title">从像素到公式。</h2>
          <p>MathCraft OCR 拆分为公式检测、符号解析与结构重建三个清晰阶段，每一步均可回看与修正。</p>
        </header>
        <div className={`${styles.recognizeGrid} ${styles.recognizeGridAlt}`}>
          <figure className={styles.recognitionVisual} data-reveal="mask" data-drift>
            <img
              src={landingImages.ocrResult}
              width="1440"
              height="900"
              loading="lazy"
              decoding="async"
              alt="LaTeXSnipper OCR 识别结果界面"
            />
            <figcaption>桌面版 MathCraft OCR · 识别结果与实时公式预览</figcaption>
          </figure>
          <div className={styles.recognitionFlow}>
            <ol className={styles.recognitionList} data-reveal-group>
              {recognitionStages.map((stage) => (
                <li className={styles.recognitionItem} data-reveal="right" key={stage.id}>
                  <span className={styles.itemIndex} aria-hidden="true">{stage.index}</span>
                  <div className={styles.itemBody}>
                    <strong>{stage.title}</strong>
                    <p>{stage.description}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className={styles.illustrativeNote} data-reveal="fade">下方三段实机录屏展示截图、图片与逐页 PDF 的完整识别过程。</p>
          </div>
        </div>
        <DemosSection embedded />
      </div>
    </section>
  );
}
