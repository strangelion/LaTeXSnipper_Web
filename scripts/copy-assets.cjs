/**
 * 构建后复制静态资源到 dist/ 目录
 * 替代之前 package.json 中的内联单行脚本
 */
const fs = require('fs');
const path = require('path');

const DIST = 'dist';

function copy(src, dst) {
  const dest = path.join(DIST, dst);
  const dir = path.dirname(dest);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`  ✓ ${dst}`);
  } else {
    console.warn(`  ✗ 跳过(源文件不存在): ${src}`);
  }
}

// 静态资源文件列表
const assets = [
  'download.html',
  { src: 'public/error.html', dst: 'error.html' },
  { src: 'public/robots.txt', dst: 'robots.txt' },
  { src: 'public/ocr.html', dst: 'ocr.html' },
  { src: 'public/js/ocr.js', dst: 'js/ocr.js' },
  'user_manual.html',
  'user_manual.typ',
  'styles/styles.css',
  'styles/editorial.css',
  'styles/product-shell.css',
  'styles/site-tokens.css',
  'styles/liquid-glass.css',
  'styles/site-shell.css',
  'styles/download.css',
  'styles/ocr.css',
  'styles/manual.css',
  'js/script.js',
  'js/product-shell.js',
  'js/device-detection.js',
  'assets/images/LaTeXSnipper.png',
  'assets/images/icon.png',
  'assets/images/icon-96.png',
  'assets/images/product/hero-workspace.webp',
  'assets/images/product/ocr-result.webp',
  'assets/images/product/handwriting.webp',
  'assets/images/product/office-word.webp',
  'assets/images/product/export-formats.webp',
  'assets/images/mathcraft_abstract_algebra.png',
  'assets/images/mathcraft_chinese_lecture.png',
  'assets/images/mathcraft_dynamics_journal.png',
  'assets/images/mathcraft_limits_series.png',
];

console.log('复制静态资源到 dist/:');
for (const f of assets) {
  if (typeof f === 'string') {
    copy(f, f);
  } else {
    copy(f.src, f.dst);
  }
}
console.log('静态资源复制完成');
