import { landingImages } from '../../data/landingScenes';
import { DESKTOP_RELEASE_LABEL } from '../../data/siteContent';
import LiquidGlassSurface from '../LiquidGlassSurface';
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
          <LiquidGlassSurface className={styles.workspaceCopy} thickness="panel" data-reveal="left">
            <span className={styles.eyebrow}>05 · Workspace</span>
            <h2 id="workspace-title">一个引擎，多个数学工作流。</h2>
            <p>OCR、MathLive 可视化编辑、符号计算与文档导出围绕同一份数学内容协作，无需反复切换工具或重新输入。</p>
            <ul className={styles.workspaceSpecs}>
              <li>
                <strong>MathLive 数学工作台</strong>
                <span>可视化编辑、虚拟键盘与化简 / 展开 / 求解</span>
              </li>
              <li>
                <strong>20 种导出格式</strong>
                <span>12 种内置格式 + 8 种 Pandoc 文档导出</span>
              </li>
              <li>
                <strong>Word / PPT 双向维护</strong>
                <span>原生 OMML 与 OLE，支持 MathType 双向互转</span>
              </li>
              <li>
                <strong>Automation API v1</strong>
                <span>端口 28765 串联 Office 插件与手机远程连接</span>
              </li>
            </ul>
            <div className={styles.workspaceLinks}>
              <a href="/user_manual.html">查看用户手册</a>
              <a href="/ocr.html">体验在线识别</a>
              <a href="/remote.html">远程连接</a>
            </div>
          </LiquidGlassSurface>
          <figure className={styles.productFigure} data-reveal="right" data-drift>
            <img
              src={landingImages.workspace}
              width="1600"
              height="1000"
              loading="lazy"
              decoding="async"
              alt="LaTeXSnipper 数学工作台和公式编辑器"
            />
            <figcaption>{`Desktop ${DESKTOP_RELEASE_LABEL} · MathLive 编辑、符号计算与实时预览工作台`}</figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
