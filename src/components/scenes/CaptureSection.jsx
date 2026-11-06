import { captureSources, landingImages } from '../../data/landingScenes';
import styles from './Scenes.module.css';

export default function CaptureSection() {
  return (
    <section
      id="capture"
      className={styles.scene}
      aria-labelledby="capture-title"
    >
      <div className={styles.container}>
        <header className={styles.heading} data-reveal="blur">
          <h2 id="capture-title">任何输入，都可以成为可编辑的数学。</h2>
          <p>从截图、图片、PDF、手写或剪贴板开始。输入方式不改变后续工作流。</p>
        </header>
        <div className={styles.captureGrid}>
          <figure className={styles.productFigure} data-reveal="mask" data-drift>
            <img
              src={landingImages.handwriting}
              width="1440"
              height="900"
              loading="lazy"
              decoding="async"
              alt="LaTeXSnipper 数学工作台中的手写识别和公式编辑界面"
            />
            <figcaption>真实产品界面，展示手写输入如何进入数学工作台。</figcaption>
          </figure>
          <ol className={styles.captureList} data-reveal-group>
            {captureSources.map((source) => (
              <li className={styles.captureItem} data-reveal="right" key={source.id}>
                <strong>{source.title}</strong>
                <p>{source.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
