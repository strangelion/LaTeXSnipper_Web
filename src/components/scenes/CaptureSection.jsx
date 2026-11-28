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
          <span className={styles.eyebrow}>01 · 捕获输入</span>
          <h2 id="capture-title">
            任何输入，都可以<span className="cjk-word">成为</span>可编辑的数学。
          </h2>
          <p>从全局截图、图片、PDF、手写画布或远程手机拍摄开始，输入方式不割裂后续工作流。</p>
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
            <figcaption>桌面版数学工作台 · 手写输入与公式精修实拍</figcaption>
          </figure>
          <ol className={styles.captureList} data-reveal-group>
            {captureSources.map((source) => (
              <li className={styles.captureItem} data-reveal="right" key={source.id}>
                <span className={styles.itemIndex} aria-hidden="true">{source.index}</span>
                <div className={styles.itemBody}>
                  <strong>{source.title}</strong>
                  <p>{source.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
